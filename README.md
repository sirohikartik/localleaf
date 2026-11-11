# 🌿 LocalLeaf

> **A fast, zero-bloat, offline-first Overleaf clone engineered with pure HTML, CSS, and JavaScript.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0_npm_packages-blue.svg)](package.json)
[![LaTeX](https://img.shields.io/badge/LaTeX-pdfLaTeX_%7C_XeLaTeX-purple.svg)](https://www.latex-project.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

LocalLeaf brings the familiar, battle-tested split-screen workflow of **Overleaf** directly to your local computer. It compiles documents locally in milliseconds using your native `pdflatex` or `xelatex` engine, completely eliminating cloud latency, subscription fees, and internet requirements.

---

## ✨ Features

- **⚡ Native Local Compilation:** Runs system `pdflatex` and `xelatex` compilers with automated multi-pass bibliography support (`bibtex`). Typesets standard papers in under 300ms.
- **🚫 Zero Bloat:** Written purely with **HTML5, CSS3, and vanilla modern JavaScript**. No React, no Next.js, no Webpack, and **zero external npm dependencies**.
- **🖥️ Overleaf 3-Pane Workspace:**
  - **Left:** File Tree Explorer with file icons, upload dropzone, new file/folder modals, and main document toggle.
  - **Middle:** Code Editor with real-time LaTeX syntax highlighting, line numbers, error indicators in the gutter, and formatting toolbar (Section, Bold, Italic, Math, Table, Figure, Itemize, Cite).
  - **Right:** Live PDF Preview with interactive zoom controls (Zoom In, Zoom Out, Fit Width) and instant download.
- **🪵 Overleaf-Style Diagnostics & Error Navigation:** Parses compiler outputs into structured error and warning cards with exact line numbers. Clicking an error automatically jumps to the corresponding line in the editor!
- **🔄 Auto-Compile with Debouncing:** Automatically recompiles your document 1.5s after you finish typing, or manually whenever you press <kbd>⌘</kbd>+<kbd>Enter</kbd> / <kbd>Ctrl</kbd>+<kbd>Enter</kbd>.
- **📋 6 Curated Templates:**
  - 📄 **Academic Research Article:** Complete with abstract, sections, equations, tables, and BibTeX citations.
  - 🏆 **IEEE Conference Paper:** Standard two-column conference layout.
  - 💼 **Modern Resume / CV:** Clean, ATS-friendly typography.
  - 📊 **Beamer Presentation Slides:** Modern slide deck with frames and theme blocks.
  - 📐 **Mathematics & Physics Problem Set:** AMS math environments and proof blocks.
  - 📝 **Blank Document:** Minimal starting template.
- **📊 Document Statistics:** Real-time word count, character count, section headers, math formulas, figures, and tables.
- **📦 ZIP Import & Export:** One-click export of your full LaTeX project as a standard `.zip` archive.
- **🌗 Theme Switcher:** Overleaf Classic (Light) and Overleaf Dark modes.
- **🔒 100% Private & Offline:** Your research papers, theses, and documents never leave your local machine.

---

## 🚀 Quick Start

### Prerequisites
1. **Node.js** >= 18 (`node -v`)
2. **TeX Live / MacTeX** with `pdflatex` or `xelatex` in your PATH (`pdflatex -version`)

### Running LocalLeaf
```bash
# Clone the repository
git clone https://github.com/sirohikartik/localleaf.git
cd localleaf

# Launch LocalLeaf
npm start
# or use the CLI binary:
./bin/localleaf
```

LocalLeaf will start at `http://127.0.0.1:3000` and automatically open your default web browser.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>Enter</kbd> | **Recompile Document** |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>S</kbd> | **Save Active File** |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>B</kbd> | Bold text (`\textbf{}`) |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>I</kbd> | Italic text (`\textit{}`) |
| <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Math mode (`$...$`) |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Indent / Unindent 2 spaces |
| <kbd>{</kbd>, <kbd>[</kbd>, <kbd>(</kbd>, <kbd>$</kbd> | Auto-closing bracket pairs |

---

## 🏗️ Architecture

```
localleaf/
├── bin/
│   └── localleaf            # Standalone CLI launcher
├── lib/
│   ├── compiler.js          # Native pdflatex/xelatex & bibtex runner
│   ├── log-parser.js        # LaTeX log diagnostics parser
│   ├── project-manager.js   # Project CRUD, file tree, word counter
│   ├── templates.js         # Built-in academic, resume, and slide templates
│   └── zip.js               # Zero-dependency PKWARE ZIP generator
├── public/
│   ├── index.html           # Single-page Overleaf workspace
│   ├── css/
│   │   ├── variables.css    # Design tokens & dark/light themes
│   │   ├── layout.css       # 3-pane split layout & resizable splitters
│   │   ├── dashboard.css    # Projects grid & template modal
│   │   ├── editor.css       # LaTeX syntax highlighted editor & gutter
│   │   ├── filetree.css     # File tree explorer & icons
│   │   ├── pdf-viewer.css   # Live PDF preview & zoom toolbar
│   │   ├── logs.css         # Diagnostics error drawer & jump links
│   │   └── components.css   # Modals, toasts, and settings drawer
│   └── js/
│       ├── app.js           # Main app orchestrator
│       ├── syntax.js        # Pure JS LaTeX syntax tokenizer
│       ├── editor.js        # Code editor controller & gutter markers
│       ├── filetree.js      # File explorer & drag-drop upload
│       ├── pdf-viewer.js    # PDF viewer controller
│       ├── compiler-client.js # Recompile & debounced auto-compile runner
│       ├── logs-viewer.js   # Diagnostics and raw logs panel
│       ├── menu-drawer.js   # Settings drawer & word count dialog
│       ├── dashboard.js     # Projects dashboard
│       └── shortcuts.js     # Keyboard shortcuts & snippets
├── server.js                # Micro HTTP server (zero npm dependencies)
├── test/
│   ├── test-all-templates.js # Automated verification for all templates
│   └── test-api.js          # Comprehensive REST API integration tests
├── package.json
└── LICENSE
```

---

## 🧪 Testing

Run the automated test suites:
```bash
# Verify all templates compile cleanly with pdflatex
node test/test-all-templates.js

# Verify all REST API endpoints (compilation, file CRUD, ZIP export)
node test/test-api.js
```

---

## 📄 License

MIT © [Kartik Sirohi](https://github.com/sirohikartik)
