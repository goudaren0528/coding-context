import * as fs from "fs";
import * as path from "path";
import { resolveProjectRoot, getProjectDbPath } from "../paths.js";
import { ensureProjectInit } from "../project/init.js";
import { openDatabase } from "../storage/connection.js";
import { getWorkspaceState } from "../storage/state-store.js";
import { getProjectBrain } from "../storage/brain-store.js";
import { execSync } from "child_process";

export async function restoreCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const { config } = await ensureProjectInit(projectRoot);
  const projectDb = await openDatabase(getProjectDbPath(projectRoot));

  const state = getWorkspaceState(projectDb, config.projectId);
  const brain = getProjectBrain(projectDb, config.projectId);

  if (!state) {
    console.log("No workspace state to restore. Start a session first.");
    return;
  }

  if (state.gitBranch) {
    try {
      const currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
        cwd: projectRoot,
        stdio: ["pipe", "pipe", "ignore"],
        timeout: 5000,
      }).toString().trim();

      if (currentBranch !== state.gitBranch) {
        console.log(`  Checking out ${state.gitBranch}...`);
        try {
          execSync(`git checkout ${state.gitBranch}`, {
            cwd: projectRoot,
            stdio: ["pipe", "pipe", "ignore"],
            timeout: 30000,
          });
          console.log(`  ✓ Branch ${state.gitBranch} checked out`);
        } catch {
          console.log(`  ✗ Could not checkout ${state.gitBranch} (dirty working tree or branch not found)`);
        }
      } else {
        console.log(`  ✓ Already on branch ${state.gitBranch}`);
      }
    } catch {
      console.log("  (not a git repository)");
    }
  }

  if (state.importantFiles.length > 0) {
    console.log(`  Key files:`);
    for (const file of state.importantFiles) {
      const fullPath = path.join(projectRoot, file);
      const exists = fs.existsSync(fullPath);
      const marker = exists ? "" : " (not found)";
      console.log(`    ${file}${marker}`);
    }
  }

  if (brain?.importantCommands && brain.importantCommands.length > 0) {
    console.log(`  Key commands:`);
    for (const cmd of brain.importantCommands) {
      console.log(`    ${cmd}`);
    }
  }

  console.log("");
  console.log("  Restore complete. Project ready.");
}
