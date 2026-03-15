"use client";

import { useEffect, useRef, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "next-themes";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";
import { EditorToolbar } from "./EditorToolbar";
import {
  wrapSelection,
  toggleLinePrefix,
  insertCodeBlock,
  insertBlock,
  insertLink,
  insertTable,
  insertHorizontalRule,
  insertAtCursor,
} from "@/lib/editor/formatting";

async function uploadFile(file: File, slug?: string): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  if (slug) formData.append("slug", slug);

  const res = await fetch("/api/upload", { method: "POST", body: formData });
  const json = await res.json();

  if (!res.ok) {
    toast.error(json.error || "Upload failed");
    return null;
  }

  return json.data.markdown as string;
}

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  slug?: string;
  className?: string;
}

export function MarkdownEditor({
  content,
  onChange,
  slug,
  className = "",
}: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const { resolvedTheme } = useTheme();
  const { editorFontSize, showLineNumbers, lineWrapping } = useSettingsStore();

  // Keep onChange ref up to date
  onChangeRef.current = onChange;

  const createState = useCallback(
    (doc: string) => {
      const isDark = resolvedTheme === "dark";

      return EditorState.create({
        doc,
        extensions: [
          ...(showLineNumbers ? [lineNumbers()] : []),
          highlightActiveLine(),
          history(),
          bracketMatching(),
          highlightSelectionMatches(),
          autocompletion(),
          markdown({ base: markdownLanguage }),
          syntaxHighlighting(defaultHighlightStyle),
          ...(isDark ? [oneDark] : []),
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
            ...completionKeymap,
            {
              key: "Mod-b",
              run: (v) => { wrapSelection(v, "**", "**"); return true; },
            },
            {
              key: "Mod-i",
              run: (v) => { wrapSelection(v, "*", "*"); return true; },
            },
            {
              key: "Mod-Shift-s",
              run: (v) => { wrapSelection(v, "~~", "~~"); return true; },
            },
            {
              key: "Mod-Shift-k",
              run: (v) => { wrapSelection(v, "`", "`"); return true; },
            },
            {
              key: "Mod-Shift-x",
              run: (v) => { toggleLinePrefix(v, "- [ ] "); return true; },
            },
            {
              key: "Mod-Shift-c",
              run: (v) => { insertCodeBlock(v); return true; },
            },
            {
              key: "Mod-Shift-h",
              run: (v) => { wrapSelection(v, "<mark>", "</mark>"); return true; },
            },
            {
              key: "Mod-Shift-m",
              run: (v) => { insertBlock(v, "$$", "$$"); return true; },
            },
            {
              key: "Mod-Shift-q",
              run: (v) => { toggleLinePrefix(v, "> "); return true; },
            },
            {
              key: "Mod-Shift-8",
              run: (v) => { toggleLinePrefix(v, "- "); return true; },
            },
            {
              key: "Mod-Shift-9",
              run: (v) => { toggleLinePrefix(v, "1. "); return true; },
            },
            {
              key: "Mod-Shift-d",
              run: (v) => { insertBlock(v, "```mermaid", "```"); return true; },
            },
            {
              key: "Mod-Shift-r",
              run: (v) => { insertHorizontalRule(v); return true; },
            },
            {
              key: "Mod-Shift-l",
              run: (v) => { insertLink(v, false); return true; },
            },
            {
              key: "Mod-Shift-i",
              run: (v) => { insertLink(v, true); return true; },
            },
            {
              key: "Mod-Shift-t",
              run: (v) => { insertTable(v); return true; },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: `${editorFontSize}px`,
            },
            ".cm-scroller": {
              overflow: "auto",
              fontFamily:
                "var(--font-geist-mono), ui-monospace, monospace",
            },
            ".cm-content": {
              padding: "16px 0",
            },
            ".cm-gutters": {
              borderRight: "none",
            },
          }),
          ...(lineWrapping ? [EditorView.lineWrapping] : []),
        ],
      });
    },
    [resolvedTheme, editorFontSize, showLineNumbers, lineWrapping]
  );

  // Initialize editor (re-create on theme or settings change)
  useEffect(() => {
    if (!editorRef.current) return;

    const state = createState(content);
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme, editorFontSize, showLineNumbers, lineWrapping]);

  // Update content from outside (e.g., when switching notes)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== content) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: content,
        },
      });
    }
  }, [content]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) return;

      e.preventDefault();
      e.stopPropagation();

      const view = viewRef.current;
      if (!view) return;

      for (const file of files) {
        const md = await uploadFile(file, slug);
        if (md) {
          insertAtCursor(view, `\n${md}\n`);
        }
      }
    },
    [slug]
  );

  const handleUploadClick = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/gif,image/webp,image/svg+xml";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      const view = viewRef.current;
      if (!view || files.length === 0) return;

      for (const file of files) {
        const md = await uploadFile(file, slug);
        if (md) {
          insertAtCursor(view, `\n${md}\n`);
        }
      }
    };
    input.click();
  }, [slug]);

  return (
    <div className={`h-full flex flex-col overflow-hidden ${className}`}>
      <EditorToolbar editorView={viewRef.current} onUpload={handleUploadClick} />
      <div
        ref={editorRef}
        className="flex-1 overflow-hidden"
        onDrop={handleDrop}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
          }
        }}
      />
    </div>
  );
}
