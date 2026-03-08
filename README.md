# Research Note

A local-first, markdown-based research note application with knowledge graph visualization, full-text search, and a rich editing experience.

Notes are stored as plain `.md` files on the local filesystem and indexed via SQLite for fast retrieval. No cloud services, no vendor lock-in — your data stays on your machine.

## Why Research Note?

- **Plain markdown files** — Notes are `.md` files you can open in any editor
- **Zero cloud dependency** — Runs entirely on your machine, works offline
- **Linked thinking** — `[[wiki-links]]` connect your notes into a knowledge graph
- **Rich content** — LaTeX math, Mermaid diagrams, syntax-highlighted code, presentations
- **Fast search** — SQLite FTS5 full-text search with filters and highlighted snippets

## Features

### Editor

| Feature | Description |
|---------|-------------|
| Split-pane editor | CodeMirror 6 source editor with live rendered preview |
| Formatting toolbar | Bold, italic, headings, lists, code, math, tables, links |
| Keyboard shortcuts | `Cmd+B` bold, `Cmd+I` italic, `Cmd+Shift+C` code block, and more |
| Auto-save | Configurable delay (0.5s–5s), saves automatically as you type |
| Customizable | Font size (12–20px), line numbers, word wrap via Settings |

### Organization

| Feature | Description |
|---------|-------------|
| Tags | Hierarchical tags (`topic/subtopic`) with tree view and inclusive filtering |
| Bi-directional links | `[[wiki-link]]` and `[[note#heading]]` section-level links with backlink tracking |
| Templates | Predefined templates: blank, research, meeting, literature review |
| Daily notes | One-click daily journal entry with date-based slug |
| Calendar view | Browse and navigate notes by creation date |

### Search & Discovery

| Feature | Description |
|---------|-------------|
| Full-text search | SQLite FTS5 with highlighted snippets |
| Combined filters | Filter by tag, note type, and date range simultaneously |
| Command palette | `Cmd+K` for quick search and navigation |
| Knowledge graph | Interactive D3.js force-directed graph of note connections |

### Rich Content

| Feature | Description |
|---------|-------------|
| LaTeX math | Inline `$...$` and block `$$...$$` via KaTeX |
| Diagrams | Mermaid flowcharts, sequence diagrams, state diagrams, etc. |
| Code blocks | Syntax highlighting for 100+ languages via Shiki |
| Presentations | Marp slide authoring with live preview and PDF/PPTX/HTML export |
| File attachments | Drag & drop upload with 10MB size limit and MIME validation |
| Web clipper | Save web pages as markdown notes |

### Productivity

| Feature | Description |
|---------|-------------|
| Sticky notes | Draggable sticky note boards per note |
| Version history | Git-based file history with diff view and restore |
| Export/Import | ZIP bulk export, markdown bulk import |
| Trash system | Deleted notes moved to `.trash/` with restore and permanent delete |
| Settings | Configurable editor, auto-save, sidebar, and interface preferences |
| Dark/Light mode | System preference detection + manual toggle |

### Data Safety

