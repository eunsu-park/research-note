import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

interface ClipResult {
  title: string;
  content: string;
  excerpt: string;
  siteName: string;
  url: string;
}

/** Convert an HTML element's content to simple markdown */
function htmlToMarkdown(element: Element): string {
  let md = "";

  for (const node of element.childNodes) {
    if (node.nodeType === 3) {
      // Text node
      md += node.textContent || "";
    } else if (node.nodeType === 1) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      switch (tag) {
        case "h1":
          md += `\n# ${el.textContent?.trim()}\n\n`;
          break;
        case "h2":
          md += `\n## ${el.textContent?.trim()}\n\n`;
          break;
        case "h3":
          md += `\n### ${el.textContent?.trim()}\n\n`;
          break;
        case "h4":
          md += `\n#### ${el.textContent?.trim()}\n\n`;
          break;
        case "h5":
          md += `\n##### ${el.textContent?.trim()}\n\n`;
          break;
        case "h6":
          md += `\n###### ${el.textContent?.trim()}\n\n`;
          break;
        case "p":
          md += `\n${htmlToMarkdown(el).trim()}\n\n`;
          break;
        case "br":
          md += "\n";
          break;
        case "strong":
        case "b":
          md += `**${el.textContent?.trim()}**`;
          break;
        case "em":
        case "i":
          md += `*${el.textContent?.trim()}*`;
          break;
        case "code":
          md += `\`${el.textContent}\``;
          break;
        case "pre": {
          const code = el.querySelector("code");
          const lang =
            code?.className?.match(/language-(\w+)/)?.[1] || "";
          md += `\n\`\`\`${lang}\n${el.textContent?.trim()}\n\`\`\`\n\n`;
          break;
        }
        case "a": {
          const href = el.getAttribute("href") || "";
          const text = el.textContent?.trim() || href;
          md += `[${text}](${href})`;
          break;
        }
        case "img": {
          const src = el.getAttribute("src") || "";
          const alt = el.getAttribute("alt") || "";
          md += `![${alt}](${src})`;
          break;
        }
        case "ul":
        case "ol": {
          md += "\n";
          let idx = 0;
          for (const li of el.children) {
            idx++;
            const prefix = tag === "ol" ? `${idx}. ` : "- ";
            md += `${prefix}${htmlToMarkdown(li).trim()}\n`;
          }
          md += "\n";
          break;
        }
        case "blockquote":
          md += `\n> ${htmlToMarkdown(el).trim().replace(/\n/g, "\n> ")}\n\n`;
          break;
        case "hr":
          md += "\n---\n\n";
          break;
        case "table": {
          const rows = el.querySelectorAll("tr");
          rows.forEach((row, rowIdx) => {
            const cells = row.querySelectorAll("th, td");
            const cellTexts = Array.from(cells).map(
              (c) => c.textContent?.trim() || ""
            );
            md += `| ${cellTexts.join(" | ")} |\n`;
            if (rowIdx === 0) {
              md += `| ${cellTexts.map(() => "---").join(" | ")} |\n`;
            }
          });
          md += "\n";
          break;
        }
        default:
          md += htmlToMarkdown(el);
      }
    }
  }

  return md;
}

/** Fetch and parse a web page into a clean markdown note */
export async function clipUrl(url: string): Promise<ClipResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ResearchNoteClipper/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    throw new Error("Could not extract readable content from the page");
  }

  // Convert the HTML content to markdown
  const contentDom = new JSDOM(article.content || "");
  const markdown = htmlToMarkdown(
    contentDom.window.document.body
  ).trim();

  // Build the final note content
  const content = `> Clipped from [${article.title}](${url})

${markdown}`;

  return {
    title: article.title || "Untitled",
    content,
    excerpt: article.excerpt || "",
    siteName: article.siteName || new URL(url).hostname,
    url,
  };
}
