/**
 * LocalLeaf Main Application Orchestrator
 * Pure JavaScript, zero dependencies.
 */

import { LatexEditor } from './editor.js';
import { FileTree } from './filetree.js';
import { PdfViewer } from './pdf-viewer.js';
import { CompilerClient } from './compiler-client.js';
import { LogsViewer } from './logs-viewer.js';
import { MenuDrawer } from './menu-drawer.js';
import { Dashboard } from './dashboard.js';

class App {
  constructor() {
    this.currentProjectId = null;
    this.currentProject = null;
    this.activeFilePath = null;
    this.saveTimeout = null;

    this.initElements();
    this.initModules();
    this.initSplitters();
    this.initGlobalEvents();
    this.applyTheme(localStorage.getItem('localleaf_theme') || 'light');

    // Route: check URL hash
    window.addEventListener('hashchange', () => this.handleRouting());
    this.handleRouting();
  }

  initElements() {
    // Views
    this.viewDashboard = document.getElementById('viewDashboard');
    this.viewWorkspace = document.getElementById('viewWorkspace');

    // Workspace elements
    this.projectTitleInput = document.getElementById('projectTitleInput');
    this.btnBack = document.getElementById('btnBackToDashboard');
    this.fileTabBar = document.getElementById('fileTabBar');
    this.statusSave = document.getElementById('statusSave');
    this.statusBarCursor = document.getElementById('statusBarCursor');
    this.statusProjectInfo = document.getElementById('statusProjectInfo');

    // Sidebar Action Buttons
    this.btnNewFile = document.getElementById('btnNewFile');
    this.btnNewFolder = document.getElementById('btnNewFolder');
    this.btnUploadFile = document.getElementById('btnUploadFile');
    this.fileUploadInput = document.getElementById('fileUploadInput');

    // Snippet Tool Buttons
    this.btnToolBold = document.getElementById('btnToolBold');
    this.btnToolItalic = document.getElementById('btnToolItalic');
    this.btnToolSection = document.getElementById('btnToolSection');
    this.btnToolEquation = document.getElementById('btnToolEquation');
    this.btnToolItemize = document.getElementById('btnToolItemize');
    this.btnToolFigure = document.getElementById('btnToolFigure');
    this.btnToolTable = document.getElementById('btnToolTable');
    this.btnToolCite = document.getElementById('btnToolCite');
  }

