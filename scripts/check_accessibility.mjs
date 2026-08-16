import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const failures = [];
let checked = 0;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(target);
    return entry.isFile() && entry.name.endsWith(".html") ? [target] : [];
  }));
  return groups.flat();
}

for (const file of await htmlFiles(dist)) {
  checked += 1;
  const html = await readFile(file, "utf8");
  const label = path.relative(dist, file);
  if (!/<html lang="(?:en|vi)"/.test(html)) failures.push(`${label}: missing supported document language`);
  if (!/<a class="skip-link" href="#main">/.test(html) || !/<main id="main"/.test(html)) failures.push(`${label}: skip link and main landmark must agree`);
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${label}: missing page title`);
  for (const match of html.matchAll(/<button\b([^>]*)>/g)) if (!/\btype="button"|\btype="submit"/.test(match[1])) failures.push(`${label}: button lacks an explicit type`);
  for (const match of html.matchAll(/<figure\b[\s\S]*?<\/figure>/g)) if (!/<figcaption>/.test(match[0])) failures.push(`${label}: figure lacks a text alternative in figcaption`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  if (new Set(ids).size !== ids.length) failures.push(`${label}: duplicate id attribute`);
  for (const match of html.matchAll(/<details\b[\s\S]*?<\/details>/g)) if (!/<summary>/.test(match[0])) failures.push(`${label}: details disclosure lacks summary`);
  for (const match of html.matchAll(/<input\b([^>]*)>/g)) {
    const attributes = match[1];
    if (/type="checkbox"/.test(attributes)) continue;
    const id = attributes.match(/\bid="([^"]+)"/)?.[1];
    if (!id || !html.includes(`for="${id}"`)) failures.push(`${label}: input is not associated with a label`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log(`Accessibility preflight passed for ${checked} generated HTML pages.`);
