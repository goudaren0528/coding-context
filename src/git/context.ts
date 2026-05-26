import { execSync } from "child_process";
import type { GitContext } from "../types.js";

export function captureGitContext(projectRoot: string): GitContext {
  let branch: string | null = null;
  let headCommit: string | null = null;
  let previousCtxCommit: string | null = null;
  let committedChangedFiles: string[] = [];
  let uncommittedFiles: string[] = [];
  let recentCommitMessages: string[] = [];

  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 5000,
    }).toString().trim();
  } catch {}

  try {
    headCommit = execSync("git rev-parse --short HEAD", {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 5000,
    }).toString().trim();
  } catch {}

  try {
    committedChangedFiles = execSync("git diff --name-only HEAD~1 HEAD", {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 5000,
    }).toString().trim().split("\n").filter(Boolean);
  } catch {
    try {
      committedChangedFiles = execSync("git diff --name-only --cached", {
        cwd: projectRoot,
        stdio: ["pipe", "pipe", "ignore"],
        timeout: 5000,
      }).toString().trim().split("\n").filter(Boolean);
    } catch {}
  }

  try {
    uncommittedFiles = execSync("git status --porcelain", {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 5000,
    }).toString().trim().split("\n").filter(Boolean).map(line => line.substring(3));
  } catch {}

  try {
    recentCommitMessages = execSync('git log -3 --format="%s"', {
      cwd: projectRoot,
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 5000,
    }).toString().trim().split("\n").filter(Boolean);
  } catch {}

  return {
    branch,
    headCommit,
    previousCtxCommit,
    committedChangedFiles,
    uncommittedFiles,
    recentCommitMessages,
  };
}
