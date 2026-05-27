import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProjectConfig } from "../src/types.js";

async function loadConfigModule() {
  vi.resetModules();
  return import("../src/config.js");
}

describe("resolveLlmConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads model, baseUrl, and apiKey from env by default", async () => {
    vi.stubEnv("CTX_MODEL", "gpt-4.1-mini");
    vi.stubEnv("CTX_BASE_URL", "https://example.test/v1");
    vi.stubEnv("CTX_API_KEY", "secret");

    const { resolveLlmConfig } = await loadConfigModule();
    const config = resolveLlmConfig(null);

    expect(config).toEqual({
      enabled: true,
      model: "gpt-4.1-mini",
      baseUrl: "https://example.test/v1",
      apiKey: "secret",
    });
  });

  it("lets project config override env model and baseUrl", async () => {
    vi.stubEnv("CTX_MODEL", "env-model");
    vi.stubEnv("CTX_BASE_URL", "https://env.test/v1");
    vi.stubEnv("CTX_API_KEY", "secret");

    const projectConfig: ProjectConfig = {
      projectId: "p1",
      projectName: "demo",
      gitRemote: null,
      llm: {
        enabled: true,
        model: "project-model",
        baseUrl: "https://project.test/v1",
      },
    };

    const { resolveLlmConfig } = await loadConfigModule();
    const config = resolveLlmConfig(projectConfig);

    expect(config.model).toBe("project-model");
    expect(config.baseUrl).toBe("https://project.test/v1");
    expect(config.apiKey).toBe("secret");
  });

  it("returns nulls when model or baseUrl are missing", async () => {
    vi.stubEnv("CTX_API_KEY", "secret");

    const { resolveLlmConfig } = await loadConfigModule();
    const config = resolveLlmConfig(null);

    expect(config.enabled).toBe(true);
    expect(config.model).toBeNull();
    expect(config.baseUrl).toBeNull();
    expect(config.apiKey).toBe("secret");
  });
});