| Feature | Description |
|---------|-------------|
| DOMPurify | HTML sanitization on all rendered content to prevent XSS |
| Incremental sync | mtime-based DB sync — only changed files are re-indexed |
| Error boundary | React error boundary prevents full app crashes |
| Toast notifications | User feedback on all operations (success/error) via sonner |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) + TypeScript |
| UI | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| Editor | [CodeMirror 6](https://codemirror.net/) |
| Markdown | [unified](https://unifiedjs.com/) / remark / rehype / rehype-slug |
| Storage | Local filesystem (`.md`) + [SQLite](https://www.sqlite.org/) ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) |
| Search | SQLite FTS5 |
| Graph | [D3.js](https://d3js.org/) |
| State | [Zustand](https://zustand.docs.pmnd.rs/) |
| Math | [KaTeX](https://katex.org/) |
| Diagrams | [Mermaid](https://mermaid.js.org/) |
| Syntax | [Shiki](https://shiki.style/) |
| Presentations | [Marp](https://marp.app/) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [pnpm](https://pnpm.io/) package manager

### Install & Run

```bash
git clone https://github.com/your-username/research-note.git
cd research-note
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

## How It Works

### Data Storage

Research Note uses a **hybrid storage** approach:

```
research-note/
├── notes/          # Your notes as plain .md files (created at runtime)
├── data/           # SQLite database for indexing and search (created at runtime)
├── attachments/    # Uploaded files (created at runtime)
└── .trash/         # Deleted notes for recovery (created at runtime)
```

- **Notes** are plain markdown files in `notes/`. Each file has YAML frontmatter for metadata (title, tags, type, dates).
- **SQLite** indexes note content for full-text search (FTS5) and metadata queries. The database is regenerated from files on startup.
- **Attachments** are stored in `attachments/` with UUID filenames to avoid collisions.
- **Deleted notes** are moved to `.trash/` instead of being permanently deleted, allowing recovery.

All runtime data directories are gitignored. The application creates them automatically on first run.

### Note Format

Notes are standard markdown files with YAML frontmatter:

```markdown
---
title: My Research Note
tags:
  - physics/quantum
  - math
type: research
created: 2026-03-08T10:00:00.000Z
updated: 2026-03-08T10:00:00.000Z
---

# My Research Note

Your content here. Use [[wiki-links]] to connect notes.

Inline math: $E = mc^2$

Block math:
$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$
```

### Wiki Links

Use `[[note-slug]]` to create bi-directional links between notes. Link to a specific section with `[[note-slug#heading]]`, or use display text with `[[note-slug#heading|display text]]`. The knowledge graph visualizes note connections as an interactive force-directed graph.

## Configuration

Open **Settings** (gear icon in the header) to customize:

| Setting | Default | Range |
|---------|---------|-------|
| Editor font size | 14px | 12–20px |
| Show line numbers | On | On/Off |
| Line wrapping | On | On/Off |
| Auto-save delay | 1s | 0.5–5s |
| Default sidebar tab | Files | Files/Tags/Search |

Settings are persisted in `localStorage` and survive page reloads.

## API Routes

The application exposes REST API routes under `/api/`:

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/notes` | GET, POST | List all notes, create a new note |
| `/api/notes/[slug]` | GET, PUT, DELETE | Read, update, delete a single note |
| `/api/notes/[slug]/backlinks` | GET | Get backlinks for a note |
| `/api/notes/by-date` | GET | Get notes grouped by date |
| `/api/search` | GET | Full-text search with filters |
| `/api/tags` | GET | List all tags |
| `/api/graph` | GET | Get knowledge graph data (nodes + edges) |
| `/api/templates` | GET | List available note templates |
| `/api/daily` | POST | Create today's daily note |
| `/api/attachments` | POST | Upload a file attachment |
| `/api/attachments/[filename]` | GET | Serve an uploaded file |
| `/api/clip` | POST | Clip a web page as a markdown note |
| `/api/render` | POST | Render markdown to HTML |
| `/api/render-marp` | POST | Render Marp markdown to HTML slides |
| `/api/export` | GET | Export a single note (HTML) |
| `/api/export-marp` | POST | Export Marp slides (PDF/PPTX/HTML) |
| `/api/bulk` | GET, POST | ZIP export all notes, bulk import markdown files |
| `/api/history` | GET | Get Git history for a note |
| `/api/trash` | GET, POST, DELETE | List trash, restore, permanently delete |
| `/api/stickies` | GET, POST | List sticky notes, create new |
| `/api/stickies/[id]` | PUT, DELETE | Update or delete a sticky note |

## Project Structure

```
research-note/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout + providers
│   │   ├── page.tsx                # Dashboard / home
│   │   ├── notes/[slug]/page.tsx   # Note editor page
│   │   ├── graph/page.tsx          # Knowledge graph page
│   │   ├── calendar/page.tsx       # Calendar view page
│   │   ├── stickies/page.tsx       # Sticky notes board page
│   │   ├── settings/page.tsx       # Settings page
│   │   └── api/                    # REST API routes (21 endpoints)
│   ├── components/
│   │   ├── editor/                 # CodeMirror editor + formatting toolbar
│   │   ├── preview/                # Markdown preview + Marp preview
│   │   ├── sidebar/                # File list, tag panel, search panel
│   │   ├── graph/                  # D3.js knowledge graph
│   │   ├── layout/                 # App shell, header, dialogs, error boundary
│   │   ├── stickies/               # Sticky note board
│   │   ├── presentation/           # Presentation mode overlay
│   │   └── ui/                     # shadcn/ui base components
│   ├── lib/
│   │   ├── db/                     # SQLite schema, connection, incremental sync
│   │   ├── markdown/               # Parsing & rendering pipeline
│   │   ├── search/                 # FTS5 indexing & filtered queries
│   │   ├── filesystem/             # File I/O, trash system
│   │   ├── links/                  # Wiki-link parser (section-level), backlink resolution
│   │   ├── tags/                   # Tag hierarchy (tree builder, matcher)
│   │   ├── editor/                 # Formatting helpers (wrapSelection, toggleLinePrefix)
│   │   ├── git/                    # Git history integration
│   │   └── templates/              # Template management
│   ├── hooks/                      # Custom React hooks (useDebounce, useFileUpload)
│   ├── stores/                     # Zustand stores (noteStore, settingsStore, stickyStore)
│   └── types/                      # TypeScript type definitions
├── templates/                      # Note template files (.md)
├── docs/                           # Project documentation
└── data/                           # SQLite database directory (runtime)
```

## Keyboard Shortcuts

Press `?` anywhere in the app to view the full shortcuts list.

### General

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette / search |
| `Cmd+Shift+N` | Create a new note |
| `?` | Show keyboard shortcuts |

### Editor — Inline Formatting

| Shortcut | Action |
|----------|--------|
| `Cmd+B` | Bold |
| `Cmd+I` | Italic |
| `Cmd+Shift+K` | Inline code |
| `Cmd+Shift+H` | Highlight |
| `Cmd+Shift+S` | Strikethrough |

### Editor — Block Formatting

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+C` | Code block |
| `Cmd+Shift+M` | Math block |
| `Cmd+Shift+Q` | Blockquote |
| `Cmd+Shift+X` | Task list |
| `Cmd+Shift+8` | Bullet list |
| `Cmd+Shift+9` | Numbered list |
| `Cmd+Shift+D` | Mermaid diagram |
| `Cmd+Shift+R` | Horizontal rule |

### Editor — General

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+L` | Insert link |
| `Cmd+Shift+I` | Insert image |
| `Cmd+Shift+W` | Insert wiki-link |
| `Cmd+Shift+T` | Insert table |

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint
```

### Code Style

- TypeScript strict mode
- Functional React components with hooks
- Named exports preferred
- React Server Components where appropriate; `"use client"` only when needed

## License

[MIT](LICENSE)
