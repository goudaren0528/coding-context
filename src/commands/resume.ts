import { resolveProjectRoot, getProjectDbPath, getUserDbPath } from "../paths.js";
import { ensureProjectInit } from "../project/init.js";
import { openDatabase, saveDatabase } from "../storage/connection.js";
import { getWorkspaceState } from "../storage/state-store.js";
import { getProjectBrain } from "../storage/brain-store.js";

export async function resumeCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const { config } = await ensureProjectInit(projectRoot);
  const projectDb = await openDatabase(getProjectDbPath(projectRoot));

  const state = getWorkspaceState(projectDb, config.projectId);
  const brain = getProjectBrain(projectDb, config.projectId);

  console.log(config.projectName);

  if (state) {
    if (state.currentFocus) {
      const ago = formatTimeAgo(state.updatedAt);
      const focus = `  focus   ${state.currentFocus}`;
      console.log(ago ? `${focus} \u00b7 ${ago}` : focus);
    }

    if (state.activeProblems.length > 0) {
      console.log(`  open    ${state.activeProblems.join(", ")}`);
    }

    if (state.nextActions.length > 0) {
      console.log(`  next    ${state.nextActions.join(", ")}`);
    }

    if (state.importantFiles.length > 0) {
      console.log(`  files   ${state.importantFiles.join(", ")}`);
    }

    if (state.gitBranch) {
      console.log(`  branch  ${state.gitBranch}`);
    }
  } else {
    console.log("  (no workspace state yet)");
  }

  if (brain) {
    if (brain.techStack.length > 0) {
      console.log(`  stack   ${brain.techStack.join(", ")}`);
    }
    if (brain.importantCommands.length > 0) {
      console.log(`  cmds    ${brain.importantCommands.join(", ")}`);
    }
  }

  saveDatabase(getProjectDbPath(projectRoot), projectDb);
}

function formatTimeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  if (isNaN(then)) return "";

  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
