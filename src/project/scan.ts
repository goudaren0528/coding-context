import * as fs from "fs";
import * as path from "path";
import type { ProjectBrain } from "../types.js";

export interface RepoScanResult {
  brain: ProjectBrain;
  entityNames: string[];
}

export function scanRepo(projectRoot: string, projectId: string): RepoScanResult {
  const brain: ProjectBrain = {
    projectId,
    architecture: [],
    techStack: [],
    keyPatterns: [],
    knownConstraints: [],
    openQuestions: [],
    importantEntities: [],
    importantCommands: [],
    updatedAt: new Date().toISOString(),
  };

  const entityNames: string[] = [];

  const techStack = detectTechStack(projectRoot);
  brain.techStack = techStack;
  for (const t of techStack) entityNames.push(t);

  try {
    const readmePath = path.join(projectRoot, "README.md");
    if (fs.existsSync(readmePath)) {
      brain.importantEntities.push("README.md");
      entityNames.push("README.md");
    }
  } catch {}

  const structure = scanDirectoryStructure(projectRoot, 0);
  if (structure.length > 0) {
    brain.architecture.push(...structure);
  }

  const commands = detectCommonCommands(projectRoot);
  brain.importantCommands = commands;

  detectSourceFiles(projectRoot).forEach(f => {
    if (!entityNames.includes(f)) entityNames.push(f);
  });

  return { brain, entityNames };
}

function detectTechStack(projectRoot: string): string[] {
  const stack: string[] = [];

  const packageJsonPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      stack.push("Node.js");
      if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
        stack.push("TypeScript");
      }
      if (pkg.dependencies?.react) stack.push("React");
      if (pkg.dependencies?.next) stack.push("Next.js");
      if (pkg.dependencies?.express) stack.push("Express");
      if (pkg.dependencies?.fastify) stack.push("Fastify");
      if (pkg.dependencies?.prisma || pkg.devDependencies?.prisma) stack.push("Prisma");
      if (pkg.dependencies?.drizzle) stack.push("Drizzle ORM");
      if (pkg.dependencies?.zod) stack.push("zod");
      if (pkg.dependencies?.commander) stack.push("commander");
      if (pkg.dependencies?.vitest || pkg.devDependencies?.vitest) stack.push("vitest");
      if (pkg.dependencies?.jest || pkg.devDependencies?.jest) stack.push("Jest");
    } catch {}
  }

  if (fs.existsSync(path.join(projectRoot, "go.mod"))) {
    stack.push("Go");
  }

  if (fs.existsSync(path.join(projectRoot, "Cargo.toml"))) {
    stack.push("Rust");
  }

  if (fs.existsSync(path.join(projectRoot, "pyproject.toml")) ||
      fs.existsSync(path.join(projectRoot, "setup.py"))) {
    stack.push("Python");
  }

  return stack;
}

function scanDirectoryStructure(
  dir: string,
  depth: number,
  maxDepth: number = 2
): string[] {
  if (depth > maxDepth) return [];
  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      if (entry.isDirectory()) {
        if (entry.name === "src") {
          results.push(`Source directory: src/`);
        } else if (entry.name === "tests" || entry.name === "__tests__" || entry.name === "test") {
          results.push(`Tests directory: ${entry.name}/`);
        } else if (entry.name === "docs") {
          results.push(`Documentation: docs/`);
        }
        if (depth < maxDepth) {
          results.push(...scanDirectoryStructure(path.join(dir, entry.name), depth + 1, maxDepth));
        }
      }
    }
  } catch {}

  return results;
}

function detectCommonCommands(projectRoot: string): string[] {
  const commands: string[] = [];

  if (fs.existsSync(path.join(projectRoot, "package.json"))) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf-8"));
      if (pkg.scripts) {
        for (const [name, value] of Object.entries(pkg.scripts)) {
          if (["dev", "build", "test", "lint", "start"].includes(name)) {
            commands.push(`${name}: ${String(value)}`);
          }
        }
      }
    } catch {}
  }

  if (fs.existsSync(path.join(projectRoot, "Makefile"))) {
    commands.push("Makefile available");
  }

  return commands;
}

function detectSourceFiles(projectRoot: string): string[] {
  const files: string[] = [];
  const srcDir = path.join(projectRoot, "src");
  if (fs.existsSync(srcDir)) {
    try {
      const entries = fs.readdirSync(srcDir);
      for (const entry of entries) {
        if (entry === "index.ts" || entry === "main.ts" || entry === "index.js" ||
            entry === "main.go" || entry === "main.py") {
          files.push(`src/${entry}`);
        }
      }
    } catch {}
  }

  const candidates = [
    "index.ts", "index.js", "main.ts", "main.go", "main.rs", "main.py", "app.ts", "server.ts",
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(projectRoot, c))) {
      files.push(c);
    }
  }

  return files;
}
