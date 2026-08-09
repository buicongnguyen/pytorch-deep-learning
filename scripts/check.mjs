import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const catalog = JSON.parse(await readFile(path.join(root, "content", "catalog.json"), "utf8"));
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
if (search.length !== expected.chapters + expected.notebooks) failures.push(`Expected 80 search records, found ${search.length}`);
const report = { checkedAt: new Date().toISOString(), expected, actual, failures };
await writeFile(path.join(dist, "validation.json"), JSON.stringify(report, null, 2) + "\n");
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`Validated ${actual.chapters} chapters, ${actual.notebooks} notebooks, and ${actual.codeCells} explained code cells.`);
