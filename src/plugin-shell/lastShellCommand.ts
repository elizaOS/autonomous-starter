// The terminal provider should provide the terminal history for the current active terminal session
// Get the current state from the service and format as text
import fs from 'fs'; // Added fs import
import path from 'path'; // Added path import
import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
  addHeader,
  logger,
} from '@elizaos/core';
import { type ShellService } from './service'; // Import ShellService

const MAX_INDIVIDUAL_OUTPUT_LENGTH = 8000; // Max length before truncating
const TRUNCATE_SEGMENT_LENGTH = 4000; // Length of head/tail segments

// Add ShellHistoryEntry if not exported from service.ts
interface ShellHistoryEntry {
  // Added local interface definition
  command: string;
  output: string;
  error?: string;
  exitCode: number | null;
  timestamp: number;
  cwd: string;
}

export const shellProvider: Provider = {
  name: 'LAST_SHELL_COMMAND',
  description:
    'Provides details on the last executed shell command, including its output and error if any.', // Updated description
  position: 101, // Position it appropriately
  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const shellService = runtime.getService<ShellService>('SHELL' as any);

    if (!shellService) {
      logger.warn('[shellProvider] ShellService not found.');
      return {
        values: {
          lastCommand: 'Shell service is not available.',
          currentWorkingDirectory: 'N/A',
        },
        text: addHeader('# Last Shell Command Status', 'Shell service is not available.'),
        data: { command: null, cwd: 'N/A' },
      };
    }

    const history = shellService.getHistory(1); // Get only the last command
    const cwd = shellService.getCurrentWorkingDirectory();

    let commandText = 'No command has been executed yet.';
    let lastCommandData: ShellHistoryEntry | null = null;

    if (history.length > 0) {
      const lastEntry = history[0];
      lastCommandData = lastEntry;
      let entryStr = `[${new Date(lastEntry.timestamp).toISOString()}] ${lastEntry.cwd}> ${lastEntry.command}`;

      if (lastEntry.output) {
        if (lastEntry.output.length > MAX_INDIVIDUAL_OUTPUT_LENGTH) {
          entryStr += `\n  Output: ${lastEntry.output.substring(0, TRUNCATE_SEGMENT_LENGTH)}\n  ... [TRUNCATED] ...\n  ${lastEntry.output.substring(lastEntry.output.length - TRUNCATE_SEGMENT_LENGTH)}`;
        } else {
          entryStr += `\n  Output: ${lastEntry.output}`;
        }
      }

      if (lastEntry.error) {
        if (lastEntry.error.length > MAX_INDIVIDUAL_OUTPUT_LENGTH) {
          entryStr += `\n  Error: ${lastEntry.error.substring(0, TRUNCATE_SEGMENT_LENGTH)}\n  ... [TRUNCATED] ...\n  ${lastEntry.error.substring(lastEntry.error.length - TRUNCATE_SEGMENT_LENGTH)}`;
        } else {
          entryStr += `\n  Error: ${lastEntry.error}`;
        }
      }
      entryStr += `\n  Exit Code: ${lastEntry.exitCode}`;
      commandText = entryStr;
    }

    // List files in CWD
    let filesInCwdText = 'Could not list files in CWD.';
    let filesList: string[] = [];
    try {
      if (cwd && cwd !== 'N/A') {
        filesList = fs.readdirSync(cwd);
        filesInCwdText =
          filesList.length > 0 ? filesList.join('\n') : 'No files in current directory.';
        if (filesInCwdText.length > 2000) {
          // Truncate if too long
          filesInCwdText = filesInCwdText.substring(0, 1997) + '...';
        }
      }
    } catch (e: any) {
      logger.warn(`[shellProvider] Error listing files in CWD (${cwd}): ${e.message}`);
      filesInCwdText = `Error listing files: ${e.message}`;
    }

    const text = `Current Directory: ${cwd}\n\n${addHeader('# Files in Current Directory', filesInCwdText)}\n\n${addHeader('# Last Shell Command', commandText)}`;

    return {
      values: {
        lastCommand: commandText,
        currentWorkingDirectory: cwd,
        filesInCwd: filesList, // Added files list to values
      },
      text,
      data: {
        command: lastCommandData, // Store the single command object or null
        cwd,
        filesInCwd: filesList, // Added files list to data
      },
    };
  },
};
