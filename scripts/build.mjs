import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatMessage, loadChapterOverlays, loadDiagrams, loadSyntax, loadUi, localizeCatalog, localizeDiagrams, localizeLessons } from "./lib/i18n.mjs";
import { addPurposeComment, detectSyntaxKeys, syntaxRuleByKey } from "./lib/code-teaching.mjs";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const canonicalCatalog = JSON.parse(await readFile(path.join(root, "content", "catalog.json"), "utf8"));
const course = JSON.parse(await readFile(path.join(root, "content", "course.json"), "utf8"));
const lessonDirectory = path.join(root, "content", "lessons");
const lessonFiles = (await readdir(lessonDirectory)).filter((file) => file.endsWith(".json")).sort();
const canonicalLessons = await Promise.all(lessonFiles.map(async (file) => JSON.parse(await readFile(path.join(lessonDirectory, file), "utf8"))));
const viOverlays = await loadChapterOverlays(root, "vi");
const viTerminology = JSON.parse(await readFile(path.join(root, "content", "locales", "vi", "terminology.json"), "utf8"));
const canonicalDiagrams = await loadDiagrams(root, "en");
const viDiagramOverlay = await loadDiagrams(root, "vi");
const localeConfig = new Map(course.locales.map((locale) => [locale.code, locale]));
const siteBase = "/pytorch-deep-learning/";
const siteOrigin = "https://buicongnguyen.github.io";

const locales = [
  {
    ...localeConfig.get("en"),
    ui: await loadUi(root, "en"),
    syntax: await loadSyntax(root, "en"),
    diagrams: canonicalDiagrams.diagrams,
    catalog: canonicalCatalog,
    lessons: canonicalLessons
  },
  {
    ...localeConfig.get("vi"),
    ui: await loadUi(root, "vi"),
    syntax: await loadSyntax(root, "vi"),
    diagrams: localizeDiagrams(canonicalDiagrams, viDiagramOverlay).diagrams,
    catalog: localizeCatalog(canonicalCatalog, viOverlays, viTerminology),
    lessons: localizeLessons(canonicalLessons, viOverlays, viTerminology)
  }
];
for (const locale of locales) locale.lessonByChapter = new Map(locale.lessons.map((lesson) => [lesson.chapter, lesson]));

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const chapterLabel = (number) => String(number).padStart(2, "0");
const chapterPath = (number) => `chapters/${chapterLabel(number)}/`;
const notebookPath = (notebook) => `notebooks/${notebook.slug}/`;
const route = (locale, logicalPath = "") => `${siteBase}${localeConfig.get(locale)?.pathPrefix ?? `${locale}/`}${logicalPath}`;
const absoluteUrl = (locale, logicalPath = "") => new URL(route(locale, logicalPath), siteOrigin).href;
const localizedRuntime = (locale, value) => locale.code === "vi" && value === "PyTorch 2.12 or earlier" ? "PyTorch 2.12 trở xuống" : value;

function chapterNav(locale, activeChapter) {
  return locale.catalog.chapters.map((chapter) => `
    <a class="chapter-nav-link${chapter.number === activeChapter ? " active" : ""}" href="${route(locale.code, chapterPath(chapter.number))}">
      <span>${chapterLabel(chapter.number)}</span><strong>${escapeHtml(chapter.title)}</strong>${locale.lessonByChapter.has(chapter.number) ? `<small>${escapeHtml(locale.ui.course)}</small>` : ""}
    </a>`).join("");
}

