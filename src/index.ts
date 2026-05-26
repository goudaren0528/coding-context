#!/usr/bin/env node
import { Command } from "commander";
import { claudeCommand } from "./commands/claude.js";
import { opencodeCommand } from "./commands/opencode.js";
import { resumeCommand } from "./commands/resume.js";
import { memoryCommand } from "./commands/memory.js";
import { updateCommand } from "./commands/update.js";
import { doctorCommand } from "./commands/doctor.js";
import { stateEditCommand } from "./commands/state-edit.js";
import { exportCommand } from "./commands/export.js";
import { importCommand } from "./commands/import.js";
import { restoreCommand } from "./commands/restore.js";

import { askCommand } from "./commands/ask.js";

const program = new Command();

program
  .name("ctx")
  .description("AI Workspace Runtime \u2014 persistent project memory for Claude Code and OpenCode")
  .version("0.1.0");

program
  .command("claude")
  .description("Start Claude Code with project context")
  .action(async () => {
    try {
      await claudeCommand();
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("opencode")
  .description("Start OpenCode with project context")
  .action(async () => {
    try {
      await opencodeCommand();
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("resume")
  .description("View current project workspace state")
  .action(async () => {
    try {
      await resumeCommand();
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("memory [action...]")
  .description("View developer preferences")
  .action(async (actionParts: string[]) => {
    try {
      const action = actionParts.length > 0 ? actionParts[0] : "";
      const args = actionParts.slice(1);
      await memoryCommand(action, args);
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("update")
  .description("Sync cross-project memory")
  .action(async () => {
    try {
      await updateCommand();
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("doctor")
  .description("Run diagnostics (privacy, state)")
  .argument("[subject]", "Check subject: privacy, state, all", "all")
  .action(async (subject: string) => {
    try {
      await doctorCommand(subject);
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("state")
  .description("Manage workspace state (edit)")
  .argument("<action>", "Action: edit")
  .argument("<field>", "Field: currentFocus, activeProblems, nextActions, recentDecisions, importantFiles")
  .argument("<value...>", "Value to set")
  .action(async (action: string, field: string, valueParts: string[]) => {
    try {
      if (action === "edit") {
        await stateEditCommand(field, valueParts.join(" "));
      } else {
        console.log(`Usage: ctx state edit <field> <value>`);
      }
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("export")
  .description("Export sanitized developer memory")
  .argument("[output]", "Output file path")
  .action(async (output: string | undefined) => {
    try {
      await exportCommand(output);
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("import")
  .description("Import developer memory from export file")
  .argument("<file>", "Input file path")
  .action(async (file: string) => {
    try {
      await importCommand(file);
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("restore")
  .description("Restore project environment (branch + files)")
  .action(async () => {
    try {
      await restoreCommand();
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program
  .command("ask [question...]")
  .description("Ask a natural language question about project memory")
  .action(async (questionParts: string[]) => {
    try {
      const question = questionParts.join(" ");
      await askCommand(question);
    } catch (err) {
      console.error(`[ctx] Error: ${String(err)}`);
      process.exit(1);
    }
  });

program.parse();
