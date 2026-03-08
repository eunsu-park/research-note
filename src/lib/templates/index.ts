import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { NoteTemplate } from "@/types/note.types";

const TEMPLATES_DIR = path.join(process.cwd(), "templates");

/** Ensure the templates directory exists */
function ensureDirExists(): void {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }
}

/** Ensure the templates directory exists and create defaults */
export function ensureTemplatesDir(): void {
  ensureDirExists();
  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    createDefaultTemplates();
  }
}

/** List all available templates */
export function listTemplates(): NoteTemplate[] {
  ensureTemplatesDir();
  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".md"));

  return files.map((file) => {
    const id = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(TEMPLATES_DIR, file), "utf-8");
    const { data, content } = matter(raw);

    return {
      id,
      name: (data.name as string) || id,
      description: (data.description as string) || "",
      content: content.trim(),
    };
  });
}

/** Get a single template by ID */
export function getTemplate(id: string): NoteTemplate | null {
  const filePath = path.join(TEMPLATES_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    id,
    name: (data.name as string) || id,
    description: (data.description as string) || "",
    content: content.trim(),
  };
}

/** Apply template variables to content */
export function applyTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  // Apply built-in variables
  const now = new Date();
  result = result.replaceAll("{{date}}", now.toISOString().split("T")[0]);
  result = result.replaceAll("{{datetime}}", now.toISOString());
  result = result.replaceAll("{{year}}", String(now.getFullYear()));
  return result;
}

/** Save a template */
export function saveTemplate(template: NoteTemplate): void {
  ensureDirExists();
  const filePath = path.join(TEMPLATES_DIR, `${template.id}.md`);
  const raw = matter.stringify(template.content, {
    name: template.name,
    description: template.description,
  });
  fs.writeFileSync(filePath, raw, "utf-8");
}

/** Delete a template */
export function deleteTemplate(id: string): boolean {
  const filePath = path.join(TEMPLATES_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

/** Create default templates */
function createDefaultTemplates(): void {
  const defaults: NoteTemplate[] = [
    {
      id: "blank",
      name: "Blank Note",
      description: "An empty note to start from scratch",
      content: "",
    },
    {
      id: "research",
      name: "Research Note",
      description: "Template for documenting research findings",
      content: `## Objective

{{title}}

## Background



## Method



## Findings



## Conclusions



## References

`,
    },
    {
      id: "meeting",
      name: "Meeting Notes",
      description: "Template for meeting notes",
      content: `## Meeting: {{title}}

**Date:** {{date}}
**Attendees:**

## Agenda

1.

## Discussion



## Action Items

- [ ]

## Next Steps

`,
    },
    {
      id: "literature-review",
      name: "Literature Review",
      description: "Template for reviewing papers and articles",
      content: `## {{title}}

**Authors:**
**Year:**
**Source:**

## Summary



## Key Points

-

## Methodology



## Results



## Relevance to Current Research



## Notes

`,
    },
  ];

  for (const template of defaults) {
    saveTemplate(template);
  }
}