function layout(locale, { title, description, body, activeChapter = 0, logicalPath = "", pageClass = "", noindex = false }) {
  const ui = locale.ui;
  const fullTitle = title === ui.siteName ? title : `${title} · ${ui.titleSuffix}`;
  const alternateLocale = locales.find((candidate) => candidate.code !== locale.code);
  const alternateLabel = alternateLocale.nativeLabel;
  return `<!doctype html>
<html lang="${locale.code}" data-theme="dark" data-base="${siteBase}" data-locale="${locale.code}" data-search-url="${route(locale.code, "search.json")}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#071312">
  ${noindex ? '<meta name="robots" content="noindex">' : ""}
  <link rel="canonical" href="${absoluteUrl(locale.code, logicalPath)}">
  ${noindex ? "" : `<link rel="alternate" hreflang="en" href="${absoluteUrl("en", logicalPath)}">
  <link rel="alternate" hreflang="vi" href="${absoluteUrl("vi", logicalPath)}">
  <link rel="alternate" hreflang="x-default" href="${absoluteUrl("en", logicalPath)}">`}
  <link rel="stylesheet" href="${siteBase}assets/styles.css?v=5">
  <title>${escapeHtml(fullTitle)}</title>
</head>
<body class="${pageClass}">
  <a class="skip-link" href="#main">${escapeHtml(ui.skipToContent)}</a>
  <header class="site-header">
    <button class="icon-button nav-toggle" type="button" aria-label="${escapeHtml(ui.toggleChapterNavigation)}" aria-expanded="false">☰</button>
    <a class="brand" href="${route(locale.code)}"><span class="brand-mark">π</span><span><strong>PyTorch Atlas</strong><small>${escapeHtml(ui.brandTagline)}</small></span></a>
    <div class="header-actions">
      ${noindex ? "" : `<a class="language-switch" href="${route(alternateLocale.code, logicalPath)}" lang="${alternateLocale.code}" hreflang="${alternateLocale.code}" aria-label="${escapeHtml(formatMessage(ui.switchLanguage, { language: alternateLabel }))}"><span>${escapeHtml(alternateLabel)}</span><b>${alternateLocale.code.toUpperCase()}</b></a>`}
      <button class="search-trigger" type="button" aria-label="${escapeHtml(ui.searchAtlas)}"><span>${escapeHtml(ui.searchTrigger)}</span><kbd>/</kbd></button>
      <button class="icon-button theme-toggle" type="button" aria-label="${escapeHtml(ui.switchToLightTheme)}">◐</button>
      <a class="github-link" href="https://github.com/buicongnguyen/pytorch-deep-learning">${escapeHtml(ui.github)}</a>
    </div>
  </header>
  <div class="site-shell">
    <aside class="sidebar" aria-label="${escapeHtml(ui.toggleChapterNavigation)}">
      <div class="sidebar-heading"><span>${escapeHtml(ui.learningPath)}</span><b>${escapeHtml(formatMessage(ui.reviewedCount, { count: locale.lessons.length }))}</b></div>
      <nav>${chapterNav(locale, activeChapter)}</nav>
      <div class="sidebar-source"><span>${escapeHtml(ui.sourceSnapshot)}</span><code>${locale.catalog.upstream.commit.slice(0, 9)}</code></div>
    </aside>
    <main id="main" class="main-content">${body}</main>
  </div>
  <dialog class="search-dialog" aria-label="${escapeHtml(ui.searchAtlas)}">
    <form method="dialog" class="search-bar"><label for="site-search">${escapeHtml(ui.searchAtlas)}</label><button aria-label="${escapeHtml(ui.closeSearch)}">×</button></form>
    <input id="site-search" type="search" autocomplete="off" placeholder="${escapeHtml(ui.searchPlaceholder)}">
    <div class="search-results" aria-live="polite"></div>
  </dialog>
  <script id="runtime-i18n" type="application/json">${safeJson(ui)}</script>
  <script type="module" src="${siteBase}assets/app.js?v=5"></script>
</body>
</html>`;
}

function stat(value, label) {
  return `<li><strong>${value}</strong><span>${escapeHtml(label)}</span></li>`;
}

function lessonCode(locale, section) {
  const code = section.code;
  if (!code) return "";
  const source = addPurposeComment(code.source, section.summary, code.language || "python", locale.syntax.purposeLabel, locale.syntax.comments);
  const syntaxItems = detectSyntaxKeys(code.source).map((key) => {
    const rule = syntaxRuleByKey.get(key);
    const copy = locale.syntax.entries[key];
    if (!rule || !copy) return "";
    return `<li><div><code>${escapeHtml(copy.title)}</code><p>${escapeHtml(copy.body)}</p></div><a href="${escapeHtml(rule.url)}">${escapeHtml(locale.syntax.officialReference)}</a></li>`;
  }).join("");
  return `<div class="lesson-code">
    <header><span>${escapeHtml(code.title || locale.ui.tryIt)}</span><button class="lesson-copy" type="button">${escapeHtml(locale.ui.copyCode)}</button></header>
    <pre><code class="language-${escapeHtml(code.language || "python")}">${escapeHtml(source)}</code></pre>
  </div>
  <aside class="syntax-guide">
    <header><span>⌘</span><div><h3>${escapeHtml(locale.syntax.heading)}</h3><p>${escapeHtml(locale.syntax.intro)}</p></div></header>
    <ul>${syntaxItems}</ul>
  </aside>`;
}

