import type { EditorView } from "@codemirror/view";

/**
 * Toggle inline formatting around selection (e.g., **bold**, *italic*).
 * If the selection is already wrapped, remove the markers. Otherwise, wrap it.
 * If nothing is selected, insert markers and place cursor between them.
 */
export function wrapSelection(
  view: EditorView,
  before: string,
  after: string
): void {
  const { state } = view;
  const { from, to } = state.selection.main;
  const selected = state.sliceDoc(from, to);

  // Check if selection is already wrapped
  const beforeText = state.sliceDoc(
    Math.max(0, from - before.length),
    from
  );
  const afterText = state.sliceDoc(to, to + after.length);

  if (beforeText === before && afterText === after) {
    // Remove wrapping
    view.dispatch({
      changes: [
        { from: from - before.length, to: from, insert: "" },
        { from: to, to: to + after.length, insert: "" },
      ],
      selection: {
        anchor: from - before.length,
        head: to - before.length,
      },
    });
    return;
  }

  // Check if selected text itself starts/ends with markers
  if (
    selected.startsWith(before) &&
    selected.endsWith(after) &&
    selected.length >= before.length + after.length
  ) {
    const inner = selected.slice(before.length, -after.length);
    view.dispatch({
      changes: { from, to, insert: inner },
      selection: { anchor: from, head: from + inner.length },
    });
    return;
  }

  // Wrap selection (or insert empty markers)
  const wrapped = `${before}${selected}${after}`;
  view.dispatch({
    changes: { from, to, insert: wrapped },
    selection:
      selected.length > 0
        ? { anchor: from, head: from + wrapped.length }
        : { anchor: from + before.length },
  });
  view.focus();
}

/**
 * Toggle a line prefix (e.g., "## " for heading, "- " for list).
 * For headings, replaces any existing heading prefix.
 */
export function toggleLinePrefix(
  view: EditorView,
  prefix: string
): void {
  const { state } = view;
  const { from, to } = state.selection.main;

  const startLine = state.doc.lineAt(from);
  const endLine = state.doc.lineAt(to);

  const changes: Array<{ from: number; to: number; insert: string }> = [];

  const headingPrefixes = ["# ", "## ", "### ", "#### ", "##### ", "###### "];
  const isHeading = headingPrefixes.includes(prefix);

  for (let i = startLine.number; i <= endLine.number; i++) {
    const line = state.doc.line(i);
    const text = line.text;

    if (isHeading) {
      // Find existing heading prefix
      const match = text.match(/^#{1,6}\s/);
      if (match && match[0] === prefix) {
        // Same heading — remove it
        changes.push({
          from: line.from,
          to: line.from + match[0].length,
          insert: "",
        });
      } else if (match) {
        // Different heading — replace it
        changes.push({
          from: line.from,
          to: line.from + match[0].length,
          insert: prefix,
        });
      } else {
        // No heading — add it
        changes.push({
          from: line.from,
          to: line.from,
          insert: prefix,
        });
      }
    } else {
      if (text.startsWith(prefix)) {
        // Remove prefix
        changes.push({
          from: line.from,
          to: line.from + prefix.length,
          insert: "",
        });
      } else {
        // Add prefix
        changes.push({
          from: line.from,
          to: line.from,
          insert: prefix,
        });
      }
    }
  }

  if (changes.length > 0) {
    view.dispatch({ changes });
  }
  view.focus();
}

/**
 * Insert text at the current cursor position.
 * If there's a selection, replace it.
 */
export function insertAtCursor(view: EditorView, text: string): void {
  const { from, to } = view.state.selection.main;
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  });
  view.focus();
}

/**
 * Insert a link or image. Uses selected text as the label.
 */
export function insertLink(view: EditorView, isImage: boolean): void {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  const label = selected || (isImage ? "alt text" : "link text");
  const template = isImage
    ? `![${label}](url)`
    : `[${label}](url)`;

  view.dispatch({
    changes: { from, to, insert: template },
    // Select "url" so user can type the URL immediately
    selection: {
      anchor: from + template.length - 4,
      head: from + template.length - 1,
    },
  });
  view.focus();
}

/**
 * Insert a markdown table template at cursor.
 */
export function insertTable(view: EditorView): void {
  const { from, to } = view.state.selection.main;
  const table = `| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
|          |          |          |
`;

  // Ensure we're on a new line
  const line = view.state.doc.lineAt(from);
  const needNewline = line.text.length > 0 && from !== line.from;
  const insert = needNewline ? `\n${table}` : table;

  view.dispatch({
    changes: { from, to, insert },
  });
  view.focus();
}

/**
 * Insert a code block. If there's a selection, wrap it.
 */
export function insertCodeBlock(view: EditorView): void {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  if (selected) {
    const wrapped = `\`\`\`\n${selected}\n\`\`\``;
    view.dispatch({
      changes: { from, to, insert: wrapped },
      selection: {
        anchor: from + 3,
        head: from + 3,
      },
    });
  } else {
    const block = "```\n\n```";
    view.dispatch({
      changes: { from, to, insert: block },
      selection: { anchor: from + 4 },
    });
  }
  view.focus();
}
