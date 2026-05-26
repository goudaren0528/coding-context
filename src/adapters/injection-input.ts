import type { WorkspaceState, ProjectBrain, DeveloperPreference } from "../types.js";

export interface InjectionInput {
  workspaceState: WorkspaceState | null;
  projectBrain: ProjectBrain | null;
  preferences: DeveloperPreference[];
  injectionBlocks: {
    l2: string | null;
    l3: string | null;
    l4: string | null;
  };
}
