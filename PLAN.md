# PyTorch Deep Learning Atlas: reviewed implementation plan

## Objective

Build and publish an original GitHub Pages learning companion for the code in
`deep-learning-with-pytorch/dlwpt-code-2e`. The experience should echo the
clarity of the local `helloalgo` project: a visible learning path, a focused
reader, responsive navigation, search, theme controls, and code presented next
to plain-language explanations.

Target repository: `buicongnguyen/pytorch-deep-learning`

Target URL: `https://buicongnguyen.github.io/pytorch-deep-learning/`

## 2026 course expansion

The second phase turns the notebook catalog into an original, code-first online
course. `learnpytorch.io` is credited as a pedagogical reference for its
long-form lesson rhythm, local table of contents, runnable examples, exercises,
and further reading. Its prose and visual implementation are not copied.

Each Atlas chapter now follows the same reviewed contract:

1. measurable learning outcomes;
2. four or more original concept-and-code lesson sections;
3. a book-to-current review targeting stable PyTorch 2.13;
4. deliberate mappings to the pinned second-edition notebooks;
5. at least three exercises with completion criteria; and
6. a visible reference section crediting LearnPyTorch and linking official
   PyTorch primary sources.

Content ships sequentially. A chapter is added to `content/course.json` only
after its lesson passes schema, route, link, and production-build checks. That
chapter is then committed, pushed to `main` over SSH, deployed with GitHub
Pages, and verified before editorial work moves to the next chapter.

## Bilingual and readability expansion

English keeps every original URL. A complete Vietnamese edition is generated
under `/vi/`, including the landing page, all 17 lessons, all 63 notebook
readers, both search indexes, and all 810 cell explanations. Locale overlays
translate learner-facing text while code, section IDs, notebook slugs, source
URLs, and audited metadata remain canonical and shared.

The bilingual release contract requires reciprocal language links, exact
canonical and `hreflang` pairs, accent-insensitive Vietnamese search, 17
complete Vietnamese chapter overlays, and zero fallback pages. The typography
system also enforces practical readability floors: 12px labels, 13px metadata,
14px navigation/code/supporting text, and 16px instructional prose. Desktop,
390px mobile, and 320px narrow-mobile layouts must remain free of page-level
horizontal overflow.

## Reviewed scope

- Seventeen chapter routes, including context pages for chapters without a
  dedicated notebook.
- Sixty-three notebook routes.
- Explanations for all 810 code cells in the pinned upstream snapshot.
- Chapter summaries, notebook learning goals, source links, Colab links, code
  copying, search, dark/light themes, keyboard focus, and mobile navigation.
- Deterministic build and coverage checks.
- Parallel English and Vietnamese routes with equivalent anchors and search.
- GitHub Actions deployment to Pages from `main`.

## Code-teaching and visual explanation expansion

Every lesson example now carries a localized purpose comment inside the copied
Python source. Critical lifecycle calls—training/evaluation mode, gradient
clearing, backward, optimizer updates, inference contexts, AMP, checkpoint
I/O, compilation parity, and distributed setup/cleanup—also receive concise
inline comments where they occur.

A deterministic syntax detector maps less-obvious Python and PyTorch constructs
to short bilingual explanations and official documentation. The source gate
requires all 94 code blocks to produce a valid guide and requires every rule,
translation, comment insertion, and HTTPS reference to remain complete. Thirteen
targeted concept diagrams cover relationships that prose alone makes harder to
see: feedback loops, broadcasting, representation pipelines, data splits, CNN
shape flow, attention, diffusion, CT provenance and geometry, segmentation,
distributed execution, and export boundaries. Diagrams use semantic HTML and
stack vertically on narrow screens instead of embedding inaccessible images.

## Architecture

1. `scripts/import-catalog.mjs` reads a local upstream checkout and records
   notebook paths, code-cell counts, concepts, and original explanations. It
   never stores notebook outputs or Manning prose.
2. `content/catalog.json` is the reviewable source-of-truth for chapter and cell
   coverage.
3. `content/lessons/chapter-NN.json` stores original course lessons and
   `content/course.json` records the chapters that passed editorial review.
4. `scripts/build.mjs` generates a dependency-free static site into `dist/`.
5. Notebook pages fetch code directly from the pinned upstream GitHub commit at
   viewing time and pair it with the locally authored explanations.
6. `scripts/check.mjs` fails unless reviewed lessons satisfy the content
   contract and all chapters, notebooks, cells, routes, and
   required Pages artifacts are present.
7. `.github/workflows/pages.yml` rebuilds and deploys the verified artifact.

## Review findings and decisions

### Completeness

The source contains 63 notebooks and 810 executable code cells. A generated
catalog is safer than maintaining hundreds of hand-written links. The build
still produces a human-readable page for every notebook and chapter.

### Copyright and attribution

The upstream repository has no explicit license file. The site therefore does
not commit or redistribute the notebooks. It pins and links the authoritative
GitHub source, fetches code in the reader, and publishes only original summaries
and explanations. The site is an independent companion, not the book text.

### Runtime expectations

The browser reader explains code but does not execute PyTorch. Each notebook
page links to Colab and the original GitHub file. Local execution instructions
keep Jupyter rooted at the upstream checkout so relative data paths work.

### Deployment

GitHub Pages is public by design. The workflow uses official Pages actions and
deploys only after the same build checks pass locally. Git transport uses SSH;
GitHub API or browser authentication is needed only once to create the remote
repository and enable Pages.

## Acceptance gates

- `npm run build` exits successfully.
- The generated audit reports 17 chapters, 63 notebooks, and 810 code cells.
- The generated audit reports two complete locales and 810 Vietnamese cell
  explanations.
- All 94 lesson examples render localized purpose comments and syntax/API
  guides; all inline teaching-comment rules are exercised.
- Thirteen bilingual, accessible concept diagrams target valid lesson sections
  and preserve exact stage parity between locales.
- Every syntax/API guide links to reachable official Python or PyTorch
  documentation.
- Root, chapter, notebook, 404, sitemap, robots, and `.nojekyll` files exist.
- Every notebook points to the pinned upstream commit.
- Every reviewed lesson has learning outcomes, substantive sections, current
  API notes, exercises, a LearnPyTorch credit, and official PyTorch references.
- `content/course.json` and the lesson file set match exactly.
- No generated page contains notebook output payloads.
- Every localized route has exact canonical/alternate metadata and every
  internal link and fragment resolves.
- The repository is committed, pushed through an SSH `origin`, and the Pages
  deployment reports success.
