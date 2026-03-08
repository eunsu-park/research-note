import { NextResponse } from "next/server";
import { listTemplates, saveTemplate, deleteTemplate } from "@/lib/templates/index";
import type { NoteTemplate } from "@/types/note.types";

/** GET /api/templates - List all templates */
export async function GET() {
  try {
    const templates = listTemplates();
    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Failed to list templates:", error);
    return NextResponse.json(
      { error: "Failed to list templates" },
      { status: 500 }
    );
  }
}

/** POST /api/templates - Create or update a template */
export async function POST(request: Request) {
  try {
    const template = (await request.json()) as NoteTemplate;
    if (!template.id || !template.name) {
      return NextResponse.json(
        { error: "Template id and name are required" },
        { status: 400 }
      );
    }
    saveTemplate(template);
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("Failed to save template:", error);
    return NextResponse.json(
      { error: "Failed to save template" },
      { status: 500 }
    );
  }
}

/** DELETE /api/templates?id=templateId */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Template id is required" },
        { status: 400 }
      );
    }
    const deleted = deleteTemplate(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error("Failed to delete template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
