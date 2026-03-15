import { NextResponse } from "next/server";
import { renameItem } from "@/lib/filesystem/notes";

/** POST /api/rename - Rename a file or folder */
export async function POST(request: Request) {
  try {
    const { path: itemPath, newName } = (await request.json()) as {
      path: string;
      newName: string;
    };

    if (!itemPath || !newName?.trim()) {
      return NextResponse.json(
        { error: "path and newName are required" },
        { status: 400 }
      );
    }

    const newPath = renameItem(itemPath, newName.trim());
    return NextResponse.json({ data: { oldPath: itemPath, newPath } });
  } catch (error) {
    console.error("Failed to rename:", error);
    const message =
      error instanceof Error ? error.message : "Failed to rename";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
