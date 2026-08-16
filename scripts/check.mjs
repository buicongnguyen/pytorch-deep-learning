import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadChapterOverlays, loadDiagrams, loadSyntax, loadUi } from "./lib/i18n.mjs";
import { addPurposeComment, detectSyntaxKeys, syntaxRules, teachingCommentRules } from "./lib/code-teaching.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const catalog = JSON.parse(await readFile(path.join(root, "content", "catalog.json"), "utf8"));
const course = JSON.parse(await readFile(path.join(root, "content", "course.json"), "utf8"));
const lessonFiles = (await readdir(path.join(root, "content", "lessons"))).filter((file) => file.endsWith(".json")).sort();
const lessons = await Promise.all(lessonFiles.map(async (file) => JSON.parse(await readFile(path.join(root, "content", "lessons", file), "utf8"))));
const viOverlays = await loadChapterOverlays(root, "vi");
const enUi = await loadUi(root, "en");
const viUi = await loadUi(root, "vi");
const viTerminology = JSON.parse(await readFile(path.join(root, "content", "locales", "vi", "terminology.json"), "utf8"));
const enSyntax = await loadSyntax(root, "en");
const viSyntax = await loadSyntax(root, "vi");
const canonicalDiagrams = await loadDiagrams(root, "en");
const viDiagrams = await loadDiagrams(root, "vi");
const support = JSON.parse(await readFile(path.join(root, "content", "learning-support.json"), "utf8"));
const viSupport = JSON.parse(await readFile(path.join(root, "content", "locales", "vi", "learning-support.json"), "utf8"));
const setup = JSON.parse(await readFile(path.join(root, "content", "setup.json"), "utf8"));
const viSetup = JSON.parse(await readFile(path.join(root, "content", "locales", "vi", "setup.json"), "utf8"));
const sourceOnly = process.argv.includes("--source-only");
const failures = [];
const expected = { chapters: 17, reviewedLessons: 17, notebooks: 63, codeCells: 810, locales: 2 };
const actual = {
  chapters: catalog.chapters.length,
  reviewedLessons: lessons.length,
  notebooks: catalog.notebooks.length,
  codeCells: catalog.notebooks.reduce((sum, notebook) => sum + notebook.codeCellCount, 0),
  locales: course.locales?.length || 0
};
const siteBase = "/pytorch-deep-learning/";
const siteOrigin = "https://buicongnguyen.github.io";
const localePrefix = (locale) => course.locales?.find((item) => item.code === locale)?.pathPrefix ?? `${locale}/`;
const localizedRoute = (locale, logicalPath = "") => `${siteBase}${localePrefix(locale)}${logicalPath}`;
const localizedUrl = (locale, logicalPath = "") => new URL(localizedRoute(locale, logicalPath), siteOrigin).href;
for (const [key, value] of Object.entries(expected)) if (actual[key] !== value) failures.push(`Expected ${value} ${key}, found ${actual[key]}`);