function lessonCallouts(callouts = []) {
  return callouts.map((callout) => `<aside class="lesson-callout ${escapeHtml(callout.kind || "note")}">
    <strong>${escapeHtml(callout.title)}</strong><p>${escapeHtml(callout.body)}</p>
  </aside>`).join("");
}

function conceptDiagram(locale, diagram) {
  if (!diagram) return "";
  const arrow = diagram.kind === "two-way" || diagram.kind === "parallel" ? "⇄" : "→";
  const stages = diagram.stages.map((stage, index) => `${index ? `<i class="diagram-arrow" aria-hidden="true">${arrow}</i>` : ""}<div class="diagram-node"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(stage.label)}</strong><small>${escapeHtml(stage.detail)}</small></div>`).join("");
  return `<figure class="concept-diagram ${escapeHtml(diagram.kind)}">
    <header><p class="eyebrow">${escapeHtml(locale.ui.diagram)}</p><h3>${escapeHtml(diagram.title)}</h3></header>
    <div class="diagram-track">${stages}</div>
    ${diagram.kind === "cycle" ? `<div class="diagram-repeat" aria-hidden="true">↺ ${escapeHtml(locale.ui.repeatCycle)}</div>` : ""}
    <figcaption>${escapeHtml(diagram.caption)}</figcaption>
  </figure>`;
}

