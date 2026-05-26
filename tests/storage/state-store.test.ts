import initSqlJs from "sql.js";
import { describe, it, expect, beforeAll } from "vitest";
import { migrateProjectDb } from "../../src/storage/migrate.js";
import {
  getWorkspaceState,
  upsertWorkspaceState,
} from "../../src/storage/state-store.js";
import type { WorkspaceState } from "../../src/types.js";

let db: any;
const projectId = "proj_test";

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  migrateProjectDb(db);
});

describe("state-store", () => {
  it("returns null for nonexistent state", () => {
    expect(getWorkspaceState(db, projectId)).toBeNull();
  });

  it("upserts workspace state", () => {
    const state: WorkspaceState = {
      projectId,
      currentFocus: "Stripe retry",
      activeProblems: ["timeout edge case"],
      nextActions: ["implement retry queue"],
      recentDecisions: ["use exponential backoff"],
      importantFiles: ["retry.ts"],
      gitBranch: "feature/retry",
      gitCommit: "a1b2c3d",
      updatedAt: new Date().toISOString(),
    };

    upsertWorkspaceState(db, state);

    const retrieved = getWorkspaceState(db, projectId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.currentFocus).toBe("Stripe retry");
    expect(retrieved!.activeProblems).toEqual(["timeout edge case"]);
    expect(retrieved!.importantFiles).toEqual(["retry.ts"]);
    expect(retrieved!.gitBranch).toBe("feature/retry");
  });

  it("updates existing state", () => {
    const state: WorkspaceState = {
      projectId,
      currentFocus: "Updated focus",
      activeProblems: [],
      nextActions: ["deploy"],
      recentDecisions: [],
      importantFiles: ["main.ts"],
      gitBranch: null,
      gitCommit: null,
      updatedAt: new Date().toISOString(),
    };

    upsertWorkspaceState(db, state);

    const retrieved = getWorkspaceState(db, projectId);
    expect(retrieved!.currentFocus).toBe("Updated focus");
    expect(retrieved!.activeProblems).toEqual([]);
    expect(retrieved!.nextActions).toEqual(["deploy"]);
  });
});
