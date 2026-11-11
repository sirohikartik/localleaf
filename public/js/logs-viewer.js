/**
 * LocalLeaf Logs & Diagnostics Console Controller
 */

export class LogsViewer {
  constructor(options = {}) {
    this.drawer = options.drawer;
    this.tabErrorsBtn = options.tabErrorsBtn;
    this.tabRawBtn = options.tabRawBtn;
    this.errorsBadge = options.errorsBadge;
    this.warningsBadge = options.warningsBadge;
    this.contentArea = options.contentArea;
    this.btnClose = options.btnClose;
    this.btnClearAux = options.btnClearAux;
    this.btnToggle = options.btnToggle;

    this.onJumpToLine = options.onJumpToLine || (() => {});
    this.onClearCache = options.onClearCache || (() => {});

    this.projectId = null;
    this.currentTab = 'diagnostics';
    this.diagnostics = { errors: [], warnings: [], rawLog: '' };
    this.isOpen = false;

    this.init();
  }

  init() {
    if (this.btnToggle) {
      this.btnToggle.addEventListener('click', () => this.toggle());
    }

    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }

    if (this.tabErrorsBtn) {
      this.tabErrorsBtn.addEventListener('click', () => this.switchTab('diagnostics'));
    }

    if (this.tabRawBtn) {
      this.tabRawBtn.addEventListener('click', () => this.switchTab('raw'));
    }

    if (this.btnClearAux) {
      this.btnClearAux.addEventListener('click', async () => {
        if (!this.projectId) return;
        await this.onClearCache();
      });
    }
  }

  setProject(projectId) {
    this.projectId = projectId;
    this.clear();
  }

  setDiagnostics(data) {
    this.diagnostics = {
      errors: data.errors || [],
      warnings: data.warnings || [],
      rawLog: data.rawLog || ''
    };

    const errCount = this.diagnostics.errors.length;
    const warnCount = this.diagnostics.warnings.length;

    if (this.errorsBadge) {
      this.errorsBadge.textContent = errCount;
      this.errorsBadge.style.display = errCount > 0 ? 'inline-block' : 'none';
    }

    if (this.warningsBadge) {
      this.warningsBadge.textContent = warnCount;
      this.warningsBadge.style.display = warnCount > 0 ? 'inline-block' : 'none';
    }

    // Auto-open logs if there are compilation errors
    if (errCount > 0 && !this.isOpen) {
      this.open();
    }

    this.render();
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.isOpen = true;
    if (this.drawer) this.drawer.classList.add('open');
    this.render();
  }

  close() {
    this.isOpen = false;
    if (this.drawer) this.drawer.classList.remove('open');
  }

  switchTab(tab) {
    this.currentTab = tab;
    if (this.tabErrorsBtn) this.tabErrorsBtn.classList.toggle('active', tab === 'diagnostics');
    if (this.tabRawBtn) this.tabRawBtn.classList.toggle('active', tab === 'raw');
    this.render();
  }

  render() {
    if (!this.contentArea) return;

    if (this.currentTab === 'diagnostics') {
      const { errors, warnings } = this.diagnostics;

      if (errors.length === 0 && warnings.length === 0) {
        this.contentArea.innerHTML = `
          <div style="text-align:center;padding:32px;color:var(--text-muted);font-size:13px;">
            <div style="font-size:24px;margin-bottom:8px;">✓</div>
            No errors or warnings. Document compiled cleanly!
          </div>
        `;
        return;
      }

      let html = '<div class="diagnostic-list">';

      // Render Errors
      for (const err of errors) {
        html += `
          <div class="diagnostic-item is-error" data-file="${err.file || 'main.tex'}" data-line="${err.line || ''}">
            <div class="diagnostic-item-header">
              <span class="diagnostic-title">
                <span class="error-badge-pill error">ERROR</span>
                ${escapeHtml(err.message)}
              </span>
              ${err.line ? `<span class="diagnostic-file-line">${err.file || 'main.tex'}:${err.line} ➜ Jump</span>` : ''}
            </div>
            ${err.context ? `<div class="diagnostic-snippet">${escapeHtml(err.context)}</div>` : ''}
          </div>
        `;
      }

      // Render Warnings
      for (const warn of warnings) {
        html += `
          <div class="diagnostic-item is-warning" data-file="${warn.file || 'main.tex'}" data-line="${warn.line || ''}">
            <div class="diagnostic-item-header">
              <span class="diagnostic-title">
                <span class="error-badge-pill warning">WARNING</span>
                ${escapeHtml(warn.message)}
              </span>
              ${warn.line ? `<span class="diagnostic-file-line">${warn.file || 'main.tex'}:${warn.line} ➜ Jump</span>` : ''}
            </div>
          </div>
        `;
      }

      html += '</div>';
      this.contentArea.innerHTML = html;

      // Attach click listeners for jump to line
      this.contentArea.querySelectorAll('.diagnostic-item').forEach(el => {
        el.addEventListener('click', () => {
          const file = el.getAttribute('data-file');
          const line = parseInt(el.getAttribute('data-line'), 10);
          if (line) {
            this.onJumpToLine(file, line);
          }
        });
      });

    } else {
      // Raw log
      this.contentArea.innerHTML = `
        <div class="raw-log-container">${escapeHtml(this.diagnostics.rawLog || 'No log output.')}</div>
      `;
    }
  }

  clear() {
    this.diagnostics = { errors: [], warnings: [], rawLog: '' };
    if (this.errorsBadge) this.errorsBadge.style.display = 'none';
    if (this.warningsBadge) this.warningsBadge.style.display = 'none';
    this.render();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
