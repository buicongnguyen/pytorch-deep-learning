import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const catalog = JSON.parse(await readFile(path.join(root, "content", "catalog.json"), "utf8"));
const course = JSON.parse(await readFile(path.join(root, "content", "course.json"), "utf8"));
const lessonDirectory = path.join(root, "content", "lessons");
const lessonFiles = (await readdir(lessonDirectory)).filter((file) => file.endsWith(".json")).sort();
const lessons = await Promise.all(lessonFiles.map(async (file) => JSON.parse(await readFile(path.join(lessonDirectory, file), "utf8"))));
const lessonByChapter = new Map(lessons.map((lesson) => [lesson.chapter, lesson]));
const base = "/pytorch-deep-learning/";
const siteUrl = "https://buicongnguyen.github.io/pytorch-deep-learning/";

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const chapterLabel = (number) => String(number).padStart(2, "0");
const chapterPath = (number) => `chapters/${chapterLabel(number)}/`;
const notebookPath = (notebook) => `notebooks/${notebook.slug}/`;
const safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");

function chapterNav(activeChapter) {
  return catalog.chapters.map((chapter) => `
    <a class="chapter-nav-link${chapter.number === activeChapter ? " active" : ""}" href="${base}${chapterPath(chapter.number)}">
      <span>${chapterLabel(chapter.number)}</span><strong>${escapeHtml(chapter.title)}</strong>${lessonByChapter.has(chapter.number) ? '<small>Course</small>' : ''}
    </a>`).join("");
}

function layout({ title, description, body, activeChapter = 0, canonical = "", pageClass = "" }) {
  const fullTitle = title === "PyTorch Deep Learning Atlas" ? title : `${title} · PyTorch Deep Learning Atlas`;
  return `<!doctype html>
<html lang="en" data-theme="dark" data-base="${base}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#071312">
  <link rel="canonical" href="${siteUrl}${canonical}">
  <link rel="stylesheet" href="${base}assets/styles.css?v=2">
  <title>${escapeHtml(fullTitle)}</title>
</head>
<body class="${pageClass}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <button class="icon-button nav-toggle" type="button" aria-label="Toggle chapter navigation" aria-expanded="false">☰</button>
    <a class="brand" href="${base}"><span class="brand-mark">π</span><span><strong>PyTorch Atlas</strong><small>Deep learning, cell by cell</small></span></a>
    <div class="header-actions">
      <button class="search-trigger" type="button" aria-label="Search the Atlas"><span>Search chapters and notebooks</span><kbd>/</kbd></button>
      <button class="icon-button theme-toggle" type="button" aria-label="Switch color theme">◐</button>
      <a class="github-link" href="https://github.com/buicongnguyen/pytorch-deep-learning">GitHub ↗</a>
    </div>
  </header>
  <div class="site-shell">
    <aside class="sidebar" aria-label="Chapter navigation">
      <div class="sidebar-heading"><span>Learning path</span><b>${lessons.length}/17 reviewed</b></div>
      <nav>${chapterNav(activeChapter)}</nav>
      <div class="sidebar-source"><span>Source snapshot</span><code>${catalog.upstream.commit.slice(0, 9)}</code></div>
    </aside>
    <main id="main" class="main-content">${body}</main>
  </div>
  <dialog class="search-dialog" aria-label="Search">
    <form method="dialog" class="search-bar"><label for="site-search">Search the Atlas</label><button aria-label="Close search">×</button></form>
    <input id="site-search" type="search" autocomplete="off" placeholder="Try tensors, diffusion, DDP…">
    <div class="search-results" aria-live="polite"></div>
  </dialog>
  <script type="module" src="${base}assets/app.js?v=2"></script>
</body>
</html>`;
}

function stat(value, label) {
  return `<li><strong>${value}</strong><span>${label}</span></li>`;
}

function lessonCode(code) {
  if (!code) return "";
  return `<div class="lesson-code">
    <header><span>${escapeHtml(code.title || "Try it")}</span><button class="lesson-copy" type="button">Copy code</button></header>
    <pre><code class="language-${escapeHtml(code.language || "python")}">${escapeHtml(code.source)}</code></pre>
  </div>`;
}

function lessonCallouts(callouts = []) {
  return callouts.map((callout) => `<aside class="lesson-callout ${escapeHtml(callout.kind || "note")}">
    <strong>${escapeHtml(callout.title)}</strong><p>${escapeHtml(callout.body)}</p>
  </aside>`).join("");
}

