import { describe, it, expect } from "vitest";
import { isExcluded } from "../../src/privacy/exclude.js";

describe("exclude", () => {
  it("excludes .env files", () => {
    expect(isExcluded(".env")).toBe(true);
    expect(isExcluded("src/.env")).toBe(true);
    expect(isExcluded(".env.production")).toBe(true);
  });

  it("excludes key and pem files", () => {
    expect(isExcluded("cert.pem")).toBe(true);
    expect(isExcluded("key.pem")).toBe(true);
    expect(isExcluded("id_rsa.key")).toBe(true);
  });

  it("excludes node_modules", () => {
    expect(isExcluded("node_modules/react/index.js")).toBe(true);
  });

  it("excludes dist", () => {
    expect(isExcluded("dist/index.js")).toBe(true);
  });

  it("excludes .git", () => {
    expect(isExcluded(".git/HEAD")).toBe(true);
  });

  it("excludes db files", () => {
    expect(isExcluded("data.sqlite")).toBe(true);
    expect(isExcluded("data.db")).toBe(true);
  });

  it("excludes secrets directory", () => {
    expect(isExcluded("secrets/api-keys.json")).toBe(true);
  });

  it("does not exclude normal source files", () => {
    expect(isExcluded("src/index.ts")).toBe(false);
    expect(isExcluded("src/components/Button.tsx")).toBe(false);
    expect(isExcluded("package.json")).toBe(false);
  });

  it("does not exclude .ctx/ directory contents", () => {
    expect(isExcluded(".ctx/db.sqlite")).toBe(true);
  });

  it("supports custom extra patterns", () => {
    expect(isExcluded("vendor/biglib.js", ["vendor/**"])).toBe(true);
    expect(isExcluded("src/app.ts", ["vendor/**"])).toBe(false);
  });
});
