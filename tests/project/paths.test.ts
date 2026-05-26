import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { resolveProjectRoot, getCtxProjectRoot, getGitRoot, getCtxHome, getProjectDbPath, getUserDbPath, ensureDir } from "../../src/paths.js";

describe("paths", () => {
  it("falls back to cwd when walking up finds no marker", () => {
    const result = resolveProjectRoot("/a/nonexistent/deep/path");
    expect(result).toBe(path.resolve("/a/nonexistent/deep/path"));
  });

  it("detects .ctx directory when present", () => {
    const tmp = path.join(os.tmpdir(), `ctx-test-hasctx-${Date.now()}`);
    fs.mkdirSync(tmp, { recursive: true });
    ensureDir(path.join(tmp, ".ctx"));
    const result = getCtxProjectRoot(tmp);
    expect(result).toBe(path.resolve(tmp));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns null when walking up with no .ctx anywhere", () => {
    const result = getCtxProjectRoot("/a/nonexistent/deep/path");
    expect(result).toBeNull();
  });

  it("returns correct ctx home path", () => {
    const home = getCtxHome();
    expect(home).toContain(".ctx");
  });

  it("returns correct project db path structure", () => {
    const dbPath = getProjectDbPath("/test/project");
    expect(dbPath).toContain(".ctx");
    expect(dbPath).toContain("db.sqlite");
    expect(dbPath).toBe(path.join("/test/project", ".ctx", "db.sqlite"));
  });

  it("returns correct user db path", () => {
    const home = getCtxHome();
    const dbPath = getUserDbPath();
    expect(dbPath).toBe(path.resolve(home, "db.sqlite"));
  });

  it("ensures directory creation", () => {
    const tmp = path.join(os.tmpdir(), `ctx-test-ensure-${Date.now()}`);
    const target = path.join(tmp, "sub1", "sub2");
    ensureDir(target);
    expect(fs.existsSync(target)).toBe(true);
    expect(fs.statSync(target).isDirectory()).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
