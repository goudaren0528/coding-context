import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

describe("git context", () => {
  it("returns nulls when not in a git repo", async () => {
    const { captureGitContext } = await import("../../src/git/context.js");
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-git-"));
    const ctx = captureGitContext(tmp);
    expect(ctx.branch).toBeNull();
    expect(ctx.headCommit).toBeNull();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
