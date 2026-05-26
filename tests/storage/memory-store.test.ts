import initSqlJs from "sql.js";
import { describe, it, expect, beforeAll } from "vitest";
import { migrateUserDb } from "../../src/storage/migrate.js";
import {
  getDeveloperPreferences,
  insertPreference,
  registerProject,
  getProjects,
} from "../../src/storage/memory-store.js";

let db: any;

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  migrateUserDb(db);
});

describe("memory-store", () => {
  it("returns empty when no preferences", () => {
    expect(getDeveloperPreferences(db)).toEqual([]);
  });

  it("inserts explicit preference as active", () => {
    const pref = insertPreference(db, {
      category: "library_preference",
      preference: "Prefer zod for runtime validation",
      source: "explicit",
    });

    expect(pref.status).toBe("active");
    expect(pref.source).toBe("explicit");
    expect(pref.confidence).toBe(1.0);
  });

  it("inserts inferred preference as candidate", () => {
    const pref = insertPreference(db, {
      category: "architecture_preference",
      preference: "Prefer repository pattern",
      source: "inferred",
      confidence: 0.6,
    });

    expect(pref.status).toBe("candidate");
    expect(pref.confidence).toBe(0.6);
  });

  it("filters by status", () => {
    const active = getDeveloperPreferences(db, "active");
    expect(active.length).toBe(1);
    expect(active[0].status).toBe("active");

    const candidates = getDeveloperPreferences(db, "candidate");
    expect(candidates.length).toBe(1);
    expect(candidates[0].status).toBe("candidate");
  });

  it("registers and retrieves projects", () => {
    registerProject(db, {
      id: "proj_1",
      name: "payment-service",
      path: "/projects/payment",
      gitRemote: "git@github.com:company/payment.git",
    });

    registerProject(db, {
      id: "proj_2",
      name: "admin-dashboard",
      path: "/projects/admin",
    });

    const projects = getProjects(db);
    expect(projects.length).toBe(2);
    expect(projects[0].name).toBeDefined();
  });

  it("updates last_seen on re-register", () => {
    const before = getProjects(db).find(p => p.id === "proj_1")!;
    const originalSeen = before.lastSeenAt;

    registerProject(db, {
      id: "proj_1",
      name: "payment-service",
      path: "/projects/payment",
    });

    const after = getProjects(db).find(p => p.id === "proj_1")!;
    expect(after.lastSeenAt).not.toBe(originalSeen);
  });
});
