import * as path from "path";
import * as fs from "fs";
import * as os from "os";

export function getCtxProjectRoot(cwd: string = process.cwd()): string | null {
  let dir = path.resolve(cwd);
  while (true) {
    const ctxDir = path.join(dir, ".ctx");
    if (fs.existsSync(ctxDir) && fs.statSync(ctxDir).isDirectory()) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function getGitRoot(cwd: string = process.cwd()): string | null {
  let dir = path.resolve(cwd);
  while (true) {
    const gitDir = path.join(dir, ".git");
    if (fs.existsSync(gitDir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function resolveProjectRoot(cwd: string = process.cwd()): string {
  return getCtxProjectRoot(cwd) ?? getGitRoot(cwd) ?? path.resolve(cwd);
}

export function getCtxHome(): string {
  return path.join(os.homedir(), ".ctx");
}

export function getProjectCtxDir(projectRoot: string): string {
  return path.join(projectRoot, ".ctx");
}

export function getProjectDbPath(projectRoot: string): string {
  return path.join(getProjectCtxDir(projectRoot), "db.sqlite");
}

export function getProjectConfigPath(projectRoot: string): string {
  return path.join(getProjectCtxDir(projectRoot), "config.json");
}

export function getUserDbPath(): string {
  return path.join(getCtxHome(), "db.sqlite");
}

export function getUserProjectsPath(): string {
  return path.join(getCtxHome(), "projects.json");
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function ensureCtxHome(): string {
  const home = getCtxHome();
  ensureDir(home);
  return home;
}

export function ensureProjectCtxDir(projectRoot: string): string {
  const dir = getProjectCtxDir(projectRoot);
  ensureDir(dir);
  return dir;
}
