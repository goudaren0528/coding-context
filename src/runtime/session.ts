import type { Database as SqlJsDatabase } from "sql.js";
import type { Session, GitContext, WorkspaceState, ProjectBrain, DeveloperPreference, ProjectConfig } from "../types.js";
import { spawnPty } from "./pty.js";
import {
  createSession,
  completeSession,
  insertEvent,
  getSessionEvents,
} from "../storage/session-store.js";
import { getWorkspaceState, upsertWorkspaceState } from "../storage/state-store.js";
import { getProjectBrain } from "../storage/brain-store.js";
import {
  insertProjectEntity,
  upsertProjectEntity,
  upsertGlobalEntity,
} from "../storage/entity-store.js";
import { generateTitle } from "../llm/titler.js";
import { compressSession } from "../llm/compress.js";
import { isAvailable } from "../llm/client.js";
import { upsertCandidate } from "../memory/candidates.js";
import { redactForLlm, redactSecrets } from "../privacy/redactor.js";

export interface SessionRunOptions {
  projectId: string;
  projectConfig: ProjectConfig;
  projectRoot: string;
  tool: "claude" | "opencode";
  gitContext: GitContext;
  workspaceState: WorkspaceState | null;
  projectBrain: ProjectBrain | null;
  preferences: DeveloperPreference[];
  injectL2: string | null;
  injectL3: string | null;
  injectL4: string | null;
  env?: Record<string, string>;
}

export async function runSession(
  projectDb: SqlJsDatabase,
  userDb: SqlJsDatabase,
  opts: SessionRunOptions,
  saveDbs: () => void
): Promise<void> {
  const session = createSession(projectDb, {
    projectId: opts.projectId,
    tool: opts.tool,
    cwd: opts.projectRoot,
    gitBranch: opts.gitContext.branch,
    gitCommit: opts.gitContext.headCommit,
  });
  saveDbs();

  const events: { source: "stdin" | "stdout"; content: string }[] = [];

  const pty = spawnPty(
    opts.tool === "claude" ? "claude" : "opencode",
    [],
    opts.projectRoot,
    opts.env
  );

  const stdin = process.stdin;
  const stdout = process.stdout;

  if (stdin.isTTY && typeof stdin.setRawMode === "function") {
    stdin.setRawMode(true);
  }
  stdin.resume();
  stdin.setEncoding("utf-8");

  pty.onData((data: string) => {
    stdout.write(data);
    const sanitized = redactSecrets(data);
    events.push({ source: "stdout", content: sanitized });
    insertEvent(projectDb, session.id, "stdout", sanitized);
  });

  stdin.on("data", (data: string) => {
    pty.write(data);
    const sanitized = redactSecrets(data);
    events.push({ source: "stdin", content: sanitized });
    insertEvent(projectDb, session.id, "stdin", sanitized);
  });

  return new Promise<void>((resolve) => {
    pty.onExit(async (code) => {
      if (stdin.isTTY && typeof stdin.setRawMode === "function") {
        stdin.setRawMode(false);
      }
      stdin.pause();
      saveDbs();

      console.log(`\n[ctx] session ended. compressing...`);

      await finalizeSession(session, events, opts, projectDb, userDb);
      saveDbs();

      process.exit(code ?? 0);
      resolve();
    });
  });
}

async function finalizeSession(
  session: Session,
  events: { source: "stdin" | "stdout"; content: string }[],
  opts: SessionRunOptions,
  projectDb: SqlJsDatabase,
  userDb: SqlJsDatabase
): Promise<void> {
  const eventsText = events
    .map(e => `[${e.source}] ${e.content}`)
    .join("\n");

  let title: string | null = null;

  if (isAvailable(opts.projectConfig)) {
    const titleResult = await generateTitle(eventsText, opts.projectConfig);
    if (titleResult) {
      title = titleResult.title;
    }

    const compressionResult = await compressSession(
      opts.workspaceState,
      eventsText,
      opts.gitContext,
      opts.projectConfig
    );

    if (compressionResult) {
      const state = compressionResult.updatedWorkspaceState;
      state.projectId = opts.projectId;
      upsertWorkspaceState(projectDb, state);

      const { nanoid } = await import("nanoid");
      const versionId = nanoid();
      const now = new Date().toISOString();
      projectDb.run(
        `INSERT INTO workspace_state_versions (id, project_id, state_json, source_session_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [versionId, opts.projectId, JSON.stringify(state), session.id, now]
      );

      for (const d of compressionResult.newDecisions) {
        const decisionId = nanoid();
        projectDb.run(
          `INSERT INTO decisions (id, project_id, session_id, decision, reason, confidence, importance_score, last_referenced_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            decisionId, opts.projectId, session.id,
            d.decision, d.reason, d.confidence, 0.5, now, now,
          ]
        );
      }

      for (const entity of compressionResult.newProjectEntities) {
        const ent = upsertProjectEntity(projectDb, {
          projectId: opts.projectId,
          type: entity.type as "library" | "concept" | "module",
          name: entity.name,
        });

        if (entity.type === "library" || entity.type === "concept") {
          upsertGlobalEntity(userDb, {
            type: entity.type,
            name: entity.name,
            projectId: opts.projectId,
          });

          upsertCandidate(userDb, {
            kind: "entity",
            content: `Frequently uses ${entity.name} in projects`,
            projectId: opts.projectId,
            confidence: 0.6,
          });
        }
      }

      for (const d of compressionResult.newDecisions) {
        upsertCandidate(userDb, {
          kind: "pattern",
          content: d.decision,
          projectId: opts.projectId,
          confidence: d.confidence,
        });
      }
    }
  }

  completeSession(projectDb, session.id, title);
}
