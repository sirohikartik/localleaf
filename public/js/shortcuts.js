/**
 * LocalLeaf Keyboard Shortcuts and Editor Interactions
 */

export function setupKeyboardShortcuts({ textarea, onRecompile, onSave, onInputUpdate }) {
  textarea.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    // Cmd/Ctrl + Enter: Recompile
    if (modKey && e.key === 'Enter') {
      e.preventDefault();
      onRecompile();
      return;
    }

    // Cmd/Ctrl + S: Save
    if (modKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      onSave();
      return;
    }

    // Cmd/Ctrl + B: Bold (\textbf{})
    if (modKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      wrapSelection(textarea, '\\textbf{', '}');
      onInputUpdate();
      return;
    }

    // Cmd/Ctrl + I: Italic (\textit{})
    if (modKey && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      wrapSelection(textarea, '\\textit{', '}');
      onInputUpdate();
      return;
    }

    // Cmd/Ctrl + K: Math ($...$)
    if (modKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      wrapSelection(textarea, '$', '$');
      onInputUpdate();
      return;
    }

    // Tab / Shift+Tab for Indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;

      if (start === end) {
        // Simple insert 2 spaces
        textarea.value = val.substring(0, start) + '  ' + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      } else {
        // Multi-line indent/unindent
        const lines = val.substring(start, end).split('\n');
        if (e.shiftKey) {
          const unindented = lines.map(line => line.startsWith('  ') ? line.substring(2) : (line.startsWith(' ') ? line.substring(1) : line)).join('\n');
          textarea.value = val.substring(0, start) + unindented + val.substring(end);
          textarea.selectionStart = start;
          textarea.selectionEnd = start + unindented.length;
        } else {
          const indented = lines.map(line => '  ' + line).join('\n');
          textarea.value = val.substring(0, start) + indented + val.substring(end);
          textarea.selectionStart = start;
          textarea.selectionEnd = start + indented.length;
        }
      }
      onInputUpdate();
      return;
    }

    // Auto-pair braces, brackets, and quotes
    const pairs = {
      '{': '}',
      '[': ']',
      '(': ')',
      '"': '"',
      '$': '$'
    };

    if (pairs[e.key]) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const closeChar = pairs[e.key];

      e.preventDefault();
      if (start !== end) {
        const selected = val.substring(start, end);
        textarea.value = val.substring(0, start) + e.key + selected + closeChar + val.substring(end);
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = end + 1;
      } else {
        textarea.value = val.substring(0, start) + e.key + closeChar + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }
      onInputUpdate();
      return;
    }
  });
}

export function wrapSelection(textarea, prefix, suffix) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;
  const selected = val.substring(start, end);

  textarea.value = val.substring(0, start) + prefix + selected + suffix + val.substring(end);
  if (start === end) {
    textarea.selectionStart = textarea.selectionEnd = start + prefix.length;
  } else {
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = end + prefix.length;
  }
  textarea.focus();
}

export function insertSnippet(textarea, snippet) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const val = textarea.value;

  textarea.value = val.substring(0, start) + snippet + val.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
  textarea.focus();
}
