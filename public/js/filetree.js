/**
 * LocalLeaf File Tree Explorer Component
 */

export class FileTree {
  constructor(options = {}) {
    this.container = options.container;
    this.onSelectFile = options.onSelectFile || (() => {});
    this.onDeleteFile = options.onDeleteFile || (() => {});
    this.onRenameFile = options.onRenameFile || (() => {});
    this.onUploadFile = options.onUploadFile || (() => {});
    this.onCreateFile = options.onCreateFile || (() => {});
    this.onSetMain = options.onSetMain || (() => {});

    this.projectId = null;
    this.mainFile = 'main.tex';
    this.activeFile = 'main.tex';
    this.files = [];

    this.initDragAndDrop();
  }

  setProject(projectId, files = [], mainFile = 'main.tex') {
    this.projectId = projectId;
    this.files = files;
    this.mainFile = mainFile;
    if (!this.activeFile || !this.fileExists(this.activeFile)) {
      this.activeFile = mainFile;
    }
    this.render();
  }

  fileExists(filePath) {
    const check = (items) => {
      for (const item of items) {
        if (item.path === filePath) return true;
        if (item.children && check(item.children)) return true;
      }
      return false;
    };
    return check(this.files);
  }

  getFileIcon(name, isDir) {
    if (isDir) return '📁';
    const ext = name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'tex': return '📄';
      case 'bib': return '📚';
      case 'cls':
      case 'sty': return '⚙️';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg': return '🖼️';
      case 'pdf': return '📑';
      case 'md':
      case 'txt': return '📝';
      default: return '📄';
    }
  }

  render() {
    this.container.innerHTML = '';
    if (!this.files || this.files.length === 0) {
      this.container.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text-muted);">No files found</div>';
      return;
    }

    const treeEl = document.createElement('div');
    treeEl.className = 'file-tree-list';

    this.renderNodes(this.files, treeEl);
    this.container.appendChild(treeEl);
  }

  renderNodes(items, parentEl, level = 0) {
    for (const item of items) {
      const itemEl = document.createElement('div');
      itemEl.className = `tree-item ${item.path === this.activeFile ? 'active' : ''}`;
      itemEl.style.paddingLeft = `${8 + level * 14}px`;

      const isMain = item.path === this.mainFile;

      itemEl.innerHTML = `
        <span class="tree-item-icon">${this.getFileIcon(item.name, item.isDir)}</span>
        <span class="tree-item-name" title="${item.path}">${item.name}</span>
        ${isMain ? '<span class="tree-item-main-badge">MAIN</span>' : ''}
        <div class="tree-item-actions">
          ${!isMain && !item.isDir && item.name.endsWith('.tex') ? `
            <button class="item-action-btn set-main-btn" title="Set as Main Document">★</button>
          ` : ''}
          ${!isMain ? `
            <button class="item-action-btn delete-btn" title="Delete">✕</button>
          ` : ''}
        </div>
      `;

      // Select file on click
      itemEl.addEventListener('click', (e) => {
        if (e.target.closest('.item-action-btn')) return;
        if (!item.isDir) {
          this.activeFile = item.path;
          this.render();
          this.onSelectFile(item.path);
        }
      });

      // Set as main
      const setMainBtn = itemEl.querySelector('.set-main-btn');
      if (setMainBtn) {
        setMainBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onSetMain(item.path);
        });
      }

      // Delete file
      const delBtn = itemEl.querySelector('.delete-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
            this.onDeleteFile(item.path);
          }
        });
      }

      parentEl.appendChild(itemEl);

      if (item.isDir && item.children) {
        this.renderNodes(item.children, parentEl, level + 1);
      }
    }
  }

  initDragAndDrop() {
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.container.classList.add('drag-over');
    });

    this.container.addEventListener('dragleave', () => {
      this.container.classList.remove('drag-over');
    });

    this.container.addEventListener('drop', async (e) => {
      e.preventDefault();
      this.container.classList.remove('drag-over');

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        for (const file of e.dataTransfer.files) {
          await this.uploadFileObject(file);
        }
      }
    });
  }

  async uploadFileObject(file) {
    const isImage = file.type.startsWith('image/');
    const reader = new FileReader();

    if (isImage) {
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        this.onUploadFile(file.name, base64, true);
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        this.onUploadFile(file.name, reader.result, false);
      };
      reader.readAsText(file);
    }
  }
}
