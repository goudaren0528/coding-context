import { resolveProjectRoot, getProjectDbPath } from "../paths.js";
import { ensureProjectInit } from "../project/init.js";
import { openDatabase } from "../storage/connection.js";
import { getWorkspaceState } from "../storage/state-store.js";
import { getProjectBrain } from "../storage/brain-store.js";
import { getLatestSessions } from "../storage/session-store.js";
import { askQuestion } from "../memory/ask.js";

export async function askCommand(question: string): Promise<void> {
  if (!question.trim()) {
    console.log("Usage: ctx ask <question>");
    return;
  }

  const projectRoot = resolveProjectRoot();
  const { config } = await ensureProjectInit(projectRoot);
  const projectDb = await openDatabase(getProjectDbPath(projectRoot));

  const state = getWorkspaceState(projectDb, config.projectId);
  const brain = getProjectBrain(projectDb, config.projectId);
  const sessions = getLatestSessions(projectDb, config.projectId, 5);

  let workspaceStateSummary = "";
  if (state) {
    const parts: string[] = [];
    if (state.currentFocus) parts.push(`Current focus: ${state.currentFocus}`);
    if (state.activeProblems.length > 0) parts.push(`Open issues: ${state.activeProblems.join(", ")}`);
    if (state.nextActions.length > 0) parts.push(`Next actions: ${state.nextActions.join(", ")}`);
    if (state.recentDecisions.length > 0) parts.push(`Recent decisions: ${state.recentDecisions.join("; ")}`);
    workspaceStateSummary = parts.join("\n");
  }

  let sessionContext = "";
  if (sessions.length > 0) {
    sessionContext = sessions
      .map(s => {
        const parts: string[] = [];
        if (s.title) parts.push(`[${s.startTime}] ${s.title}`);
        if (s.summary) parts.push(s.summary);
        return parts.join(": ");
      })
      .join("\n");
  }

  let decisionContext = "";
  try {
    const decisionsResult = projectDb.exec(
      `SELECT decision, reason, importance_score, last_referenced_at FROM decisions WHERE project_id = ? ORDER BY importance_score DESC, last_referenced_at DESC LIMIT 20`,
      [config.projectId]
    );
    if (decisionsResult.length > 0 && decisionsResult[0].values.length > 0) {
      decisionContext = decisionsResult[0].values
        .map(row => {
          const decision = String(row[0]);
          const reason = row[1] ? ` (reason: ${String(row[1])})` : "";
          return `- ${decision}${reason}`;
        })
        .join("\n");
    }
  } catch {}

  const contexts = [state, sessions.length > 0, decisionContext.length > 0].filter(Boolean).length;
  if (contexts === 0) {
    console.log("No memory available. Start a session first to build project memory.");
    return;
  }

  console.log(`Searching project memory for: "${question}"...`);
  console.log("");

  const answer = await askQuestion(question, workspaceStateSummary, sessionContext, decisionContext, config);

  if (answer) {
    console.log(answer);
  } else {
    console.log("Could not retrieve an answer. Make sure CTX_MODEL, CTX_BASE_URL, and CTX_API_KEY are configured.");
  }
}
