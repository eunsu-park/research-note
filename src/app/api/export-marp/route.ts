import { NextResponse } from "next/server";
import { readNote } from "@/lib/filesystem/notes";
import { renderMarp, buildMarpDocument } from "@/lib/marp/render";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

/** GET /api/export-marp?slug=xxx&format=html|pdf|pptx */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const format = searchParams.get("format") || "html";

  if (!slug) {
    return NextResponse.json(
      { error: "slug is required" },
      { status: 400 }
    );
  }

  const note = readNote(slug);
  if (!note) {
    return NextResponse.json(
      { error: "Note not found" },
      { status: 404 }
    );
  }

  try {
    if (format === "html") {
      const result = renderMarp(note.rawContent);
      const document = buildMarpDocument(result);
      return new NextResponse(document, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}.html"`,
        },
      });
    }

    if (format === "pdf" || format === "pptx") {
      // Use marp-cli binary for PDF/PPTX conversion
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "marp-"));
      const inputPath = path.join(tmpDir, "input.md");
      const outputPath = path.join(tmpDir, `output.${format}`);

      try {
        fs.writeFileSync(inputPath, note.rawContent, "utf-8");

        // Find the marp CLI binary in node_modules
        const marpBin = path.join(
          process.cwd(),
          "node_modules",
          ".bin",
          "marp"
        );

        await execFileAsync(marpBin, [
          inputPath,
          "-o",
          outputPath,
          "--allow-local-files",
          "--no-stdin",
        ], { timeout: 60000 });

        const fileBuffer = fs.readFileSync(outputPath);

        const contentType =
          format === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.presentationml.presentation";

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${slug}.${format}"`,
          },
        });
      } finally {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }

    return NextResponse.json(
      { error: `Unsupported format: ${format}` },
      { status: 400 }
    );
  } catch (error) {
    console.error(`Failed to export Marp as ${format}:`, error);
    return NextResponse.json(
      { error: `Failed to export as ${format}` },
      { status: 500 }
    );
  }
}
