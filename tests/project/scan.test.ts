import { describe, it, expect } from "vitest";
import { scanRepo } from "../../src/project/scan.js";
import * as fs from "fs";
import * as path from "path";

describe("scan", () => {
  it("detects Node.js project with tsconfig and package.json", () => {
    const tmp = fs.mkdtempSync("ctx-scan-");
    const pkgPath = path.join(tmp, "package.json");
    fs.writeFileSync(pkgPath, JSON.stringify({
      name: "test",
      dependencies: { express: "^4.0.0", zod: "^3.0.0" },
      devDependencies: { typescript: "^5.0.0", vitest: "^1.0.0" },
      scripts: { dev: "tsc --watch", test: "vitest", build: "tsc" },
    }));

    fs.mkdirSync(path.join(tmp, "src"));
    fs.mkdirSync(path.join(tmp, "tests"));
    fs.writeFileSync(path.join(tmp, "src", "index.ts"), "console.log('hello');");

    const result = scanRepo(tmp, "proj_scan");
    expect(result.brain.techStack).toContain("Node.js");
    expect(result.brain.techStack).toContain("TypeScript");
    expect(result.brain.techStack).toContain("Express");
    expect(result.brain.techStack).toContain("zod");
    expect(result.brain.techStack).toContain("vitest");
    expect(result.brain.importantCommands.length).toBeGreaterThan(0);
    expect(result.entityNames).toContain("src/index.ts");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("detects Go project", () => {
    const tmp = fs.mkdtempSync("ctx-scan-");
    fs.writeFileSync(path.join(tmp, "go.mod"), "module example.com/test\n\ngo 1.21");

    const result = scanRepo(tmp, "proj_go");
    expect(result.brain.techStack).toContain("Go");

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("handles empty directory", () => {
    const tmp = fs.mkdtempSync("ctx-scan-");
    const result = scanRepo(tmp, "proj_empty");
    expect(result.brain.techStack).toEqual([]);
    expect(result.brain.architecture).toEqual([]);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
