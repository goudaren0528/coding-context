import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("child_process", () => ({
  spawn: spawnMock,
}));

function createChild() {
  const handlers = new Map<string, Array<(...args: unknown[]) => void>>();
  return {
    stdout: { setEncoding: vi.fn(), on: vi.fn() },
    stderr: { setEncoding: vi.fn(), on: vi.fn() },
    stdin: { destroyed: false, write: vi.fn() },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    }),
    kill: vi.fn(),
  };
}

describe("spawnPty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses inherited stdio for opencode passthrough", async () => {
    spawnMock.mockReturnValue(createChild());
    const { spawnPty } = await import("../../src/runtime/pty.js");

    const pty = spawnPty("opencode", [], "/repo");

    expect(spawnMock).toHaveBeenCalledWith(
      "opencode",
      [],
      expect.objectContaining({
        cwd: "/repo",
        stdio: "inherit",
      })
    );
    expect(pty.mode).toBe("inherit");
  });

  it("uses piped stdio for claude", async () => {
    spawnMock.mockReturnValue(createChild());
    const { spawnPty } = await import("../../src/runtime/pty.js");

    const pty = spawnPty("claude", [], "/repo");

    expect(spawnMock).toHaveBeenCalledWith(
      "claude",
      [],
      expect.objectContaining({
        cwd: "/repo",
        stdio: ["pipe", "pipe", "pipe"],
      })
    );
    expect(pty.mode).toBe("piped");
  });
});
