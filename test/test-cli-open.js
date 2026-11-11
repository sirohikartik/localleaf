/**
 * LocalLeaf External Folder & CLI Open Integration Test Suite
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverPath = path.join(rootDir, 'server.js');

const TEST_PORT = 3288;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEMP_EXTERNAL_DIR = path.join(__dirname, 'temp_user_external_paper');

function makeRequest(method, urlPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const reqHeaders = {};
    let payload = null;

    if (body) {
      payload = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        let data = buffer.toString('utf8');
        try {
          data = JSON.parse(data);
        } catch {}
        resolve({ statusCode: res.statusCode, data });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log('🧪 Testing LocalLeaf Existing Folder CLI / API Support...\n');

  // 1. Create a dummy user directory simulating an existing research project
  await fs.mkdir(TEMP_EXTERNAL_DIR, { recursive: true });
  const sampleTex = `\\documentclass{article}
\\title{My External Offline Paper}
\\author{Kartik Sirohi}
\\begin{document}
\\maketitle
\\section{Testing External Folder}
This document lives outside LocalLeaf projects directory!
\\end{document}
`;
  await fs.writeFile(path.join(TEMP_EXTERNAL_DIR, 'paper.tex'), sampleTex, 'utf8');

  // 2. Start server
  const serverProc = spawn(process.execPath, [serverPath], {
    cwd: rootDir,
    env: { ...process.env, PORT: TEST_PORT.toString() },
    stdio: 'ignore'
  });

  await new Promise(r => setTimeout(r, 1200));

  try {
    // 3. Test POST /api/open
    process.stdout.write('1. Testing POST /api/open with external directory... ');
    const openRes = await makeRequest('POST', '/api/open', { path: TEMP_EXTERNAL_DIR });
    if (openRes.statusCode === 200 && openRes.data.project) {
      const p = openRes.data.project;
      if (p.isExternal && p.mainFile === 'paper.tex') {
        console.log(`✅ OK (Project ID: ${p.id}, Detected main: ${p.mainFile})`);
      } else {
        throw new Error(`Unexpected project config: ${JSON.stringify(p)}`);
      }
    } else {
      throw new Error(`Failed /api/open: ${JSON.stringify(openRes.data)}`);
    }

    const projectId = openRes.data.project.id;

    // 4. Test compilation of external directory
    process.stdout.write('2. Testing compile on external project... ');
    const compileRes = await makeRequest('POST', `/api/projects/${projectId}/compile`, {
      engine: 'pdflatex',
      mainFile: 'paper.tex'
    });
    if (compileRes.statusCode === 200 && compileRes.data.success) {
      console.log(`✅ OK (Compiled in ${compileRes.data.durationMs}ms, PDF size: ${compileRes.data.pdfSize})`);
    } else {
      throw new Error(`Compile failed: ${JSON.stringify(compileRes.data)}`);
    }

    // 5. Verify PDF exists in the external folder itself
    process.stdout.write('3. Verifying output PDF in source directory... ');
    const pdfPath = path.join(TEMP_EXTERNAL_DIR, 'paper.pdf');
    const pdfStats = await fs.stat(pdfPath);
    if (pdfStats.isFile() && pdfStats.size > 0) {
      console.log(`✅ OK (${pdfStats.size} bytes written to external folder)`);
    } else {
      throw new Error('PDF not found in external directory');
    }

    // 6. Test project removal does NOT delete the external folder
    process.stdout.write('4. Testing safe deletion preserves user folder... ');
    await makeRequest('DELETE', `/api/projects/${projectId}`);
    const checkTexExists = await fs.stat(path.join(TEMP_EXTERNAL_DIR, 'paper.tex'));
    if (checkTexExists.isFile()) {
      console.log('✅ OK (User files preserved!)');
    } else {
      throw new Error('User files were mistakenly deleted!');
    }

    console.log('\n════════════════════════════════════════════════');
    console.log('🎉 EXTERNAL FOLDER INTEGRATION PASSED 100%!');

  } finally {
    serverProc.kill('SIGKILL');
    // Clean up temp external directory
    await fs.rm(TEMP_EXTERNAL_DIR, { recursive: true, force: true });
  }
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
