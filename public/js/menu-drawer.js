/**
 * LocalLeaf Project Settings Menu Drawer & Word Count
 */

export class MenuDrawer {
  constructor(options = {}) {
    this.overlay = options.overlay;
    this.drawer = options.drawer;
    this.btnOpen = options.btnOpen;
    this.btnClose = options.btnClose;

    this.selectCompiler = options.selectCompiler;
    this.selectMainFile = options.selectMainFile;
    this.toggleAutoCompile = options.toggleAutoCompile;
    this.selectTheme = options.selectTheme;
    this.btnWordCount = options.btnWordCount;
    this.btnDownloadZip = options.btnDownloadZip;
    this.btnDownloadPdf = options.btnDownloadPdf;

    this.onUpdateSettings = options.onUpdateSettings || (() => {});
    this.onToggleAutoCompile = options.onToggleAutoCompile || (() => {});
    this.onChangeTheme = options.onChangeTheme || (() => {});

    this.projectId = null;
    this.projectData = null;

    this.init();
  }

  init() {
    if (this.btnOpen) {
      this.btnOpen.addEventListener('click', () => this.open());
    }
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }

    if (this.selectCompiler) {
      this.selectCompiler.addEventListener('change', () => {
        this.onUpdateSettings({ compiler: this.selectCompiler.value });
      });
    }

    if (this.selectMainFile) {
      this.selectMainFile.addEventListener('change', () => {
        this.onUpdateSettings({ mainFile: this.selectMainFile.value });
      });
    }

    if (this.toggleAutoCompile) {
      this.toggleAutoCompile.addEventListener('change', () => {
        this.onToggleAutoCompile(this.toggleAutoCompile.checked);
      });
    }

    if (this.selectTheme) {
      this.selectTheme.addEventListener('change', () => {
        this.onChangeTheme(this.selectTheme.value);
      });
    }

    if (this.btnWordCount) {
      this.btnWordCount.addEventListener('click', () => {
        this.showWordCountModal();
      });
    }

    if (this.btnDownloadZip) {
      this.btnDownloadZip.addEventListener('click', () => {
        if (!this.projectId) return;
        window.location.href = `/api/projects/${this.projectId}/export`;
      });
    }

    if (this.btnDownloadPdf) {
      this.btnDownloadPdf.addEventListener('click', () => {
        if (!this.projectId) return;
        window.open(`/api/projects/${this.projectId}/pdf`, '_blank');
      });
    }
  }

  setProject(project) {
    this.projectId = project.id;
    this.projectData = project;

    if (this.selectCompiler) {
      this.selectCompiler.value = project.compiler || 'pdflatex';
    }

    if (this.selectMainFile && project.files) {
      this.updateMainFileList(project.files, project.mainFile || 'main.tex');
    }
  }

  updateMainFileList(files, activeMain) {
    if (!this.selectMainFile) return;
    this.selectMainFile.innerHTML = '';

    const texFiles = [];
    const findTex = (items) => {
      for (const item of items) {
        if (!item.isDir && item.name.endsWith('.tex')) {
          texFiles.push(item.path);
        }
        if (item.children) findTex(item.children);
      }
    };
    findTex(files);

    for (const file of texFiles) {
      const opt = document.createElement('option');
      opt.value = file;
      opt.textContent = file;
      if (file === activeMain) opt.selected = true;
      this.selectMainFile.appendChild(opt);
    }
  }

  open() {
    if (this.overlay) this.overlay.classList.add('open');
    if (this.drawer) this.drawer.classList.add('open');
  }

  close() {
    if (this.overlay) this.overlay.classList.remove('open');
    if (this.drawer) this.drawer.classList.remove('open');
  }

  async showWordCountModal() {
    if (!this.projectId) return;

    try {
      const res = await fetch(`/api/projects/${this.projectId}/wordcount`);
      const stats = await res.json();

      let modalEl = document.getElementById('wordCountModal');
      if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'wordCountModal';
        modalEl.className = 'modal-overlay';
        document.body.appendChild(modalEl);
      }

      modalEl.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Document Statistics</h3>
            <button class="btn-close-modal" id="closeWordCountBtn">✕</button>
          </div>
          <div class="modal-body">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${stats.words.toLocaleString()}</div>
                <div class="stat-label">Words</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.characters.toLocaleString()}</div>
                <div class="stat-label">Characters</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.headings}</div>
                <div class="stat-label">Section Headers</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.mathFormulas}</div>
                <div class="stat-label">Math Formulas</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.figures}</div>
                <div class="stat-label">Figures</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.tables}</div>
                <div class="stat-label">Tables</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" id="doneWordCountBtn">Done</button>
          </div>
        </div>
      `;

      modalEl.classList.add('open');

      const closeHandler = () => modalEl.classList.remove('open');
      modalEl.querySelector('#closeWordCountBtn').addEventListener('click', closeHandler);
      modalEl.querySelector('#doneWordCountBtn').addEventListener('click', closeHandler);
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) closeHandler();
      });

    } catch (err) {
      alert('Failed to calculate word count: ' + err.message);
    }
  }
}