  initModules() {
    // 1. Dashboard
    this.dashboard = new Dashboard({
      container: this.viewDashboard,
      projectsGrid: document.getElementById('projectsGrid'),
      searchInput: document.getElementById('dashboardSearchInput'),
      btnNewProject: document.getElementById('btnNewProject'),
      btnOpenFolder: document.getElementById('btnOpenFolder'),
      onOpenProject: (id) => {
        window.location.hash = `#/project/${id}`;
      }
    });

    // 2. Code Editor
    this.editor = new LatexEditor({
      container: document.getElementById('editorContainer'),
      textarea: document.getElementById('editorTextarea'),
      highlightLayer: document.getElementById('editorHighlightLayer'),
      gutter: document.getElementById('editorGutter'),
      statusBarCursor: this.statusBarCursor,
      onSave: () => this.saveCurrentFile(),
      onChange: (val) => {
        this.setSaveStatus('Unsaved changes...');
        this.compilerClient.notifyEdit();
        this.debounceAutoSave();
      },
      onRecompile: () => this.triggerRecompile()
    });

    // 3. File Tree
    this.fileTree = new FileTree({
      container: document.getElementById('fileTreeContainer'),
      onSelectFile: (filePath) => this.loadFile(filePath),
      onDeleteFile: (filePath) => this.deleteFile(filePath),
      onUploadFile: (filename, content, isBase64) => this.uploadFile(filename, content, isBase64),
      onSetMain: (filePath) => this.setMainDocument(filePath)
    });

    // 4. PDF Viewer
    this.pdfViewer = new PdfViewer({
      viewport: document.getElementById('pdfViewport'),
      zoomLabel: document.getElementById('pdfZoomLabel'),
      btnZoomIn: document.getElementById('btnPdfZoomIn'),
      btnZoomOut: document.getElementById('btnPdfZoomOut'),
      btnFitWidth: document.getElementById('btnPdfFitWidth'),
      btnDownload: document.getElementById('btnPdfDownload')
    });

    // 5. Compiler Client
    this.compilerClient = new CompilerClient({
      recompileBtn: document.getElementById('btnRecompile'),
      statusPill: document.getElementById('recompileStatusPill'),
      onCompileComplete: (result) => {
        this.pdfViewer.reload();
        this.editor.setDiagnostics(result);
        this.logsViewer.setDiagnostics(result);
      },
      onStatusClick: () => {
        this.logsViewer.toggle();
      }
    });

    // 6. Logs Viewer
    this.logsViewer = new LogsViewer({
      drawer: document.getElementById('logsDrawer'),
      tabErrorsBtn: document.getElementById('logsTabErrors'),
      tabRawBtn: document.getElementById('logsTabRaw'),
      errorsBadge: document.getElementById('logsErrorsBadge'),
      warningsBadge: document.getElementById('logsWarningsBadge'),
      contentArea: document.getElementById('logsContentArea'),
      btnClose: document.getElementById('btnCloseLogs'),
      btnClearAux: document.getElementById('btnClearAux'),
      btnToggle: document.getElementById('btnToggleLogs'),
      onJumpToLine: (file, line) => {
        if (file && file !== this.activeFilePath && file.endsWith('.tex')) {
          this.loadFile(file).then(() => {
            this.editor.goToLine(line);
          });
        } else {
          this.editor.goToLine(line);
        }
      },
      onClearCache: async () => {
        await fetch(`/api/projects/${this.currentProjectId}/clean`, { method: 'POST' });
        this.showToast('Cleaned auxiliary files', 'info');
      }
    });

    // 7. Menu Drawer
    this.menuDrawer = new MenuDrawer({
      overlay: document.getElementById('menuDrawerOverlay'),
      drawer: document.getElementById('menuDrawer'),
      btnOpen: document.getElementById('btnOpenMenu'),
      btnClose: document.getElementById('btnCloseMenu'),
      selectCompiler: document.getElementById('drawerSelectCompiler'),
      selectMainFile: document.getElementById('drawerSelectMainFile'),
      toggleAutoCompile: document.getElementById('drawerToggleAutoCompile'),
      selectTheme: document.getElementById('drawerSelectTheme'),
      btnWordCount: document.getElementById('drawerBtnWordCount'),
      btnDownloadZip: document.getElementById('drawerBtnDownloadZip'),
      btnDownloadPdf: document.getElementById('drawerBtnDownloadPdf'),
      onUpdateSettings: async (updates) => {
        await fetch(`/api/projects/${this.currentProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        if (updates.compiler) this.compilerClient.engine = updates.compiler;
        if (updates.mainFile) {
          this.compilerClient.mainFile = updates.mainFile;
          this.fileTree.mainFile = updates.mainFile;
          this.fileTree.render();
        }
        this.showToast('Project settings saved', 'success');
      },
      onToggleAutoCompile: (enabled) => {
        this.compilerClient.setAutoCompile(enabled);
        this.showToast(`Auto-compile ${enabled ? 'enabled' : 'disabled'}`, 'info');
      },
      onChangeTheme: (theme) => {
        this.applyTheme(theme);
      }
    });
  }

  initSplitters() {
    // Sidebar resizer
    const resizerSidebar = document.getElementById('resizerSidebar');
    const paneSidebar = document.getElementById('paneSidebar');

    let isResizingSidebar = false;
    resizerSidebar.addEventListener('mousedown', (e) => {
      isResizingSidebar = true;
      resizerSidebar.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    // Editor / PDF resizer
    const resizerEditor = document.getElementById('resizerEditor');
    const paneEditor = document.getElementById('paneEditor');
    const panePdf = document.getElementById('panePdf');
    let isResizingEditor = false;

    resizerEditor.addEventListener('mousedown', (e) => {
      isResizingEditor = true;
      resizerEditor.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (isResizingSidebar) {
        const newWidth = Math.max(180, Math.min(500, e.clientX));
        paneSidebar.style.width = `${newWidth}px`;
      }
      if (isResizingEditor) {
        const containerRect = document.querySelector('.workspace-container').getBoundingClientRect();
        const sidebarWidth = paneSidebar.offsetWidth;
        const availableWidth = containerRect.width - sidebarWidth;
        const relativeX = e.clientX - sidebarWidth;

        const leftPercent = Math.max(25, Math.min(75, (relativeX / availableWidth) * 100));
        paneEditor.style.flex = `1 1 ${leftPercent}%`;
        panePdf.style.flex = `1 1 ${100 - leftPercent}%`;
      }
    });

    window.addEventListener('mouseup', () => {
      if (isResizingSidebar || isResizingEditor) {
        isResizingSidebar = false;
        isResizingEditor = false;
        resizerSidebar.classList.remove('dragging');
        resizerEditor.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  initGlobalEvents() {
    // Back button
    this.btnBack.addEventListener('click', () => {
      window.location.hash = '#/';
    });

    // Title edit
    this.projectTitleInput.addEventListener('change', async () => {
      const newTitle = this.projectTitleInput.value.trim();
      if (!newTitle || !this.currentProjectId) return;
      await fetch(`/api/projects/${this.currentProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      this.showToast('Title renamed', 'success');
    });

    // Toolbar Snippet buttons
    this.btnToolBold.addEventListener('click', () => this.editor.insertBold());
    this.btnToolItalic.addEventListener('click', () => this.editor.insertItalic());
    this.btnToolSection.addEventListener('click', () => this.editor.insertSection());
    this.btnToolEquation.addEventListener('click', () => this.editor.insertEquation());
    this.btnToolItemize.addEventListener('click', () => this.editor.insertItemize());
    this.btnToolFigure.addEventListener('click', () => this.editor.insertFigure());
    this.btnToolTable.addEventListener('click', () => this.editor.insertTable());
    this.btnToolCite.addEventListener('click', () => this.editor.insertCite());

    // New File button
    this.btnNewFile.addEventListener('click', () => this.showNewFileDialog());
    this.btnNewFolder.addEventListener('click', () => this.showNewFolderDialog());

    // Upload button
    this.btnUploadFile.addEventListener('click', () => {
      this.fileUploadInput.click();
    });

    // Shortcuts & Help Modal
    const btnShortcutsHelp = document.getElementById('btnShortcutsHelp');
    if (btnShortcutsHelp) {
      btnShortcutsHelp.addEventListener('click', () => this.showShortcutsModal());
    }

    this.fileUploadInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        for (const file of e.target.files) {
          await this.fileTree.uploadFileObject(file);
        }
        this.fileUploadInput.value = '';
      }
    });
  }

