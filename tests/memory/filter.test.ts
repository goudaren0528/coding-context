import { describe, it, expect } from "vitest";
import { filterPreferences } from "../../src/memory/filter.js";
import type { DeveloperPreference, ProjectBrain } from "../../src/types.js";

describe("filter", () => {
  const prefs: DeveloperPreference[] = [
    {
      id: "p1",
      category: "library_preference",
      preference: "Uses zod",
      appliesTo: { languages: ["TypeScript"] },
      source: "inferred",
      confidence: 0.8,
      evidenceProjectIds: [],
      status: "active",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "p2",
      category: "library_preference",
      preference: "Uses React",
      appliesTo: { projectTypes: ["frontend"] },
      source: "inferred",
      confidence: 0.7,
      evidenceProjectIds: [],
      status: "active",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "p3",
      category: "agent_interaction_preference",
      preference: "Prefers small patches",
      appliesTo: { tools: ["claude-code", "opencode"] },
      source: "explicit",
      confidence: 1.0,
      evidenceProjectIds: [],
      status: "active",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "p4",
      category: "coding_style",
      preference: "Uses async/await",
      appliesTo: {},
      source: "inferred",
      confidence: 0.9,
      evidenceProjectIds: [],
      status: "active",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "p5",
      category: "library_preference",
      preference: "Candidate preference",
      appliesTo: {},
      source: "inferred",
      confidence: 0.5,
      evidenceProjectIds: [],
      status: "candidate",
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("filters out non-active preferences", () => {
    const result = filterPreferences(prefs, null);
    expect(result.length).toBe(4);
  });

  it("filters by language match", () => {
    const brain: ProjectBrain = {
      projectId: "p",
      architecture: [],
      techStack: ["TypeScript", "Node.js"],
      keyPatterns: [],
      knownConstraints: [],
      openQuestions: [],
      importantEntities: [],
      importantCommands: [],
      updatedAt: "",
    };

    const result = filterPreferences(prefs, brain);
    const zod = result.find(p => p.id === "p1");
    expect(zod).toBeDefined();
  });

  it("filters by project type", () => {
    const brain: ProjectBrain = {
      projectId: "p",
      architecture: [],
      techStack: ["TypeScript", "React"],
      keyPatterns: [],
      knownConstraints: [],
      openQuestions: [],
      importantEntities: [],
      importantCommands: [],
      updatedAt: "",
    };

    const result = filterPreferences(prefs, brain);
    const react = result.find(p => p.id === "p2");
    expect(react).toBeDefined();
  });

  it("filters by tool", () => {
    const result = filterPreferences(prefs, null, "claude-code");
    const patches = result.find(p => p.id === "p3");
    expect(patches).toBeDefined();

    const noTool = filterPreferences(prefs, null, "gemini");
    const noPatches = noTool.find(p => p.id === "p3");
    expect(noPatches).toBeUndefined();
  });

  it("always includes preferences with no appliesTo filters", () => {
    const result = filterPreferences(prefs, null);
    const alwaysIn = result.find(p => p.id === "p4");
    expect(alwaysIn).toBeDefined();
  });

  it("excludes preferences when project type doesn't match", () => {
    const brain: ProjectBrain = {
      projectId: "p",
      architecture: [],
      techStack: ["TypeScript", "Express"],
      keyPatterns: ["CLI", "commander"],
      knownConstraints: [],
      openQuestions: [],
      importantEntities: [],
      importantCommands: [],
      updatedAt: "",
    };

    const result = filterPreferences(prefs, brain);
    const react = result.find(p => p.id === "p2");
    expect(react).toBeUndefined();
  });
});