const sameSet = (left, right) => JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
const isText = (value) => typeof value === "string" && value.trim() && !/TODO|�/.test(value);
const placeholders = (value) => [...String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
const preservedTokens = (value) => [...String(value).matchAll(/`[^`]+`|\b\d+(?:\.\d+)*\b|\b(?:torch|torchvision|nn|F|dist|model|optimizer|scaler|scheduler)\.[A-Za-z_][\w.]*(?:\(\))?|\b[A-Z][A-Za-z0-9_]*(?:Loss|Dataset|Loader|Program|Inductor|Mesh|DDP|FSDP2?)\b/g)].map((match) => match[0].replace(/[.,;:]+$/, "")).sort();
function requireText(value, label) {
  if (!isText(value)) failures.push(`${label}: missing or invalid Vietnamese text`);
}
function requireArrayParity(source, translated, label) {
  if (!Array.isArray(translated) || translated.length !== source.length) failures.push(`${label}: expected ${source.length} entries, found ${translated?.length ?? "none"}`);
}
function requireTranslation(source, translated, label) {
  requireText(translated, label);
  if (String(source).trim() === String(translated).trim() && String(source).trim().split(/\s+/).length >= 4) failures.push(`${label}: appears to be unlocalized English fallback`);
  const remaining = [...preservedTokens(translated)];
  const missing = preservedTokens(source).filter((token) => {
    const index = remaining.indexOf(token);
    if (index < 0) return true;
    remaining.splice(index, 1);
    return false;
  });
  if (missing.length) failures.push(`${label}: required identifiers or numeric tokens changed during translation (${missing.join(", ")})`);
}
function rejectInvariantCopies(value, label) {
  const forbidden = new Set(["source", "language", "url", "path", "sourceUrl", "githubUrl", "colabUrl", "status", "kind", "pytorchVersion", "reviewedAt", "minutes"]);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbidden.has(key)) failures.push(`${label}: localized overlay must not duplicate invariant field ${key}`);
    rejectInvariantCopies(child, `${label}.${key}`);
  }
}
function validateLocalizedHead(html, locale, logicalPath, label) {
  const expectations = [
    `<html lang="${locale}"`,
    `<link rel="canonical" href="${localizedUrl(locale, logicalPath)}">`,
    `<link rel="alternate" hreflang="en" href="${localizedUrl("en", logicalPath)}">`,
    `<link rel="alternate" hreflang="vi" href="${localizedUrl("vi", logicalPath)}">`,
    `<link rel="alternate" hreflang="x-default" href="${localizedUrl("en", logicalPath)}">`
  ];
  for (const expectation of expectations) if (!html.includes(expectation)) failures.push(`${label}: missing exact head markup ${expectation}`);
}

for (const notebook of catalog.notebooks) {
  if (notebook.cells.length !== notebook.codeCellCount) failures.push(`${notebook.path}: explanation count does not match code-cell count`);
  if (!notebook.sourceUrl.includes(catalog.upstream.commit)) failures.push(`${notebook.path}: source is not pinned to the audited commit`);
  for (const [field, allowedHosts] of Object.entries({ sourceUrl: ["raw.githubusercontent.com"], githubUrl: ["github.com"], colabUrl: ["colab.research.google.com"] })) {
    try {
      const url = new URL(notebook[field]);
      if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname)) failures.push(`${notebook.path}: ${field} must use HTTPS on ${allowedHosts.join(", ")}`);
    } catch { failures.push(`${notebook.path}: invalid ${field}`); }
  }
}
const lessonChapters = lessons.map((lesson) => lesson.chapter).sort((a, b) => a - b);
if (JSON.stringify(lessonChapters) !== JSON.stringify(course.reviewedChapters)) failures.push("course.reviewedChapters must exactly match the lesson files");
if (new Set(lessonChapters).size !== lessonChapters.length) failures.push("Each chapter may have only one lesson file");
if (JSON.stringify(lessonChapters) !== JSON.stringify(Array.from({ length: lessons.length }, (_, index) => index + 1))) failures.push("Reviewed lessons must form the contiguous chapter prefix 1..N");
if (course.upstreamCommit !== catalog.upstream.commit) failures.push("Course and notebook catalog must pin the same upstream commit");
if (course.defaultLocale !== "en" || !sameSet(course.locales?.map((item) => item.code) || [], ["en", "vi"])) failures.push("Course locales must define English as default plus Vietnamese");
if (course.locales?.some((item) => typeof item.pathPrefix !== "string" || (item.pathPrefix && !/^[a-z]{2}\/$/.test(item.pathPrefix)))) failures.push("Locale pathPrefix values must be empty or a two-letter path ending in /");
if (new Set(course.locales?.map((item) => item.pathPrefix)).size !== course.locales?.length) failures.push("Locale pathPrefix values must be unique");
for (const locale of ["en", "vi"]) if (!sameSet(course.reviewedLocales?.[locale] || [], lessonChapters)) failures.push(`reviewedLocales.${locale} must cover Chapters 1–17`);
if (!sameSet(Object.keys(enUi), Object.keys(viUi))) failures.push("English and Vietnamese UI dictionaries must have identical keys");
const uiConsumers = `${await readFile(path.join(root, "scripts", "build.mjs"), "utf8")}\n${await readFile(path.join(root, "src", "app.js"), "utf8")}`;
const requiredUiKeys = new Set([...uiConsumers.matchAll(/\bui\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((match) => match[1]));
for (const key of requiredUiKeys) if (!(key in enUi) || !(key in viUi)) failures.push(`Missing required localized UI key ${key}`);
for (const [key, value] of Object.entries(enUi)) requireText(value, `English UI ${key}`);
for (const [key, value] of Object.entries(viUi)) requireText(value, `Vietnamese UI ${key}`);
for (const key of Object.keys(enUi)) if (JSON.stringify(placeholders(enUi[key])) !== JSON.stringify(placeholders(viUi[key]))) failures.push(`UI placeholder mismatch for ${key}`);
const canonicalConcepts = new Set(catalog.notebooks.flatMap((notebook) => notebook.cells.flatMap((cell) => cell.concepts)));
const canonicalReferenceTypes = new Set(lessons.flatMap((lesson) => lesson.references.map((reference) => reference.type)));
if (!sameSet(canonicalConcepts, Object.keys(viTerminology.concepts || {}))) failures.push("Vietnamese terminology must cover the 24 canonical notebook concepts exactly");
if (!sameSet(canonicalReferenceTypes, Object.keys(viTerminology.referenceTypes || {}))) failures.push("Vietnamese terminology must cover the canonical reference types exactly");
for (const [key, value] of Object.entries(viTerminology.concepts || {})) requireText(value, `Vietnamese concept ${key}`);
for (const [key, value] of Object.entries(viTerminology.referenceTypes || {})) requireText(value, `Vietnamese reference type ${key}`);

const syntaxKeys = new Set(syntaxRules.map((rule) => rule.key));
if (!sameSet(syntaxKeys, Object.keys(enSyntax.entries || {}))) failures.push("English syntax guide must cover every detection rule exactly");
if (!sameSet(syntaxKeys, Object.keys(viSyntax.entries || {}))) failures.push("Vietnamese syntax guide must cover every detection rule exactly");
for (const field of ["heading", "intro", "officialReference", "purposeLabel"]) {
  requireText(enSyntax[field], `English syntax ${field}`);
  requireTranslation(enSyntax[field], viSyntax[field], `Vietnamese syntax ${field}`);
}
for (const key of syntaxKeys) {
  for (const field of ["title", "body"]) {
    requireText(enSyntax.entries?.[key]?.[field], `English syntax ${key} ${field}`);
    requireTranslation(enSyntax.entries?.[key]?.[field], viSyntax.entries?.[key]?.[field], `Vietnamese syntax ${key} ${field}`);
  }
}
if (!sameSet(teachingCommentRules.map((rule) => rule.key), Object.keys(enSyntax.comments || {}))) failures.push("English inline teaching comments must cover every insertion rule exactly");
if (!sameSet(teachingCommentRules.map((rule) => rule.key), Object.keys(viSyntax.comments || {}))) failures.push("Vietnamese inline teaching comments must cover every insertion rule exactly");
for (const rule of teachingCommentRules) {
  requireText(enSyntax.comments?.[rule.key], `English inline comment ${rule.key}`);
  requireTranslation(enSyntax.comments?.[rule.key], viSyntax.comments?.[rule.key], `Vietnamese inline comment ${rule.key}`);
}
for (const rule of syntaxRules) {
  try {
    const url = new URL(rule.url);
    if (url.protocol !== "https:" || !["docs.python.org", "docs.pytorch.org"].includes(url.hostname)) failures.push(`Syntax rule ${rule.key} must link to official Python or PyTorch HTTPS documentation`);
  } catch { failures.push(`Syntax rule ${rule.key} has an invalid reference URL`); }
}

if (canonicalDiagrams.diagrams?.length !== 15) failures.push(`Expected 15 targeted concept diagrams, found ${canonicalDiagrams.diagrams?.length ?? "none"}`);
if (canonicalDiagrams.diagrams.filter((diagram) => diagram.visual).length !== 9) failures.push("Expected 9 evidence-oriented data visuals");
if (support.tracks?.length !== 5) failures.push("Expected 5 goal-based learning tracks");
if (support.chapters?.length !== 17 || JSON.stringify(support.chapters.map((item) => item.chapter)) !== JSON.stringify(Array.from({ length: 17 }, (_, index) => index + 1))) failures.push("Learning support must cover Chapters 1–17 in order");
if (support.chapters?.some((item) => !item.level || item.time?.length !== 3 || !item.prerequisites?.length || item.checkpoints?.length !== 2)) failures.push("Every chapter needs level, prerequisites, a three-part time plan, and two checkpoints");
if (support.glossary?.length !== 25) failures.push("Expected 25 glossary terms");
if (viSupport.tracks?.length !== support.tracks.length || viSupport.chapters?.length !== support.chapters.length || viSupport.glossary?.length !== support.glossary.length) failures.push("Vietnamese learning support must preserve track, chapter, and glossary parity");
if (!/^\d{4}-\d{2}-\d{2}$/.test(setup.reviewedAt || "") || viSetup.reviewedAt !== setup.reviewedAt) failures.push("Setup guide needs one shared ISO review date");
for (const field of ["title", "shortTitle", "eyebrow", "summary"]) requireTranslation(setup[field], viSetup[field], `Vietnamese setup ${field}`);
requireArrayParity(setup.sections || [], viSetup.sections || [], "Vietnamese setup sections");
if (JSON.stringify(setup.sections?.map((section) => section.id)) !== JSON.stringify(viSetup.sections?.map((section) => section.id))) failures.push("Vietnamese setup section IDs and order must match English");
for (const [index, section] of (setup.sections || []).entries()) {
  const translated = viSetup.sections?.[index];
  for (const field of ["title", "summary"]) requireTranslation(section[field], translated?.[field], `Vietnamese setup ${section.id} ${field}`);
  requireArrayParity(section.body || [], translated?.body || [], `Vietnamese setup ${section.id} body`);
  for (const [bodyIndex, paragraph] of (section.body || []).entries()) requireTranslation(paragraph, translated?.body?.[bodyIndex], `Vietnamese setup ${section.id} paragraph ${bodyIndex + 1}`);
  requireArrayParity(section.commands || [], translated?.commands || [], `Vietnamese setup ${section.id} commands`);
  for (const [commandIndex, command] of (section.commands || []).entries()) {
    const translatedCommand = translated?.commands?.[commandIndex];
    requireTranslation(command.title, translatedCommand?.title, `Vietnamese setup ${section.id} command ${commandIndex + 1}`);
    if (command.language !== translatedCommand?.language || command.source !== translatedCommand?.source) failures.push(`Vietnamese setup ${section.id}: command source or language changed`);
  }
  if (section.callout) {
    requireTranslation(section.callout.title, translated?.callout?.title, `Vietnamese setup ${section.id} callout title`);
    requireTranslation(section.callout.body, translated?.callout?.body, `Vietnamese setup ${section.id} callout body`);
  }
  if (JSON.stringify(section.download?.path || null) !== JSON.stringify(translated?.download?.path || null)) failures.push(`Vietnamese setup ${section.id}: download path changed`);
  if (section.download) requireTranslation(section.download.label, translated?.download?.label, `Vietnamese setup ${section.id} download label`);
}
requireArrayParity(setup.references || [], viSetup.references || [], "Vietnamese setup references");
for (const [index, reference] of (setup.references || []).entries()) {
  requireTranslation(reference.title, viSetup.references?.[index]?.title, `Vietnamese setup reference ${index + 1}`);
  if (reference.url !== viSetup.references?.[index]?.url || !reference.url.startsWith("https://")) failures.push(`Setup reference ${index + 1}: URL must be unchanged HTTPS`);
}
for (const [index, item] of support.chapters.entries()) {
  const lesson = lessons.find((candidate) => candidate.chapter === item.chapter);
  for (const checkpoint of item.checkpoints) if (!lesson?.sections.some((section) => section.id === checkpoint.after)) failures.push(`Chapter ${item.chapter}: checkpoint target ${checkpoint.after} is missing`);
  if (viSupport.chapters[index]?.chapter !== item.chapter || viSupport.chapters[index]?.checkpoints?.length !== item.checkpoints.length) failures.push(`Vietnamese Chapter ${item.chapter}: learning-support parity differs`);
}
requireArrayParity(canonicalDiagrams.diagrams || [], viDiagrams.diagrams || [], "Vietnamese diagrams");
const diagramKeys = new Set();
for (const diagram of canonicalDiagrams.diagrams || []) {
  const key = `${diagram.chapter}.${diagram.section}`;
  if (diagramKeys.has(key)) failures.push(`Duplicate diagram ${key}`);
  diagramKeys.add(key);
  const lesson = lessons.find((item) => item.chapter === diagram.chapter);
  if (!lesson?.sections.some((section) => section.id === diagram.section)) failures.push(`Diagram ${key} targets an unknown lesson section`);
  if (!/^(?:flow|cycle|split|two-way|parallel)$/.test(diagram.kind || "")) failures.push(`Diagram ${key} has unsupported kind ${diagram.kind}`);
  requireText(diagram.title, `Diagram ${key} title`);
  requireText(diagram.caption, `Diagram ${key} caption`);
  if (!Array.isArray(diagram.stages) || diagram.stages.length < 3 || diagram.stages.length > 6) failures.push(`Diagram ${key} must contain 3–6 stages`);
  const translated = viDiagrams.diagrams?.find((item) => item.chapter === diagram.chapter && item.section === diagram.section);
  if (!translated) { failures.push(`Vietnamese diagram ${key} is missing`); continue; }
  if ("kind" in translated) failures.push(`Vietnamese diagram ${key} must not duplicate invariant kind`);
  requireTranslation(diagram.title, translated.title, `Vietnamese diagram ${key} title`);
  requireTranslation(diagram.caption, translated.caption, `Vietnamese diagram ${key} caption`);
  requireArrayParity(diagram.stages, translated.stages, `Vietnamese diagram ${key} stages`);
  for (const [index, stage] of diagram.stages.entries()) {
    requireTranslation(stage.label, translated.stages?.[index]?.label, `Vietnamese diagram ${key} stage ${index + 1} label`);
    if (/[A-Za-z]{2,}/.test(stage.detail)) {
      requireTranslation(stage.detail, translated.stages?.[index]?.detail, `Vietnamese diagram ${key} stage ${index + 1} detail`);
    } else if (stage.detail !== translated.stages?.[index]?.detail) {
      failures.push(`Vietnamese diagram ${key} stage ${index + 1}: symbolic tensor notation must remain exact`);
    }
  }
}

const reservedSectionIds = new Set(["learning-outcomes", "version-review", "guided-notebooks", "exercises", "references"]);
let lessonCodeBlocks = 0;
const teachingRuleUsage = new Map(teachingCommentRules.map((rule) => [rule.key, 0]));
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
    if (section.code) {
      lessonCodeBlocks += 1;
      const keys = detectSyntaxKeys(section.code.source);
      if (!keys.length || keys.some((key) => !syntaxKeys.has(key))) failures.push(`${prefix}: code block ${section.id} lacks a valid syntax guide`);
      const annotated = addPurposeComment(section.code.source, section.summary, section.code.language, enSyntax.purposeLabel, enSyntax.comments);
      if (section.code.language === "python" && !annotated.startsWith("# Purpose:")) failures.push(`${prefix}: code block ${section.id} lacks its purpose comment`);
      for (const rule of teachingCommentRules) {
        const matches = section.code.source.split("\n").filter((line) => rule.test.test(line)).length;
        if (matches) teachingRuleUsage.set(rule.key, teachingRuleUsage.get(rule.key) + matches);
      }
    }
    const pythonSource = section.code?.language === "python" ? section.code.source : "";
    const pythonBody = pythonSource.replace(/^\s*(?:from\s+torch(?:\.[A-Za-z_][\w.]*)?\s+import\s+.+|import\s+torch\.[A-Za-z_][\w.]*(?:\s+as\s+[A-Za-z_]\w*)?)\s*$/gm, "");
    if (pythonSource && /(?:\.data\b|pretrained\s*=\s*True|torch\.cuda\.amp|torch\.jit\.)/.test(pythonBody)) failures.push(`${prefix}: deprecated API in current Python example ${section.id}`);
    if (/\btorch\./.test(pythonBody) && !/(?:^|\n)\s*import torch(?:\s|$)/m.test(pythonSource)) failures.push(`${prefix}: Python example ${section.id} uses torch without importing it`);
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
if (lessonCodeBlocks !== 94) failures.push(`Expected 94 lesson code blocks with teaching guides, found ${lessonCodeBlocks}`);
for (const [key, count] of teachingRuleUsage) if (!count) failures.push(`Inline teaching-comment rule ${key} is not exercised by any lesson example`);

if (viOverlays.length !== 17) failures.push(`Expected 17 Vietnamese chapter overlays, found ${viOverlays.length}`);
const overlayChapters = viOverlays.map((overlay) => overlay.chapter?.number).sort((a, b) => a - b);
if (JSON.stringify(overlayChapters) !== JSON.stringify(lessonChapters)) failures.push("Vietnamese overlays must cover Chapters 1–17 exactly");
let localizedCells = 0;
for (const overlay of viOverlays) {
  const chapterNumber = overlay.chapter?.number;
  const chapter = catalog.chapters.find((item) => item.number === chapterNumber);
  const lesson = lessons.find((item) => item.chapter === chapterNumber);
  const label = `Vietnamese Chapter ${chapterNumber}`;
  rejectInvariantCopies(overlay, label);
  if (!chapter || !lesson) { failures.push(`${label}: unknown chapter`); continue; }
  requireTranslation(chapter.title, overlay.chapter.title, `${label} title`);
  requireTranslation(chapter.summary, overlay.chapter.summary, `${label} summary`);
  if (overlay.lesson?.chapter !== chapterNumber) failures.push(`${label}: lesson chapter number mismatch`);
  requireArrayParity(lesson.outcomes, overlay.lesson?.outcomes, `${label} outcomes`);
  for (const [index, outcome] of (overlay.lesson?.outcomes || []).entries()) requireTranslation(lesson.outcomes[index], outcome, `${label} outcome ${index + 1}`);
  requireArrayParity(lesson.sections, overlay.lesson?.sections, `${label} sections`);
  if (JSON.stringify(lesson.sections.map((section) => section.id)) !== JSON.stringify((overlay.lesson?.sections || []).map((section) => section.id))) failures.push(`${label}: section order differs from English`);
  for (const sourceSection of lesson.sections) {
    const translated = overlay.lesson?.sections?.find((section) => section.id === sourceSection.id);
    if (!translated) { failures.push(`${label}: missing section ${sourceSection.id}`); continue; }
    requireTranslation(sourceSection.title, translated.title, `${label} ${sourceSection.id} title`);
    requireTranslation(sourceSection.summary, translated.summary, `${label} ${sourceSection.id} summary`);
    requireArrayParity(sourceSection.body, translated.body, `${label} ${sourceSection.id} body`);
    requireArrayParity(sourceSection.points || [], translated.points || [], `${label} ${sourceSection.id} points`);
    requireArrayParity(sourceSection.callouts || [], translated.callouts || [], `${label} ${sourceSection.id} callouts`);
    for (const [index, text] of (translated.body || []).entries()) requireTranslation(sourceSection.body[index], text, `${label} ${sourceSection.id} body ${index + 1}`);
    for (const [index, text] of (translated.points || []).entries()) requireTranslation(sourceSection.points[index], text, `${label} ${sourceSection.id} point ${index + 1}`);
    if (sourceSection.code) {
      if (!translated.code || !sameSet(Object.keys(translated.code), ["title"])) failures.push(`${label} ${sourceSection.id}: code overlay must contain title only`);
      requireTranslation(sourceSection.code.title, translated.code?.title, `${label} ${sourceSection.id} code title`);
    } else if (translated.code) failures.push(`${label} ${sourceSection.id}: unexpected code overlay`);
    for (const [index, callout] of (translated.callouts || []).entries()) {
      requireTranslation(sourceSection.callouts[index].title, callout.title, `${label} ${sourceSection.id} callout ${index + 1} title`);
      requireTranslation(sourceSection.callouts[index].body, callout.body, `${label} ${sourceSection.id} callout ${index + 1} body`);
    }
  }
  requireArrayParity(lesson.modern, overlay.lesson?.modern, `${label} modern notes`);
  for (const [index, item] of (overlay.lesson?.modern || []).entries()) for (const field of ["topic", "book", "current", "reason"]) requireTranslation(lesson.modern[index][field], item[field], `${label} modern ${index + 1} ${field}`);
  requireArrayParity(lesson.notebookLinks, overlay.lesson?.notebookLinks, `${label} notebook links`);
  if (!sameSet(lesson.notebookLinks.map((item) => item.slug), (overlay.lesson?.notebookLinks || []).map((item) => item.slug))) failures.push(`${label}: notebook link slugs differ from English`);
  if (JSON.stringify(lesson.notebookLinks.map((item) => item.slug)) !== JSON.stringify((overlay.lesson?.notebookLinks || []).map((item) => item.slug))) failures.push(`${label}: notebook link order differs from English`);
  for (const sourceItem of lesson.notebookLinks) {
    const item = overlay.lesson?.notebookLinks?.find((candidate) => candidate.slug === sourceItem.slug);
    if (!item) continue;
    requireTranslation(sourceItem.reason, item.reason, `${label} notebook reason ${item.slug}`);
    if (sourceItem.runtime) requireTranslation(sourceItem.runtime, item.runtime, `${label} notebook runtime ${item.slug}`);
  }
  requireArrayParity(lesson.exercises, overlay.lesson?.exercises, `${label} exercises`);
  for (const [index, item] of (overlay.lesson?.exercises || []).entries()) for (const field of ["title", "prompt", "success"]) requireTranslation(lesson.exercises[index][field], item[field], `${label} exercise ${index + 1} ${field}`);
  requireArrayParity(lesson.references, overlay.lesson?.references, `${label} references`);
  for (const [index, item] of (overlay.lesson?.references || []).entries()) for (const field of ["type", "title"]) requireTranslation(lesson.references[index][field], item[field], `${label} reference ${index + 1} ${field}`);
  const sourceNotebooks = catalog.notebooks.filter((notebook) => notebook.chapter === chapterNumber);
  requireArrayParity(sourceNotebooks, overlay.notebooks, `${label} notebooks`);
  if (!sameSet(sourceNotebooks.map((item) => item.slug), (overlay.notebooks || []).map((item) => item.slug))) failures.push(`${label}: notebook overlay slugs differ from catalog`);
  if (JSON.stringify(sourceNotebooks.map((item) => item.slug)) !== JSON.stringify((overlay.notebooks || []).map((item) => item.slug))) failures.push(`${label}: notebook overlay order differs from catalog`);
  for (const sourceNotebook of sourceNotebooks) {
    const translated = overlay.notebooks?.find((item) => item.slug === sourceNotebook.slug);
    if (!translated) continue;
    requireTranslation(sourceNotebook.title, translated.title, `${label} notebook ${sourceNotebook.slug} title`);
    requireTranslation(sourceNotebook.summary, translated.summary, `${label} notebook ${sourceNotebook.slug} summary`);
    requireArrayParity(sourceNotebook.cells, translated.cells, `${label} notebook ${sourceNotebook.slug} cells`);
    if (!sameSet(sourceNotebook.cells.map((cell) => String(cell.number)), (translated.cells || []).map((cell) => String(cell.number)))) failures.push(`${label} notebook ${sourceNotebook.slug}: cell numbers differ`);
    if (JSON.stringify(sourceNotebook.cells.map((cell) => cell.number)) !== JSON.stringify((translated.cells || []).map((cell) => cell.number))) failures.push(`${label} notebook ${sourceNotebook.slug}: cell order differs`);
    for (const sourceCell of sourceNotebook.cells) {
      const translatedCell = translated.cells?.find((cell) => cell.number === sourceCell.number);
      if (!translatedCell) continue;
      requireArrayParity(sourceCell.concepts, translatedCell.concepts, `${label} ${sourceNotebook.slug} cell ${sourceCell.number} concepts`);
      for (const [index, concept] of (translatedCell.concepts || []).entries()) requireText(concept, `${label} ${sourceNotebook.slug} cell ${sourceCell.number} concept ${index + 1}`);
      requireTranslation(sourceCell.explanation, translatedCell.explanation, `${label} ${sourceNotebook.slug} cell ${sourceCell.number} explanation`);
      localizedCells += 1;
    }
  }
}
if (localizedCells !== 810) failures.push(`Expected 810 Vietnamese notebook explanations, found ${localizedCells}`);

if (sourceOnly) {
  if (failures.length) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }
  console.log(`Source preflight passed for ${lessons.length} English and ${viOverlays.length} Vietnamese chapters with ${localizedCells} localized cells.`);
  process.exit(0);
}

for (const file of ["index.html", "setup/index.html", "404.html", ".nojekyll", "sitemap.xml", "robots.txt", "search.json", `${localePrefix("vi")}index.html`, `${localePrefix("vi")}setup/index.html`, `${localePrefix("vi")}search.json`, "downloads/verify-environment.py", "audit.json", "manifest.webmanifest", "service-worker.js", "assets/styles.css", "assets/app.js"]) {
  try { await access(path.join(dist, file)); } catch { failures.push(`Missing dist/${file}`); }
}
try {
  const audit = JSON.parse(await readFile(path.join(dist, "audit.json"), "utf8"));
  const featureCounts = { lessonCodeBlocks: 94, learningTracks: 5, learningCheckpoints: 34, glossaryTerms: 25, diagrams: 15, dataVisuals: 9, chapterRunners: 17, setupGuides: 1 };
  for (const [key, value] of Object.entries(featureCounts)) if (audit[key] !== value) failures.push(`Audit expected ${key}=${value}, found ${audit[key]}`);
} catch (error) { failures.push(`Invalid dist/audit.json: ${error.message}`); }
try {
  const manifest = JSON.parse(await readFile(path.join(dist, "manifest.webmanifest"), "utf8"));
  if (manifest.start_url !== siteBase || manifest.scope !== siteBase || manifest.display !== "standalone") failures.push("Web manifest must preserve the GitHub Pages scope and standalone display");
  const worker = await readFile(path.join(dist, "service-worker.js"), "utf8");
  new Function(worker);
  if (!worker.includes("event.request.mode === \"navigate\"")) failures.push("Offline fallback must be restricted to navigation requests");
} catch (error) { failures.push(`Invalid offline application artifact: ${error.message}`); }
for (const chapter of catalog.chapters) {
  const runner = path.join(dist, "downloads", `chapter-${String(chapter.number).padStart(2, "0")}.py`);
  try {
    const source = await readFile(runner, "utf8");
    if (!source.includes("EXAMPLES = {") || !source.includes("# Purpose:")) failures.push(`Chapter ${chapter.number}: generated runner lacks registry or purpose comments`);
  } catch { failures.push(`Chapter ${chapter.number}: missing generated Python runner`); }
}
for (const locale of ["en", "vi"]) {
  const localeRoot = path.join(dist, localePrefix(locale));
  try {
    const html = await readFile(path.join(localeRoot, "index.html"), "utf8");
    validateLocalizedHead(html, locale, "", `${locale} landing page`);
  } catch { failures.push(`Missing ${locale} landing page`); }
  try {
    const html = await readFile(path.join(localeRoot, "setup", "index.html"), "utf8");
    validateLocalizedHead(html, locale, "setup/", `${locale} setup page`);
    if ((html.match(/class="lesson-code setup-command"/g) || []).length !== setup.sections.reduce((sum, section) => sum + section.commands.length, 0)) failures.push(`${locale} setup page: command count differs`);
    if (!html.includes("downloads/verify-environment.py")) failures.push(`${locale} setup page: environment-test download is missing`);
  } catch { failures.push(`Missing ${locale} setup page`); }
  for (const chapter of catalog.chapters) {
    const file = path.join(localeRoot, "chapters", String(chapter.number).padStart(2, "0"), "index.html");
    try {
      const html = await readFile(file, "utf8");
      validateLocalizedHead(html, locale, `chapters/${String(chapter.number).padStart(2, "0")}/`, `${locale} Chapter ${chapter.number}`);
      const lesson = lessons.find((item) => item.chapter === chapter.number);
      const expectedGuides = lesson.sections.filter((section) => section.code).length;
      if ((html.match(/class="syntax-guide"/g) || []).length !== expectedGuides) failures.push(`${locale} Chapter ${chapter.number}: expected ${expectedGuides} rendered syntax guides`);
      if ((html.match(/class="expected-result"/g) || []).length !== expectedGuides) failures.push(`${locale} Chapter ${chapter.number}: expected ${expectedGuides} result guides`);
      if ((html.match(/class="learning-checkpoint"/g) || []).length !== 2) failures.push(`${locale} Chapter ${chapter.number}: expected two learning checkpoints`);
      const purposeMarker = locale === "en" ? "# Purpose:" : "# Mục đích:";
      if ((html.match(new RegExp(purposeMarker, "g")) || []).length !== expectedGuides) failures.push(`${locale} Chapter ${chapter.number}: localized purpose comments are missing or incorrect`);
      const expectedDiagrams = canonicalDiagrams.diagrams.filter((diagram) => diagram.chapter === chapter.number).length;
      if ((html.match(/class="concept-diagram /g) || []).length !== expectedDiagrams) failures.push(`${locale} Chapter ${chapter.number}: expected ${expectedDiagrams} rendered concept diagrams`);
    } catch { failures.push(`Missing ${locale} chapter ${chapter.number} page`); }
  }
  for (const notebook of catalog.notebooks) {
    const file = path.join(localeRoot, "notebooks", notebook.slug, "index.html");
    try {
      const html = await readFile(file, "utf8");
      if (!html.includes(notebook.sourceUrl)) failures.push(`${locale} ${notebook.slug}: reader lacks pinned source URL`);
      if (html.includes('"outputs"')) failures.push(`${locale} ${notebook.slug}: notebook output payload leaked into the page`);
      validateLocalizedHead(html, locale, `notebooks/${notebook.slug}/`, `${locale} ${notebook.slug}`);
    } catch { failures.push(`Missing ${locale} notebook page ${notebook.slug}`); }
  }
}
const expectedSearchRecords = 1 + expected.chapters + expected.notebooks + lessons.reduce((sum, lesson) => sum + lesson.sections.length, 0) + support.glossary.length + Object.keys(enSyntax.entries).length;
const enSearch = JSON.parse(await readFile(path.join(dist, "search.json"), "utf8"));
const viSearch = JSON.parse(await readFile(path.join(dist, localePrefix("vi"), "search.json"), "utf8"));
if (enSearch.length !== expectedSearchRecords) failures.push(`Expected ${expectedSearchRecords} English search records, found ${enSearch.length}`);
if (viSearch.length !== expectedSearchRecords) failures.push(`Expected ${expectedSearchRecords} Vietnamese search records, found ${viSearch.length}`);
if (viSearch.some((item) => !item.url.startsWith(localizedRoute("vi")))) failures.push("Vietnamese search contains an English internal route");
const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
if ((sitemap.match(/<url>/g) || []).length !== 166) failures.push("Sitemap must contain 83 route pairs (166 URLs)");
if ((sitemap.match(/hreflang="vi"/g) || []).length !== 166) failures.push("Every sitemap URL needs a Vietnamese alternate");
const logicalRoutes = ["", "setup/", "glossary/", ...catalog.chapters.map((chapter) => `chapters/${String(chapter.number).padStart(2, "0")}/`), ...catalog.notebooks.map((notebook) => `notebooks/${notebook.slug}/`)];
const expectedSitemapLocations = logicalRoutes.flatMap((logicalPath) => [localizedUrl("en", logicalPath), localizedUrl("vi", logicalPath)]).sort();
const actualSitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).sort();
if (JSON.stringify(actualSitemapLocations) !== JSON.stringify(expectedSitemapLocations)) failures.push("Sitemap locations do not exactly match the 83 English/Vietnamese route pairs");

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(file);
    return entry.isFile() && entry.name.endsWith(".html") ? [file] : [];
  }));
  return nested.flat();
}
const generatedHtml = await htmlFiles(dist);
const htmlCache = new Map();
for (const sourceFile of generatedHtml) {
  const html = await readFile(sourceFile, "utf8");
  htmlCache.set(sourceFile, html);
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:|javascript:)/.test(href)) continue;
    const [pathPart, fragment = ""] = href.split("#", 2);
    let targetFile = sourceFile;
    if (pathPart) {
      const cleanPath = pathPart.split("?", 1)[0];
      if (!cleanPath.startsWith(siteBase)) { failures.push(`${path.relative(dist, sourceFile)}: internal link escapes the site base: ${href}`); continue; }
      const relativeTarget = cleanPath.slice(siteBase.length);
      targetFile = path.join(dist, relativeTarget, cleanPath.endsWith("/") ? "index.html" : "");
    }
    try {
      await access(targetFile);
      if (fragment) {
        const targetHtml = htmlCache.get(targetFile) || await readFile(targetFile, "utf8");
        htmlCache.set(targetFile, targetHtml);
        const decoded = decodeURIComponent(fragment);
        if (!targetHtml.includes(`id="${decoded}"`)) failures.push(`${path.relative(dist, sourceFile)}: missing fragment target ${href}`);
      }
    } catch { failures.push(`${path.relative(dist, sourceFile)}: broken internal link ${href}`); }
  }
}

const report = { checkedAt: new Date().toISOString(), expected, actual: { ...actual, localizedCells }, failures };
await writeFile(path.join(dist, "validation.json"), JSON.stringify(report, null, 2) + "\n");
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`Validated ${actual.chapters} chapters, ${lessons.length} reviewed lessons, ${actual.notebooks} notebooks, ${actual.codeCells} explained code cells, and ${localizedCells} Vietnamese explanations.`);
