---
title: Features Guide
tags:
  - guide
  - documentation
created: '2026-03-08T23:30:00.000Z'
updated: '2026-03-08T23:30:00.000Z'
pinned: true
---

# Features Guide

This guide covers all the application features in Research Note. For writing syntax (markdown, math, diagrams), see [[Writing Guide]].

---

## 1. Editor

### Split-Pane Layout

The note editor uses a split-pane layout:

- **Left pane**: CodeMirror 6 source editor for writing markdown
- **Right pane**: Live rendered preview that updates as you type

### Formatting Toolbar

The toolbar above the editor provides quick-access buttons for common formatting:

| Button | Action | Shortcut |
|--------|--------|----------|
| **B** | Bold | `Cmd+B` |
| *I* | Italic | `Cmd+I` |
| `<>` | Inline code | `Cmd+Shift+K` |
| H | Highlight | `Cmd+Shift+H` |
| ~~S~~ | Strikethrough | `Cmd+Shift+S` |
| Code | Code block | `Cmd+Shift+C` |
| Math | Math block | `Cmd+Shift+M` |
| Quote | Blockquote | `Cmd+Shift+Q` |
| Task | Task list | `Cmd+Shift+X` |
| UL | Bullet list | `Cmd+Shift+8` |
| OL | Numbered list | `Cmd+Shift+9` |
| Link | Insert link | `Cmd+Shift+L` |
| Image | Insert image | `Cmd+Shift+I` |
| Wiki | Insert wiki-link | `Cmd+Shift+W` |
| Table | Insert table | `Cmd+Shift+T` |
| Diagram | Mermaid diagram | `Cmd+Shift+D` |
| HR | Horizontal rule | `Cmd+Shift+R` |

### Auto-Save

Notes are automatically saved as you type. The save delay is configurable from 0.5s to 5s in Settings.

### Table of Contents

When your note contains headings, a table of contents appears above the preview panel. Click any heading to scroll to that section.

---

## 2. Search

### Full-Text Search

Open the search panel in the sidebar (Search tab) to search across all notes. The search uses SQLite FTS5 for fast, full-text matching with highlighted snippets in the results.

### Command Palette

Press `Cmd+K` to open the command palette for quick note searching and navigation. Type a few characters to filter notes by title.

### Search Filters

Combine multiple filters to narrow your search:

- **Type filter**: Filter by note type (Note, Presentation, Sticky)
- **Tag filter**: Select a tag to show only matching notes (supports hierarchical matching)
- **Date range**: Set a "from" and "to" date to filter by creation date

Filters can be combined with a text query, or used alone without any search text.

---

## 3. Organization

### Tags

Add tags to your notes via the frontmatter editor (click the chevron next to the title). Tags support hierarchical paths using `/`:

```
physics/quantum
physics/classical
math/linear-algebra
```

The sidebar tag panel shows tags as a collapsible tree. Selecting a parent tag includes all its children in the filter.

### Pin Notes

Pin important notes to always appear at the top of the sidebar file list. Right-click a note or use the pin option in the note menu.

### Folders

Assign notes to folders using the `folder` field in frontmatter. Folders help organize notes beyond tags.

---

## 4. Knowledge Graph

Navigate to the **Graph** page (graph icon in the header) to see an interactive visualization of how your notes are connected.

- **Nodes** represent notes, sized by the number of connections
- **Edges** represent `[[wiki-links]]` between notes
- **Drag** nodes to rearrange the layout
- **Click** a node to navigate to that note
- **Zoom** and **pan** to explore the graph

The graph uses a force-directed layout (D3.js) that automatically positions connected notes closer together.

---

## 5. Templates

When creating a new note, you can choose from built-in templates:

| Template | Description |
|----------|-------------|
| Blank | Empty note with just a title |
| Research | Structured template with sections for abstract, methods, results, discussion |
| Meeting | Template for meeting notes with attendees, agenda, action items |
| Literature Review | Template for reviewing papers with citation info, summary, key findings |