function lessonSection(locale, section, index, diagram) {
  return `<section class="lesson-section" id="${escapeHtml(section.id)}">
    <header><span>${String(index + 1).padStart(2, "0")}</span><div><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.summary)}</p></div></header>
    <div class="lesson-prose">${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
    ${section.points?.length ? `<ul class="lesson-points">${section.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>` : ""}
    ${conceptDiagram(locale, diagram)}
    ${lessonCode(locale, section)}
    ${lessonCallouts(section.callouts)}
  </section>`;
}

function courseLesson(locale, chapter, lesson) {
  const ui = locale.ui;
  const notebookReasons = lesson.notebookLinks.map((item) => {
    const notebook = locale.catalog.notebooks.find((candidate) => candidate.slug === item.slug);
    const runtime = localizedRuntime(locale, item.runtime);
    return notebook ? `<li><a href="${route(locale.code, notebookPath(notebook))}"><strong>${escapeHtml(notebook.title)}${item.status === "historical" ? `<small class="historical-badge">${escapeHtml(ui.historical)} · ${escapeHtml(runtime)}</small>` : ""}</strong><span>${escapeHtml(item.reason)}</span></a></li>` : "";
  }).join("");
  return `<div class="course-layout">
    <details class="lesson-toc" open><summary>${escapeHtml(ui.inThisChapter)}</summary><nav>
      <a href="#learning-outcomes">${escapeHtml(ui.learningOutcomes)}</a>
      ${lesson.sections.map((section) => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`).join("")}
      <a href="#version-review">${escapeHtml(ui.versionReview)}</a><a href="#guided-notebooks">${escapeHtml(ui.guidedNotebooks)}</a><a href="#exercises">${escapeHtml(ui.exercises)}</a><a href="#references">${escapeHtml(ui.references)}</a>
    </nav></details>
    <article class="course-article">
      <section class="learning-outcomes" id="learning-outcomes"><div><p class="eyebrow">${escapeHtml(ui.learningOutcomes)}</p><h2>${escapeHtml(ui.whatYouCanDo)}</h2></div><ol>${lesson.outcomes.map((outcome) => `<li>${escapeHtml(outcome)}</li>`).join("")}</ol></section>
      ${lesson.sections.map((section, index) => lessonSection(locale, section, index, locale.diagrams.find((diagram) => diagram.chapter === lesson.chapter && diagram.section === section.id))).join("")}
      <section class="version-review" id="version-review"><div class="section-heading"><p class="eyebrow">${escapeHtml(ui.bookToCurrentReview)}</p><h2>${escapeHtml(formatMessage(ui.whatChanges, { version: course.pytorchVersion }))}</h2><p>${escapeHtml(ui.currentReviewDescription)}</p></div>
        <div class="version-grid">${lesson.modern.map((item) => `<article><span>${escapeHtml(item.topic)}</span><h3>${escapeHtml(item.current)}</h3><p><strong>${escapeHtml(ui.bookContext)}</strong> ${escapeHtml(item.book)}</p><p>${escapeHtml(item.reason)}</p></article>`).join("")}</div>
      </section>
      <section class="notebook-mapping" id="guided-notebooks"><div class="section-heading"><p class="eyebrow">${escapeHtml(ui.codeAlongMap)}</p><h2>${escapeHtml(ui.useBookNotebooks)}</h2></div>${notebookReasons ? `<ul>${notebookReasons}</ul>` : `<p class="concept-note">${escapeHtml(ui.conceptChapterNote)}</p>`}</section>
      <section class="exercise-section" id="exercises"><div class="section-heading"><p class="eyebrow">${escapeHtml(ui.exercises)}</p><h2>${escapeHtml(ui.testByChangingCode)}</h2></div><ol>${lesson.exercises.map((exercise) => `<li><h3>${escapeHtml(exercise.title)}</h3><p>${escapeHtml(exercise.prompt)}</p><small>${escapeHtml(ui.doneWhen)} ${escapeHtml(exercise.success)}</small></li>`).join("")}</ol></section>
      <section class="reference-section" id="references"><div class="section-heading"><p class="eyebrow">${escapeHtml(ui.referencesFurther)}</p><h2>${escapeHtml(ui.continuePrimarySources)}</h2><p>${escapeHtml(ui.referencesDescription)}</p></div><ul>${lesson.references.map((reference) => `<li><a href="${escapeHtml(reference.url)}"><span>${escapeHtml(reference.type)}</span><strong>${escapeHtml(reference.title)}</strong><b>↗</b></a></li>`).join("")}</ul></section>
    </article>
  </div>`;
}

function landingPage(locale) {
  const ui = locale.ui;
  const chapterCards = locale.catalog.chapters.map((chapter) => `
    <a class="chapter-card" href="${route(locale.code, chapterPath(chapter.number))}">
      <span class="chapter-number">${chapterLabel(chapter.number)}</span>
      <div><h3>${escapeHtml(chapter.title)}</h3><p>${escapeHtml(chapter.summary)}</p></div>
      <footer><span>${escapeHtml(formatMessage(ui.notebookCount, { count: chapter.notebookCount }))}</span><span>${escapeHtml(formatMessage(ui.codeCellCount, { count: chapter.codeCellCount }))}</span><b>${escapeHtml(ui.explore)}</b></footer>
    </a>`).join("");
  const teachingDescription = escapeHtml(ui.teachingReferenceDescription).replace("Learn PyTorch for Deep Learning", '<a href="https://www.learnpytorch.io/">Learn PyTorch for Deep Learning</a>');
  const body = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(ui.heroEyebrow)}</p>
        <h1>${escapeHtml(ui.heroTitleFirst)}<br><em>${escapeHtml(ui.heroTitleSecond)}</em></h1>
        <p class="hero-lede">${escapeHtml(formatMessage(ui.heroLede, { version: course.pytorchVersion }))}</p>
        <div class="hero-actions"><a class="primary-button" href="${route(locale.code, chapterPath(1))}">${escapeHtml(ui.startLearningPath)}</a><a class="secondary-button" href="${route(locale.code, chapterPath(9))}">${escapeHtml(ui.jumpModernModels)}</a></div>
        <ul class="hero-stats">${stat(17, ui.chapters)}${stat(locale.lessons.length, ui.reviewedLessons)}${stat(810, ui.explainedCodeCells)}</ul>
      </div>
      <div class="hero-visual" aria-label="${escapeHtml(ui.pipelineLabel)}">
        <div class="terminal-bar"><i></i><i></i><i></i><span>learning_path.py</span></div>
        <pre><code><span class="muted"># Build intuition in layers</span>
data = <span class="accent">Tensor</span>(real_world)
model = <span class="accent">nn.Module</span>()

for chapter in atlas:
    prediction = model(data)
    understanding.<span class="warm">backward</span>()
    curiosity.<span class="warm">step</span>()</code></pre>
        <div class="pipeline"><span>${escapeHtml(ui.pipelineTensors)}</span><i>→</i><span>${escapeHtml(ui.pipelineModels)}</span><i>→</i><span>${escapeHtml(ui.pipelineSystems)}</span></div>
      </div>
    </section>
    <section class="roadmap-section">
      <div class="section-heading"><p class="eyebrow">${escapeHtml(ui.roadmapEyebrow)}</p><h2>${escapeHtml(ui.roadmapTitle)}</h2><p>${escapeHtml(ui.roadmapDescription)}</p></div>
      <div class="chapter-grid">${chapterCards}</div>
    </section>
    <section class="principles">
      <article><span>01</span><h3>${escapeHtml(ui.principleOneTitle)}</h3><p>${escapeHtml(ui.principleOneBody)}</p></article>
      <article><span>02</span><h3>${escapeHtml(ui.principleTwoTitle)}</h3><p>${escapeHtml(ui.principleTwoBody)}</p></article>
      <article><span>03</span><h3>${escapeHtml(ui.principleThreeTitle)}</h3><p>${escapeHtml(ui.principleThreeBody)}</p></article>
    </section>
    <section class="reference-credit"><p class="eyebrow">${escapeHtml(ui.teachingReference)}</p><h2>${escapeHtml(ui.inspiredCodeFirst)}</h2><p>${teachingDescription}</p></section>`;
  return layout(locale, { title: ui.siteName, description: ui.landingDescription, body, logicalPath: "", pageClass: "landing" });
}

