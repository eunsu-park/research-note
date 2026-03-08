import { execFileSync } from "child_process";
import path from "path";

const PROJECT_ROOT = process.cwd();

interface GitCommit {
  hash: string;
  shortHash: string;
  date: string;
  message: string;
  author: string;
}

interface GitDiff {
  additions: number;
  deletions: number;
  patch: string;
}

/** Validate a git commit hash (only hex chars allowed) */
function isValidHash(hash: string): boolean {
  return /^[0-9a-f]{4,40}$/i.test(hash);
}

/** Check if the project is a git repository */
export function isGitRepo(): boolean {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

/** Get the git log for a specific file */
export function getFileHistory(
  filePath: string,
  limit = 50
): GitCommit[] {
  if (!isGitRepo()) return [];

  try {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const output = execFileSync(
      "git",
      ["log", "--follow", "--format=%H|%h|%aI|%s|%an", "-n", String(limit), "--", relativePath],
      { cwd: PROJECT_ROOT, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    if (!output) return [];

    return output.split("\n").map((line) => {
      const [hash, shortHash, date, message, author] = line.split("|");
      return { hash, shortHash, date, message, author };
    });
  } catch {
    return [];
  }
}

/** Get the diff between two commits for a specific file */
export function getFileDiff(
  filePath: string,
  commitHash: string
): GitDiff | null {
  if (!isGitRepo() || !isValidHash(commitHash)) return null;

  try {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    const patch = execFileSync(
      "git",
      ["diff", `${commitHash}^..${commitHash}`, "--", relativePath],
      { cwd: PROJECT_ROOT, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();

    let additions = 0;
    let deletions = 0;
    for (const line of patch.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) additions++;
      if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }

    return { additions, deletions, patch };
  } catch {
    return null;
  }
}

/** Get the content of a file at a specific commit */
export function getFileAtCommit(
  filePath: string,
  commitHash: string
): string | null {
  if (!isGitRepo() || !isValidHash(commitHash)) return null;

  try {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    return execFileSync(
      "git",
      ["show", `${commitHash}:${relativePath}`],
      { cwd: PROJECT_ROOT, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
  } catch {
    return null;
  }
}

/** Restore a file to a specific commit version */
export function restoreFileFromCommit(
  filePath: string,
  commitHash: string
): boolean {
  if (!isGitRepo() || !isValidHash(commitHash)) return false;

  try {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    execFileSync(
      "git",
      ["checkout", commitHash, "--", relativePath],
      { cwd: PROJECT_ROOT, stdio: ["pipe", "pipe", "pipe"] }
    );
    return true;
  } catch {
    return false;
  }
}
