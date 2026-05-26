import initSqlJs from "sql.js";
import { describe, it, expect, beforeAll } from "vitest";
import { migrateProjectDb } from "../../src/storage/migrate.js";
import {
  getProjectBrain,
  upsertProjectBrain,
} from "../../src/storage/brain-store.js";
import type { ProjectBrain } from "../../src/types.js";

let db: any;
const projectId = "proj_brain";

beforeAll(async () => {
  const SQL = await initSqlJs();
  db = new SQL.Database();
  migrateProjectDb(db);
});

describe("brain-store", () => {
  it("returns null for nonexistent brain", () => {
    expect(getProjectBrain(db, projectId)).toBeNull();
  });

  it("upserts project brain", () => {
    const brain: ProjectBrain = {
      projectId,
      architecture: ["handler → service → repo"],
      techStack: ["Node.js", "TypeScript"],
      keyPatterns: ["repository pattern"],
      knownConstraints: ["idempotency required"],
      openQuestions: ["switch to Stripe Connect?"],
      importantEntities: ["Stripe", "retry.ts"],
      importantCommands: ["npm run dev", "npm test"],
      updatedAt: new Date().toISOString(),
    };

    upsertProjectBrain(db, brain);

    const retrieved = getProjectBrain(db, projectId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.architecture).toEqual(["handler → service → repo"]);
    expect(retrieved!.techStack).toEqual(["Node.js", "TypeScript"]);
    expect(retrieved!.knownConstraints).toEqual(["idempotency required"]);
    expect(retrieved!.importantCommands).toEqual(["npm run dev", "npm test"]);
  });

  it("updates existing brain", () => {
    const brain: ProjectBrain = {
      projectId,
      architecture: ["Clean Architecture"],
      techStack: ["TypeScript"],
      keyPatterns: [],
      knownConstraints: [],
      openQuestions: [],
      importantEntities: [],
      importantCommands: [],
      updatedAt: new Date().toISOString(),
    };

    upsertProjectBrain(db, brain);

    const retrieved = getProjectBrain(db, projectId);
    expect(retrieved!.architecture).toEqual(["Clean Architecture"]);
    expect(retrieved!.techStack).toEqual(["TypeScript"]);
  });
});
