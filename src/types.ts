export interface WorkspaceState {
  projectId: string;
  currentFocus: string | null;
  activeProblems: string[];
  nextActions: string[];
  recentDecisions: string[];
  importantFiles: string[];
  gitBranch: string | null;
  gitCommit: string | null;
  updatedAt: string;
}

export interface ProjectBrain {
  projectId: string;
  architecture: string[];
  techStack: string[];
  keyPatterns: string[];
  knownConstraints: string[];
  openQuestions: string[];
  importantEntities: string[];
  importantCommands: string[];
  updatedAt: string;
}

export interface Session {
  id: string;
  projectId: string;
  tool: "claude" | "opencode";
  startTime: string;
  endTime: string | null;
  cwd: string;
  title: string | null;
  summary: string | null;
  status: "active" | "completed";
  gitBranch: string | null;
  gitCommit: string | null;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  source: "stdin" | "stdout";
  content: string;
}

export interface Decision {
  id: string;
  projectId: string;
  sessionId: string;
  decision: string;
  reason: string | null;
  confidence: number;
  importanceScore: number;
  lastReferencedAt: string;
  createdAt: string;
}

export interface ProjectEntity {
  id: string;
  projectId: string;
  type: "file" | "api" | "library" | "concept" | "command" | "module";
  name: string;
  globalEntityId: string | null;
  confidence: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface GitContext {
  branch: string | null;
  headCommit: string | null;
  previousCtxCommit: string | null;
  committedChangedFiles: string[];
  uncommittedFiles: string[];
  recentCommitMessages: string[];
}

export interface GlobalEntity {
  id: string;
  type: "library" | "concept" | "pattern" | "tool" | "framework" | "language";
  name: string;
  description: string | null;
  usageCount: number;
  linkedProjectIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface CrossProjectPattern {
  id: string;
  pattern: string;
  description: string | null;
  projectIds: string[];
  confidence: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface DeveloperPreference {
  id: string;
  category: "coding_style" | "architecture_preference" | "library_preference"
    | "testing_preference" | "workflow_preference" | "agent_interaction_preference"
    | "naming_preference" | "avoidance";
  preference: string;
  appliesTo: {
    languages?: string[];
    projectTypes?: string[];
    tools?: ("claude-code" | "opencode")[];
  };
  source: "explicit" | "inferred";
  confidence: number;
  evidenceProjectIds: string[];
  status: "active" | "candidate" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface RegisteredProject {
  id: string;
  name: string;
  path: string;
  gitRemote: string | null;
  primaryLanguage: string | null;
  projectType: string | null;
  lastSeenAt: string;
  createdAt: string;
}

export interface ProjectConfig {
  projectId: string;
  projectName: string;
  gitRemote: string | null;
  llm: {
    enabled: boolean;
    model: string | null;
    baseUrl: string | null;
  };
}

export interface ResolvedLlmConfig {
  enabled: boolean;
  model: string | null;
  baseUrl: string | null;
  apiKey: string | null;
}

export interface CompressionInput {
  previousWorkspaceState: WorkspaceState | null;
  sessionEvents: SessionEvent[];
  gitContext: GitContext;
  projectBrain: ProjectBrain | null;
}

export interface CompressionOutput {
  updatedWorkspaceState: WorkspaceState;
  newDecisions: { decision: string; reason: string | null; confidence: number }[];
  newProjectEntities: { type: ProjectEntity["type"]; name: string }[];
}

export interface InjectionBlocks {
  l1: string;
  l2: string | null;
  l3: string | null;
  l4: string | null;
}

export interface MemoryCandidate {
  id: string;
  kind: "preference" | "pattern" | "entity" | "constraint";
  content: string;
  evidenceProjectIds: string[];
  evidenceCount: number;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "archived";
  createdAt: string;
  updatedAt: string;
}
