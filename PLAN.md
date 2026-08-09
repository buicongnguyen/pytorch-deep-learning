# PyTorch Deep Learning Atlas: reviewed implementation plan

## Objective

Build and publish an original GitHub Pages learning companion for the code in
`deep-learning-with-pytorch/dlwpt-code-2e`. The experience should echo the
clarity of the local `helloalgo` project: a visible learning path, a focused
reader, responsive navigation, search, theme controls, and code presented next
to plain-language explanations.

Target repository: `buicongnguyen/pytorch-deep-learning`

Target URL: `https://buicongnguyen.github.io/pytorch-deep-learning/`

## Reviewed scope

- Seventeen chapter routes, including context pages for chapters without a
  dedicated notebook.
- Sixty-three notebook routes.
- Explanations for all 810 code cells in the pinned upstream snapshot.
- Chapter summaries, notebook learning goals, source links, Colab links, code
  copying, search, dark/light themes, keyboard focus, and mobile navigation.
- Deterministic build and coverage checks.
- GitHub Actions deployment to Pages from `main`.

## Architecture

1. `scripts/import-catalog.mjs` reads a local upstream checkout and records
   notebook paths, code-cell counts, concepts, and original explanations. It
   never stores notebook outputs or Manning prose.
2. `content/catalog.json` is the reviewable source-of-truth for chapter and cell
   coverage.
3. `scripts/build.mjs` generates a dependency-free static site into `dist/`.
4. Notebook pages fetch code directly from the pinned upstream GitHub commit at
   viewing time and pair it with the locally authored explanations.
5. `scripts/check.mjs` fails unless all chapters, notebooks, cells, routes, and
   required Pages artifacts are present.
6. `.github/workflows/pages.yml` rebuilds and deploys the verified artifact.

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
- Root, chapter, notebook, 404, sitemap, robots, and `.nojekyll` files exist.
- Every notebook points to the pinned upstream commit.
- No generated page contains notebook output payloads.
- The repository is committed, pushed through an SSH `origin`, and the Pages
  deployment reports success.
