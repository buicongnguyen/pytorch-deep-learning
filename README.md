# PyTorch Deep Learning Atlas

An interactive, chapter-by-chapter learning companion for the public code
repository accompanying *Deep Learning with PyTorch, Second Edition*.

The Atlas provides:

- a seventeen-chapter learning roadmap;
- original long-form lessons reviewed against PyTorch 2.13;
- chapter tables of contents, runnable examples, update notes, and exercises;
- localized comments inside all 94 lesson examples, plus syntax/API guides with
  official Python and PyTorch references;
- thirteen responsive concept diagrams for the chapters where flow, shape, or
  system relationships benefit from a visual explanation;
- a page for every upstream Jupyter notebook;
- plain-language explanations for each code cell;
- complete English and Vietnamese routes for all lessons and notebook readers;
- direct links to the pinned source and Google Colab;
- locale-aware search (including Vietnamese queries without diacritics), dark
  mode, responsive navigation, and copyable code;
- deterministic coverage and GitHub Pages deployment checks.

English remains at the original URLs. The Vietnamese course starts at
`/pytorch-deep-learning/vi/`, with reciprocal language links on equivalent
pages. Both versions share the same audited Python examples, notebook slugs,
source URLs, and section anchors; only learner-facing text is localized.

The lesson format acknowledges [Learn PyTorch for Deep
Learning](https://www.learnpytorch.io/) as a teaching reference. Current API
guidance links to official PyTorch documentation, while the book notebooks stay
pinned as the historical and executable code companion.

The project does not reproduce the book's prose or commit the upstream
notebooks. Notebook code is loaded from the pinned authoritative GitHub source
when a reader page opens. Explanations and the site implementation are original
to this repository.

## Build

Node.js 24 or newer is required.

```powershell
npm run build
npm start
```

The build produces 81 logical pages in each language, two 184-record search
indexes, reciprocal `hreflang` metadata, and one bilingual sitemap. Validation
requires all 17 Vietnamese chapter overlays, all 810 localized notebook-cell
explanations, all 94 code-teaching guides, and 13 bilingual diagrams before the
site can ship.

To refresh the catalog from a local checkout:

```powershell
$env:DLWPT_SOURCE = "C:\path\to\dlwpt-code-2e"
npm run import
```

See [PLAN.md](PLAN.md) for the reviewed architecture, risks, and acceptance
gates.
