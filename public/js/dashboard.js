/**
 * LocalLeaf Projects Dashboard Controller
 */

export class Dashboard {
  constructor(options = {}) {
    this.container = options.container;
    this.projectsGrid = options.projectsGrid;
    this.searchInput = options.searchInput;
    this.btnNewProject = options.btnNewProject;
    this.btnOpenFolder = options.btnOpenFolder;
    this.onOpenProject = options.onOpenProject || (() => {});

    this.projects = [];
    this.templates = [];
    this.filterQuery = '';

    this.init();
  }

  async init() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => {
        this.filterQuery = this.searchInput.value.toLowerCase().trim();
        this.render();
      });
    }

    if (this.btnNewProject) {
      this.btnNewProject.addEventListener('click', () => {
        this.showNewProjectModal();
      });
    }

    if (this.btnOpenFolder) {
      this.btnOpenFolder.addEventListener('click', () => {
        this.promptOpenFolder();
      });
    }

    await this.loadTemplates();
  }

  async promptOpenFolder() {
    const dirPath = prompt('Enter the path to an existing folder on your computer:\n(e.g. /Users/kartiksirohi/my-paper or ./paper)');
    if (!dirPath || !dirPath.trim()) return;

    try {
      const res = await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to open directory');
      }
      this.onOpenProject(data.project.id);
    } catch (err) {
      alert('Error opening folder: ' + err.message);
    }
  }

  async loadTemplates() {
    try {
      const res = await fetch('/api/templates');
      this.templates = await res.json();
    } catch {
      this.templates = [];
    }
  }

  async loadProjects() {
    try {
      const res = await fetch('/api/projects');
      this.projects = await res.json();
      this.render();
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }

  render() {
    if (!this.projectsGrid) return;
    this.projectsGrid.innerHTML = '';

    const filtered = this.projects.filter(p => {
      if (!this.filterQuery) return true;
      return (p.title && p.title.toLowerCase().includes(this.filterQuery)) ||
             (p.description && p.description.toLowerCase().includes(this.filterQuery));
    });

    if (filtered.length === 0) {
      this.projectsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
          <div style="font-size: 15px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">No projects found</div>
          <p style="font-size: 13px;">Create a new project using templates to get started.</p>
        </div>
      `;
      return;
    }

    for (const project of filtered) {
      const card = document.createElement('div');
      card.className = 'project-card';

      const templateInfo = this.templates.find(t => t.id === project.template) || { icon: '📄', name: 'Document' };
      const dateFormatted = new Date(project.updatedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      card.innerHTML = `
        <div class="card-header">
          <div class="card-template-icon">${templateInfo.icon || '📄'}</div>
          <div class="card-actions-menu">
            <button class="tool-btn btn-duplicate" title="Duplicate Project">⎘</button>
            <button class="tool-btn btn-export-zip" title="Download Source ZIP">⬇</button>
            <button class="tool-btn btn-delete" title="Delete Project">✕</button>
          </div>
        </div>
        <h3 class="card-title">${escapeHtml(project.title)}</h3>
        <p class="card-desc">${escapeHtml(project.description || 'LaTeX Project')}</p>
        <div class="card-footer">
          <span class="card-badge ${project.hasPdf ? 'has-pdf' : ''}">
            ${project.isExternal ? '📁 Folder' : (project.hasPdf ? '✓ PDF Ready' : '• ' + (templateInfo.name || 'LaTeX'))}
          </span>
          <span title="${project.externalDir || ''}">Updated ${dateFormatted}</span>
        </div>
      `;

      // Open on card body click
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-actions-menu')) return;
        this.onOpenProject(project.id);
      });

      // Duplicate
      card.querySelector('.btn-duplicate').addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.duplicateProject(project.id);
      });

      // Export ZIP
      card.querySelector('.btn-export-zip').addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = `/api/projects/${project.id}/export`;
      });

      // Delete
      card.querySelector('.btn-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete "${project.title}"?`)) {
          await this.deleteProject(project.id);
        }
      });

      this.projectsGrid.appendChild(card);
    }
  }

  async duplicateProject(id) {
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
      const newProj = await res.json();
      await this.loadProjects();
    } catch (err) {
      alert('Failed to duplicate project: ' + err.message);
    }
  }

  async deleteProject(id) {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      await this.loadProjects();
    } catch (err) {
      alert('Failed to delete project: ' + err.message);
    }
  }

  showNewProjectModal() {
    let modalEl = document.getElementById('newProjectModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'newProjectModal';
      modalEl.className = 'modal-overlay';
      document.body.appendChild(modalEl);
    }

    let selectedTemplateId = 'article';

    modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>Create New \\LaTeX{} Project</h3>
          <button class="btn-close-modal" id="closeNewModalBtn">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="newProjectTitleInput">Project Title</label>
            <input type="text" class="form-control" id="newProjectTitleInput" value="My Research Paper" placeholder="Enter project name..." />
          </div>

          <label style="display:block;font-size:12.5px;font-weight:600;margin-bottom:8px;">Choose a Template</label>
          <div class="template-grid">
            ${this.templates.map(t => `
              <div class="template-card ${t.id === selectedTemplateId ? 'selected' : ''}" data-template="${t.id}">
                <div class="template-icon">${t.icon}</div>
                <div class="template-info">
                  <h4>${escapeHtml(t.name)}</h4>
                  <p>${escapeHtml(t.description)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="cancelNewModalBtn">Cancel</button>
          <button class="btn-primary" id="confirmNewModalBtn">Create Project</button>
        </div>
      </div>
    `;

    modalEl.classList.add('open');

    // Handle template card clicks
    const cards = modalEl.querySelectorAll('.template-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTemplateId = card.getAttribute('data-template');
      });
    });

    const close = () => modalEl.classList.remove('open');
    modalEl.querySelector('#closeNewModalBtn').addEventListener('click', close);
    modalEl.querySelector('#cancelNewModalBtn').addEventListener('click', close);
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close();
    });

    modalEl.querySelector('#confirmNewModalBtn').addEventListener('click', async () => {
      const title = modalEl.querySelector('#newProjectTitleInput').value.trim() || 'Untitled Project';
      try {
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            template: selectedTemplateId
          })
        });
        const created = await res.json();
        close();
        this.onOpenProject(created.id);
      } catch (err) {
        alert('Failed to create project: ' + err.message);
      }
    });

    setTimeout(() => {
      const input = modalEl.querySelector('#newProjectTitleInput');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
