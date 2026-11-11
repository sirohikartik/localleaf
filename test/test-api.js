/**
 * LocalLeaf Comprehensive REST API Test Suite
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const serverPath = path.join(rootDir, 'server.js');

const TEST_PORT = 3199;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function makeRequest(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const reqHeaders = { ...headers };
    let payload = null;

    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        let data = buffer;
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(buffer.toString('utf8'));
          } catch {
            data = buffer.toString('utf8');
          }
        } else if (contentType.startsWith('text/')) {
          data = buffer.toString('utf8');
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          rawBuffer: buffer
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runApiTests() {
  console.log('🧪 Starting LocalLeaf REST API Test Suite...\n');

  // Spawn test server on port 3199
  const serverProc = spawn(process.execPath, [serverPath], {
    cwd: rootDir,
    env: { ...process.env, PORT: TEST_PORT.toString() },
    stdio: 'ignore'
  });

  // Wait for server to boot
  await new Promise(r => setTimeout(r, 1200));

  try {
    // 1. GET /api/system
    process.stdout.write('1. Testing GET /api/system... ');
    const sys = await makeRequest('GET', '/api/system');
    if (sys.statusCode === 200 && sys.data.engines?.pdflatex?.available) {
      console.log('✅ OK (Engine: pdflatex detected)');
    } else {
      throw new Error(`Failed /api/system: ${JSON.stringify(sys.data)}`);
    }

    // 2. GET /api/templates
    process.stdout.write('2. Testing GET /api/templates... ');
    const tpl = await makeRequest('GET', '/api/templates');
    if (tpl.statusCode === 200 && Array.isArray(tpl.data) && tpl.data.length >= 6) {
      console.log(`✅ OK (${tpl.data.length} templates)`);
    } else {
      throw new Error(`Failed /api/templates: ${JSON.stringify(tpl.data)}`);
    }

    // 3. POST /api/projects (Create project)
    process.stdout.write('3. Testing POST /api/projects... ');
    const created = await makeRequest('POST', '/api/projects', {
      title: 'Automated Test Paper',
      template: 'article'
    });
    if (created.statusCode === 201 && created.data.id) {
      console.log(`✅ OK (Created ID: ${created.data.id})`);
    } else {
      throw new Error(`Failed project creation: ${JSON.stringify(created.data)}`);
    }
    const testProjectId = created.data.id;

    // 4. GET /api/projects/:id (Get project tree)
    process.stdout.write('4. Testing GET /api/projects/:id... ');
    const proj = await makeRequest('GET', `/api/projects/${testProjectId}`);
    if (proj.statusCode === 200 && Array.isArray(proj.data.files) && proj.data.files.length > 0) {
      console.log(`✅ OK (${proj.data.files.length} files in tree)`);
    } else {
      throw new Error(`Failed to get project: ${JSON.stringify(proj.data)}`);
    }

    // 5. POST /api/projects/:id/compile
    process.stdout.write('5. Testing POST /api/projects/:id/compile... ');
    const compileRes = await makeRequest('POST', `/api/projects/${testProjectId}/compile`, {
      engine: 'pdflatex',
      mainFile: 'main.tex'
    });
    if (compileRes.statusCode === 200 && compileRes.data.success && compileRes.data.pdfSize > 0) {
      console.log(`✅ OK (Compiled in ${compileRes.data.durationMs}ms, PDF size: ${compileRes.data.pdfSize} bytes)`);
    } else {
      throw new Error(`Failed compilation: ${JSON.stringify(compileRes.data)}`);
    }

    // 6. GET /api/projects/:id/pdf
    process.stdout.write('6. Testing GET /api/projects/:id/pdf... ');
    const pdfRes = await makeRequest('GET', `/api/projects/${testProjectId}/pdf`);
    if (pdfRes.statusCode === 200 && pdfRes.headers['content-type'] === 'application/pdf') {
      console.log(`✅ OK (Received ${pdfRes.rawBuffer.length} bytes PDF)`);
    } else {
      throw new Error(`Failed PDF download: ${pdfRes.statusCode}`);
    }

    // 7. GET /api/projects/:id/wordcount
    process.stdout.write('7. Testing GET /api/projects/:id/wordcount... ');
    const wcRes = await makeRequest('GET', `/api/projects/${testProjectId}/wordcount`);
    if (wcRes.statusCode === 200 && wcRes.data.words > 0) {
      console.log(`✅ OK (Words: ${wcRes.data.words}, Math formulas: ${wcRes.data.mathFormulas})`);
    } else {
      throw new Error(`Failed wordcount: ${JSON.stringify(wcRes.data)}`);
    }

    // 8. GET /api/projects/:id/export (ZIP)
    process.stdout.write('8. Testing GET /api/projects/:id/export (ZIP)... ');
    const zipRes = await makeRequest('GET', `/api/projects/${testProjectId}/export`);
    if (zipRes.statusCode === 200 && zipRes.rawBuffer.length > 50) {
      console.log(`✅ OK (ZIP buffer: ${zipRes.rawBuffer.length} bytes)`);
    } else {
      throw new Error(`Failed ZIP export: ${zipRes.statusCode}`);
    }

    // 9. DELETE /api/projects/:id
    process.stdout.write('9. Testing DELETE /api/projects/:id... ');
    const delRes = await makeRequest('DELETE', `/api/projects/${testProjectId}`);
    if (delRes.statusCode === 200 && delRes.data.success) {
      console.log('✅ OK (Cleaned up test project)');
    } else {
      throw new Error(`Failed to delete project: ${JSON.stringify(delRes.data)}`);
    }

    console.log('\n════════════════════════════════════════════════');
    console.log('🎉 ALL REST API ENDPOINTS VERIFIED AND PASSING!');

  } finally {
    serverProc.kill('SIGKILL');
  }
}

runApiTests().catch(err => {
  console.error('API test failed:', err);
  process.exit(1);
});
