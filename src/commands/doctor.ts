import { resolveProjectRoot } from "../paths.js";
import { ensureProjectInit } from "../project/init.js";
import { runLlmCheck } from "../llm/doctor.js";
import { runPrivacyCheck } from "../privacy/doctor.js";

export async function doctorCommand(subject: string): Promise<void> {
  const validSubjects = ["privacy", "llm", "state", "all"];
  if (!validSubjects.includes(subject)) {
    console.log(`Usage: ctx doctor <privacy|llm|state|all>`);
    return;
  }

  const projectRoot = resolveProjectRoot();
  const project = subject === "llm" || subject === "all"
    ? await ensureProjectInit(projectRoot)
    : null;

  if (subject === "privacy" || subject === "all") {
    const report = runPrivacyCheck(projectRoot);

    console.log("Privacy Report");
    console.log("");

    if (report.issues.length > 0) {
      console.log("Issues:");
      for (const issue of report.issues) {
        console.log(`  \u2717 ${issue}`);
      }
      console.log("");
    }

    console.log("Status:");
    for (const ok of report.ok) {
      console.log(`  \u2713 ${ok}`);
    }
  }

  if (subject === "llm" || subject === "all") {
    const report = runLlmCheck(project?.config ?? null);

    console.log("");
    console.log("LLM Report");
    console.log("");

    if (report.issues.length > 0) {
      console.log("Issues:");
      for (const issue of report.issues) {
        console.log(`  \u2717 ${issue}`);
      }
      console.log("");
    }

    console.log("Status:");
    for (const ok of report.ok) {
      console.log(`  \u2713 ${ok}`);
    }
  }

  if (subject === "state" || subject === "all") {
    console.log("");
    console.log("State: use `ctx resume` to view current state.");
    console.log("State: use `ctx state edit <field> <value>` to correct workspace state.");
  }
}
