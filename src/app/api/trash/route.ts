import { NextResponse } from "next/server";
import {
  listTrashedNotes,
  restoreNoteFromTrash,
  permanentlyDeleteTrash,
  emptyTrash,
} from "@/lib/filesystem/notes";
import { syncAllNotes } from "@/lib/db/sync";

/** GET /api/trash - List trashed notes */
export async function GET() {
  try {
    const items = listTrashedNotes();
    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("Failed to list trash:", error);
    return NextResponse.json(
      { error: "Failed to list trash" },
      { status: 500 }
    );
  }
}

/** POST /api/trash - Restore or delete a trashed note */
export async function POST(request: Request) {
  try {
    const { action, filename } = await request.json();

    if (action === "restore") {
      const restored = restoreNoteFromTrash(filename);
      if (!restored) {
        return NextResponse.json(
          { error: "Note not found in trash" },
          { status: 404 }
        );
      }
      syncAllNotes();
      return NextResponse.json({ data: { restored: true } });
    }

    if (action === "delete") {
      const deleted = permanentlyDeleteTrash(filename);
      if (!deleted) {
        return NextResponse.json(
          { error: "Note not found in trash" },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: { deleted: true } });
    }

    if (action === "empty") {
      const count = emptyTrash();
      return NextResponse.json({ data: { deleted: count } });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'restore', 'delete', or 'empty'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to process trash action:", error);
    return NextResponse.json(
      { error: "Failed to process trash action" },
      { status: 500 }
    );
  }
}
