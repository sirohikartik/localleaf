/**
 * LocalLeaf LaTeX Log Parser
 * Extracts structured errors, warnings, and stats from pdflatex / xelatex logs.
 */

export function parseLatexLog(logContent = '', stdout = '') {
  const combined = logContent || stdout || '';
  const lines = combined.split(/\r?\n/);

  const errors = [];
  const warnings = [];
  let pageCount = 0;
  let pdfBytes = 0;

  // Track active file hierarchy via balanced parentheses
  let currentFile = 'main.tex';
  const fileStack = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // File tracking: detect (filepath or balanced paren
    // LaTeX logs indicate entered files like (./sections/intro.tex or (/usr/local/...
    const fileMatch = line.match(/\(((\.?\/|[A-Za-z]:\\)[^\s()]+(\.tex|\.sty|\.cls|\.bib|\.aux|\.bbl)?)/);
    if (fileMatch) {
      const detected = fileMatch[1].replace(/^\.\//, '');
      fileStack.push(detected);
      currentFile = detected;
    }

    // Detect file pop if line ends with ')' or contains ')'
    if (line.includes(')') && fileStack.length > 1) {
      const closeCount = (line.match(/\)/g) || []).length;
      const openCount = (line.match(/\(/g) || []).length;
      if (closeCount > openCount) {
        for (let c = 0; c < Math.min(closeCount - openCount, fileStack.length - 1); c++) {
          fileStack.pop();
        }
        currentFile = fileStack[fileStack.length - 1] || 'main.tex';
      }
    }

    // Detect Output written line (e.g., Output written on main.pdf (3 pages, 145023 bytes).)
    const outputMatch = line.match(/Output written on .*?\((\d+)\s+pages?,\s+(\d+)\s+bytes\)/i);
    if (outputMatch) {
      pageCount = parseInt(outputMatch[1], 10);
      pdfBytes = parseInt(outputMatch[2], 10);
    }

    // Detect Errors (Lines starting with '!')
    if (line.startsWith('!')) {
      const message = line.substring(1).trim();
      let lineNumber = null;
      let context = '';
      let errorFile = currentFile;

      // Look ahead up to 10 lines for "l.<number>" indicating line number and context
      let j = i + 1;
      while (j < Math.min(i + 12, lines.length)) {
        const nextLine = lines[j];
        const lineNumMatch = nextLine.match(/^l\.(\d+)\s*(.*)$/);
        if (lineNumMatch) {
          lineNumber = parseInt(lineNumMatch[1], 10);
          context = lineNumMatch[2].trim();
          break;
        } else if (nextLine.startsWith('!')) {
          // Another error started
          break;
        }
        j++;
      }

      errors.push({
        type: 'error',
        message,
        file: errorFile,
        line: lineNumber,
        context: context || '',
        raw: lines.slice(i, Math.min(i + 5, lines.length)).join('\n')
      });
      i = Math.max(i, j);
    }
    // Detect Warnings
    else if (
      line.includes('LaTeX Warning:') ||
      line.includes('Package ') && line.includes('Warning:') ||
      line.includes('Class ') && line.includes('Warning:')
    ) {
      let message = line.trim();
      let lineNumber = null;

      // Check if line number is in the message (e.g. "on input line 42.")
      const inputLineMatch = line.match(/on input line (\d+)/i) || line.match(/lines? (\d+)/i);
      if (inputLineMatch) {
        lineNumber = parseInt(inputLineMatch[1], 10);
      } else if (i + 1 < lines.length && lines[i + 1].match(/on input line (\d+)/i)) {
        const nextMatch = lines[i + 1].match(/on input line (\d+)/i);
        lineNumber = parseInt(nextMatch[1], 10);
        message += ' ' + lines[i + 1].trim();
        i++;
      }

      warnings.push({
        type: 'warning',
        message: message.replace(/^LaTeX Warning:\s*/, '').replace(/^[A-Za-z0-9_-]+\s+Warning:\s*/, ''),
        file: currentFile,
        line: lineNumber,
        raw: message
      });
    }
    // Detect Overfull / Underfull hbox warnings
    else if (line.startsWith('Overfull \\hbox') || line.startsWith('Underfull \\hbox')) {
      let lineNumber = null;
      const hboxMatch = line.match(/at lines? (\d+)(?:--\d+)?/i);
      if (hboxMatch) {
        lineNumber = parseInt(hboxMatch[1], 10);
      }
      warnings.push({
        type: 'badbox',
        message: line.trim(),
        file: currentFile,
        line: lineNumber,
        raw: line.trim()
      });
    }

    i++;
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
    pageCount,
    pdfBytes,
    rawLog: combined
  };
}
