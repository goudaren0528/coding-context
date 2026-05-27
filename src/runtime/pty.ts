import { spawn, ChildProcess } from "child_process";

export interface PtyProcess {
  process: ChildProcess;
  mode: "piped" | "inherit";
  onData: (handler: (data: string) => void) => void;
  onExit: (handler: (code: number | null) => void) => void;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
}

export function spawnPty(
  command: string,
  args: string[],
  cwd: string,
  env?: Record<string, string>
): PtyProcess {
  const childEnv = { ...process.env, ...env };
  const mode = command === "opencode" ? "inherit" : "piped";
  const child = spawn(command, args, {
    cwd,
    env: childEnv,
    stdio: mode === "inherit" ? "inherit" : ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
    windowsHide: true,
  });

  const dataHandlers: Array<(data: string) => void> = [];
  const exitHandlers: Array<(code: number | null) => void> = [];

  if (mode === "piped" && child.stdout) {
    child.stdout.setEncoding("utf-8");
    child.stdout.on("data", (data: string) => {
      for (const h of dataHandlers) h(data);
    });
  }

  if (mode === "piped" && child.stderr) {
    child.stderr.setEncoding("utf-8");
    child.stderr.on("data", (data: string) => {
      for (const h of dataHandlers) h(data);
    });
  }

  child.on("exit", (code) => {
    for (const h of exitHandlers) h(code);
  });

  child.on("error", (err) => {
    console.error(`[ctx] Process error: ${err.message}`);
    for (const h of exitHandlers) h(1);
  });

  return {
    process: child,
    mode,
    onData(handler) {
      dataHandlers.push(handler);
    },
    onExit(handler) {
      exitHandlers.push(handler);
    },
    write(data: string) {
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write(data);
      }
    },
    resize() {},
    kill() {
      child.kill();
    },
  };
}
