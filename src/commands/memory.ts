import { getUserDbPath, ensureCtxHome } from "../paths.js";
import { openDatabase, saveDatabase } from "../storage/connection.js";
import { migrateUserDb } from "../storage/migrate.js";
import {
  getDeveloperPreferences,
  insertPreference,
} from "../storage/memory-store.js";
import {
  approveCandidate,
  rejectCandidate,
  forgetCandidate,
  getPendingCandidates,
} from "../memory/candidates.js";
import type { DeveloperPreference } from "../types.js";

export async function memoryCommand(action: string, args: string[]): Promise<void> {
  ensureCtxHome();
  const userDb = await openDatabase(getUserDbPath());
  migrateUserDb(userDb);

  if (action === "add") {
    const preferenceText = args.join(" ");
    if (!preferenceText) {
      console.log("Usage: ctx memory add <preference>");
      saveDatabase(getUserDbPath(), userDb);
      return;
    }

    const pref = insertPreference(userDb, {
      category: detectCategory(preferenceText),
      preference: preferenceText,
      source: "explicit",
    });

    saveDatabase(getUserDbPath(), userDb);
    console.log(`  \u2713 Added: ${pref.category.replace(/_/g, " ")}`);
    console.log(`    ${pref.preference}`);
    return;
  }

  if (action === "approve") {
    const candidateId = args[0];
    if (!candidateId) {
      console.log("Usage: ctx memory approve <candidate-id>");
      saveDatabase(getUserDbPath(), userDb);
      return;
    }

    const ok = approveCandidate(userDb, candidateId);
    saveDatabase(getUserDbPath(), userDb);
    if (ok) {
      console.log(`  \u2713 Candidate ${candidateId.slice(0, 8)}... approved and promoted to active preference.`);
    } else {
      console.log(`  \u2717 Candidate not found or already resolved.`);
    }
    return;
  }

  if (action === "reject") {
    const candidateId = args[0];
    if (!candidateId) {
      console.log("Usage: ctx memory reject <candidate-id>");
      saveDatabase(getUserDbPath(), userDb);
      return;
    }

    const ok = rejectCandidate(userDb, candidateId);
    saveDatabase(getUserDbPath(), userDb);
    if (ok) {
      console.log(`  \u2713 Candidate ${candidateId.slice(0, 8)}... rejected.`);
    } else {
      console.log(`  \u2717 Candidate not found or already resolved.`);
    }
    return;
  }

  if (action === "forget") {
    const candidateId = args[0];
    if (!candidateId) {
      console.log("Usage: ctx memory forget <candidate-id>");
      saveDatabase(getUserDbPath(), userDb);
      return;
    }

    const ok = forgetCandidate(userDb, candidateId);
    saveDatabase(getUserDbPath(), userDb);
    if (ok) {
      console.log(`  \u2713 Candidate ${candidateId.slice(0, 8)}... archived.`);
    } else {
      console.log(`  \u2717 Candidate not found.`);
    }
    return;
  }

  const prefs = getDeveloperPreferences(userDb);
  const candidates = getPendingCandidates(userDb);
  saveDatabase(getUserDbPath(), userDb);

  if (prefs.length === 0 && candidates.length === 0) {
    console.log("Developer Memory");
    console.log("");
    console.log("  (empty)");
    console.log("");
    console.log("  Use `ctx memory add <preference>` to add one.");
    return;
  }

  if (prefs.length > 0) {
    const grouped = new Map<string, DeveloperPreference[]>();
    for (const p of prefs) {
      if (!grouped.has(p.category)) grouped.set(p.category, []);
      grouped.get(p.category)!.push(p);
    }

    console.log("Developer Preferences");
    console.log("");

    for (const [category, items] of grouped) {
      console.log(`  ${category.replace(/_/g, " ")}:`);
      for (const item of items) {
        const status = item.source === "explicit" ? "[explicit]"
          : item.status === "candidate" ? "[candidate]"
          : `[inferred, ${Math.round(item.confidence * 100)}%]`;
        console.log(`    ${item.preference} ${status}`);
      }
      console.log("");
    }

    console.log(`  ${prefs.length} preferences`);
  }

  if (candidates.length > 0) {
    console.log("");
    console.log("Pending Candidates");
    console.log("");

    for (const c of candidates) {
      const id = c.id as string;
      const kind = c.kind as string;
      const content = c.content as string;
      const evidenceCount = c.evidenceCount as number;
      const confidence = c.confidence as number;

      console.log(`  [${id.slice(0, 8)}] ${kind} · ${Math.round(confidence * 100)}% · ${evidenceCount} projects`);
      console.log(`    ${content}`);
      console.log("");
    }

    console.log(`  ${candidates.length} pending`);
    console.log("");
    console.log("  Use `ctx memory approve <id>` or `ctx memory reject <id>` to resolve.");
  }
}

function detectCategory(text: string): DeveloperPreference["category"] {
  const lower = text.toLowerCase();
  if (lower.includes("test")) return "testing_preference";
  if (lower.includes("library") || lower.includes("use ") || lower.includes("prefer ")) {
    if (lower.includes("react") || lower.includes("vue") || lower.includes("express") ||
        lower.includes("zod") || lower.includes("prisma") || lower.includes("better-sqlite3") ||
        lower.includes("commander") || lower.includes("sql.js")) {
      return "library_preference";
    }
  }
  if (lower.includes("async") || lower.includes("await") || lower.includes("pattern") ||
      lower.includes("style") || lower.includes("strict")) {
    return "coding_style";
  }
  if (lower.includes("architecture") || lower.includes("layer") || lower.includes("handler") ||
      lower.includes("service") || lower.includes("repository")) {
    return "architecture_preference";
  }
  if (lower.includes("commit") || lower.includes("branch") || lower.includes("workflow")) {
    return "workflow_preference";
  }
  if (lower.includes("avoid") || lower.includes("don't") || lower.includes("never")) {
    return "avoidance";
  }
  if (lower.includes("explain") || lower.includes("patch") || lower.includes("response") ||
      lower.includes("implementation")) {
    return "agent_interaction_preference";
  }
  return "coding_style";
}
