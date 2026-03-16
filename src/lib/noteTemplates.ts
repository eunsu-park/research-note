export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Empty note",
    content: "",
  },
  {
    id: "research",
    name: "Research Note",
    description: "Abstract, methods, results, references",
    content: `## Abstract

> Brief summary of the research.

## Background

## Methods

## Results

## Discussion

## References
`,
  },
  {
    id: "meeting",
    name: "Meeting Note",
    description: "Attendees, agenda, action items",
    content: `## Meeting Info

- **Date:**
- **Attendees:**

## Agenda

1.

## Notes

## Action Items

- [ ]
`,
  },
  {
    id: "literature",
    name: "Literature Review",
    description: "Paper summary and critique",
    content: `## Paper Info

- **Title:**
- **Authors:**
- **Year:**
- **DOI/URL:**

## Summary

## Key Contributions

## Methodology

## Strengths

## Limitations

## Notes
`,
  },
];
