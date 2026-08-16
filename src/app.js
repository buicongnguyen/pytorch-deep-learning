const base = document.documentElement.dataset.base;
const root = document.documentElement;
const locale = root.dataset.locale || "en";
const searchUrl = root.dataset.searchUrl || `${base}search.json`;
const runtimeElement = document.querySelector("#runtime-i18n");
const ui = runtimeElement ? JSON.parse(runtimeElement.textContent) : {};
const formatMessage = (template, values = {}) => String(template || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => values[key] ?? `{${key}}`);
const normalizeSearch = (value) => String(value).normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(locale).replaceAll("đ", "d");

function applyTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("pytorch-atlas-theme", theme);
  document.querySelector(".theme-toggle")?.setAttribute("aria-label", theme === "dark" ? ui.switchToLightTheme : ui.switchToDarkTheme);
}

applyTheme(localStorage.getItem("pytorch-atlas-theme") || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
document.querySelector(".theme-toggle")?.addEventListener("click", () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark"));

const navToggle = document.querySelector(".nav-toggle");
navToggle?.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

const dialog = document.querySelector(".search-dialog");
const searchInput = document.querySelector("#site-search");
const searchResults = document.querySelector(".search-results");
let searchIndex;

async function openSearch() {
  dialog.showModal();
  searchInput.focus();
  if (!searchIndex) {
    try {
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error(String(response.status));
      searchIndex = await response.json();
    } catch {
      const message = document.createElement("p");
      message.className = "no-results";
      message.textContent = ui.searchLoadError;
      searchResults.replaceChildren(message);
      return;
    }
  }
  renderSearch("");
}

function renderSearch(query) {
  if (!searchIndex) return;
  const normalized = normalizeSearch(query.trim());
  const matches = searchIndex.filter((item) => !normalized || normalizeSearch(`${item.title} ${item.summary} ${item.type} ${item.keywords || ""}`).includes(normalized)).slice(0, 12);
  searchResults.replaceChildren(...matches.map((item) => {
    const link = document.createElement("a");
    link.href = item.url;
    const type = document.createElement("span");
    const title = document.createElement("strong");
    const summary = document.createElement("p");
    type.textContent = item.type;
    title.textContent = item.title;
    summary.textContent = item.summary;
    link.append(type, title, summary);
    return link;
  }));
  if (!matches.length) {
    const message = document.createElement("p");
    message.className = "no-results";
    message.textContent = ui.noSearchResults;
    searchResults.replaceChildren(message);
  }
}

document.querySelector(".search-trigger")?.addEventListener("click", openSearch);
searchInput?.addEventListener("input", (event) => renderSearch(event.target.value));
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) { event.preventDefault(); openSearch(); }
  if (event.key === "Escape" && document.body.classList.contains("nav-open")) { document.body.classList.remove("nav-open"); navToggle?.setAttribute("aria-expanded", "false"); }
});

document.querySelectorAll(".lesson-copy").forEach((button) => {
  button.addEventListener("click", async () => {
    const source = button.closest(".lesson-code")?.querySelector("code")?.textContent || "";
    await navigator.clipboard.writeText(source);
    button.textContent = ui.copied;
    setTimeout(() => { button.textContent = ui.copyCode; }, 1400);
  });
});

document.querySelector(".language-switch")?.addEventListener("click", (event) => {
  if (!location.hash) return;
  const target = new URL(event.currentTarget.href);
  target.hash = location.hash;
  event.currentTarget.href = target.href;
});

const lessonToc = document.querySelector(".lesson-toc");
if (lessonToc) {
  if (matchMedia("(max-width: 700px)").matches) lessonToc.open = false;
  const sections = [...document.querySelectorAll(".course-article > section[id]")];
  const links = [...lessonToc.querySelectorAll("a")];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => {
        const active = link.hash === `#${entry.target.id}`;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
  }, { rootMargin: "-18% 0px -72%" });
  sections.forEach((section) => observer.observe(section));
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function renderNotebook() {
  const reader = document.querySelector(".notebook-reader");
  const metaElement = document.querySelector("#notebook-meta");
  if (!reader || !metaElement) return;
  const meta = JSON.parse(metaElement.textContent);
  try {
    const response = await fetch(meta.sourceUrl);
    if (!response.ok) throw new Error(formatMessage(ui.sourceReturned, { status: response.status }));
    const notebook = await response.json();
    const codeCells = notebook.cells.filter((cell) => cell.cell_type === "code");
    if (codeCells.length !== meta.cells.length) throw new Error(ui.notebookMismatch);
    const toc = document.querySelector(".cell-toc nav");
    const fragments = codeCells.map((cell, index) => {
      const guide = meta.cells[index];
      const source = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source || "");
      const article = element("article", "code-cell");
      article.id = `cell-${guide.number}`;
      const header = element("header", "cell-header");
      const identity = element("div");
      identity.append(element("span", "cell-index", formatMessage(ui.inputCell, { number: guide.number })), element("strong", "cell-role", guide.concepts[0]));
      const copy = element("button", "copy-button", ui.copyCode);
      copy.type = "button";
      copy.addEventListener("click", async () => {
        await navigator.clipboard.writeText(source);
        copy.textContent = ui.copied;
        setTimeout(() => { copy.textContent = ui.copyCode; }, 1400);
      });
      header.append(identity, copy);
      const pre = element("pre", "code-block");
      const code = element("code", "language-python", source || ui.emptyExperimentCell);
      pre.append(code);
      const explanation = element("div", "cell-explanation");
      const label = element("p", "explanation-label", ui.whatCellDoes);
      const prose = element("p", "explanation-text", guide.explanation);
      const tags = element("ul", "concept-tags");
      guide.concepts.forEach((concept) => tags.append(element("li", "", concept)));
      explanation.append(label, prose, tags);
      article.append(header, pre, explanation);
      const tocLink = element("a", "", `${String(guide.number).padStart(2, "0")} · ${guide.concepts[0]}`);
      tocLink.href = `#cell-${guide.number}`;
      toc?.append(tocLink);
      return article;
    });
    reader.replaceChildren(...fragments);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          document.querySelectorAll(".cell-toc a").forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
        }
      });
    }, { rootMargin: "-20% 0px -65%" });
    reader.querySelectorAll(".code-cell").forEach((cell) => observer.observe(cell));
  } catch (error) {
    const wrapper = element("div", "reader-error");
    const heading = element("strong", "", ui.notebookLoadError);
    const message = element("p", "", error.message);
    const source = element("a", "", ui.openPinnedSource);
    source.href = meta.githubUrl;
    wrapper.append(heading, message, source);
    reader.replaceChildren(wrapper);
  }
}