  async handleRouting() {
    const hash = window.location.hash || '#/';
    if (hash.startsWith('#/project/')) {
      const projectId = hash.replace('#/project/', '');
      await this.openWorkspace(projectId);
    } else {
      this.openDashboard();
    }
  }

  openDashboard() {
    this.viewWorkspace.classList.add('hidden');
    this.viewDashboard.classList.remove('hidden');
    this.dashboard.loadProjects();
  }

  async openWorkspace(projectId) {
    this.currentProjectId = projectId;
    this.viewDashboard.classList.add('hidden');
    this.viewWorkspace.classList.remove('hidden');

    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Project not found');
      this.currentProject = await res.json();

      this.projectTitleInput.value = this.currentProject.title;
      this.statusProjectInfo.textContent = `${this.currentProject.compiler || 'pdflatex'}`;

      this.fileTree.setProject(projectId, this.currentProject.files, this.currentProject.mainFile || 'main.tex');
      this.compilerClient.setProject(projectId, this.currentProject.mainFile || 'main.tex', this.currentProject.compiler || 'pdflatex');
      this.logsViewer.setProject(projectId);
      this.menuDrawer.setProject(this.currentProject);

      const mainFile = this.currentProject.mainFile || 'main.tex';
      await this.loadFile(mainFile);

      // Check if PDF already compiled
      const hasPdf = this.currentProject.files.some(f => f.name === `${mainFile.replace('.tex', '')}.pdf`);
      this.pdfViewer.setProject(projectId, hasPdf);

      // Trigger initial compile if no PDF yet
      if (!hasPdf) {
        this.triggerRecompile();
      }
    } catch (err) {
      alert('Error opening project: ' + err.message);
      window.location.hash = '#/';
    }
  }

  async loadFile(filePath) {
    try {
      this.activeFilePath = filePath;
      const res = await fetch(`/api/projects/${this.currentProjectId}/files?path=${encodeURIComponent(filePath)}`);
      const file = await res.json();

      this.editor.setValue(file.content, filePath);
      this.updateTabBar(filePath);
      this.setSaveStatus('Saved');
    } catch (err) {
      this.showToast('Failed to load file: ' + err.message, 'error');
    }
  }

  updateTabBar(filePath) {
    this.fileTabBar.innerHTML = `
      <div class="file-tab active">
        <span class="tab-icon">📄</span>
        <span>${filePath}</span>
      </div>
    `;
  }

  debounceAutoSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.saveCurrentFile();
    }, 1200);
  }

  async saveCurrentFile() {
    if (!this.currentProjectId || !this.activeFilePath) return;
    try {
      const content = this.editor.getValue();
      await fetch(`/api/projects/${this.currentProjectId}/files?path=${encodeURIComponent(this.activeFilePath)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      this.setSaveStatus('Saved');
    } catch (err) {
      this.setSaveStatus('Save failed');
    }
  }

  async triggerRecompile() {
    await this.saveCurrentFile();
    await this.compilerClient.triggerCompile();
  }

  async setMainDocument(filePath) {
    await fetch(`/api/projects/${this.currentProjectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mainFile: filePath })
    });
    this.currentProject.mainFile = filePath;
    this.fileTree.mainFile = filePath;
    this.compilerClient.mainFile = filePath;
    this.fileTree.render();
    this.showToast(`Set "${filePath}" as main document`, 'success');
  }

  async deleteFile(filePath) {
    try {
      await fetch(`/api/projects/${this.currentProjectId}/files?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE'
      });
      this.showToast(`Deleted ${filePath}`, 'info');
      await this.refreshProjectTree();
      if (this.activeFilePath === filePath) {
        await this.loadFile(this.currentProject.mainFile || 'main.tex');
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  async uploadFile(filename, content, isBase64) {
    try {
      await fetch(`/api/projects/${this.currentProjectId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filename,
          content,
          isBase64
        })
      });
      this.showToast(`Uploaded ${filename}`, 'success');
      await this.refreshProjectTree();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  }

  async refreshProjectTree() {
    const res = await fetch(`/api/projects/${this.currentProjectId}`);
    this.currentProject = await res.json();
    this.fileTree.setProject(this.currentProjectId, this.currentProject.files, this.currentProject.mainFile);
  }

  showShortcutsModal() {
    let modalEl = document.getElementById('shortcutsModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'shortcutsModal';
      modalEl.className = 'modal-overlay';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-dialog" style="max-width: 640px;">
        <div class="modal-header">
          <h3>Keyboard Shortcuts & \\LaTeX{} Reference</h3>
          <button class="btn-close-modal" id="closeShortcutsModalBtn">✕</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
          <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Editor Shortcuts</h4>
          <table class="shortcuts-table" style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th>Action</th>
                <th>Shortcut</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Recompile Document</td>
                <td><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>Enter</kbd></td>
              </tr>
              <tr>
                <td>Save Active File</td>
                <td><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>S</kbd></td>
              </tr>
              <tr>
                <td>Bold Selection</td>
                <td><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>B</kbd> &nbsp; (<code>\\textbf{...}</code>)</td>
              </tr>
              <tr>
                <td>Italic Selection</td>
                <td><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>I</kbd> &nbsp; (<code>\\textit{...}</code>)</td>
              </tr>
              <tr>
                <td>Inline Math Selection</td>
                <td><kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> &nbsp; (<code>$...$</code>)</td>
              </tr>
              <tr>
                <td>Indent / Unindent 2 spaces</td>
                <td><kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd></td>
              </tr>
              <tr>
                <td>Auto-close brackets</td>
                <td><kbd>{</kbd>, <kbd>[</kbd>, <kbd>(</kbd>, <kbd>$</kbd></td>
              </tr>
            </tbody>
          </table>

          <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary);">Common \\LaTeX{} Snippets</h4>
          <table class="shortcuts-table">
            <thead>
              <tr>
                <th>Construct</th>
                <th>Syntax</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Section Header</td>
                <td><code>\\section{Title}</code></td>
              </tr>
              <tr>
                <td>Numbered Equation</td>
                <td><code>\\begin{equation} ... \\end{equation}</code></td>
              </tr>
              <tr>
                <td>Bullet List</td>
                <td><code>\\begin{itemize} \\item ... \\end{itemize}</code></td>
              </tr>
              <tr>
                <td>Figure with Caption</td>
                <td><code>\\begin{figure}[htbp] ... \\end{figure}</code></td>
              </tr>
              <tr>
                <td>Citation</td>
                <td><code>\\cite{key}</code></td>
              </tr>
              <tr>
                <td>Cross-Reference</td>
                <td><code>\\ref{label}</code></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" id="doneShortcutsModalBtn">Got it</button>
        </div>
      </div>
    `;

    modalEl.classList.add('open');

    const close = () => modalEl.classList.remove('open');
    modalEl.querySelector('#closeShortcutsModalBtn').addEventListener('click', close);
    modalEl.querySelector('#doneShortcutsModalBtn').addEventListener('click', close);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close();
    });
  }

  showNewFileDialog() {
    const name = prompt('Enter new file name (e.g. section1.tex, style.sty, refs.bib):');
    if (!name || !name.trim()) return;
    this.uploadFile(name.trim(), '% ' + name.trim() + '\n', false);
  }

  showNewFolderDialog() {
    const name = prompt('Enter new folder name (e.g. figures, chapters):');
    if (!name || !name.trim()) return;
    fetch(`/api/projects/${this.currentProjectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: name.trim(), isDir: true })
    }).then(() => this.refreshProjectTree());
  }

  setSaveStatus(text) {
    if (this.statusSave) {
      this.statusSave.textContent = text;
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('localleaf_theme', theme);
    const select = document.getElementById('drawerSelectTheme');
    if (select) select.value = theme;
  }

  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