function chapterPage(locale, chapter) {
  const ui = locale.ui;
  const notebooks = locale.catalog.notebooks.filter((item) => item.chapter === chapter.number);
  const lesson = locale.lessonByChapter.get(chapter.number);
  const notebookList = notebooks.length ? notebooks.map((notebook, index) => {
    const courseNote = lesson?.notebookLinks.find((item) => item.slug === notebook.slug);
    const runtime = localizedRuntime(locale, courseNote?.runtime);
    return `
    <a class="notebook-card${courseNote?.status === "historical" ? " historical" : ""}" href="${route(locale.code, notebookPath(notebook))}">
      <span class="sequence">${String(index + 1).padStart(2, "0")}</span>
      <div><h3>${escapeHtml(notebook.title)}${courseNote?.status === "historical" ? `<small class="historical-badge">${escapeHtml(ui.historical)} · ${escapeHtml(runtime)}</small>` : ""}</h3><p>${escapeHtml(notebook.summary)}</p><code>${escapeHtml(notebook.path)}</code></div>
      <aside><strong>${notebook.codeCellCount}</strong><span>${escapeHtml(ui.explainedCodeCells)}</span><b>${escapeHtml(ui.explore)}</b></aside>
    </a>`;
  }).join("") : `
    <div class="empty-chapter"><span>${escapeHtml(ui.conceptChapter)}</span><h3>${escapeHtml(ui.noDedicatedNotebook)}</h3><p>${escapeHtml(ui.noDedicatedNotebookDescription)}</p></div>`;
  const previous = locale.catalog.chapters.find((item) => item.number === chapter.number - 1);
  const next = locale.catalog.chapters.find((item) => item.number === chapter.number + 1);
  const logicalPath = chapterPath(chapter.number);
  const body = `
    <nav class="breadcrumbs" aria-label="${escapeHtml(ui.breadcrumbLabel)}"><a href="${route(locale.code)}">${escapeHtml(ui.atlas)}</a><span>/</span><b>${escapeHtml(formatMessage(ui.chapter, { number: chapter.number }))}</b></nav>
    <header class="chapter-hero"><div class="chapter-hero-copy"><span class="chapter-kicker">${escapeHtml(formatMessage(ui.chapter, { number: chapterLabel(chapter.number) }))} · ${escapeHtml(formatMessage(ui.reviewedFor, { version: course.pytorchVersion }))}</span><h1>${escapeHtml(chapter.title)}</h1><p>${escapeHtml(chapter.summary)}</p></div>
      <ul class="chapter-facts">${stat(chapter.notebookCount, ui.notebooks)}${stat(chapter.codeCellCount, ui.explainedCells)}${stat(formatMessage(ui.lessonMinutes, { count: lesson.minutes }), ui.lesson)}</ul>
    </header>
    ${courseLesson(locale, chapter, lesson)}
    <section class="chapter-content"><div class="section-heading"><p class="eyebrow">${escapeHtml(ui.completeNotebookShelf)}</p><h2>${escapeHtml(ui.allGuidedCode)}</h2><p>${escapeHtml(ui.notebookShelfDescription)}</p></div><div class="notebook-list">${notebookList}</div></section>
    <nav class="pager" aria-label="${escapeHtml(ui.toggleChapterNavigation)}">
      ${previous ? `<a href="${route(locale.code, chapterPath(previous.number))}"><span>${escapeHtml(ui.previous)}</span><strong>${escapeHtml(previous.title)}</strong></a>` : "<i></i>"}
      ${next ? `<a class="next" href="${route(locale.code, chapterPath(next.number))}"><span>${escapeHtml(ui.next)}</span><strong>${escapeHtml(next.title)}</strong></a>` : ""}
    </nav>`;
  return layout(locale, { title: `${formatMessage(ui.chapter, { number: chapter.number })}: ${chapter.title}`, description: chapter.summary, body, activeChapter: chapter.number, logicalPath, pageClass: "chapter-page" });
}

