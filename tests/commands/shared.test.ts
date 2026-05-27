import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeveloperPreference, GitContext, ProjectConfig, WorkspaceState } from "../../src/types.js";

const openDatabaseMock = vi.fn(async () => ({}));
const saveDatabaseMock = vi.fn();
const getWorkspaceStateMock = vi.fn<() => WorkspaceState | null>();
const getProjectBrainMock = vi.fn(() => null);
const getDeveloperPreferencesMock = vi.fn<() => DeveloperPreference[]>(() => []);
const filterPreferencesMock = vi.fn((prefs: DeveloperPreference[]) => prefs);
const buildInjectionsMock = vi.fn();
const captureGitContextMock = vi.fn<() => GitContext>(() => ({
  branch: "main",
  headCommit: "abc123",
  previousCtxCommit: null,
  committedChangedFiles: [],
  uncommittedFiles: [],
  recentCommitMessages: [],
}));
const runSessionMock = vi.fn(async () => undefined);

const baseConfig: ProjectConfig = {
  projectId: "project-1",
  projectName: "demo-project",
  gitRemote: null,
  llm: {
    enabled: true,
    model: null,
    baseUrl: null,
  },
};

vi.mock("../../src/paths.js", () => ({
  resolveProjectRoot: vi.fn(() => "/repo"),
  getUserDbPath: vi.fn(() => "/home/user/.ctx/db.sqlite"),
  getProjectDbPath: vi.fn(() => "/repo/.ctx/db.sqlite"),
}));

vi.mock("../../src/project/init.js", () => ({
  ensureProjectInit: vi.fn(async () => ({
    projectRoot: "/repo",
    config: baseConfig,
    isNew: false,
  })),
}));

vi.mock("../../src/project/scan.js", () => ({
  scanRepo: vi.fn(),
}));

vi.mock("../../src/git/context.js", () => ({
  captureGitContext: captureGitContextMock,
}));

vi.mock("../../src/storage/connection.js", () => ({
  openDatabase: openDatabaseMock,
  saveDatabase: saveDatabaseMock,
}));

vi.mock("../../src/storage/state-store.js", () => ({
  getWorkspaceState: getWorkspaceStateMock,
}));

vi.mock("../../src/storage/brain-store.js", () => ({
  getProjectBrain: getProjectBrainMock,
  upsertProjectBrain: vi.fn(),
}));

vi.mock("../../src/storage/memory-store.js", () => ({
  getDeveloperPreferences: getDeveloperPreferencesMock,
}));

vi.mock("../../src/storage/entity-store.js", () => ({
  upsertProjectEntity: vi.fn(),
}));

vi.mock("../../src/memory/injector.js", () => ({
  buildInjections: buildInjectionsMock,
}));

vi.mock("../../src/memory/filter.js", () => ({
  filterPreferences: filterPreferencesMock,
}));

vi.mock("../../src/runtime/session.js", () => ({
  runSession: runSessionMock,
}));

describe("startTool", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getWorkspaceStateMock.mockReturnValue(null);
    getProjectBrainMock.mockReturnValue(null);
    getDeveloperPreferencesMock.mockReturnValue([]);
    filterPreferencesMock.mockImplementation((prefs: DeveloperPreference[]) => prefs);
    buildInjectionsMock.mockReturnValue({
      l1: "  ctx · demo-project",
      l2: "[ctx project state]\nCurrent focus: Ship release",
      l3: null,
      l4: "[ctx developer memory]\nRelevant preferences:\n- Keep diffs small",
    });
  });

  it("passes CTX_CONTEXT to runSession when injection blocks exist", async () => {
    const { startTool } = await import("../../src/commands/shared.js");

    await startTool("claude");

    expect(runSessionMock).toHaveBeenCalledTimes(1);
    const opts = runSessionMock.mock.calls[0][2];
    expect(opts.env).toEqual({
      CTX_CONTEXT: [
        "[ctx project state]\nCurrent focus: Ship release",
        "[ctx developer memory]\nRelevant preferences:\n- Keep diffs small",
      ].join("\n\n"),
    });
  });

  it("omits CTX_CONTEXT when there are no L2-L4 blocks", async () => {
    buildInjectionsMock.mockReturnValue({
      l1: "  ctx · demo-project",
      l2: null,
      l3: null,
      l4: null,
    });

    const { startTool } = await import("../../src/commands/shared.js");

    await startTool("opencode");

    expect(runSessionMock).toHaveBeenCalledTimes(1);
    const opts = runSessionMock.mock.calls[0][2];
    expect(opts.env).toBeUndefined();
  });
});
