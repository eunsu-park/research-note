import { NextResponse } from "next/server";
import { getNotePath } from "@/lib/filesystem/notes";
import {
  getFileHistory,
  getFileDiff,
  getFileAtCommit,
  isGitRepo,
} from "@/lib/git/history";

/** GET /api/history?slug=xxx - Get version history for a note */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const commit = searchParams.get("commit");

    if (!slug) {
      return NextResponse.json(
        { error: "slug is required" },
        { status: 400 }
      );
    }

    if (!isGitRepo()) {
      return NextResponse.json({
        data: { commits: [], isGitRepo: false },
      });
    }

    const filePath = getNotePath(slug);

    // If a specific commit is requested, return its diff
    if (commit) {
      const diff = getFileDiff(filePath, commit);
      const content = getFileAtCommit(filePath, commit);
      return NextResponse.json({
        data: { diff, content },
      });
    }

    // Otherwise return the commit log
    const commits = getFileHistory(filePath);
    return NextResponse.json({
      data: { commits, isGitRepo: true },
    });
  } catch (error) {
    console.error("Failed to get history:", error);
    return NextResponse.json(
      { error: "Failed to get history" },
      { status: 500 }
    );
  }
}
