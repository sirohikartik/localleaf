/**
 * LocalLeaf LaTeX Code Editor Controller
 * Zero-dependency synchronized highlight, gutter, and diagnostics integration.
 */

import { highlightLatex } from './syntax.js';
import { setupKeyboardShortcuts, wrapSelection, insertSnippet } from './shortcuts.js';

export class LatexEditor {
  constructor(options = {}) {
    this.container = options.container;
    this.textarea = options.textarea;
    this.highlightLayer = options.highlightLayer;
    this.gutter = options.gutter;
    this.statusBarCursor = options.statusBarCursor;

    this.onSave = options.onSave || (() => {});
    this.onChange = options.onChange || (() => {});
    this.onRecompile = options.onRecompile || (() => {});

    this.currentFile = 'main.tex';
    this.diagnostics = { errors: [], warnings: [] };
    this.isDirty = false;

    this.init();
  }

  init() {
    // Synchronize scrolling between textarea, highlight layer, and gutter
    this.textarea.addEventListener('scroll', () => {
      this.syncScroll();
    });

    // Handle input and update syntax layer & gutter
    this.textarea.addEventListener('input', () => {
      this.isDirty = true;
      this.updateHighlight();
      this.updateGutter();
      this.updateCursorStatus();
      this.onChange(this.textarea.value);
    });

    // Update cursor position on click / keyup / selectionchange
    this.textarea.addEventListener('click', () => this.updateCursorStatus());
    this.textarea.addEventListener('keyup', () => this.updateCursorStatus());

    // Setup shortcuts and bracket matching
    setupKeyboardShortcuts({
      textarea: this.textarea,
      onRecompile: this.onRecompile,
      onSave: this.onSave,
      onInputUpdate: () => {
        this.isDirty = true;
        this.updateHighlight();
        this.updateGutter();
        this.updateCursorStatus();
        this.onChange(this.textarea.value);
      }
    });

    this.updateHighlight();
    this.updateGutter();
  }

  setValue(value, filename = 'main.tex') {
    this.currentFile = filename;
    this.textarea.value = value || '';
    this.isDirty = false;
    this.updateHighlight();
    this.updateGutter();
    this.updateCursorStatus();
    this.textarea.scrollTop = 0;
    this.syncScroll();
  }

  getValue() {
    return this.textarea.value;
  }

  syncScroll() {
    const top = this.textarea.scrollTop;
    const left = this.textarea.scrollLeft;
    this.highlightLayer.scrollTop = top;
    this.highlightLayer.scrollLeft = left;
    this.gutter.scrollTop = top;
  }

  updateHighlight() {
    const val = this.textarea.value;
    // Add extra newline if ends with newline for alignment
    const content = val.endsWith('\n') ? val + ' ' : val;
    this.highlightLayer.innerHTML = highlightLatex(content);
  }

  updateGutter() {
    const lines = this.textarea.value.split('\n');
    const lineCount = lines.length;

    let html = '';
    const errorLines = new Set(
      this.diagnostics.errors
        .filter(e => !e.file || e.file === this.currentFile || e.file.endsWith(this.currentFile))
        .map(e => e.line)
    );
    const warningLines = new Set(
      this.diagnostics.warnings
        .filter(w => !w.file || w.file === this.currentFile || w.file.endsWith(this.currentFile))
        .map(w => w.line)
    );

    for (let i = 1; i <= lineCount; i++) {
      let marker = '';
      if (errorLines.has(i)) {
        marker = `<span class="gutter-marker error" title="LaTeX Error on line ${i}"></span>`;
      } else if (warningLines.has(i)) {
        marker = `<span class="gutter-marker warning" title="LaTeX Warning on line ${i}"></span>`;
      }

      html += `<div class="gutter-line" data-line="${i}">${marker}${i}</div>`;
    }

    this.gutter.innerHTML = html;
  }

  setDiagnostics(diagnostics) {
    this.diagnostics = diagnostics || { errors: [], warnings: [] };
    this.updateGutter();
  }

  updateCursorStatus() {
    if (!this.statusBarCursor) return;
    const start = this.textarea.selectionStart;
    const textBefore = this.textarea.value.substring(0, start);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    this.statusBarCursor.textContent = `Ln ${line}, Col ${col}`;
  }

  goToLine(lineNumber) {
    if (!lineNumber || lineNumber < 1) return;
    const lines = this.textarea.value.split('\n');
    let charIndex = 0;
    for (let i = 0; i < Math.min(lineNumber - 1, lines.length); i++) {
      charIndex += lines[i].length + 1;
    }

    this.textarea.focus();
    this.textarea.setSelectionRange(charIndex, charIndex + (lines[lineNumber - 1] ? lines[lineNumber - 1].length : 0));

    // Scroll textarea to center line
    const lineHeight = 13.5 * 1.55;
    const targetScroll = (lineNumber - 1) * lineHeight - (this.textarea.clientHeight / 2);
    this.textarea.scrollTop = Math.max(0, targetScroll);
    this.syncScroll();
  }

  // Snippet Quick Insertions
  insertBold() {
    wrapSelection(this.textarea, '\\textbf{', '}');
    this.triggerEdit();
  }

  insertItalic() {
    wrapSelection(this.textarea, '\\textit{', '}');
    this.triggerEdit();
  }

  insertSection() {
    insertSnippet(this.textarea, '\n\\section{New Section}\n');
    this.triggerEdit();
  }

  insertEquation() {
    insertSnippet(this.textarea, '\n\\begin{equation}\n  \n\\end{equation}\n');
    this.triggerEdit();
  }

  insertItemize() {
    insertSnippet(this.textarea, '\n\\begin{itemize}\n  \\item First item\n  \\item Second item\n\\end{itemize}\n');
    this.triggerEdit();
  }

  insertFigure() {
    insertSnippet(this.textarea, '\n\\begin{figure}[htbp]\n  \\centering\n  % \\includegraphics[width=0.8\\linewidth]{image.png}\n  \\caption{Caption description}\n  \\label{fig:example}\n\\end{figure}\n');
    this.triggerEdit();
  }

  insertTable() {
    insertSnippet(this.textarea, '\n\\begin{table}[htbp]\n  \\centering\n  \\caption{Table Caption}\n  \\label{tab:sample}\n  \\begin{tabular}{llr}\n    \\toprule\n    Item & Category & Count \\\\\n    \\midrule\n    Alpha & First & 10 \\\\\n    Beta & Second & 20 \\\\\n    \\bottomrule\n  \\end{tabular}\n\\end{table}\n');
    this.triggerEdit();
  }

  insertCite() {
    wrapSelection(this.textarea, '\\cite{', '}');
    this.triggerEdit();
  }

  triggerEdit() {
    this.isDirty = true;
    this.updateHighlight();
    this.updateGutter();
    this.updateCursorStatus();
    this.onChange(this.textarea.value);
  }
}
