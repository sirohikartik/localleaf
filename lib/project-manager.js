/**
 * LocalLeaf Project and File Manager
 * Handles persistent project storage, directory trees, file operations, and ZIP export.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES } from './templates.js';
import { createZipBuffer } from './zip.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECTS_ROOT = path.resolve(__dirname, '..', 'projects');
const INDEX_FILE = path.join(PROJECTS_ROOT, 'projects.json');

/**
 * Ensure projects directory and index file exist
 */
export async function initStorage() {
  await fs.mkdir(PROJECTS_ROOT, { recursive: true });
  try {
    await fs.access(INDEX_FILE);
  } catch {
    await fs.writeFile(INDEX_FILE, JSON.stringify([], null, 2), 'utf8');
    // Seed with initial sample project
    await createProject({
      title: 'Welcome to LocalLeaf',
      template: 'article',
      description: 'Getting started guide and scientific article template'
    });
  }
}

/**
 * Read projects metadata list
 */
async function readIndex() {
  await initStorage();
  try {
    const raw = await fs.readFile(INDEX_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save projects metadata list
 */
async function writeIndex(projects) {
  await initStorage();
  await fs.writeFile(INDEX_FILE, JSON.stringify(projects, null, 2), 'utf8');
}

/**
 * List all projects with file statistics
 */
export async function listProjects() {
  const list = await readIndex();
  // Enrich with live file stats
  const enriched = [];

  for (const p of list) {
    const projectDir = path.join(PROJECTS_ROOT, p.id);
    let fileCount = 0;
    let hasPdf = false;

    try {
      const files = await fs.readdir(projectDir);
      fileCount = files.length;
      hasPdf = files.includes(`${path.basename(p.mainFile || 'main.tex', '.tex')}.pdf`);
    } catch {
      fileCount = 0;
    }

    enriched.push({
      ...p,
      fileCount,
      hasPdf
    });
  }

  // Sort descending by updatedAt
  return enriched.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/**
 * Create a new project from a template or blank
 */
export async function createProject({ title, template = 'article', description = '' }) {
  const projects = await readIndex();
  const id = 'proj_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const projectDir = path.join(PROJECTS_ROOT, id);
  await fs.mkdir(projectDir, { recursive: true });

  const chosenTemplate = TEMPLATES[template] || TEMPLATES.blank;
  for (const [filename, content] of Object.entries(chosenTemplate.files)) {
    const filePath = path.join(projectDir, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
  }

  const newProject = {
    id,
    title: title || 'Untitled Project',
    description: description || chosenTemplate.description || '',
    template: template,
    mainFile: 'main.tex',
    compiler: 'pdflatex',
    createdAt: now,
    updatedAt: now
  };

  projects.unshift(newProject);
  await writeIndex(projects);

  return newProject;
}

/**
 * Get project metadata by ID
 */
export async function getProject(id) {
  const projects = await readIndex();
  const project = projects.find(p => p.id === id);
  if (!project) return null;

  const projectDir = path.join(PROJECTS_ROOT, id);
  const tree = await buildFileTree(projectDir, '');

  return {
    ...project,
    files: tree
  };
}

/**
 * Update project metadata (title, compiler, mainFile)
 */
export async function updateProject(id, updates = {}) {
  const projects = await readIndex();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const allowed = ['title', 'description', 'compiler', 'mainFile'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      projects[idx][key] = updates[key];
    }
  }

  projects[idx].updatedAt = new Date().toISOString();
  await writeIndex(projects);
  return projects[idx];
}

/**
 * Delete a project
 */
export async function deleteProject(id) {
  const projects = await readIndex();
  const updated = projects.filter(p => p.id !== id);
  if (updated.length === projects.length) return false;

  await writeIndex(updated);

  const projectDir = path.join(PROJECTS_ROOT, id);
  try {
    await fs.rm(projectDir, { recursive: true, force: true });
  } catch {
    // ignore
  }

  return true;
}

/**
 * Build recursive file tree representation
 */
async function buildFileTree(baseDir, relativePath = '') {
  const currentDir = path.join(baseDir, relativePath);
  let entries = [];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const items = [];
  for (const entry of entries) {
    // Ignore auxiliary build artifacts from file tree display
    const ext = path.extname(entry.name).toLowerCase();
    const isAux = ['.aux', '.log', '.out', '.toc', '.bbl', '.blg', '.synctex.gz', '.fls', '.fdb_latexmk'].includes(ext);

    if (entry.name.startsWith('.') || (isAux && ext !== '.log')) {
      continue;
    }

    const rel = relativePath ? path.join(relativePath, entry.name) : entry.name;
    const full = path.join(baseDir, rel);

    if (entry.isDirectory()) {
      const children = await buildFileTree(baseDir, rel);
      items.push({
        name: entry.name,
        path: rel.replace(/\\/g, '/'),
        isDir: true,
        children
      });
    } else {
      const stats = await fs.stat(full);
      items.push({
        name: entry.name,
        path: rel.replace(/\\/g, '/'),
        isDir: false,
        size: stats.size,
        ext: ext.slice(1) || 'file',
        updatedAt: stats.mtime.toISOString()
      });
    }
  }

  // Sort directories first, then files alphabetically
  items.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });

  return items;
}

/**
 * Read file contents from project
 */
export async function readProjectFile(projectId, filePath) {
  const safeRel = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const absPath = path.join(PROJECTS_ROOT, projectId, safeRel);

  const ext = path.extname(absPath).toLowerCase();
  const binaryExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'];

  if (binaryExtensions.includes(ext)) {
    const buffer = await fs.readFile(absPath);
    return {
      isBinary: true,
      content: buffer.toString('base64'),
      path: safeRel,
      ext: ext.slice(1)
    };
  }

  const text = await fs.readFile(absPath, 'utf8');
  return {
    isBinary: false,
    content: text,
    path: safeRel,
    ext: ext.slice(1)
  };
}

/**
 * Write or create file in project
 */
export async function writeProjectFile(projectId, filePath, content, isBase64 = false) {
  const safeRel = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const absPath = path.join(PROJECTS_ROOT, projectId, safeRel);

  await fs.mkdir(path.dirname(absPath), { recursive: true });

  if (isBase64) {
    const buffer = Buffer.from(content, 'base64');
    await fs.writeFile(absPath, buffer);
  } else {
    await fs.writeFile(absPath, content, 'utf8');
  }

  // Touch project updatedAt
  await touchProject(projectId);
  return { path: safeRel, success: true };
}

/**
 * Create directory in project
 */
export async function createProjectDirectory(projectId, dirPath) {
  const safeRel = path.normalize(dirPath).replace(/^(\.\.[\/\\])+/, '');
  const absPath = path.join(PROJECTS_ROOT, projectId, safeRel);
  await fs.mkdir(absPath, { recursive: true });
  await touchProject(projectId);
  return { path: safeRel, success: true };
}

/**
 * Delete file or directory in project
 */
export async function deleteProjectFile(projectId, filePath) {
  const safeRel = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const absPath = path.join(PROJECTS_ROOT, projectId, safeRel);

  await fs.rm(absPath, { recursive: true, force: true });
  await touchProject(projectId);
  return { path: safeRel, success: true };
}

/**
 * Rename file or directory in project
 */
export async function renameProjectFile(projectId, oldPath, newPath) {
  const safeOld = path.normalize(oldPath).replace(/^(\.\.[\/\\])+/, '');
  const safeNew = path.normalize(newPath).replace(/^(\.\.[\/\\])+/, '');

  const oldAbs = path.join(PROJECTS_ROOT, projectId, safeOld);
  const newAbs = path.join(PROJECTS_ROOT, projectId, safeNew);

  await fs.mkdir(path.dirname(newAbs), { recursive: true });
  await fs.rename(oldAbs, newAbs);
  await touchProject(projectId);
  return { oldPath: safeOld, newPath: safeNew, success: true };
}

/**
 * Update project updated timestamp
 */
async function touchProject(id) {
  const projects = await readIndex();
  const p = projects.find(item => item.id === id);
  if (p) {
    p.updatedAt = new Date().toISOString();
    await writeIndex(projects);
  }
}

/**
 * Export project as standard ZIP archive buffer
 */
export async function exportProjectZip(id) {
  const project = await getProject(id);
  if (!project) return null;

  const projectDir = path.join(PROJECTS_ROOT, id);

  async function collectFiles(dir, prefix = '') {
    const list = await fs.readdir(dir, { withFileTypes: true });
    let collected = [];

    for (const item of list) {
      const rel = prefix ? path.join(prefix, item.name) : item.name;
      const full = path.join(dir, item.name);

      if (item.isDirectory()) {
        const sub = await collectFiles(full, rel);
        collected = collected.concat(sub);
      } else {
        const ext = path.extname(item.name).toLowerCase();
        // Ignore build logs and aux files from export zip
        if (!['.aux', '.log', '.out', '.toc', '.synctex.gz', '.fls', '.fdb_latexmk'].includes(ext)) {
          const content = await fs.readFile(full);
          collected.push({ name: rel.replace(/\\/g, '/'), content });
        }
      }
    }
    return collected;
  }

  const files = await collectFiles(projectDir);
  return createZipBuffer(files);
}

/**
 * Calculate document statistics (word count, headers, math environments)
 */
export async function getWordCount(projectId, mainFile = 'main.tex') {
  try {
    const file = await readProjectFile(projectId, mainFile);
    let text = file.content;

    // Remove LaTeX comments
    text = text.replace(/%.*$/gm, '');

    // Extract content between \begin{document} and \end{document} if present
    const docMatch = text.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    if (docMatch) {
      text = docMatch[1];
    }

    // Count math environments
    const inlineMath = (text.match(/\$[^$]+\$/g) || []).length;
    const displayMath = (text.match(/\$\$[\s\S]*?\$\$/g) || []).length +
      (text.match(/\\\[[\s\S]*?\\\]/g) || []).length +
      (text.match(/\\begin\{(?:equation|align|gather)\*?\}[\s\S]*?\\end\{(?:equation|align|gather)\*?\}/g) || []).length;

    // Count section headings
    const headings = (text.match(/\\(?:section|subsection|subsubsection)\*?\{([^}]+)\}/g) || []).length;

    // Count figures and tables
    const figures = (text.match(/\\begin\{figure\*?\}/g) || []).length;
    const tables = (text.match(/\\begin\{table\*?\}/g) || []).length;

    // Strip LaTeX commands to calculate clean words
    let cleanText = text
      .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^}]*\})?/g, ' ')
      .replace(/[\\{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleanText ? cleanText.split(/\s+/).filter(w => w.length > 0).length : 0;
    const characters = cleanText.length;
    const charactersNoSpaces = cleanText.replace(/\s/g, '').length;

    return {
      words,
      characters,
      charactersNoSpaces,
      headings,
      mathFormulas: inlineMath + displayMath,
      figures,
      tables
    };
  } catch (err) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      headings: 0,
      mathFormulas: 0,
      figures: 0,
      tables: 0,
      error: err.message
    };
  }
}
