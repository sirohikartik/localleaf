/**
 * LocalLeaf Compiler Client
 * Coordinates compilation lifecycle, debounce auto-compile, and status badges.
 */

export class CompilerClient {
  constructor(options = {}) {
    this.projectId = null;
    this.engine = 'pdflatex';
    this.mainFile = 'main.tex';

    this.recompileBtn = options.recompileBtn;
    this.statusPill = options.statusPill;
    this.onCompileComplete = options.onCompileComplete || (() => {});
    this.onStatusClick = options.onStatusClick || (() => {});

    this.isCompiling = false;
    this.autoCompileEnabled = true;
    this.debounceTimer = null;
    this.debounceMs = 1500;

    this.init();
  }

  init() {
    if (this.recompileBtn) {
      this.recompileBtn.addEventListener('click', () => {
        this.triggerCompile();
      });
    }

    if (this.statusPill) {
      this.statusPill.addEventListener('click', () => {
        this.onStatusClick();
      });
    }
  }

  setProject(projectId, mainFile = 'main.tex', engine = 'pdflatex') {
    this.projectId = projectId;
    this.mainFile = mainFile;
    this.engine = engine;
  }

  setAutoCompile(enabled) {
    this.autoCompileEnabled = enabled;
  }

  notifyEdit() {
    if (!this.autoCompileEnabled) return;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.triggerCompile({ auto: true });
    }, this.debounceMs);
  }

  async triggerCompile(options = {}) {
    if (this.isCompiling || !this.projectId) return;

    this.isCompiling = true;
    this.setButtonState(true);
    this.setStatus('compiling', 'Compiling...');

    try {
      const response = await fetch(`/api/projects/${this.projectId}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: this.engine,
          mainFile: this.mainFile,
          draft: options.draft || false
        })
      });

      const result = await response.json();
      const durationSec = (result.durationMs / 1000).toFixed(2);

      if (result.success) {
        if (result.warningCount > 0) {
          this.setStatus('warning', `Compiled in ${durationSec}s (${result.warningCount} warn)`);
        } else {
          this.setStatus('success', `Compiled in ${durationSec}s`);
        }
      } else {
        const errText = result.errorCount > 0 ? `${result.errorCount} Error${result.errorCount > 1 ? 's' : ''}` : 'Compile failed';
        this.setStatus('error', errText);
      }

      this.onCompileComplete(result);
    } catch (err) {
      console.error('Compilation error:', err);
      this.setStatus('error', 'Error running compiler');
      this.onCompileComplete({
        success: false,
        errors: [{ type: 'error', message: err.message, file: this.mainFile, line: 1 }],
        warnings: []
      });
    } finally {
      this.isCompiling = false;
      this.setButtonState(false);
    }
  }

  setButtonState(compiling) {
    if (!this.recompileBtn) return;
    if (compiling) {
      this.recompileBtn.classList.add('is-compiling');
      this.recompileBtn.innerHTML = `
        <span class="recompile-icon">⟳</span>
        <span>Compiling...</span>
      `;
    } else {
      this.recompileBtn.classList.remove('is-compiling');
      this.recompileBtn.innerHTML = `
        <span class="recompile-icon">▶</span>
        <span>Recompile</span>
        <span class="recompile-shortcut">⌘↵</span>
      `;
    }
  }

  setStatus(type, text) {
    if (!this.statusPill) return;
    this.statusPill.className = `status-pill ${type}`;
    this.statusPill.textContent = text;
    this.statusPill.style.display = 'inline-flex';
  }
}
