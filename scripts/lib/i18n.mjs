import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export function formatMessage(template, values = {}) {
  return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => values[key] ?? `{${key}}`);
}

export async function loadUi(root, locale) {
  return readJson(path.join(root, "content", "locales", locale, "ui.json"));
}

export async function loadChapterOverlays(root, locale) {
  const directory = path.join(root, "content", "locales", locale, "chapters");
  const files = (await readdir(directory)).filter((file) => /^chapter-\d{2}\.json$/.test(file)).sort();
  return Promise.all(files.map((file) => readJson(path.join(directory, file))));
}

function localizedBy(items, key, value) {
  return items?.find((item) => item?.[key] === value);
}

export function mergeLesson(source, overlay, terminology = {}) {
  if (!overlay) throw new Error(`Missing localized lesson overlay for Chapter ${source.chapter}`);
  return {
    ...source,
    outcomes: overlay.outcomes,
    sections: source.sections.map((section, index) => {
      const localized = localizedBy(overlay.sections, "id", section.id) || overlay.sections?.[index];
      return {
        ...section,
        title: localized.title,
        summary: localized.summary,
        body: localized.body,
        points: localized.points,
        code: section.code ? { ...section.code, title: localized.code?.title } : undefined,
        callouts: (section.callouts || []).map((callout, calloutIndex) => ({
          ...callout,
          ...localized.callouts[calloutIndex]
        }))
      };
    }),
    modern: source.modern.map((item, index) => ({ ...item, ...overlay.modern[index] })),
    notebookLinks: source.notebookLinks.map((item, index) => {
      const localized = localizedBy(overlay.notebookLinks, "slug", item.slug) || overlay.notebookLinks[index];
      return { ...item, reason: localized.reason, ...(localized.runtime ? { runtime: localized.runtime } : {}) };
    }),
    exercises: source.exercises.map((item, index) => ({ ...item, ...overlay.exercises[index] })),
    references: source.references.map((item, index) => ({
      ...item,
      ...overlay.references[index],
      type: terminology.referenceTypes?.[item.type] || overlay.references[index].type,
      url: item.url
    }))
  };
}

export function localizeCatalog(sourceCatalog, overlays, terminology = {}) {
  const overlayByChapter = new Map(overlays.map((overlay) => [overlay.chapter.number, overlay]));
  return {
    ...sourceCatalog,
    chapters: sourceCatalog.chapters.map((chapter) => {
      const localized = overlayByChapter.get(chapter.number)?.chapter;
      if (!localized) throw new Error(`Missing localized chapter metadata for Chapter ${chapter.number}`);
      return { ...chapter, title: localized.title, summary: localized.summary };
    }),
    notebooks: sourceCatalog.notebooks.map((notebook) => {
      const localized = localizedBy(overlayByChapter.get(notebook.chapter)?.notebooks, "slug", notebook.slug);
      if (!localized) throw new Error(`Missing localized notebook metadata for ${notebook.slug}`);
      return {
        ...notebook,
        title: localized.title,
        summary: localized.summary,
        cells: notebook.cells.map((cell, index) => {
          const localizedCell = localizedBy(localized.cells, "number", cell.number) || localized.cells?.[index];
          if (!localizedCell) throw new Error(`Missing localized explanation for ${notebook.slug} cell ${cell.number}`);
          return { ...cell, concepts: cell.concepts.map((concept) => terminology.concepts?.[concept] || concept), explanation: localizedCell.explanation };
        })
      };
    })
  };
}

export function localizeLessons(sourceLessons, overlays, terminology = {}) {
  const overlayByChapter = new Map(overlays.map((overlay) => [overlay.lesson.chapter, overlay.lesson]));
  return sourceLessons.map((lesson) => mergeLesson(lesson, overlayByChapter.get(lesson.chapter), terminology));
}