function notebookPage(locale, notebook) {
  const ui = locale.ui;
  const chapter = locale.catalog.chapters.find((item) => item.number === notebook.chapter);
  const courseNote = locale.lessonByChapter.get(notebook.chapter)?.notebookLinks.find((item) => item.slug === notebook.slug);
  const runtime = localizedRuntime(locale, courseNote?.runtime);
  const logicalPath = notebookPath(notebook);
  const body = `
    <nav class="breadcrumbs" aria-label="${escapeHtml(ui.breadcrumbLabel)}"><a href="${route(locale.code)}">${escapeHtml(ui.atlas)}</a><span>/</span><a href="${route(locale.code, chapterPath(chapter.number))}">${escapeHtml(formatMessage(ui.chapter, { number: chapter.number }))}</a><span>/</span><b>${escapeHtml(notebook.title)}</b></nav>
    <header class="notebook-hero">
      <div><p class="eyebrow">${escapeHtml(formatMessage(ui.chapter, { number: chapterLabel(chapter.number) }))} · ${escapeHtml(ui.guidedNotebook)}</p><h1>${escapeHtml(notebook.title)}</h1><p>${escapeHtml(notebook.summary)}</p></div>
      <aside><strong>${notebook.codeCellCount}</strong><span>${escapeHtml(ui.explainedCodeCells)}</span></aside>
    </header>
    ${courseNote ? `<aside class="notebook-course-note ${escapeHtml(courseNote.status || "current")}"><strong>${courseNote.status === "historical" ? escapeHtml(formatMessage(ui.historicalApi, { runtime })) : escapeHtml(ui.courseNotebookNote)}</strong><p>${escapeHtml(courseNote.reason)}</p></aside>` : ""}
    <div class="notebook-toolbar"><div><span class="source-dot"></span><code>${escapeHtml(notebook.path)}</code></div><nav><a href="${escapeHtml(notebook.githubUrl)}">${escapeHtml(ui.viewSource)}</a>${courseNote?.status === "historical" ? `<span class="colab-disabled">${escapeHtml(formatMessage(ui.colabIncompatible, { version: course.pytorchVersion }))}</span>` : `<a class="colab-button" href="${escapeHtml(notebook.colabUrl)}">${escapeHtml(ui.openColab)}</a>`}</nav></div>
    <section class="reader-layout">
      <aside class="cell-toc"><strong>${escapeHtml(ui.onThisPage)}</strong><nav></nav></aside>
      <div class="notebook-reader" aria-live="polite"><div class="reader-loading"><span></span><p>${escapeHtml(ui.loadingNotebook)}</p></div></div>
    </section>
    <script id="notebook-meta" type="application/json">${safeJson(notebook)}</script>`;
  return layout(locale, { title: notebook.title, description: notebook.summary, body, activeChapter: notebook.chapter, logicalPath, pageClass: "notebook-page" });
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets"), { recursive: true });
await cp(path.join(root, "src", "styles.css"), path.join(dist, "assets", "styles.css"));
await cp(path.join(root, "src", "app.js"), path.join(dist, "assets", "app.js"));
await writeFile(path.join(dist, ".nojekyll"), "");

for (const locale of locales) {
  const localeRoot = path.join(dist, locale.pathPrefix);
  await mkdir(localeRoot, { recursive: true });
  await writeFile(path.join(localeRoot, "index.html"), landingPage(locale));
  for (const chapter of locale.catalog.chapters) {
    const directory = path.join(localeRoot, chapterPath(chapter.number));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "index.html"), chapterPage(locale, chapter));
  }
  for (const notebook of locale.catalog.notebooks) {
    const directory = path.join(localeRoot, notebookPath(notebook));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "index.html"), notebookPage(locale, notebook));
  }
  const searchEntries = [
    ...locale.catalog.chapters.map((chapter) => ({ title: `${formatMessage(locale.ui.chapter, { number: chapter.number })}: ${chapter.title}`, summary: chapter.summary, type: locale.ui.chapterSearchType, url: route(locale.code, chapterPath(chapter.number)) })),
    ...locale.lessons.flatMap((lesson) => lesson.sections.map((section) => ({ title: section.title, summary: section.summary, type: formatMessage(locale.ui.lessonSearchType, { number: lesson.chapter }), url: `${route(locale.code, chapterPath(lesson.chapter))}#${section.id}` }))),
    ...locale.catalog.notebooks.map((notebook) => ({ title: notebook.title, summary: notebook.summary, type: formatMessage(locale.ui.notebookSearchType, { number: notebook.chapter }), url: route(locale.code, notebookPath(notebook)) }))
  ];
  await writeFile(path.join(localeRoot, "search.json"), JSON.stringify(searchEntries));
}

