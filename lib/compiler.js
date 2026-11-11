/**
 * LocalLeaf Compilation Engine
 * Executes native pdflatex / xelatex / bibtex compilers directly on machine.
 */

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseLatexLog } from './log-parser.js';

// Search paths for TeX binaries
const POSSIBLE_TEX_DIRS = [
  '/Library/TeX/texbin',
  '/usr/local/bin',
  '/usr/bin',
  '/opt/homebrew/bin'
];

/**
 * Locate executable binary with fallback to PATH
 */
async function findBinary(binName) {
  for (const dir of POSSIBLE_TEX_DIRS) {
    const candidate = path.join(dir, binName);
    try {
      await fs.access(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // not in this dir, try next
    }
  }
  return binName; // Rely on system PATH
}

/**
 * Detect installed engines and version info
 */
export async function detectEngines() {
  const engines = {
    pdflatex: null,
    xelatex: null,
    bibtex: null
  };

  for (const name of ['pdflatex', 'xelatex', 'bibtex']) {
    try {
      const binPath = await findBinary(name);
      const versionOutput = await runProcess(binPath, ['--version'], { timeout: 3000 });
      const firstLine = versionOutput.stdout.split('\n')[0] || '';
      engines[name] = {
        available: true,
        path: binPath,
        version: firstLine.trim()
      };
    } catch (err) {
      engines[name] = {
        available: false,
        error: err.message
      };
    }
  }

  return engines;
}

/**
 * Execute child process safely with timeout and buffer capture
 */
function runProcess(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const cwd = options.cwd || process.cwd();
    const timeout = options.timeout || 30000;

    let stdout = '';
    let stderr = '';

    const proc = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        PATH: `${POSSIBLE_TEX_DIRS.join(':')}:${process.env.PATH || ''}`
      }
    });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`Command ${cmd} timed out after ${timeout}ms`));
    }, timeout);

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Compile a LaTeX project
 */
export async function compileProject(projectDir, options = {}) {
  const startTime = Date.now();
  const engine = options.engine === 'xelatex' ? 'xelatex' : 'pdflatex';
  const mainFile = options.mainFile || 'main.tex';
  const mainBase = path.basename(mainFile, path.extname(mainFile));
  const fullMainPath = path.join(projectDir, mainFile);

  // Ensure main file exists
  try {
    await fs.access(fullMainPath);
  } catch {
    return {
      success: false,
      error: `Main document file "${mainFile}" not found.`,
      errors: [{ type: 'error', message: `File "${mainFile}" not found in project.`, file: mainFile, line: 1 }],
      warnings: [],
      durationMs: 0
    };
  }

  const binPath = await findBinary(engine);
  const bibtexPath = await findBinary('bibtex');

  const latexArgs = [
    '-interaction=nonstopmode',
    '-synctex=1',
    '-file-line-error',
    mainFile
  ];

  let combinedStdout = '';
  let combinedStderr = '';

  // Pass 1: Initial pdflatex run
  const pass1 = await runProcess(binPath, latexArgs, { cwd: projectDir });
  combinedStdout += pass1.stdout + '\n';
  combinedStderr += pass1.stderr + '\n';

  // Check if aux file requests bibliography
  const auxPath = path.join(projectDir, `${mainBase}.aux`);
  let hasBib = false;
  try {
    const auxContent = await fs.readFile(auxPath, 'utf8');
    if (auxContent.includes('\\bibdata') || auxContent.includes('\\citation')) {
      hasBib = true;
    }
  } catch {
    // aux file might not exist yet
  }

  // If bibliography references exist, run bibtex and 2 more passes
  if (hasBib && !options.draft) {
    try {
      const bibRes = await runProcess(bibtexPath, [mainBase], { cwd: projectDir, timeout: 10000 });
      combinedStdout += bibRes.stdout + '\n';

      // Pass 2: Incorporate .bbl
      const pass2 = await runProcess(binPath, latexArgs, { cwd: projectDir });
      combinedStdout += pass2.stdout + '\n';

      // Pass 3: Resolve cross references
      const pass3 = await runProcess(binPath, latexArgs, { cwd: projectDir });
      combinedStdout += pass3.stdout + '\n';
    } catch (err) {
      combinedStderr += `BibTeX warning: ${err.message}\n`;
    }
  }

  const durationMs = Date.now() - startTime;

  // Read log file
  const logPath = path.join(projectDir, `${mainBase}.log`);
  let logContent = '';
  try {
    logContent = await fs.readFile(logPath, 'utf8');
  } catch {
    logContent = combinedStdout;
  }

  const diagnostics = parseLatexLog(logContent, combinedStdout);

  // Sanitize rawLog to ensure strict JSON compatibility
  const cleanLog = (logContent || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Check if output PDF was created
  const pdfPath = path.join(projectDir, `${mainBase}.pdf`);
  let pdfExists = false;
  let pdfStats = null;
  try {
    pdfStats = await fs.stat(pdfPath);
    pdfExists = pdfStats.isFile() && pdfStats.size > 0;
  } catch {
    pdfExists = false;
  }

  return {
    success: pdfExists && diagnostics.errorCount === 0,
    hasPdf: pdfExists,
    pdfPath: pdfExists ? `${mainBase}.pdf` : null,
    pdfSize: pdfStats ? pdfStats.size : 0,
    errors: diagnostics.errors,
    warnings: diagnostics.warnings,
    errorCount: diagnostics.errorCount,
    warningCount: diagnostics.warningCount,
    pageCount: diagnostics.pageCount,
    durationMs,
    rawLog: cleanLog,
    engine,
    timestamp: new Date().toISOString()
  };
}

/**
 * Clean auxiliary files from project directory
 */
export async function cleanAuxFiles(projectDir) {
  const auxExtensions = [
    '.aux', '.log', '.out', '.toc', '.bbl', '.blg',
    '.synctex.gz', '.fls', '.fdb_latexmk', '.nav', '.snm', '.vrb', '.lot', '.lof'
  ];

  const files = await fs.readdir(projectDir);
  let removedCount = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (auxExtensions.includes(ext)) {
      try {
        await fs.unlink(path.join(projectDir, file));
        removedCount++;
      } catch {
        // ignore
      }
    }
  }

  return { cleaned: removedCount };
}