function lessonSection(section, index) {
  return `<section class="lesson-section" id="${escapeHtml(section.id)}">
    <header><span>${String(index + 1).padStart(2, "0")}</span><div><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.summary)}</p></div></header>
    <div class="lesson-prose">${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>
    ${section.points?.length ? `<ul class="lesson-points">${section.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>` : ""}
    ${lessonCode(section.code)}
    ${lessonCallouts(section.callouts)}
  </section>`;
}

function courseLesson(chapter, lesson) {
  if (!lesson) return `<section class="lesson-pending"><p class="eyebrow">Course lesson</p><h2>Editorial review in progress</h2><p>The original notebook guide remains available below while this chapter's PyTorch ${escapeHtml(course.pytorchVersion)} lesson is being written and checked.</p></section>`;
  const notebookReasons = lesson.notebookLinks.map((item) => {
    const notebook = catalog.notebooks.find((candidate) => candidate.slug === item.slug);
    return notebook ? `<li><a href="${base}${notebookPath(notebook)}"><strong>${escapeHtml(notebook.title)}</strong><span>${escapeHtml(item.reason)}</span></a></li>` : "";
  }).join("");
  return `<div class="course-layout">
    <aside class="lesson-toc"><strong>In this chapter</strong><nav>
      <a href="#learning-outcomes">Learning outcomes</a>
      ${lesson.sections.map((section) => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`).join("")}
      <a href="#version-review">Version review</a><a href="#guided-notebooks">Guided notebooks</a><a href="#exercises">Exercises</a><a href="#references">References</a>
    </nav></aside>
    <article class="course-article">
      <section class="learning-outcomes" id="learning-outcomes"><div><p class="eyebrow">Learning outcomes</p><h2>What you will be able to do</h2></div><ol>${lesson.outcomes.map((outcome) => `<li>${escapeHtml(outcome)}</li>`).join("")}</ol></section>
      ${lesson.sections.map(lessonSection).join("")}
      <section class="version-review" id="version-review"><div class="section-heading"><p class="eyebrow">Book-to-current review</p><h2>What changes in PyTorch ${escapeHtml(course.pytorchVersion)}</h2><p>The pinned notebooks preserve the book's learning sequence. These notes show where current practice differs.</p></div>
        <div class="version-grid">${lesson.modern.map((item) => `<article><span>${escapeHtml(item.topic)}</span><h3>${escapeHtml(item.current)}</h3><p><strong>Book context:</strong> ${escapeHtml(item.book)}</p><p>${escapeHtml(item.reason)}</p></article>`).join("")}</div>
      </section>
      <section class="notebook-mapping" id="guided-notebooks"><div class="section-heading"><p class="eyebrow">Code-along map</p><h2>Use the book notebooks deliberately</h2></div>${notebookReasons ? `<ul>${notebookReasons}</ul>` : `<p class="concept-note">This is a concept chapter without a dedicated upstream notebook. Use the short original examples above, then continue to the next chapter's runnable notebooks.</p>`}</section>
      <section class="exercise-section" id="exercises"><div class="section-heading"><p class="eyebrow">Exercises</p><h2>Test the idea by changing the code</h2></div><ol>${lesson.exercises.map((exercise) => `<li><h3>${escapeHtml(exercise.title)}</h3><p>${escapeHtml(exercise.prompt)}</p><small>Done when: ${escapeHtml(exercise.success)}</small></li>`).join("")}</ol></section>
      <section class="reference-section" id="references"><div class="section-heading"><p class="eyebrow">References and further reading</p><h2>Continue with primary sources</h2><p>Lesson prose and examples are original. LearnPyTorch is credited as a teaching-format reference; API guidance comes from official PyTorch material.</p></div><ul>${lesson.references.map((reference) => `<li><a href="${escapeHtml(reference.url)}"><span>${escapeHtml(reference.type)}</span><strong>${escapeHtml(reference.title)}</strong><b>↗</b></a></li>`).join("")}</ul></section>
    </article>
  </div>`;
}

function landingPage() {
  const chapterCards = catalog.chapters.map((chapter) => `
    <a class="chapter-card" href="${base}${chapterPath(chapter.number)}">
      <span class="chapter-number">${chapterLabel(chapter.number)}</span>
      <div><h3>${escapeHtml(chapter.title)}</h3><p>${escapeHtml(chapter.summary)}</p></div>
      <footer><span>${chapter.notebookCount} notebooks</span><span>${chapter.codeCellCount} code cells</span><b>Explore →</b></footer>
    </a>`).join("");
  const body = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">An interactive code companion</p>
        <h1>Learn PyTorch<br><em>cell by cell.</em></h1>
        <p class="hero-lede">Follow a code-first course from tensors to transformers, medical imaging, distributed training, and deployment. Long-form lessons target PyTorch ${escapeHtml(course.pytorchVersion)}, while every book notebook cell remains explained.</p>
        <div class="hero-actions"><a class="primary-button" href="${base}${chapterPath(1)}">Start the learning path</a><a class="secondary-button" href="${base}${chapterPath(9)}">Jump to modern models</a></div>
        <ul class="hero-stats">${stat(17, "chapters")}${stat(lessons.length, "reviewed lessons")}${stat(810, "explained code cells")}</ul>
      </div>
      <div class="hero-visual" aria-label="PyTorch learning pipeline">
        <div class="terminal-bar"><i></i><i></i><i></i><span>learning_path.py</span></div>
        <pre><code><span class="muted"># Build intuition in layers</span>
data = <span class="accent">Tensor</span>(real_world)
model = <span class="accent">nn.Module</span>()

for chapter in atlas:
    prediction = model(data)
    understanding.<span class="warm">backward</span>()
    curiosity.<span class="warm">step</span>()</code></pre>
        <div class="pipeline"><span>Tensors</span><i>→</i><span>Models</span><i>→</i><span>Systems</span></div>
      </div>
    </section>
    <section class="roadmap-section">
      <div class="section-heading"><p class="eyebrow">The complete roadmap</p><h2>Concept first. Code beside it.</h2><p>The sequence follows the book's public code repository while the explanations are original to this Atlas.</p></div>
      <div class="chapter-grid">${chapterCards}</div>
    </section>
    <section class="principles">
      <article><span>01</span><h3>Read the intent</h3><p>Start with what a cell contributes before inspecting syntax.</p></article>
      <article><span>02</span><h3>Track the shapes</h3><p>Tensor dimensions connect data preparation, layers, loss, and output.</p></article>
      <article><span>03</span><h3>Run the experiment</h3><p>Open the pinned source in Colab or Jupyter and change one thing at a time.</p></article>
    </section>
    <section class="reference-credit"><p class="eyebrow">Teaching-format reference</p><h2>Inspired by code-first learning.</h2><p>This Atlas uses an original design and original explanations. Its long-form, experiment-led chapter structure acknowledges <a href="https://www.learnpytorch.io/">Learn PyTorch for Deep Learning</a> as a pedagogical reference, and links current API claims to official PyTorch documentation.</p></section>`;
  return layout({ title: "PyTorch Deep Learning Atlas", description: "A chapter-by-chapter PyTorch code companion with explanations for 810 notebook cells.", body, canonical: "", pageClass: "landing" });
}

