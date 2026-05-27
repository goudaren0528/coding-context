import { beforeEach, describe, expect, it, vi } from "vitest";

const ensureProjectInitMock = vi.fn(async () => ({
  projectRoot: "/repo",
  config: {
    projectId: "project-1",
    projectName: "demo-project",
    gitRemote: null,
    llm: {
      enabled: true,
      model: null,
      baseUrl: null,
    },
  },
  isNew: false,
}));

const openDatabaseMock = vi.fn(async () => ({
  exec: vi.fn(() => []),
}));

const askQuestionMock = vi.fn(async () => null);

vi.mock("../../src/paths.js", () => ({
  resolveProjectRoot: vi.fn(() => "/repo"),
  getProjectDbPath: vi.fn(() => "/repo/.ctx/db.sqlite"),
}));

vi.mock("../../src/project/init.js", () => ({
  ensureProjectInit: ensureProjectInitMock,
}));

vi.mock("../../src/storage/connection.js", () => ({
  openDatabase: openDatabaseMock,
}));

vi.mock("../../src/storage/state-store.js", () => ({
  getWorkspaceState: vi.fn(() => ({
    currentFocus: "Ship release",
    activeProblems: [],
    nextActions: [],
    recentDecisions: [],
  })),
}));

vi.mock("../../src/storage/brain-store.js", () => ({
  getProjectBrain: vi.fn(() => null),
}));

vi.mock("../../src/storage/session-store.js", () => ({
  getLatestSessions: vi.fn(() => []),
}));

vi.mock("../../src/memory/ask.js", () => ({
  askQuestion: askQuestionMock,
}));

describe("askCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    askQuestionMock.mockResolvedValue(null);
  });

  it("prints generic LLM configuration guidance when no answer is available", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const { askCommand } = await import("../../src/commands/ask.js");
    await askCommand("What changed?");

    expect(logSpy).toHaveBeenCalledWith(
      "Could not retrieve an answer. Make sure CTX_MODEL, CTX_BASE_URL, and CTX_API_KEY are configured."
    );
  });
});
