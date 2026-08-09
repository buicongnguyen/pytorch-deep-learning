# PyTorch Deep Learning Atlas

An interactive, chapter-by-chapter learning companion for the public code
repository accompanying *Deep Learning with PyTorch, Second Edition*.

The Atlas provides:

- a seventeen-chapter learning roadmap;
- a page for every upstream Jupyter notebook;
- plain-language explanations for each code cell;
- direct links to the pinned source and Google Colab;
- search, dark mode, responsive navigation, and copyable code;
- deterministic coverage and GitHub Pages deployment checks.

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

To refresh the catalog from a local checkout:

```powershell
$env:DLWPT_SOURCE = "C:\path\to\dlwpt-code-2e"
npm run import
```

See [PLAN.md](PLAN.md) for the reviewed architecture, risks, and acceptance
gates.
