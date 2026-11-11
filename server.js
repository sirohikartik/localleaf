/**
 * LocalLeaf HTTP Server
 * Lightweight, zero-dependency REST API & static file server.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

import {
  initStorage,
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  openDirectoryAsProject,
  getProjectDirectory,
  readProjectFile,
  writeProjectFile,
  createProjectDirectory,
  deleteProjectFile,
  renameProjectFile,
  exportProjectZip,
  getWordCount,
  PROJECTS_ROOT
} from './lib/project-manager.js';

import { compileProject, detectEngines, cleanAuxFiles } from './lib/compiler.js';
import { TEMPLATES } from './lib/templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

/**
 * Helper to parse incoming JSON bodies
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 50 * 1024 * 1024) { // 50MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

/**
 * Send error response
 */
function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

/**
 * Static file handler
 */
async function serveStatic(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent directory traversal
  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  try {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      return serveStatic(req, res, path.join(pathname, 'index.html'));
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const content = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  }
}

/**
 * HTTP Request Handler
 */
async function handleRequest(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // --- API ROUTES ---

    // GET /api/system
    if (method === 'GET' && pathname === 'api/system' || pathname === '/api/system') {
      const engines = await detectEngines();
      return sendJson(res, 200, {
        system: {
          platform: os.platform(),
          release: os.release(),
          nodeVersion: process.version,
          cpus: os.cpus().length,
          freeMemMb: Math.round(os.freemem() / (1024 * 1024))
        },
        engines
      });
    }

    // GET /api/templates
    if (method === 'GET' && pathname === '/api/templates') {
      const templatesList = Object.values(TEMPLATES).map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        icon: t.icon
      }));
      return sendJson(res, 200, templatesList);
    }

    // POST /api/open (Open existing local directory as project)
    if (method === 'POST' && pathname === '/api/open') {
      const body = await parseBody(req);
      if (!body.path) {
        return sendError(res, 400, 'Missing directory path');
      }
      try {
        const project = await openDirectoryAsProject(body.path);
        return sendJson(res, 200, { success: true, project });
      } catch (err) {
        return sendError(res, 400, err.message);
      }
    }

    // GET /api/projects
    if (method === 'GET' && pathname === '/api/projects') {
      const projects = await listProjects();
      return sendJson(res, 200, projects);
    }

    // POST /api/projects
    if (method === 'POST' && pathname === '/api/projects') {
      const body = await parseBody(req);
      const project = await createProject(body);
      return sendJson(res, 201, project);
    }

    // Project subroutes: /api/projects/:id/...
    const projectRouteMatch = pathname.match(/^\/api\/projects\/([^\/]+)(?:\/(.*))?$/);
    if (projectRouteMatch) {
      const projectId = projectRouteMatch[1];
      const subPath = projectRouteMatch[2] || '';

      // GET /api/projects/:id
      if (method === 'GET' && !subPath) {
        const project = await getProject(projectId);
        if (!project) return sendError(res, 404, 'Project not found');
        return sendJson(res, 200, project);
      }

      // PATCH /api/projects/:id
      if (method === 'PATCH' && !subPath) {
        const body = await parseBody(req);
        const updated = await updateProject(projectId, body);
        if (!updated) return sendError(res, 404, 'Project not found');
        return sendJson(res, 200, updated);
      }

      // DELETE /api/projects/:id
      if (method === 'DELETE' && !subPath) {
        const success = await deleteProject(projectId);
        if (!success) return sendError(res, 404, 'Project not found');
        return sendJson(res, 200, { success: true });
      }

      // POST /api/projects/:id/duplicate
      if (method === 'POST' && subPath === 'duplicate') {
        const source = await getProject(projectId);
        if (!source) return sendError(res, 404, 'Project not found');

        const newProject = await createProject({
          title: `${source.title} (Copy)`,
          description: source.description,
          template: 'blank'
        });

        // Copy all source files
        const srcDir = path.join(PROJECTS_ROOT, projectId);
        const destDir = path.join(PROJECTS_ROOT, newProject.id);

        async function copyRecursive(src, dest) {
          const entries = await fs.readdir(src, { withFileTypes: true });
          await fs.mkdir(dest, { recursive: true });
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
              await copyRecursive(srcPath, destPath);
            } else {
              await fs.copyFile(srcPath, destPath);
            }
          }
        }
        await copyRecursive(srcDir, destDir);
        await updateProject(newProject.id, { compiler: source.compiler, mainFile: source.mainFile });

        return sendJson(res, 201, newProject);
      }

      // GET /api/projects/:id/export
      if (method === 'GET' && subPath === 'export') {
        const zipBuffer = await exportProjectZip(projectId);
        if (!zipBuffer) return sendError(res, 404, 'Project not found');

        const project = await getProject(projectId);
        const safeTitle = (project.title || 'project').replace(/[^a-zA-Z0-9_-]/g, '_');

        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${safeTitle}.zip"`,
          'Content-Length': zipBuffer.length
        });
        return res.end(zipBuffer);
      }

      // GET /api/projects/:id/wordcount
      if (method === 'GET' && subPath === 'wordcount') {
        const project = await getProject(projectId);
        if (!project) return sendError(res, 404, 'Project not found');
        const stats = await getWordCount(projectId, project.mainFile || 'main.tex');
        return sendJson(res, 200, stats);
      }

      // POST /api/projects/:id/clean
      if (method === 'POST' && subPath === 'clean') {
        const project = await getProject(projectId);
        if (!project) return sendError(res, 404, 'Project not found');
        const projectDir = await getProjectDirectory(project);
        const resClean = await cleanAuxFiles(projectDir);
        return sendJson(res, 200, resClean);
      }

      // Files endpoints
      if (subPath === 'files') {
        const targetPath = parsedUrl.searchParams.get('path');

        // GET /api/projects/:id/files?path=...
        if (method === 'GET') {
          if (!targetPath) return sendError(res, 400, 'Missing path parameter');
          const fileData = await readProjectFile(projectId, targetPath);
          return sendJson(res, 200, fileData);
        }

        // PUT /api/projects/:id/files?path=...
        if (method === 'PUT') {
          if (!targetPath) return sendError(res, 400, 'Missing path parameter');
          const body = await parseBody(req);
          const writeRes = await writeProjectFile(projectId, targetPath, body.content || '', body.isBase64 || false);
          return sendJson(res, 200, writeRes);
        }

        // POST /api/projects/:id/files
        if (method === 'POST') {
          const body = await parseBody(req);
          if (body.isDir) {
            const dirRes = await createProjectDirectory(projectId, body.path);
            return sendJson(res, 201, dirRes);
          } else {
            const fileRes = await writeProjectFile(projectId, body.path, body.content || '', body.isBase64 || false);
            return sendJson(res, 201, fileRes);
          }
        }

        // DELETE /api/projects/:id/files?path=...
        if (method === 'DELETE') {
          if (!targetPath) return sendError(res, 400, 'Missing path parameter');
          const delRes = await deleteProjectFile(projectId, targetPath);
          return sendJson(res, 200, delRes);
        }

        // PATCH /api/projects/:id/files (rename)
        if (method === 'PATCH') {
          const body = await parseBody(req);
          if (!body.oldPath || !body.newPath) {
            return sendError(res, 400, 'Missing oldPath or newPath parameter');
          }
          const renRes = await renameProjectFile(projectId, body.oldPath, body.newPath);
          return sendJson(res, 200, renRes);
        }
      }

      // POST /api/projects/:id/compile
      if (method === 'POST' && subPath === 'compile') {
        const body = await parseBody(req);
        const project = await getProject(projectId);
        if (!project) return sendError(res, 404, 'Project not found');

        const engine = body.engine || project.compiler || 'pdflatex';
        const mainFile = body.mainFile || project.mainFile || 'main.tex';
        const projectDir = await getProjectDirectory(project);

        const result = await compileProject(projectDir, {
          engine,
          mainFile,
          draft: body.draft || false
        });

        return sendJson(res, 200, result);
      }

      // GET /api/projects/:id/pdf
      if (method === 'GET' && subPath === 'pdf') {
        const project = await getProject(projectId);
        if (!project) return sendError(res, 404, 'Project not found');

        const mainBase = path.basename(project.mainFile || 'main.tex', '.tex');
        const projectDir = await getProjectDirectory(project);
        const pdfPath = path.join(projectDir, `${mainBase}.pdf`);

        try {
          const stats = await fs.stat(pdfPath);
          const pdfBuffer = await fs.readFile(pdfPath);

          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': stats.size,
            'Content-Disposition': 'inline; filename="document.pdf"',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Accept-Ranges': 'bytes'
          });
          return res.end(pdfBuffer);
        } catch {
          return sendError(res, 404, 'Compiled PDF not found. Recompile the project first.');
        }
      }

      // GET /api/projects/:id/log
      if (method === 'GET' && subPath === 'log') {
        const project = await getProject(projectId);
        if (!project) return sendError(res, 404, 'Project not found');

        const mainBase = path.basename(project.mainFile || 'main.tex', '.tex');
        const projectDir = await getProjectDirectory(project);
        const logPath = path.join(projectDir, `${mainBase}.log`);

        try {
          const logContent = await fs.readFile(logPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end(logContent);
        } catch {
          return sendError(res, 404, 'Log file not found');
        }
      }
    }

    // Default: serve static web assets
    return serveStatic(req, res, pathname);

  } catch (error) {
    console.error('Request error:', error);
    sendError(res, 500, error.message || 'Internal server error');
  }
}

// Start Server
const server = http.createServer(handleRequest);

await initStorage();

let initialOpenProject = null;
if (process.env.OPEN_DIR) {
  try {
    initialOpenProject = await openDirectoryAsProject(process.env.OPEN_DIR);
    console.log(`[LocalLeaf] Opened folder "${process.env.OPEN_DIR}" as project: ${initialOpenProject.id}`);
  } catch (err) {
    console.error(`[LocalLeaf] Could not open initial folder "${process.env.OPEN_DIR}":`, err.message);
  }
}

server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║    🌿 LocalLeaf - Fast, Offline Overleaf Workspace         ║
║                                                            ║
║    Local Server: http://${HOST}:${PORT}                    ║
║    Zero-Bloat: Pure HTML/CSS/JS (0 npm dependencies)       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
});
