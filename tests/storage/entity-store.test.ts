import initSqlJs from "sql.js";
import { describe, it, expect, beforeAll } from "vitest";
import { migrateProjectDb } from "../../src/storage/migrate.js";
import { migrateUserDb } from "../../src/storage/migrate.js";
import {
  insertProjectEntity,
  getProjectEntities,
  upsertProjectEntity,
  upsertGlobalEntity,
} from "../../src/storage/entity-store.js";

let projectDb: any;
let userDb: any;
const projectId = "proj_ent";

beforeAll(async () => {
  const SQL = await initSqlJs();
  projectDb = new SQL.Database();
  userDb = new SQL.Database();
  migrateProjectDb(projectDb);
  migrateUserDb(userDb);
});

describe("entity-store", () => {
  it("inserts and retrieves project entities", () => {
    insertProjectEntity(projectDb, {
      projectId,
      type: "library",
      name: "Stripe",
      globalEntityId: null,
    });
    insertProjectEntity(projectDb, {
      projectId,
      type: "file",
      name: "retry.ts",
      globalEntityId: null,
    });

    const entities = getProjectEntities(projectDb, projectId);
    expect(entities.length).toBe(2);
    expect(entities[0].name).toBeDefined();
  });

  it("upserts project entity (no duplicate by type+name)", () => {
    upsertProjectEntity(projectDb, {
      projectId,
      type: "library",
      name: "Stripe",
    });
    upsertProjectEntity(projectDb, {
      projectId,
      type: "library",
      name: "Stripe",
    });

    const entities = getProjectEntities(projectDb, projectId);
    const stripeEntities = entities.filter(e => e.type === "library" && e.name === "Stripe");
    expect(stripeEntities.length).toBe(1);
  });

  it("upserts global entity", () => {
    upsertGlobalEntity(userDb, {
      type: "library",
      name: "Stripe",
      projectId,
    });

    upsertGlobalEntity(userDb, {
      type: "library",
      name: "Stripe",
      projectId: "proj_2",
    });

    const result = userDb.exec(`SELECT name, usage_count, linked_project_ids FROM global_entities WHERE name = 'Stripe'`);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].values.length).toBe(1);
    expect(Number(result[0].values[0][1])).toBeGreaterThanOrEqual(2);
  });

  it("handles empty entity list", () => {
    const entities = getProjectEntities(projectDb, "nonexistent");
    expect(entities).toEqual([]);
  });
});
