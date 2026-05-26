import type { DeveloperPreference, ProjectBrain } from "../types.js";

export function filterPreferences(
  preferences: DeveloperPreference[],
  brain: ProjectBrain | null,
  tool?: string
): DeveloperPreference[] {
  return preferences.filter(p => {
    if (p.status !== "active") return false;

    const appliesTo = p.appliesTo;
    if (!appliesTo || Object.keys(appliesTo).length === 0) return true;

    if (appliesTo.tools && tool) {
      if (!appliesTo.tools.includes(tool as "claude-code" | "opencode")) {
        return false;
      }
    }

    if (appliesTo.languages && brain?.techStack) {
      const hasLanguage = appliesTo.languages.some(l =>
        brain.techStack.some(ts => ts.toLowerCase().includes(l.toLowerCase()))
      );
      if (!hasLanguage) return false;
    }

    if (appliesTo.projectTypes && brain) {
      const projectType = inferProjectType(brain);
      if (projectType && !appliesTo.projectTypes.some(t =>
        t.toLowerCase() === projectType.toLowerCase()
      )) {
        return false;
      }
    }

    return true;
  });
}

function inferProjectType(brain: ProjectBrain): string | null {
  const all = [
    ...brain.techStack,
    ...brain.keyPatterns,
  ].map(s => s.toLowerCase()).join(" ");

  if (all.includes("cli") || all.includes("commander")) return "cli";
  if (all.includes("react") || all.includes("next.js") || all.includes("vue")) return "frontend";
  if (all.includes("express") || all.includes("fastify") || all.includes("api")) return "backend";
  if (all.includes("library") || all.includes("sdk")) return "library";

  return null;
}
