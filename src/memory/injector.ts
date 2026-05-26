import type { WorkspaceState, ProjectBrain, DeveloperPreference, InjectionBlocks } from "../types.js";

export function buildInjections(
  workspaceState: WorkspaceState | null,
  projectBrain: ProjectBrain | null,
  preferences: DeveloperPreference[],
  projectName: string
): InjectionBlocks {
  const l1 = buildL1(workspaceState, projectName);
  const l2 = buildL2(workspaceState);
  const l3 = buildL3(projectBrain);
  const l4 = buildL4(preferences);

  return { l1, l2, l3, l4 };
}

function buildL1(state: WorkspaceState | null, projectName: string): string {
  if (!state || !state.currentFocus) {
    return `  ctx · ${projectName}`;
  }

  const focus = state.currentFocus.length > 50
    ? state.currentFocus.slice(0, 47) + "..."
    : state.currentFocus;

  const parts: string[] = [];

  if (state.activeProblems.length > 0) {
    parts.push(`open: ${state.activeProblems[0]}`);
  }
  if (state.nextActions.length > 0) {
    parts.push(`next: ${state.nextActions[0]}`);
  }

  const timeAgo = formatTimeAgo(state.updatedAt);

  let line = `  ctx \u00b7 ${projectName} \u2014 ${focus}`;
  if (timeAgo) {
    line += ` \u00b7 ${timeAgo}`;
  }

  if (parts.length > 0) {
    line += `\n       ${parts.join(" \u00b7 ")}`;
  }

  return line;
}

function buildL2(state: WorkspaceState | null): string | null {
  if (!state) return null;

  const lines: string[] = [];
  lines.push("[ctx project state]");

  if (state.currentFocus) {
    lines.push(`Current focus: ${state.currentFocus}`);
    lines.push("");
  }

  if (state.activeProblems.length > 0) {
    lines.push("Open issues:");
    for (const p of state.activeProblems) {
      lines.push(`- ${p}`);
    }
    lines.push("");
  }

  if (state.nextActions.length > 0) {
    lines.push("Next actions:");
    for (const a of state.nextActions) {
      lines.push(`- ${a}`);
    }
    lines.push("");
  }

  if (state.recentDecisions.length > 0) {
    lines.push("Recent decisions:");
    for (const d of state.recentDecisions) {
      lines.push(`- ${d}`);
    }
    lines.push("");
  }

  if (state.importantFiles.length > 0) {
    lines.push(`Important files: ${state.importantFiles.join(", ")}`);
  }

  if (lines.length <= 2) return null;
  return lines.join("\n");
}

function buildL3(brain: ProjectBrain | null): string | null {
  if (!brain) return null;

  const lines: string[] = [];
  lines.push("[ctx project brain]");

  if (brain.architecture.length > 0) {
    lines.push(`Architecture: ${brain.architecture.join("; ")}`);
  }

  if (brain.techStack.length > 0) {
    lines.push(`Tech stack: ${brain.techStack.join(", ")}`);
  }

  if (brain.knownConstraints.length > 0) {
    lines.push(`Known constraints: ${brain.knownConstraints.join("; ")}`);
  }

  if (brain.keyPatterns.length > 0) {
    lines.push(`Key patterns: ${brain.keyPatterns.join(", ")}`);
  }

  if (brain.importantCommands.length > 0) {
    lines.push(`Important commands: ${brain.importantCommands.join(", ")}`);
  }

  if (lines.length <= 1) return null;
  return lines.join("\n");
}

function buildL4(preferences: DeveloperPreference[]): string | null {
  const active = preferences.filter(p => p.status === "active");
  if (active.length === 0) return null;

  const lines: string[] = [];
  lines.push("[ctx developer memory]");
  lines.push("Relevant preferences:");

  for (const p of active) {
    lines.push(`- ${p.preference}`);
  }

  return lines.join("\n");
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
