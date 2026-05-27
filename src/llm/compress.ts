import { callLlm } from "./client.js";
import type { WorkspaceState, GitContext, CompressionOutput, ProjectConfig } from "../types.js";

const COMPRESSOR_SYSTEM = `You are the ctx workspace state compressor.

Given:
1. Previous workspace state (what the developer was doing before this session)
2. Session transcript (what happened in this AI coding session)
3. Git context (branch, changed files)

Your job is to UPDATE the workspace state. This is NOT a summary.

Output a JSON object with these fields:
- currentFocus: What is the developer working on right now? (1 sentence, or null if unknown)
- activeProblems: What issues are still unresolved? (array of strings, max 5)
- nextActions: What should be done next? (array of strings, max 3)
- recentDecisions: What decisions were committed to? (array of strings with brief reasons, max 5)
- importantFiles: Which files are most relevant to current work? (array, max 5)
- newProjectEntities: New libraries, frameworks, concepts, or modules discovered (array of {type, name})

Rules:
- If a previous problem is resolved, REMOVE it from activeProblems
- If a new decision invalidates an old one, REPLACE the old
- Git changed files MUST appear in importantFiles if relevant
- Don't convert discussions into decisions. Only record decisions that were explicitly committed to
- Keep it concise. State snapshot, not history log
- Default to keeping existing state items unless the session explicitly changes them

Output ONLY the JSON object.`;

export async function compressSession(
  previousState: WorkspaceState | null,
  eventsText: string,
  gitContext: GitContext,
  projectConfig: ProjectConfig | null = null
): Promise<CompressionOutput | null> {
  const eventsTruncated = eventsText.slice(0, 12000);

  const prevStateJson = previousState
    ? JSON.stringify({
        currentFocus: previousState.currentFocus,
        activeProblems: previousState.activeProblems,
        nextActions: previousState.nextActions,
        recentDecisions: previousState.recentDecisions,
        importantFiles: previousState.importantFiles,
      })
    : "null (no previous state)";

  const gitJson = JSON.stringify({
    branch: gitContext.branch,
    changedFiles: [...gitContext.committedChangedFiles, ...gitContext.uncommittedFiles],
    recentCommits: gitContext.recentCommitMessages,
  });

  const message = `Previous state:\n${prevStateJson}\n\nGit context:\n${gitJson}\n\nSession transcript:\n${eventsTruncated}`;

  const result = await callLlm(COMPRESSOR_SYSTEM, message, { maxTokens: 2048, projectConfig });
  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    const now = new Date().toISOString();

    return {
      updatedWorkspaceState: {
        projectId: previousState?.projectId ?? "",
        currentFocus: parsed.currentFocus ?? previousState?.currentFocus ?? null,
        activeProblems: parsed.activeProblems ?? previousState?.activeProblems ?? [],
        nextActions: parsed.nextActions ?? previousState?.nextActions ?? [],
        recentDecisions: parsed.recentDecisions ?? previousState?.recentDecisions ?? [],
        importantFiles: parsed.importantFiles ?? previousState?.importantFiles ?? [],
        gitBranch: gitContext.branch,
        gitCommit: gitContext.headCommit,
        updatedAt: now,
      },
      newDecisions: (parsed.recentDecisions ?? []).map((d: string) => ({
        decision: d,
        reason: null,
        confidence: 0.7,
      })),
      newProjectEntities: (parsed.newProjectEntities ?? []).map((e: { type: string; name: string }) => ({
        type: e.type,
        name: e.name,
      })),
    };
  } catch (err) {
    console.error(`[ctx] Failed to parse compressor output: ${String(err)}`);
    return null;
  }
}
