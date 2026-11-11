/**
 * LocalLeaf LaTeX Syntax Tokenizer & Highlighter
 * Pure JavaScript, zero dependencies.
 */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Tokenize a line or block of LaTeX code into highlighted HTML spans
 */
export function highlightLatex(text) {
  if (!text) return '';

  const lines = text.split('\n');
  const highlightedLines = lines.map(line => highlightLine(line));
  return highlightedLines.join('\n');
}

function highlightLine(line) {
  if (!line) return '';

  let out = '';
  let i = 0;
  const len = line.length;

  while (i < len) {
    const ch = line[i];

    // Check for comments: % until end of line (unless escaped \%)
    if (ch === '%' && (i === 0 || line[i - 1] !== '\\')) {
      const commentText = line.slice(i);
      out += `<span class="syn-comment">${escapeHtml(commentText)}</span>`;
      break;
    }

    // Check for display math: \[ ... \] or $$ ... $$
    if (line.slice(i, i + 2) === '\\[' || line.slice(i, i + 2) === '\\]' || line.slice(i, i + 2) === '$$') {
      out += `<span class="syn-math">${escapeHtml(line.slice(i, i + 2))}</span>`;
      i += 2;
      continue;
    }

    // Check for inline math delimiters: $ or \( or \)
    if (ch === '$' && (i === 0 || line[i - 1] !== '\\')) {
      out += `<span class="syn-math">$</span>`;
      i++;
      continue;
    }

    // Check for LaTeX command: \commandname
    if (ch === '\\') {
      // Check if it's a symbol command like \\ or \{ or \}
      if (i + 1 < len && !/[a-zA-Z]/.test(line[i + 1])) {
        out += `<span class="syn-cmd">\\${escapeHtml(line[i + 1])}</span>`;
        i += 2;
        continue;
      }

      // Alphanumeric command
      let j = i + 1;
      while (j < len && /[a-zA-Z*]/.test(line[j])) {
        j++;
      }
      const cmd = line.slice(i, j);

      if (cmd === '\\begin' || cmd === '\\end') {
        out += `<span class="syn-env">${escapeHtml(cmd)}</span>`;
      } else if (['\\documentclass', '\\usepackage', '\\input', '\\include', '\\bibliography', '\\bibliographystyle'].includes(cmd)) {
        out += `<span class="syn-kw">${escapeHtml(cmd)}</span>`;
      } else {
        out += `<span class="syn-cmd">${escapeHtml(cmd)}</span>`;
      }
      i = j;
      continue;
    }

    // Check for braces and brackets
    if (ch === '{' || ch === '}') {
      out += `<span class="syn-bracket">${escapeHtml(ch)}</span>`;
      i++;
      continue;
    }
    if (ch === '[' || ch === ']') {
      out += `<span class="syn-arg">${escapeHtml(ch)}</span>`;
      i++;
      continue;
    }

    // Check for numbers
    if (/[0-9]/.test(ch) && (i === 0 || !/[a-zA-Z]/.test(line[i - 1]))) {
      let j = i;
      while (j < len && /[0-9.]/.test(line[j])) {
        j++;
      }
      out += `<span class="syn-num">${escapeHtml(line.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    // Default plain character
    out += escapeHtml(ch);
    i++;
  }

  return out;
}
