// The terminal service holds an active terminal session which the agent can use, updating the terminal history
import { execSync, type ExecSyncOptions } from "child_process";
import path from "path"; // Added for path normalization
import {
  Service,
  ServiceType,
  type IAgentRuntime,
  type ServiceTypeName,
  logger,
} from "@elizaos/core";
import { ShellServiceType } from "./types";

interface ShellHistoryEntry {
  command: string;
  output: string;
  error?: string;
  exitCode: number | null;
  timestamp: number;
  cwd: string;
}

// Interface for file operations
interface FileOperationEntry {
  timestamp: number;
  operationType: string; // e.g., "read", "write", "delete", "create_dir", "edit", "move", "copy"
  command: string; // The full command
  target: string; // The primary file or directory path involved
  secondaryTarget?: string; // For commands like mv, cp
  cwd: string;
}

// Heuristic to identify file operation types and targets
// This is a simplified parser and might need to be more robust for complex commands
function parseFileOperation(
  command: string,
  cwd: string,
): Omit<FileOperationEntry, "timestamp" | "command" | "cwd"> | null {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  let operationType: string | null = null;
  let target: string | null = null;
  let secondaryTarget: string | undefined = undefined;

  // Simple keywords for operations
  const readCmds = ["cat", "less", "more", "head", "tail"];
  const writeCmds = ["touch"]; // 'echo >'/'>>' are harder to parse simply, vim/nano are "edit"
  const editCmds = ["vim", "nano", "vi", "code", "subl", "pico"]; // Common editors
  const deleteCmds = ["rm", "unlink"];
  const createDirCmds = ["mkdir"];
  const deleteDirCmds = ["rmdir"];
  const moveCmds = ["mv"];
  const copyCmds = ["cp"];

  if (readCmds.includes(cmd) && parts.length > 1) {
    operationType = "read";
    target = parts[1];
  } else if (writeCmds.includes(cmd) && parts.length > 1) {
    operationType = "write";
    target = parts[1];
  } else if (editCmds.includes(cmd) && parts.length > 1) {
    operationType = "edit";
    target = parts[1];
  } else if (deleteCmds.includes(cmd) && parts.length > 1) {
    operationType = "delete";
    target = parts[1];
  } else if (createDirCmds.includes(cmd) && parts.length > 1) {
    operationType = "create_dir";
    target = parts[1];
  } else if (deleteDirCmds.includes(cmd) && parts.length > 1) {
    operationType = "delete_dir";
    target = parts[1];
  } else if (moveCmds.includes(cmd) && parts.length > 2) {
    operationType = "move";
    target = parts[1];
    secondaryTarget = parts[2];
  } else if (copyCmds.includes(cmd) && parts.length > 2) {
    operationType = "copy";
    target = parts[1];
    secondaryTarget = parts[2];
  } else if (
    cmd === "echo" &&
    parts.length > 2 &&
    (parts[parts.length - 2] === ">" || parts[parts.length - 2] === ">>")
  ) {
    operationType = "write"; // or 'append'
    target = parts[parts.length - 1];
  }
  // Add more complex parsing for grep, find, etc. if needed

  if (operationType && target) {
    // Normalize target path if it's not absolute
    const normalizedTarget = path.isAbsolute(target)
      ? target
      : path.normalize(path.join(cwd, target));
    const normalizedSecondaryTarget = secondaryTarget
      ? path.isAbsolute(secondaryTarget)
        ? secondaryTarget
        : path.normalize(path.join(cwd, secondaryTarget))
      : undefined;
    return {
      operationType,
      target: normalizedTarget,
      secondaryTarget: normalizedSecondaryTarget,
    };
  }
  return null;
}

export class ShellService extends Service {
  static override serviceType: ServiceTypeName = ShellServiceType.SHELL;
  override capabilityDescription =
    "Provides shell access to execute commands on the host system.";

  private history: ShellHistoryEntry[] = [];
  private fileOperationHistory: FileOperationEntry[] = []; // Added
  private maxHistoryLength = 100; // Store the last 100 commands
  private maxFileOperationHistoryLength = 10; // Store last 10 file operations

