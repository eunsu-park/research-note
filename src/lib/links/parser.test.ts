import { describe, it, expect } from "vitest";
import { extractLinks, renderWikiLinks, slugifyHeading } from "./parser";

describe("slugifyHeading", () => {
  it("converts heading to lowercase kebab-case", () => {
    expect(slugifyHeading("Hello World")).toBe("hello-world");
  });

  it("strips special characters", () => {
    expect(slugifyHeading("What's New?")).toBe("whats-new");
  });

  it("collapses multiple dashes and spaces", () => {
    // "foo  --  bar" → strip special → replace spaces with - → collapse dashes → "foo-bar"
    expect(slugifyHeading("foo  --  bar")).toBe("foo-bar");
    expect(slugifyHeading("foo   bar")).toBe("foo-bar");
  });

  it("converts leading/trailing spaces to dashes (trim only strips whitespace)", () => {
    // "  spaced  " → spaces become dashes → "-spaced-" → trim is no-op on dashes
    expect(slugifyHeading("  spaced  ")).toBe("-spaced-");
  });

  it("handles empty string", () => {
    expect(slugifyHeading("")).toBe("");
  });

  it("preserves underscores", () => {
    expect(slugifyHeading("my_variable")).toBe("my_variable");
  });
});

describe("extractLinks", () => {
  it("extracts simple [[target]] links", () => {
    const links = extractLinks("source-note", "See [[My Note]] for details.");
    expect(links).toEqual([
      { source: "source-note", target: "my-note", section: undefined },
    ]);
  });

  it("extracts [[target#heading]] links with section", () => {
    const links = extractLinks("source", "Refer to [[Note#Section One]].");
    expect(links).toEqual([
      { source: "source", target: "note", section: "section-one" },
    ]);
  });

  it("extracts [[target|display]] links with display text", () => {
    const links = extractLinks("source", "See [[my-note|click here]].");
    expect(links).toEqual([
      { source: "source", target: "my-note", section: undefined },
    ]);
  });

  it("extracts [[target#heading|display]] links with section and display", () => {
    const links = extractLinks(
      "source",
      "See [[Research Paper#Methods|methods section]]."
    );
    expect(links).toEqual([
      { source: "source", target: "research-paper", section: "methods" },
    ]);
  });

  it("extracts multiple links from content", () => {
    const content = "Link to [[Note A]] and [[Note B]] and [[Note C]].";
    const links = extractLinks("source", content);
    expect(links).toHaveLength(3);
    expect(links.map((l) => l.target)).toEqual([
      "note-a",
      "note-b",
      "note-c",
    ]);
  });

  it("deduplicates links to the same target", () => {
    const content = "See [[My Note]] and again [[My Note]].";
    const links = extractLinks("source", content);
    expect(links).toHaveLength(1);
  });

  it("excludes self-links", () => {
    const links = extractLinks("my-note", "See [[My Note]] for recursion.");
    expect(links).toHaveLength(0);
  });

  it("returns empty array for content with no links", () => {
    const links = extractLinks("source", "No links here.");
    expect(links).toEqual([]);
  });

  it("handles links with extra whitespace in target", () => {
    const links = extractLinks("source", "See [[ My Note ]].");
    expect(links).toEqual([
      { source: "source", target: "my-note", section: undefined },
    ]);
  });

  it("handles consecutive calls (regex state reset)", () => {
    const links1 = extractLinks("a", "See [[Note X]].");
    const links2 = extractLinks("b", "See [[Note Y]].");
    expect(links1).toHaveLength(1);
    expect(links2).toHaveLength(1);
    expect(links2[0].target).toBe("note-y");
  });
});

describe("renderWikiLinks", () => {
  it("converts [[target]] to markdown link", () => {
    const result = renderWikiLinks("See [[My Note]].");
    expect(result).toBe("See [My Note](/notes/my-note).");
  });

  it("converts [[target#heading]] to link with anchor", () => {
    const result = renderWikiLinks("See [[Note#Section One]].");
    expect(result).toBe("See [Note#Section One](/notes/note#section-one).");
  });

  it("converts [[target|display]] using display text", () => {
    const result = renderWikiLinks("See [[my-note|click here]].");
    expect(result).toBe("See [click here](/notes/my-note).");
  });

  it("converts [[target#heading|display]] with both section and display", () => {
    const result = renderWikiLinks(
      "See [[Research Paper#Methods|methods section]]."
    );
    expect(result).toBe(
      "See [methods section](/notes/research-paper#methods)."
    );
  });

  it("converts multiple links in content", () => {
    const result = renderWikiLinks("From [[Note A]] to [[Note B]].");
    expect(result).toBe(
      "From [Note A](/notes/note-a) to [Note B](/notes/note-b)."
    );
  });

  it("returns content unchanged when no wiki-links present", () => {
    const content = "No links here.";
    expect(renderWikiLinks(content)).toBe(content);
  });

  it("handles consecutive calls (regex state reset)", () => {
    const r1 = renderWikiLinks("[[A]]");
    const r2 = renderWikiLinks("[[B]]");
    expect(r1).toBe("[A](/notes/a)");
    expect(r2).toBe("[B](/notes/b)");
  });
});
