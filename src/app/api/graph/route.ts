import { NextResponse } from "next/server";
import { getGraphData, syncAllNotes } from "@/lib/db/sync";

/** GET /api/graph - Get graph data for knowledge graph visualization */
export async function GET() {
  try {
    syncAllNotes();
    const graphData = getGraphData();
    return NextResponse.json({ data: graphData });
  } catch (error) {
    console.error("Failed to get graph data:", error);
    return NextResponse.json(
      { error: "Failed to get graph data" },
      { status: 500 }
    );
  }
}
