import { describe, it, expect } from "vitest";
import { buildInjections } from "../../src/memory/injector.js";
import type { WorkspaceState, ProjectBrain, DeveloperPreference } from "../../src/types.js";

describe("injector", () => {
  it("builds L1 header from state", () => {
    const state: WorkspaceState = {
      projectId: "p1",
      currentFocus: "Stripe retry",
      activeProblems: ["timeout edge case"],
      nextActions: ["implement retry queue"],
      recentDecisions: ["use exponential backoff"],
      importantFiles: ["retry.ts"],
      gitBranch: "feature/retry",
      gitCommit: null,
      updatedAt: new Date().toISOString(),
    };

    const result = buildInjections(state, null, [], "payment-service");
    expect(result.l1).toContain("payment-service");
    expect(result.l1).toContain("Stripe retry");
    expect(result.l1).toContain("open: timeout edge case");
    expect(result.l1).toContain("next: implement retry queue");
  });

  it("builds L1 with just project name when no state", () => {
    const result = buildInjections(null, null, [], "empty-project");
    expect(result.l1).toBe("  ctx · empty-project");
  });

  it("builds L2 with state details", () => {
    const state: WorkspaceState = {
      projectId: "p1",
      currentFocus: "Test focus",
      activeProblems: ["problem 1"],
      nextActions: ["action 1"],
      recentDecisions: ["decision 1"],
      importantFiles: ["file.ts"],
      gitBranch: null,
      gitCommit: null,
      updatedAt: new Date().toISOString(),
    };

    const result = buildInjections(state, null, [], "test");
    expect(result.l2).toContain("[ctx project state]");
    expect(result.l2).toContain("Current focus: Test focus");
    expect(result.l2).toContain("- problem 1");
    expect(result.l2).toContain("- action 1");
    expect(result.l2).toContain("- decision 1");
  });

  it("builds L3 from project brain", () => {
    const brain: ProjectBrain = {
      projectId: "p1",
      architecture: ["Clean Architecture"],
      techStack: ["TypeScript", "Node.js"],
      keyPatterns: [],
      knownConstraints: ["idempotency required"],
      openQuestions: [],
      importantEntities: [],
      importantCommands: ["npm run dev"],
      updatedAt: new Date().toISOString(),
    };

    const result = buildInjections(null, brain, [], "test");
    expect(result.l3).toContain("[ctx project brain]");
    expect(result.l3).toContain("Clean Architecture");
    expect(result.l3).toContain("TypeScript");
    expect(result.l3).toContain("idempotency required");
  });

  it("builds L4 from developer preferences", () => {
    const prefs: DeveloperPreference[] = [
      {
        id: "p1",
        category: "library_preference",
        preference: "Uses zod",
        appliesTo: {},
        source: "explicit",
        confidence: 1,
        evidenceProjectIds: [],
        status: "active",
        createdAt: "",
        updatedAt: "",
      },
    ];

    const result = buildInjections(null, null, prefs, "test");
    expect(result.l4).toContain("[ctx developer memory]");
    expect(result.l4).toContain("Uses zod");
  });

  it("returns null L2-L4 when no data", () => {
    const result = buildInjections(null, null, [], "test");
    expect(result.l2).toBeNull();
    expect(result.l3).toBeNull();
    expect(result.l4).toBeNull();
  });
});
