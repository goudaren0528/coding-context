import { nanoid } from "nanoid";
import * as fs from "fs";
import { execSync } from "child_process";
import {
  ensureProjectCtxDir,
  getProjectConfigPath,
  ensureCtxHome,
  getUserDbPath,
  getUserProjectsPath,
} from "../paths.js";
import { saveProjectConfig } from "../config.js";
import { openDatabase, saveDatabase } from "../storage/connection.js";
import { migrateProjectDb } from "../storage/migrate.js";
import { migrateUserDb } from "../storage/migrate.js";
import { registerProject } from "../storage/memory-store.js";
import type { ProjectConfig, RegisteredProject } from "../types.js";

export interface InitResult {
  projectRoot: string;
  config: ProjectConfig;
  isNew: boolean;
}

export async function ensureProjectInit(
  projectRoot: string,
  forceName?: string
): Promise<InitResult> {
  const ctxDir = ensureProjectCtxDir(projectRoot);

  let configPath = getProjectConfigPath(projectRoot);
  let config: ProjectConfig;
  let isNew = false;

  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as ProjectConfig;
  } else {
    const projectName = forceName ?? projectRoot.split(/[/\\]/).pop() ?? "unknown";
    const projectId = nanoid();
    let gitRemote: string | null = null;
    try {
      gitRemote = execSync("git remote get-url origin", {
        cwd: projectRoot,
        stdio: ["pipe", "pipe", "ignore"],
        timeout: 5000,
      }).toString().trim() || null;
    } catch {}

    config = {
      projectId,
      projectName,
      gitRemote,
      llm: {
        enabled: true,
        model: null,
        baseUrl: null,
      },
    };
    saveProjectConfig(projectRoot, config);
    isNew = true;
  }

  const projectDbPath = `${ctxDir}/db.sqlite`;
  const projectDb = await openDatabase(projectDbPath);
  migrateProjectDb(projectDb);
  saveDatabase(projectDbPath, projectDb);

  await registerInUserDb(projectRoot, config);

  return { projectRoot, config, isNew };
}

async function registerInUserDb(
  projectRoot: string,
  config: ProjectConfig
): Promise<void> {
  const userDbPath = getUserDbPath();
  ensureCtxHome();

  let userDb = await openDatabase(userDbPath);
  migrateUserDb(userDb);

  registerProject(userDb, {
    id: config.projectId,
    name: config.projectName,
    path: projectRoot,
    gitRemote: config.gitRemote,
  });

  saveDatabase(userDbPath, userDb);

  const projectsPath = getUserProjectsPath();
  let projects: { id: string; path: string; name: string }[] = [];
  if (fs.existsSync(projectsPath)) {
    projects = JSON.parse(fs.readFileSync(projectsPath, "utf-8"));
  }
  const existing = projects.find(p => p.id === config.projectId);
  if (!existing) {
    projects.push({
      id: config.projectId,
      path: projectRoot,
      name: config.projectName,
    });
  }
  fs.writeFileSync(projectsPath, JSON.stringify(projects, null, 2), "utf-8");
}