await writeFile(path.join(dist, "audit.json"), JSON.stringify({
  chapters: canonicalCatalog.chapters.length,
  reviewedLessons: canonicalLessons.length,
  lessonSections: canonicalLessons.reduce((sum, lesson) => sum + lesson.sections.length, 0),
  notebooks: canonicalCatalog.notebooks.length,
  codeCells: canonicalCatalog.notebooks.reduce((sum, item) => sum + item.codeCellCount, 0),
  locales: Object.fromEntries(locales.map((locale) => [locale.code, { chapters: locale.catalog.chapters.length, lessons: locale.lessons.length, notebooks: locale.catalog.notebooks.length }])),
  pytorchVersion: course.pytorchVersion,
  upstreamCommit: canonicalCatalog.upstream.commit
}, null, 2) + "\n");

const logicalRoutes = ["", ...canonicalCatalog.chapters.map((chapter) => chapterPath(chapter.number)), ...canonicalCatalog.notebooks.map(notebookPath)];
const sitemapRows = logicalRoutes.flatMap((logicalPath) => locales.map((locale) => `  <url><loc>${absoluteUrl(locale.code, logicalPath)}</loc><xhtml:link rel="alternate" hreflang="en" href="${absoluteUrl("en", logicalPath)}"/><xhtml:link rel="alternate" hreflang="vi" href="${absoluteUrl("vi", logicalPath)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${absoluteUrl("en", logicalPath)}"/></url>`));
await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapRows.join("\n")}\n</urlset>\n`);
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl("en", "sitemap.xml")}\n`);
const en = locales.find((locale) => locale.code === "en");
await writeFile(path.join(dist, "404.html"), layout(en, { title: "Page not found", description: en.ui.notFoundDescription, logicalPath: "404.html", noindex: true, body: `<section class="not-found"><p class="eyebrow">${escapeHtml(en.ui.notFoundEyebrow)}</p><h1>${escapeHtml(en.ui.notFoundTitle)}</h1><p>${escapeHtml(en.ui.notFoundBody)}</p><a class="primary-button" href="${route("en")}">${escapeHtml(en.ui.backToAtlas)}</a></section>` }));
console.log(`Built ${canonicalCatalog.chapters.length} chapters and ${canonicalCatalog.notebooks.length} notebook readers in ${locales.length} languages.`);