renderNotebook();

const progressKey = `pytorch-atlas-progress-${locale}`;
const progress = (() => {
  try {
    const stored = JSON.parse(localStorage.getItem(progressKey));
    return stored && typeof stored === "object" ? stored : { completed: [], exercises: {}, bookmark: null, last: null };
  }
  catch { return { completed: [], exercises: {}, bookmark: null, last: null }; }
})();
if (!Array.isArray(progress.completed)) progress.completed = [];
if (!progress.exercises || typeof progress.exercises !== "object" || Array.isArray(progress.exercises)) progress.exercises = {};
const saveProgress = () => {
  try { localStorage.setItem(progressKey, JSON.stringify(progress)); }
  catch { /* Reading remains usable when storage is unavailable or full. */ }
};

function renderProgress() {
  const count = new Set(progress.completed.map(Number)).size;
  const summary = document.querySelector(".sidebar-progress");
  if (summary) summary.textContent = formatMessage(ui.progressSummary, { done: count });
  document.querySelectorAll(".chapter-card[data-chapter]").forEach((card) => card.classList.toggle("completed", progress.completed.includes(Number(card.dataset.chapter))));
  const button = document.querySelector("[data-complete-chapter]");
  if (button) {
    const done = progress.completed.includes(Number(button.dataset.completeChapter));
    button.classList.toggle("completed", done);
    button.textContent = done ? `✓ ${ui.completed}` : `○ ${ui.markComplete}`;
    button.setAttribute("aria-pressed", String(done));
  }
}

document.querySelector("[data-complete-chapter]")?.addEventListener("click", (event) => {
  const chapter = Number(event.currentTarget.dataset.completeChapter);
  progress.completed = progress.completed.includes(chapter) ? progress.completed.filter((item) => item !== chapter) : [...progress.completed, chapter].sort((a, b) => a - b);
  saveProgress();
  renderProgress();
});

document.querySelectorAll("[data-exercise]").forEach((item) => {
  const input = item.querySelector("input[type=checkbox]");
  input.checked = Boolean(progress.exercises[item.dataset.exercise]);
  input.addEventListener("change", () => {
    progress.exercises[item.dataset.exercise] = input.checked;
    saveProgress();
  });
});

document.querySelectorAll("[data-bookmark]").forEach((button) => {
  const section = button.dataset.bookmark;
  const chapter = Number(root.dataset.chapter);
  const active = progress.bookmark?.chapter === chapter && progress.bookmark?.section === section;
  button.classList.toggle("active", active);
  button.setAttribute("aria-pressed", String(active));
  if (active) button.querySelector("span").textContent = ui.bookmarked;
  button.addEventListener("click", () => {
    const isActive = progress.bookmark?.chapter === chapter && progress.bookmark?.section === section;
    progress.bookmark = isActive ? null : { chapter, section };
    saveProgress();
    document.querySelectorAll("[data-bookmark]").forEach((item) => {
      const selected = !isActive && item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
      item.querySelector("span").textContent = selected ? ui.bookmarked : ui.bookmarkSection;
    });
  });
});

const currentChapter = Number(root.dataset.chapter || 0);
if (currentChapter) {
  const sections = [...document.querySelectorAll(".lesson-section[id]")];
  const readingObserver = new IntersectionObserver((entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!visible) return;
    progress.last = { chapter: currentChapter, section: visible.target.id };
    saveProgress();
  }, { rootMargin: "-20% 0px -70%" });
  sections.forEach((section) => readingObserver.observe(section));
}

const continueButton = document.querySelector(".continue-button");
if (continueButton && Number.isInteger(progress.last?.chapter) && progress.last.chapter >= 1 && progress.last.chapter <= 17 && /^[a-z0-9-]+$/.test(progress.last?.section || "")) {
  continueButton.hidden = false;
  continueButton.textContent = ui.continueReading;
  continueButton.href = `${base}${root.dataset.localePrefix || ""}chapters/${String(progress.last.chapter).padStart(2, "0")}/#${encodeURIComponent(progress.last.section)}`;
}

document.querySelector("[data-print]")?.addEventListener("click", () => window.print());

const glossarySearch = document.querySelector("[data-glossary-search]");
glossarySearch?.addEventListener("input", () => {
  const query = normalizeSearch(glossarySearch.value);
  document.querySelectorAll(".glossary-entry").forEach((entry) => {
    entry.hidden = Boolean(query) && !normalizeSearch(`${entry.dataset.search} ${entry.textContent}`).includes(query);
  });
});

renderProgress();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register(`${base}service-worker.js`).catch(() => {}));
}
