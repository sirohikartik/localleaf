/**
 * LocalLeaf Comprehensive Automated Test Suite
 * Tests every template compilation with native pdflatex.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES } from '../lib/templates.js';
import { compileProject } from '../lib/compiler.js';
import { getWordCount } from '../lib/project-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DIR = path.join(__dirname, 'temp_test_workspace');

async function runTestSuite() {
  console.log('🧪 Starting LocalLeaf Template & Compiler Test Suite...\n');
  await fs.mkdir(TEST_DIR, { recursive: true });

  let allPassed = true;

  for (const [tplId, tpl] of Object.entries(TEMPLATES)) {
    process.stdout.write(`Testing template "${tpl.name}" (${tplId})... `);
    const projDir = path.join(TEST_DIR, `proj_${tplId}`);
    await fs.mkdir(projDir, { recursive: true });

    // Write template files
    for (const [filename, content] of Object.entries(tpl.files)) {
      await fs.writeFile(path.join(projDir, filename), content, 'utf8');
    }

    // Compile with pdflatex
    const res = await compileProject(projDir, {
      engine: 'pdflatex',
      mainFile: 'main.tex'
    });

    if (res.hasPdf && res.pdfSize > 0) {
      console.log(`✅ PASSED (${res.durationMs}ms, ${res.pageCount} page(s), ${res.pdfSize} bytes)`);
    } else {
      console.log(`❌ FAILED`);
      console.error('Errors:', res.errors);
      allPassed = false;
    }
  }

  // Cleanup test workspace
  await fs.rm(TEST_DIR, { recursive: true, force: true });

  console.log('\n════════════════════════════════════════════════');
  if (allPassed) {
    console.log('🎉 ALL TEMPLATES COMPILED SUCCESSFULLY WITHOUT ERRORS!');
  } else {
    console.log('❌ SOME TEMPLATES FAILED TO COMPILE');
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Test suite runner failed:', err);
  process.exit(1);
});
