"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { History, GitCommitHorizontal } from "lucide-react";

interface Commit {
  hash: string;
  shortHash: string;
  date: string;
  message: string;
  author: string;
}

interface VersionHistoryProps {
  slug: string;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function VersionHistory({ slug }: VersionHistoryProps) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isGitRepo, setIsGitRepo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/history?slug=${slug}`);
      const { data } = await res.json();
      setCommits(data?.commits || []);
      setIsGitRepo(data?.isGitRepo ?? true);
    } catch {
      setCommits([]);
    }
    setLoading(false);
  };

  const fetchDiff = async (hash: string) => {
    setSelectedCommit(hash);
    try {
      const res = await fetch(
        `/api/history?slug=${slug}&commit=${hash}`
      );
      const { data } = await res.json();
      setDiffContent(data?.diff?.patch || null);
    } catch {
      setDiffContent(null);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="Version History"
          onClick={fetchHistory}
        >
          <History className="h-3.5 w-3.5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
        </SheetHeader>

        {!isGitRepo ? (
          <p className="text-sm text-muted-foreground mt-4">
            This project is not a git repository. Initialize git to track
            version history.
          </p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground mt-4">
            Loading history...
          </p>
        ) : commits.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-4">
            No history found for this note. Commit changes to start
            tracking.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4 h-[calc(100vh-8rem)]">
            {/* Commit list */}
            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-4">
                {commits.map((commit) => (
                  <button
                    key={commit.hash}
                    onClick={() => fetchDiff(commit.hash)}
                    className={`w-full text-left p-2 rounded-md text-sm hover:bg-accent transition-colors ${
                      selectedCommit === commit.hash ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-mono text-xs text-muted-foreground">
                        {commit.shortHash}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatRelativeDate(commit.date)}
                      </span>
                    </div>
                    <p className="text-xs mt-1 truncate">
                      {commit.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {commit.author}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Diff view */}
            {diffContent && (
              <div className="border-t pt-2 max-h-[40%] overflow-hidden flex flex-col">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Changes
                </h4>
                <ScrollArea className="flex-1">
                  <pre className="text-xs font-mono whitespace-pre-wrap p-2 bg-muted rounded">
                    {diffContent.split("\n").map((line, i) => {
                      let color = "";
                      if (line.startsWith("+") && !line.startsWith("+++"))
                        color = "text-green-600 dark:text-green-400";
                      else if (
                        line.startsWith("-") &&
                        !line.startsWith("---")
                      )
                        color = "text-red-600 dark:text-red-400";
                      else if (line.startsWith("@@"))
                        color = "text-blue-600 dark:text-blue-400";

                      return (
                        <span key={i} className={color}>
                          {line}
                          {"\n"}
                        </span>
                      );
                    })}
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
