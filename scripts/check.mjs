import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const catalog = JSON.parse(await readFile(path.join(root, "content", "catalog.json"), "utf8"));
const course = JSON.parse(await readFile(path.join(root, "content", "course.json"), "utf8"));
const lessonFiles = (await readdir(path.join(root, "content", "lessons"))).filter((file) => file.endsWith(".json")).sort();
const lessons = await Promise.all(lessonFiles.map(async (file) => JSON.parse(await readFile(path.join(root, "content", "lessons", file), "utf8"))));
const failures = [];
const expected = { chapters: 17, notebooks: 63, codeCells: 810 };
const actual = {
  chapters: catalog.chapters.length,
  notebooks: catalog.notebooks.length,
  codeCells: catalog.notebooks.reduce((sum, notebook) => sum + notebook.codeCellCount, 0)
};
for (const [key, value] of Object.entries(expected)) if (actual[key] !== value) failures.push(`Expected ${value} ${key}, found ${actual[key]}`);
for (const notebook of catalog.notebooks) {
  if (notebook.cells.length !== notebook.codeCellCount) failures.push(`${notebook.path}: explanation count does not match code-cell count`);
  if (!notebook.sourceUrl.includes(catalog.upstream.commit)) failures.push(`${notebook.path}: source is not pinned to the audited commit`);
}
const lessonChapters = lessons.map((lesson) => lesson.chapter).sort((a, b) => a - b);
if (JSON.stringify(lessonChapters) !== JSON.stringify(course.reviewedChapters)) failures.push("course.reviewedChapters must exactly match the lesson files");
if (new Set(lessonChapters).size !== lessonChapters.length) failures.push("Each chapter may have only one lesson file");
if (JSON.stringify(lessonChapters) !== JSON.stringify(Array.from({ length: lessons.length }, (_, index) => index + 1))) failures.push("Reviewed lessons must form the contiguous chapter prefix 1..N");
if (course.upstreamCommit !== catalog.upstream.commit) failures.push("Course and notebook catalog must pin the same upstream commit");
const reservedSectionIds = new Set(["learning-outcomes", "version-review", "guided-notebooks", "exercises", "references"]);
for (const lesson of lessons) {
  const prefix = `Chapter ${lesson.chapter}`;
  if (!catalog.chapters.some((chapter) => chapter.number === lesson.chapter)) failures.push(`${prefix}: unknown chapter`);
  if (lesson.pytorchVersion !== course.pytorchVersion) failures.push(`${prefix}: pytorchVersion must match the course target`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lesson.reviewedAt || "")) failures.push(`${prefix}: missing ISO reviewedAt date`);
  if (!Number.isInteger(lesson.minutes) || lesson.minutes < 10) failures.push(`${prefix}: invalid lesson duration`);
  if (!Array.isArray(lesson.outcomes) || lesson.outcomes.length < 3) failures.push(`${prefix}: expected at least 3 learning outcomes`);
  if (!Array.isArray(lesson.sections) || lesson.sections.length < 4) failures.push(`${prefix}: expected at least 4 lesson sections`);
  if (new Set(lesson.sections?.map((section) => section.id)).size !== lesson.sections?.length) failures.push(`${prefix}: section IDs must be unique`);
  for (const section of lesson.sections || []) {
    if (!section.id || !section.title || !section.summary || !Array.isArray(section.body) || !section.body.length) failures.push(`${prefix}: incomplete section ${section.id || "(missing id)"}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(section.id || "") || reservedSectionIds.has(section.id)) failures.push(`${prefix}: unsafe or reserved section ID ${section.id}`);
    if (section.code && (!section.code.title || !section.code.language || !section.code.source)) failures.push(`${prefix}: incomplete code block in ${section.id}`);
    if (section.code?.language === "python" && /(?:(?<!torch\.utils)\.data\b|pretrained\s*=\s*True|torch\.cuda\.amp|torch\.jit\.)/.test(section.code.source)) failures.push(`${prefix}: deprecated API in current Python example ${section.id}`);
    if (section.code?.language === "python" && /\btorch\.(?!utils\.data\b)/.test(section.code.source) && !/(?:^|\n)\s*import torch(?:\s|$)/m.test(section.code.source)) failures.push(`${prefix}: Python example ${section.id} uses torch without importing it`);
  }
  if (!Array.isArray(lesson.modern) || lesson.modern.length < 2) failures.push(`${prefix}: expected at least 2 book-to-current review notes`);
  for (const item of lesson.modern || []) if (!item.topic || !item.book || !item.current || !item.reason) failures.push(`${prefix}: incomplete book-to-current review note`);
  if (!Array.isArray(lesson.exercises) || lesson.exercises.length < 3) failures.push(`${prefix}: expected at least 3 exercises`);
  for (const exercise of lesson.exercises || []) if (!exercise.title || !exercise.prompt || !exercise.success) failures.push(`${prefix}: incomplete exercise`);
  if (!Array.isArray(lesson.references) || !lesson.references.some((reference) => reference.url === "https://www.learnpytorch.io/" || reference.url.startsWith("https://www.learnpytorch.io/"))) failures.push(`${prefix}: missing LearnPyTorch teaching reference`);
  for (const reference of lesson.references || []) {
    try {
      const url = new URL(reference.url);
      if (url.protocol !== "https:") failures.push(`${prefix}: reference must use HTTPS: ${reference.url}`);
      if (reference.type === "Official PyTorch" && url.hostname !== "pytorch.org" && !url.hostname.endsWith(".pytorch.org")) failures.push(`${prefix}: official reference is not on a PyTorch domain: ${reference.url}`);
    } catch { failures.push(`${prefix}: invalid reference URL ${reference.url}`); }
    if (!reference.type || !reference.title) failures.push(`${prefix}: incomplete reference`);
  }
  if (!lesson.references?.some((reference) => reference.type === "Official PyTorch")) failures.push(`${prefix}: missing official PyTorch reference`);
  const expectedNotebookSlugs = catalog.notebooks.filter((notebook) => notebook.chapter === lesson.chapter).map((notebook) => notebook.slug).sort();
  const mappedNotebookSlugs = (lesson.notebookLinks || []).map((mapping) => mapping.slug).sort();
  if (JSON.stringify(expectedNotebookSlugs) !== JSON.stringify(mappedNotebookSlugs)) failures.push(`${prefix}: notebook mappings must cover the chapter exactly`);
  for (const mapping of lesson.notebookLinks || []) {
    if (!mapping.reason) failures.push(`${prefix}: notebook mapping ${mapping.slug} needs a reason`);
    if (mapping.status === "historical" && !mapping.runtime) failures.push(`${prefix}: historical notebook ${mapping.slug} needs a runtime note`);
  }
}
for (const file of ["index.html", "404.html", ".nojekyll", "sitemap.xml", "robots.txt", "search.json", "audit.json", "assets/styles.css", "assets/app.js"]) {
  try { await access(path.join(dist, file)); } catch { failures.push(`Missing dist/${file}`); }
}
for (const chapter of catalog.chapters) {
  try { await access(path.join(dist, "chapters", String(chapter.number).padStart(2, "0"), "index.html")); } catch { failures.push(`Missing chapter ${chapter.number} page`); }
}
for (const notebook of catalog.notebooks) {
  const file = path.join(dist, "notebooks", notebook.slug, "index.html");
  try {
    const html = await readFile(file, "utf8");
    if (!html.includes(notebook.sourceUrl)) failures.push(`${notebook.slug}: reader lacks pinned source URL`);
    if (html.includes('"outputs"')) failures.push(`${notebook.slug}: notebook output payload leaked into the page`);
  } catch { failures.push(`Missing notebook page ${notebook.slug}`); }
}
const search = JSON.parse(await readFile(path.join(dist, "search.json"), "utf8"));
const expectedSearchRecords = expected.chapters + expected.notebooks + lessons.reduce((sum, lesson) => sum + lesson.sections.length, 0);
if (search.length !== expectedSearchRecords) failures.push(`Expected ${expectedSearchRecords} search records, found ${search.length}`);
const report = { checkedAt: new Date().toISOString(), expected, actual: { ...actual, reviewedLessons: lessons.length }, failures };
await writeFile(path.join(dist, "validation.json"), JSON.stringify(report, null, 2) + "\n");
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`Validated ${actual.chapters} chapters, ${lessons.length} reviewed lessons, ${actual.notebooks} notebooks, and ${actual.codeCells} explained code cells.`);