function chapterPage(chapter) {
  const notebooks = catalog.notebooks.filter((item) => item.chapter === chapter.number);
  const lesson = lessonByChapter.get(chapter.number);
  const notebookList = notebooks.length ? notebooks.map((notebook, index) => `
    <a class="notebook-card" href="${base}${notebookPath(notebook)}">
      <span class="sequence">${String(index + 1).padStart(2, "0")}</span>
      <div><h3>${escapeHtml(notebook.title)}</h3><p>${escapeHtml(notebook.summary)}</p><code>${escapeHtml(notebook.path)}</code></div>
      <aside><strong>${notebook.codeCellCount}</strong><span>code cells</span><b>Read →</b></aside>
    </a>`).join("") : `
    <div class="empty-chapter"><span>Concept chapter</span><h3>No dedicated notebook in the upstream repository</h3><p>This route supplies the context that connects the surrounding executable chapters. Continue to the next chapter for runnable examples.</p></div>`;
  const previous = catalog.chapters.find((item) => item.number === chapter.number - 1);
  const next = catalog.chapters.find((item) => item.number === chapter.number + 1);
  const body = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">Atlas</a><span>/</span><b>Chapter ${chapter.number}</b></nav>
    <header class="chapter-hero"><span class="chapter-kicker">Chapter ${chapterLabel(chapter.number)} · ${lesson ? `Reviewed for PyTorch ${escapeHtml(course.pytorchVersion)}` : "Lesson review pending"}</span><h1>${escapeHtml(chapter.title)}</h1><p>${escapeHtml(chapter.summary)}</p>
      <ul>${stat(chapter.notebookCount, "notebooks")}${stat(chapter.codeCellCount, "explained cells")}${lesson ? stat(`${lesson.minutes} min`, "lesson") : ""}</ul>
    </header>
    ${courseLesson(chapter, lesson)}
    <section class="chapter-content"><div class="section-heading"><p class="eyebrow">Complete notebook shelf</p><h2>All guided code for this chapter</h2><p>These readers fetch the pinned upstream notebook and pair every code cell with an Atlas explanation.</p></div><div class="notebook-list">${notebookList}</div></section>
    <nav class="pager" aria-label="Adjacent chapters">
      ${previous ? `<a href="${base}${chapterPath(previous.number)}"><span>← Previous</span><strong>${escapeHtml(previous.title)}</strong></a>` : "<i></i>"}
      ${next ? `<a class="next" href="${base}${chapterPath(next.number)}"><span>Next →</span><strong>${escapeHtml(next.title)}</strong></a>` : ""}
    </nav>`;
  return layout({ title: `Chapter ${chapter.number}: ${chapter.title}`, description: chapter.summary, body, activeChapter: chapter.number, canonical: chapterPath(chapter.number), pageClass: "chapter-page" });
}

function notebookPage(notebook) {
  const chapter = catalog.chapters.find((item) => item.number === notebook.chapter);
  const body = `
    <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${base}">Atlas</a><span>/</span><a href="${base}${chapterPath(chapter.number)}">Chapter ${chapter.number}</a><span>/</span><b>${escapeHtml(notebook.title)}</b></nav>
    <header class="notebook-hero">
      <div><p class="eyebrow">Chapter ${chapterLabel(chapter.number)} · Guided notebook</p><h1>${escapeHtml(notebook.title)}</h1><p>${escapeHtml(notebook.summary)}</p></div>
      <aside><strong>${notebook.codeCellCount}</strong><span>explained code cells</span></aside>
    </header>
    <div class="notebook-toolbar"><div><span class="source-dot"></span><code>${escapeHtml(notebook.path)}</code></div><nav><a href="${notebook.githubUrl}">View source ↗</a><a class="colab-button" href="${notebook.colabUrl}">Open in Colab ↗</a></nav></div>
    <section class="reader-layout">
      <aside class="cell-toc"><strong>On this page</strong><nav></nav></aside>
      <div class="notebook-reader" aria-live="polite"><div class="reader-loading"><span></span><p>Loading pinned notebook code…</p></div></div>
    </section>
    <script id="notebook-meta" type="application/json">${safeJson(notebook)}</script>`;
  return layout({ title: notebook.title, description: notebook.summary, body, activeChapter: notebook.chapter, canonical: notebookPath(notebook), pageClass: "notebook-page" });
}

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets"), { recursive: true });
await cp(path.join(root, "src", "styles.css"), path.join(dist, "assets", "styles.css"));
await cp(path.join(root, "src", "app.js"), path.join(dist, "assets", "app.js"));
await writeFile(path.join(dist, ".nojekyll"), "");
await writeFile(path.join(dist, "index.html"), landingPage());

for (const chapter of catalog.chapters) {
  const directory = path.join(dist, chapterPath(chapter.number));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), chapterPage(chapter));
}
for (const notebook of catalog.notebooks) {
  const directory = path.join(dist, notebookPath(notebook));
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), notebookPage(notebook));
}

const searchEntries = [
  ...catalog.chapters.map((chapter) => ({ title: `Chapter ${chapter.number}: ${chapter.title}`, summary: chapter.summary, type: "Chapter", url: `${base}${chapterPath(chapter.number)}` })),
  ...lessons.flatMap((lesson) => lesson.sections.map((section) => ({ title: section.title, summary: section.summary, type: `Chapter ${lesson.chapter} lesson`, url: `${base}${chapterPath(lesson.chapter)}#${section.id}` }))),
  ...catalog.notebooks.map((notebook) => ({ title: notebook.title, summary: notebook.summary, type: `Chapter ${notebook.chapter} notebook`, url: `${base}${notebookPath(notebook)}` }))
];
await writeFile(path.join(dist, "search.json"), JSON.stringify(searchEntries));
await writeFile(path.join(dist, "audit.json"), JSON.stringify({ chapters: catalog.chapters.length, reviewedLessons: lessons.length, lessonSections: lessons.reduce((sum, lesson) => sum + lesson.sections.length, 0), notebooks: catalog.notebooks.length, codeCells: catalog.notebooks.reduce((sum, item) => sum + item.codeCellCount, 0), pytorchVersion: course.pytorchVersion, upstreamCommit: catalog.upstream.commit }, null, 2) + "\n");

const routes = ["", ...catalog.chapters.map((chapter) => chapterPath(chapter.number)), ...catalog.notebooks.map(notebookPath)];
await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`).join("\n")}\n</urlset>\n`);
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}sitemap.xml\n`);
await writeFile(path.join(dist, "404.html"), layout({ title: "Page not found", description: "Return to the PyTorch learning path.", canonical: "404.html", body: `<section class="not-found"><p class="eyebrow">404 · Lost tensor</p><h1>This route has no shape.</h1><p>The page may have moved. Return to the learning path and continue from a known dimension.</p><a class="primary-button" href="${base}">Back to the Atlas</a></section>` }));
console.log(`Built ${catalog.chapters.length} chapters and ${catalog.notebooks.length} notebook readers in dist/.`);