  private currentWorkingDirectory: string = process.cwd();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    logger.info("[ShellService] Initialized");
  }

  static async start(runtime: IAgentRuntime): Promise<ShellService> {
    const service = new ShellService(runtime);
    // No specific async startup actions needed for now
    return service;
  }

  async executeCommand(command: string): Promise<{
    output: string;
    error?: string;
    exitCode: number | null;
    cwd: string;
  }> {
    logger.info(
      `[ShellService] Executing command: ${command} in ${this.currentWorkingDirectory}`,
    );
    let output = "";
    let errorOutput = "";
    let exitCode: number | null = 0;

    const options: ExecSyncOptions = {
      cwd: this.currentWorkingDirectory,
      encoding: "utf-8",
      shell: process.env.SHELL || "/bin/bash", // Use user's shell or default bash
    };

    try {
      // Handle 'cd' command separately to update CWD
      if (command.trim().startsWith("cd ")) {
        const newDir = command.trim().substring(3).trim();
        try {
          // Attempt to change directory
          // process.chdir will throw if path is invalid
          // To make it robust, we test if the path is valid by trying to execute a simple command in it.
          execSync("pwd", { ...options, cwd: newDir }); // Test command
          this.currentWorkingDirectory = newDir;
          output = `Changed directory to ${this.currentWorkingDirectory}`;
          logger.debug(
            `[ShellService] Changed CWD to ${this.currentWorkingDirectory}`,
          );
        } catch (e: any) {
          errorOutput = `Error changing directory to ${newDir}: ${e.message}`;
          exitCode = e.status || 1;
          logger.error(
            `[ShellService] Error changing directory: ${errorOutput}`,
          );
        }
      } else {
        output = execSync(command, options) as string;
      }
    } catch (e: any) {
      errorOutput = e.stderr || e.message || "Command execution failed";
      output = e.stdout || ""; // Sometimes there's stdout even on error
      exitCode = e.status || 1; // Capture exit code
      logger.error(
        `[ShellService] Command execution error: ${errorOutput}, exit code: ${exitCode}`,
      );
    }

    const historyEntry: ShellHistoryEntry = {
      command,
      output: output.trim(),
      error: errorOutput.trim() || undefined,
      exitCode,
      timestamp: Date.now(),
      cwd: this.currentWorkingDirectory,
    };

    this.history.push(historyEntry);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift(); // Keep history trimmed
    }

    // Log file operation
    const fileOp = parseFileOperation(command, this.currentWorkingDirectory);
    if (fileOp && exitCode === 0) {
      // Only log successful operations for simplicity
      const fileOperationEntry: FileOperationEntry = {
        ...fileOp,
        timestamp: historyEntry.timestamp, // use same timestamp
        command,
        cwd: this.currentWorkingDirectory,
      };
      this.fileOperationHistory.push(fileOperationEntry);
      if (
        this.fileOperationHistory.length > this.maxFileOperationHistoryLength
      ) {
        this.fileOperationHistory.shift();
      }
      logger.debug(
        `[ShellService] Logged file operation: ${fileOp.operationType} on ${fileOp.target}`,
      );
    }

    logger.debug(`[ShellService] Command output: ${output.trim()}`);
    if (errorOutput.trim()) {
      logger.debug(`[ShellService] Command error: ${errorOutput.trim()}`);
    }

    return {
      output: output.trim(),
      error: errorOutput.trim() || undefined,
      exitCode,
      cwd: this.currentWorkingDirectory,
    };
  }

  getHistory(count = 10): ShellHistoryEntry[] {
    return this.history.slice(-count);
  }

  // New method to get file operation history
  getFileOperationHistory(count = 10): FileOperationEntry[] {
    return this.fileOperationHistory.slice(
      -Math.min(count, this.maxFileOperationHistoryLength),
    );
  }

  getCurrentWorkingDirectory(): string {
    return this.currentWorkingDirectory;
  }

  clearHistory(): void {
    this.history = [];
    this.fileOperationHistory = []; // Clear file op history too
    logger.info("[ShellService] Shell history cleared.");
  }

  async stop(): Promise<void> {
    logger.info("[ShellService] Stopped.");
    // No specific cleanup needed for execSync
  }
}
