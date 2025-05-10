// run shell command
import {
  type Action, // Added Action import
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  ModelType,
  parseKeyValueXml, // Replace parseJSONObjectFromText with parseKeyValueXml
  composePromptFromState, // Add composePromptFromState
  createUniqueUuid, // Added createUniqueUuid
} from '@elizaos/core';
import { type ShellService } from './service'; // Import ShellService

// XML template for command extraction
const commandExtractionTemplate = `You are an AI assistant that extracts shell commands from user messages.
The user might ask to run a command in natural language.
Your task is to identify the exact shell command to be executed.
For example:
User: "Can you list the files in the current directory?"
Command: "ls -la"
User: "Show me the running processes."
Command: "ps aux"
User: "Change directory to /tmp and then list files."
Command: "cd /tmp && ls -la"
User: "Run the script build.sh"
Command: "./build.sh"

{{providers}}

Extract the command to run.
Return ONLY the command as an XML object with a "command" key, like this:
<response>
  <command>your_extracted_command_here_or_null_if_none</command>
</response>
If no specific command can be confidently extracted, return null for the command value within the <command> tag.`;

// Helper function to extract command from natural language
async function extractCommandFromMessage(
  runtime: IAgentRuntime,
  message: Memory
): Promise<string | null> {
  const messageText = message.content.text;
  if (!messageText) {
    logger.warn('[extractCommandFromMessage] Message text is empty.');
    return null;
  }

  try {
    // Compose state, providers are not strictly necessary for this simple extraction but shown for completeness
    const state = await runtime.composeState(message, []);
    const prompt = composePromptFromState({
      state,
      template: commandExtractionTemplate,
    });

    const resultXml = await runtime.useModel(ModelType.TEXT_SMALL, {
      // Changed to TEXT_SMALL as OBJECT_SMALL implies JSON
      prompt,
    });

    if (!resultXml) {
      logger.warn('[extractCommandFromMessage] Model returned no result.');
      logger.error(
        '[extractCommandFromMessage] No command could be extracted or command was explicitly null.'
      );
      return null;
    }

    const parsedResult = parseKeyValueXml(resultXml);

    if (parsedResult && parsedResult.command && parsedResult.command !== 'null') {
      return parsedResult.command;
    }
    logger.info(
      '[extractCommandFromMessage] No command could be extracted or command was explicitly null.'
    );
    return null;
  } catch (error) {
    logger.error('[extractCommandFromMessage] Error extracting command:', error);
    return null;
  }
}

// Helper function to save execution record to message feed
async function saveExecutionRecord(
  runtime: IAgentRuntime,
  messageContext: Memory, // To get roomId, worldId
  thought: string,
  text: string,
  actions?: string[]
): Promise<void> {
  const memory: Memory = {
    content: {
      text,
      thought,
      actions: actions || ['RUN_SHELL_COMMAND_OUTCOME'], // Using a distinct action for these records
    },
    entityId: createUniqueUuid(runtime, runtime.agentId),
    agentId: runtime.agentId,
    roomId: messageContext.roomId,
    worldId: messageContext.worldId,
  };
  await runtime.createMemory(memory, 'messages');
}

