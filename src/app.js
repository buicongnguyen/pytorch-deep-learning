const base = document.documentElement.dataset.base;
const root = document.documentElement;

function applyTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("pytorch-atlas-theme", theme);
  document.querySelector(".theme-toggle")?.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
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
  if (!searchIndex) searchIndex = await fetch(`${base}search.json`).then((response) => response.json());
  renderSearch("");
}

function renderSearch(query) {
  if (!searchIndex) return;
  const normalized = query.trim().toLowerCase();
  const matches = searchIndex.filter((item) => !normalized || `${item.title} ${item.summary} ${item.type}`.toLowerCase().includes(normalized)).slice(0, 12);
  searchResults.replaceChildren(...matches.map((item) => {
    const link = document.createElement("a");
    link.href = item.url;
    link.innerHTML = `<span>${item.type}</span><strong>${item.title}</strong><p>${item.summary}</p>`;
    return link;
  }));
  if (!matches.length) searchResults.innerHTML = "<p class='no-results'>No matching chapter or notebook.</p>";
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
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = "Copy code"; }, 1400);
  });
});

const lessonToc = document.querySelector(".lesson-toc");
if (lessonToc) {
  const sections = [...document.querySelectorAll(".course-article > section[id]")];
  const links = [...lessonToc.querySelectorAll("a")];
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => link.classList.toggle("active", link.hash === `#${entry.target.id}`));
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
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    const notebook = await response.json();
    const codeCells = notebook.cells.filter((cell) => cell.cell_type === "code");
    if (codeCells.length !== meta.cells.length) throw new Error("The pinned notebook no longer matches the explanation catalog.");
    const toc = document.querySelector(".cell-toc nav");
    const fragments = codeCells.map((cell, index) => {
      const guide = meta.cells[index];
      const source = Array.isArray(cell.source) ? cell.source.join("") : String(cell.source || "");
      const article = element("article", "code-cell");
      article.id = `cell-${guide.number}`;
      const header = element("header", "cell-header");
      const identity = element("div");
      identity.append(element("span", "cell-index", `In [${guide.number}]`), element("strong", "cell-role", guide.concepts[0]));
      const copy = element("button", "copy-button", "Copy code");
      copy.type = "button";
      copy.addEventListener("click", async () => {
        await navigator.clipboard.writeText(source);
        copy.textContent = "Copied";
        setTimeout(() => { copy.textContent = "Copy code"; }, 1400);
      });
      header.append(identity, copy);
      const pre = element("pre", "code-block");
      const code = element("code", "language-python", source || "# Empty experiment cell");
      pre.append(code);
      const explanation = element("div", "cell-explanation");
      const label = element("p", "explanation-label", "What this cell does");
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
    reader.innerHTML = `<div class="reader-error"><strong>Notebook code could not be loaded.</strong><p>${error.message}</p><a href="${meta.githubUrl}">Open the pinned source on GitHub ↗</a></div>`;
  }
}

renderNotebook();
