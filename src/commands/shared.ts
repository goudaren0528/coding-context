import { resolveProjectRoot } from "../paths.js";
import { ensureProjectInit } from "../project/init.js";
import { scanRepo } from "../project/scan.js";
import { captureGitContext } from "../git/context.js";
import { openDatabase, saveDatabase } from "../storage/connection.js";
import { getWorkspaceState } from "../storage/state-store.js";
import { getProjectBrain, upsertProjectBrain } from "../storage/brain-store.js";
import { getDeveloperPreferences } from "../storage/memory-store.js";
import { upsertProjectEntity } from "../storage/entity-store.js";
import { buildInjections } from "../memory/injector.js";
import { filterPreferences } from "../memory/filter.js";
import { runSession } from "../runtime/session.js";
import { getUserDbPath, getProjectDbPath } from "../paths.js";

export async function startTool(tool: "claude" | "opencode"): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const { config, isNew } = await ensureProjectInit(projectRoot);

  const projectDbPath = getProjectDbPath(projectRoot);
  const userDbPath = getUserDbPath();

  const projectDb = await openDatabase(projectDbPath);
  const userDb = await openDatabase(userDbPath);

  const saveDbs = () => {
    saveDatabase(projectDbPath, projectDb);
    saveDatabase(userDbPath, userDb);
  };

  let workspaceState = getWorkspaceState(projectDb, config.projectId);
  let projectBrain = getProjectBrain(projectDb, config.projectId);

  const needsAutoAttach = isNew && !projectBrain;
  if (needsAutoAttach) {
    const scan = scanRepo(projectRoot, config.projectId);
    projectBrain = scan.brain;
    upsertProjectBrain(projectDb, projectBrain);

    for (const name of scan.entityNames) {
      upsertProjectEntity(projectDb, {
        projectId: config.projectId,
        type: name.endsWith(".ts") || name.endsWith(".js") || name.endsWith(".go") || name.endsWith(".rs") ? "file" : "module",
        name,
      });
    }

    saveDbs();
  }

  const prefs = getDeveloperPreferences(userDb, "active");
  const filteredPrefs = filterPreferences(prefs, projectBrain, tool);
  const injections = buildInjections(workspaceState, projectBrain, filteredPrefs, config.projectName);

  const gitContext = captureGitContext(projectRoot);

  if (injections.l1) {
    console.log(injections.l1);
    console.log("─".repeat(70));
  }

  if (isNew) {
    const label = needsAutoAttach ? "attached existing repo" : "initialized new project";
    console.log(`  ctx \u00b7 ${label}`);
    if (filteredPrefs.length > 0) {
      console.log(`       loaded ${filteredPrefs.length} developer preferences from ~/.ctx`);
    }
    console.log("");
  }

  const injectionBlock = [injections.l2, injections.l3, injections.l4]
    .filter(Boolean)
    .join("\n\n");

  const env = injectionBlock
    ? { CTX_CONTEXT: injectionBlock }
    : undefined;

  await runSession(projectDb, userDb, {
    projectId: config.projectId,
    projectRoot,
    tool,
    gitContext,
    workspaceState,
    projectBrain,
    preferences: filteredPrefs,
    injectL2: injections.l2,
    injectL3: injections.l3,
    injectL4: injections.l4,
    env,
  }, saveDbs);
}
