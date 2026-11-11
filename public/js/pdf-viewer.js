/**
 * LocalLeaf Live PDF Viewer Controller
 */

export class PdfViewer {
  constructor(options = {}) {
    this.viewport = options.viewport;
    this.zoomLabel = options.zoomLabel;
    this.btnZoomIn = options.btnZoomIn;
    this.btnZoomOut = options.btnZoomOut;
    this.btnFitWidth = options.btnFitWidth;
    this.btnDownload = options.btnDownload;

    this.projectId = null;
    this.hasPdf = false;
    this.zoomLevel = 100;

    this.init();
  }

  init() {
    if (this.btnZoomIn) {
      this.btnZoomIn.addEventListener('click', () => this.zoom(15));
    }
    if (this.btnZoomOut) {
      this.btnZoomOut.addEventListener('click', () => this.zoom(-15));
    }
    if (this.btnFitWidth) {
      this.btnFitWidth.addEventListener('click', () => this.resetZoom());
    }
    if (this.btnDownload) {
      this.btnDownload.addEventListener('click', () => this.downloadPdf());
    }
  }

  setProject(projectId, hasPdf = false) {
    this.projectId = projectId;
    this.hasPdf = hasPdf;
    if (hasPdf) {
      this.reload();
    } else {
      this.showEmptyState();
    }
  }

  reload() {
    if (!this.projectId) return;
    this.hasPdf = true;
    const pdfUrl = `/api/projects/${this.projectId}/pdf?t=${Date.now()}#toolbar=0&navpanes=0`;

    this.viewport.innerHTML = `
      <iframe class="pdf-embed-frame" src="${pdfUrl}" type="application/pdf"></iframe>
    `;
    this.applyZoom();
  }

  showEmptyState() {
    this.viewport.innerHTML = `
      <div class="pdf-empty-state">
        <div class="pdf-empty-icon">📄</div>
        <div class="pdf-empty-title">No PDF Preview Available</div>
        <div class="pdf-empty-desc">
          Click the green <strong>Recompile</strong> button or press <strong>⌘+Enter</strong> to build your document.
        </div>
      </div>
    `;
  }

  zoom(delta) {
    this.zoomLevel = Math.max(50, Math.min(250, this.zoomLevel + delta));
    this.applyZoom();
  }

  resetZoom() {
    this.zoomLevel = 100;
    this.applyZoom();
  }

  applyZoom() {
    if (this.zoomLabel) {
      this.zoomLabel.textContent = `${this.zoomLevel}%`;
    }
    const frame = this.viewport.querySelector('.pdf-embed-frame');
    if (frame) {
      frame.style.transform = `scale(${this.zoomLevel / 100})`;
      frame.style.transformOrigin = 'top center';
    }
  }

  downloadPdf() {
    if (!this.projectId) return;
    const a = document.createElement('a');
    a.href = `/api/projects/${this.projectId}/pdf`;
    a.download = `document_${this.projectId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
