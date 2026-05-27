import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveProjectRootMock = vi.fn(() => "/repo");
const ensureProjectInitMock = vi.fn(async () => ({
  projectRoot: "/repo",
  config: {
    projectId: "project-1",
    projectName: "demo-project",
    gitRemote: null,
    llm: {
      enabled: true,
      model: "gpt-4.1-mini",
      baseUrl: "https://llm.example.test/v1",
    },
  },
  isNew: false,
}));
const runPrivacyCheckMock = vi.fn(() => ({
  issues: [],
  ok: ["privacy ok"],
}));
const runLlmCheckMock = vi.fn(() => ({
  issues: ["Missing CTX_API_KEY."],
  ok: ["Model configured: gpt-4.1-mini"],
}));

vi.mock("../../src/paths.js", () => ({
  resolveProjectRoot: resolveProjectRootMock,
}));

vi.mock("../../src/project/init.js", () => ({
  ensureProjectInit: ensureProjectInitMock,
}));

vi.mock("../../src/privacy/doctor.js", () => ({
  runPrivacyCheck: runPrivacyCheckMock,
}));

vi.mock("../../src/llm/doctor.js", () => ({
  runLlmCheck: runLlmCheckMock,
}));

describe("doctorCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows llm report for doctor llm", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { doctorCommand } = await import("../../src/commands/doctor.js");

    await doctorCommand("llm");

    expect(ensureProjectInitMock).toHaveBeenCalledWith("/repo");
    expect(runLlmCheckMock).toHaveBeenCalledWith(expect.objectContaining({ projectId: "project-1" }));
    expect(logSpy).toHaveBeenCalledWith("LLM Report");
    expect(logSpy).toHaveBeenCalledWith("  ✗ Missing CTX_API_KEY.");
    expect(logSpy).toHaveBeenCalledWith("  ✓ Model configured: gpt-4.1-mini");
  });

  it("includes llm section in doctor all", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const { doctorCommand } = await import("../../src/commands/doctor.js");

    await doctorCommand("all");

    expect(runPrivacyCheckMock).toHaveBeenCalledWith("/repo");
    expect(runLlmCheckMock).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith("Privacy Report");
    expect(logSpy).toHaveBeenCalledWith("LLM Report");
  });
});
