import { NextResponse } from "next/server";
import { createFolder, deleteFolder, deleteFile } from "@/lib/filesystem/notes";

/** POST /api/folders - Create a folder */
export async function POST(request: Request) {
  try {
    const { path: folderPath } = (await request.json()) as { path: string };
    if (!folderPath?.trim()) {
      return NextResponse.json(
        { error: "Folder path is required" },
        { status: 400 }
      );
    }
    createFolder(folderPath.trim());
    return NextResponse.json({ data: { path: folderPath } }, { status: 201 });
  } catch (error) {
    console.error("Failed to create folder:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create folder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/folders - Delete a folder (use force=true for non-empty) */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderPath = searchParams.get("path");
    const force = searchParams.get("force") === "true";
    const type = searchParams.get("type"); // "file" to delete a non-note file

    if (type === "file" && folderPath) {
      const deleted = deleteFile(folderPath);
      if (!deleted) {
        return NextResponse.json(
          { error: "File not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: { path: folderPath } });
    }

    if (!folderPath) {
      return NextResponse.json(
        { error: "Folder path is required" },
        { status: 400 }
      );
    }
    const deleted = deleteFolder(folderPath, force);
    if (!deleted) {
      return NextResponse.json(
        { error: "Folder not found or not empty" },
        { status: 400 }
      );
    }
    return NextResponse.json({ data: { path: folderPath } });
  } catch (error) {
    console.error("Failed to delete:", error);
    const message =
      error instanceof Error ? error.message : "Failed to delete";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
