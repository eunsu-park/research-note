"use client";

import { useState } from "react";
import type { EditorView } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link,
  Image,
  Table,
  Minus,
  Braces,
  Sigma,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  wrapSelection,
  toggleLinePrefix,
  insertAtCursor,
  insertLink,
  insertTable,
  insertCodeBlock,
} from "@/lib/editor/formatting";

import { Upload } from "lucide-react";

interface EditorToolbarProps {
  editorView: EditorView | null;
  onUpload?: () => void;
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
}

function ToolbarButton({ icon, label, shortcut, onClick }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClick}
          type="button"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span>{label}</span>
        {shortcut && (
          <span className="ml-2 text-muted-foreground">{shortcut}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function EditorToolbar({ editorView, onUpload }: EditorToolbarProps) {
  const [toolbarVisible, setToolbarVisible] = useState(true);

  if (!toolbarVisible) {
    return (
      <div className="flex items-center justify-end border-b px-2 py-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setToolbarVisible(true)}
          title="Show toolbar"
          type="button"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  const v = editorView;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 border-b px-2 py-0.5 flex-wrap">
        {/* Headings */}
        <ToolbarButton
          icon={<Heading1 className="h-4 w-4" />}
          label="Heading 1"
          onClick={() => v && toggleLinePrefix(v, "# ")}
        />
        <ToolbarButton
          icon={<Heading2 className="h-4 w-4" />}
          label="Heading 2"
          onClick={() => v && toggleLinePrefix(v, "## ")}
        />
        <ToolbarButton
          icon={<Heading3 className="h-4 w-4" />}
          label="Heading 3"
          onClick={() => v && toggleLinePrefix(v, "### ")}
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Inline formatting */}
        <ToolbarButton
          icon={<Bold className="h-4 w-4" />}
          label="Bold"
          shortcut="Ctrl+B"
          onClick={() => v && wrapSelection(v, "**", "**")}
        />
        <ToolbarButton
          icon={<Italic className="h-4 w-4" />}
          label="Italic"
          shortcut="Ctrl+I"
          onClick={() => v && wrapSelection(v, "*", "*")}
        />
        <ToolbarButton
          icon={<Strikethrough className="h-4 w-4" />}
          label="Strikethrough"
          shortcut="Ctrl+Shift+S"
          onClick={() => v && wrapSelection(v, "~~", "~~")}
        />
        <ToolbarButton
          icon={<Code className="h-4 w-4" />}
          label="Inline Code"
          shortcut="Ctrl+Shift+K"
          onClick={() => v && wrapSelection(v, "`", "`")}
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Lists & quotes */}
        <ToolbarButton
          icon={<List className="h-4 w-4" />}
          label="Bullet List"
          shortcut="Ctrl+Shift+8"
          onClick={() => v && toggleLinePrefix(v, "- ")}
        />
        <ToolbarButton
          icon={<ListOrdered className="h-4 w-4" />}
          label="Ordered List"
          shortcut="Ctrl+Shift+9"
          onClick={() => v && toggleLinePrefix(v, "1. ")}
        />
        <ToolbarButton
          icon={<ListChecks className="h-4 w-4" />}
          label="Task List"
          shortcut="Ctrl+Shift+X"
          onClick={() => v && toggleLinePrefix(v, "- [ ] ")}
        />
        <ToolbarButton
          icon={<Quote className="h-4 w-4" />}
          label="Blockquote"
          shortcut="Ctrl+Shift+Q"
          onClick={() => v && toggleLinePrefix(v, "> ")}
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Insert */}
        <ToolbarButton
          icon={<Link className="h-4 w-4" />}
          label="Link"
          shortcut="Ctrl+Shift+L"
          onClick={() => v && insertLink(v, false)}
        />
        <ToolbarButton
          icon={<Image className="h-4 w-4" />}
          label="Image (URL)"
          shortcut="Ctrl+Shift+I"
          onClick={() => v && insertLink(v, true)}
        />
        <ToolbarButton
          icon={<Upload className="h-4 w-4" />}
          label="Upload Image"
          onClick={() => onUpload?.()}
        />
        <ToolbarButton
          icon={<Table className="h-4 w-4" />}
          label="Table"
          shortcut="Ctrl+Shift+T"
          onClick={() => v && insertTable(v)}
        />
        <ToolbarButton
          icon={<Minus className="h-4 w-4" />}
          label="Horizontal Rule"
          shortcut="Ctrl+Shift+R"
          onClick={() => v && insertAtCursor(v, "\n---\n")}
        />

        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Code & Math */}
        <ToolbarButton
          icon={<Braces className="h-4 w-4" />}
          label="Code Block"
          shortcut="Ctrl+Shift+C"
          onClick={() => v && insertCodeBlock(v)}
        />
        <ToolbarButton
          icon={<Sigma className="h-4 w-4" />}
          label="Inline Math"
          onClick={() => v && wrapSelection(v, "$", "$")}
        />
        <ToolbarButton
          icon={
            <span className="text-xs font-mono leading-none">$$</span>
          }
          label="Block Math"
          shortcut="Ctrl+Shift+M"
          onClick={() => v && wrapSelection(v, "$$\n", "\n$$")}
        />

        {/* Spacer + collapse button */}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setToolbarVisible(false)}
          title="Hide toolbar"
          type="button"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
