import { resolveProjectRoot } from "../paths.js";
import { runPrivacyCheck } from "../privacy/doctor.js";

export async function doctorCommand(subject: string): Promise<void> {
  const validSubjects = ["privacy", "state", "all"];
  if (!validSubjects.includes(subject)) {
    console.log(`Usage: ctx doctor <privacy|state|all>`);
    return;
  }

  if (subject === "privacy" || subject === "all") {
    const projectRoot = resolveProjectRoot();
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

  if (subject === "state" || subject === "all") {
    console.log("");
    console.log("State: use `ctx resume` to view current state.");
    console.log("State: use `ctx state edit <field> <value>` to correct workspace state.");
  }
}