Templates provide a starting structure — you can freely modify the content after creation.

---

## 6. Daily Notes

Click the **Today** button in the header to create or open today's daily note. Daily notes use the date as their title (e.g., `2026-03-08`) and are tagged with `daily`.

This is useful for journaling, daily standup notes, or capturing quick thoughts.

---

## 7. Calendar View

Navigate to the **Calendar** page to browse notes by their creation date. Click a date to see all notes created on that day. This provides a chronological view of your note-taking activity.

---

## 8. Sticky Notes

Navigate to the **Stickies** page to use a draggable sticky note board. Each sticky note is a small, colored card that you can:

- **Create** with a click
- **Drag** to reposition on the board
- **Edit** by clicking the text
- **Delete** when no longer needed

Sticky notes are stored separately from regular notes and are useful for quick reminders or brainstorming.

---

## 9. Presentations (Marp)

Create presentation slides using the Marp syntax. Set the note type to "presentation" when creating a new note.

### Slide Syntax

Separate slides with `---` (horizontal rule):

```markdown
---
marp: true
---

# Slide 1

Content for the first slide.

---

# Slide 2

Content for the second slide.
```

### Features

- **Live preview**: See rendered slides as you write
- **Presentation mode**: Full-screen slide presentation
- **Export**: Download as PDF, PPTX, or HTML

---

## 10. Version History

If your notes directory is a Git repository, you can view the change history of any note:

1. Open a note
2. Click the **History** button
3. Browse past versions with diff highlighting
4. Restore a previous version if needed

This requires Git to be installed and the `notes/` directory to be a Git repository.

---

## 11. File Attachments

### Upload Methods

- **Drag & drop**: Drag a file into the editor area
- **Clipboard paste**: Paste an image from your clipboard (`Cmd+V`)

### Limits

- Maximum file size: **10 MB**
- Allowed types: Images (PNG, JPEG, GIF, SVG, WebP), PDF, and common document formats

Uploaded files are stored in the `attachments/` directory with UUID filenames to prevent conflicts.

---

## 12. Export & Import

### Export

- **Single note**: Export as HTML from the note menu
- **Bulk export**: Download all notes as a ZIP file from Settings > Data
- **Marp export**: Export presentations as PDF, PPTX, or HTML

### Import

- **Bulk import**: Upload multiple `.md` files at once from Settings > Data
- Imported notes are parsed and indexed automatically

### Web Clipper

Save a web page as a note by sending a POST request:

```bash
curl -X POST http://localhost:3000/api/clip \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

---

## 13. Trash System

Deleted notes are moved to `.trash/` instead of being permanently removed.

- **View trash**: Access from Settings or the API
- **Restore**: Bring a deleted note back to the active notes
- **Permanent delete**: Remove a note from trash forever
- **Empty trash**: Permanently delete all trashed notes

---

## 14. Settings

Open Settings (gear icon in the header) to customize your experience:

### Editor

| Setting | Default | Options |
|---------|---------|---------|
| Font size | 14px | 12–20px |
| Line numbers | On | On/Off |
| Line wrapping | On | On/Off |

### Auto-Save

| Setting | Default | Options |
|---------|---------|---------|
| Save delay | 1s | 0.5–5s |

### Sidebar

| Setting | Default | Options |
|---------|---------|---------|
| Default tab | Files | Files/Tags/Search |

### Dark/Light Mode

Toggle between dark and light themes using the theme button in the header. The app also respects your system preference by default.

---

## 15. Keyboard Shortcuts

Press `?` anywhere in the app to see the full keyboard shortcuts reference.

### Quick Reference

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette |
| `Cmd+Shift+N` | Create a new note |
| `?` | Show keyboard shortcuts |
| `Cmd+B` | Bold |
| `Cmd+I` | Italic |
| `Cmd+Shift+C` | Code block |
| `Cmd+Shift+M` | Math block |