export const runShellCommandAction: Action = {
  name: 'RUN_SHELL_COMMAND',
  similes: ['EXECUTE_SHELL_COMMAND', 'TERMINAL_COMMAND', 'RUN_COMMAND'],
  description:
    'Executes a shell command on the host system and returns its output, error, and exit code. Handles `cd` to change current working directory for the session.',
  validate: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    const shellService = runtime.getService<ShellService>('SHELL' as any);
    if (!shellService) {
      logger.warn('[runShellCommandAction] ShellService not available during validation.');
      return false;
    }
    return true; // Always true if service is available
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    options: { command?: string }, // Allow command to be passed in options
    callback: HandlerCallback,
    _responses?: Memory[]
  ): Promise<void> => {
    const shellService = runtime.getService<ShellService>('SHELL' as any);
    const thoughtForCallback = 'Initial thought before specific outcomes.'; // Placeholder, will be refined
    const textForCallback = 'Processing command...'; // Placeholder

    if (!shellService) {
      const thought = 'ShellService is not available. Cannot execute command.';
      const text = 'I am currently unable to run shell commands.';
      await saveExecutionRecord(runtime, message, thought, text);
      await callback({ thought, text });
      return;
    }

    let commandToRun = options?.command;

    if (!commandToRun) {
      // If command is not in options, try to extract from message content
      if (message.content.text) {
        commandToRun = await extractCommandFromMessage(runtime, message); // Pass the whole message object
      } else if (Array.isArray(message.content.actions) && message.content.actions.length > 1) {
        // Attempt to use the text following the action name if it was passed like ['RUN_SHELL_COMMAND', 'ls -la']
        commandToRun = message.content.actions[1];
      }
    }

    if (!commandToRun) {
      const thought = 'No command was provided or could be extracted from the message.';
      const text = 'What command would you like me to run?';
      await saveExecutionRecord(runtime, message, thought, text);
      await callback({ thought, text });
      return;
    }

    logger.info(`[runShellCommandAction] Extracted command: ${commandToRun}`);

    try {
      const { output, error, exitCode, cwd } = await shellService.executeCommand(commandToRun);
      let responseText = `Command: ${commandToRun}
Exit Code: ${exitCode}
CWD: ${cwd}`;
      if (output) {
        responseText += `
Output:
${output}`;
      }
      if (error) {
        responseText += `
Error:
${error}`;
      }

      const thought = `Executed command: ${commandToRun}. Exit code: ${exitCode}. Output and error (if any) captured.`;
      const finalText = responseText.substring(0, 1800); // Keep response size reasonable
      await saveExecutionRecord(runtime, message, thought, finalText);
      await callback({
        thought,
        text: finalText,
      });
    } catch (e: any) {
      logger.error('[runShellCommandAction] Error executing command via service:', e);
      const thought = 'An unexpected error occurred while trying to execute the shell command.';
      const text = `Error executing command: ${e.message}`;
      await saveExecutionRecord(runtime, message, thought, text);
      await callback({
        thought,
        text,
      });
    }
  },
  examples: [
    [
      { name: 'user', content: { text: 'list files' } },
      {
        name: 'agent',
        content: {
          actions: ['RUN_SHELL_COMMAND'],
          thought: 'The user wants to list files. I should run `ls -la`.',
          text: `Command: ls -la
Exit Code: 0
CWD: /Users/user/project
Output:
total 0
drwxr-xr-x   2 user  staff    64B Jul 18 10:00 .
drwxr-xr-x   5 user  staff   160B Jul 18 09:50 ..`,
        },
      },
    ],
    [
      { name: 'user', content: { text: 'show me running processes' } },
      {
        name: 'agent',
        content: {
          actions: ['RUN_SHELL_COMMAND'],
        },
      },
    ],
    [
      { name: 'user', content: { text: 'cd to /tmp then list files' } },
      {
        name: 'agent',
        content: {
          actions: ['RUN_SHELL_COMMAND'],
        },
      },
    ],
  ],
};

export const clearShellHistoryAction: Action = {
  name: 'CLEAR_SHELL_HISTORY',
  similes: ['RESET_SHELL', 'CLEAR_TERMINAL'],
  description: 'Clears the recorded history of shell commands for the current session.',
  validate: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => {
    const shellService = runtime.getService<ShellService>('SHELL' as any);
    return !!shellService;
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses?: Memory[]
  ): Promise<void> => {
    const shellService = runtime.getService<ShellService>('SHELL' as any);
    if (!shellService) {
      await callback({
        thought: 'ShellService is not available. Cannot clear history.',
        text: 'I am currently unable to clear shell history.',
      });
      return;
    }

    try {
      shellService.clearHistory();
      await callback({
        thought: 'Shell history has been cleared successfully.',
        text: 'Shell command history has been cleared.',
      });
    } catch (e: any) {
      logger.error('[clearShellHistoryAction] Error clearing history:', e);
      await callback({
        thought: 'An unexpected error occurred while trying to clear shell history.',
        text: `Error clearing shell history: ${e.message}`,
      });
    }
  },
  examples: [
    [
      { name: 'user', content: { text: 'clear my shell history' } },
      {
        name: 'agent',
        content: {
          actions: ['CLEAR_SHELL_HISTORY'],
          thought:
            'The user wants to clear the shell history. I will call the clearHistory method.',
          text: 'Shell command history has been cleared.',
        },
      },
    ],
  ],
};
