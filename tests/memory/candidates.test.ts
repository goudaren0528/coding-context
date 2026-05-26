import initSqlJs from "sql.js";
import { describe, it, expect, beforeAll } from "vitest";
import { migrateUserDb } from "../../src/storage/migrate.js";
import {
  upsertCandidate,
  getPendingCandidates,
  approveCandidate,
  rejectCandidate,
  forgetCandidate,
} from "../../src/memory/candidates.js";

let db: any;

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  migrateUserDb(db);
});

describe("candidates", () => {
  it("upserts a new candidate", () => {
    upsertCandidate(db, {
      kind: "entity",
      content: "Frequently uses zod",
      projectId: "proj_1",
      confidence: 0.5,
    });

    const pending = getPendingCandidates(db);
    expect(pending.length).toBe(1);
    expect(pending[0].content).toBe("Frequently uses zod");
    expect(pending[0].evidenceCount).toBe(1);
  });

  it("auto-approves when evidence crosses threshold (≥3)", () => {
    upsertCandidate(db, {
      kind: "entity",
      content: "Frequently uses zod",
      projectId: "proj_2",
    });

    upsertCandidate(db, {
      kind: "entity",
      content: "Frequently uses zod",
      projectId: "proj_3",
    });

    const pending = getPendingCandidates(db);
    const zodCandidate = pending.find(c => c.content === "Frequently uses zod");
    expect(zodCandidate).toBeUndefined();

    const pref = db.exec(`SELECT * FROM developer_preferences WHERE preference = 'Frequently uses zod'`);
    expect(pref[0].values.length).toBe(1);
    expect(pref[0].values[0][5]).toBe("inferred");
  });

  it("approves a pending candidate manually", () => {
    upsertCandidate(db, {
      kind: "pattern",
      content: "Uses repository pattern",
      projectId: "proj_1",
    });

    const pending = getPendingCandidates(db);
    const cand = pending.find(c => c.content === "Uses repository pattern");
    expect(cand).toBeDefined();

    const ok = approveCandidate(db, cand!.id as string);
    expect(ok).toBe(true);

    const after = getPendingCandidates(db);
    const stillPending = after.find(c => c.content === "Uses repository pattern");
    expect(stillPending).toBeUndefined();
  });

  it("rejects a pending candidate", () => {
    upsertCandidate(db, {
      kind: "preference",
      content: "Always uses tabs",
      projectId: "proj_1",
    });

    const pending = getPendingCandidates(db);
    const cand = pending.find(c => c.content === "Always uses tabs")!;
    expect(rejectCandidate(db, cand.id as string)).toBe(true);
  });

  it("forgets (archives) a candidate", () => {
    upsertCandidate(db, {
      kind: "constraint",
      content: "Avoid ORMs",
      projectId: "proj_1",
    });

    const pending = getPendingCandidates(db);
    const cand = pending.find(c => c.content === "Avoid ORMs")!;
    expect(forgetCandidate(db, cand.id as string)).toBe(true);
  });
});
