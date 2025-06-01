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
  type Media, // Added Media type
  ContentType, // Added ContentType import
} from "@elizaos/core";
import { type ShellService } from "./service"; // Import ShellService

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
  message: Memory,
): Promise<string | null> {
  const messageText = message.content.text;
  if (!messageText) {
    logger.warn("[extractCommandFromMessage] Message text is empty.");
    return null;
  }

  // LLM extraction logic remains here
  try {
    const state = await runtime.composeState(message, []);
    const prompt = composePromptFromState({
      state,
      template: commandExtractionTemplate,
    });

    const resultXml = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
    });

    if (!resultXml) {
      logger.warn("[extractCommandFromMessage] Model returned no result.");
      return null;
    }

    const parsedResult = parseKeyValueXml(resultXml);

    if (
      parsedResult &&
      parsedResult.command &&
      parsedResult.command !== "null"
    ) {
      return parsedResult.command;
    }
    logger.info(
      "[extractCommandFromMessage] No command could be extracted or command was explicitly null.",
    );
    return null;
  } catch (error) {
    logger.error(
      "[extractCommandFromMessage] Error extracting command:",
      error,
    );
    return null;
  }
}

// New helper function to quote arguments for shell commands like find and grep
function quoteShellArgs(command: string): string {
  if (!command) return "";

  const commandParts = command.split(" ");
  const commandName = commandParts[0];

  if (commandName !== "find" && commandName !== "grep") {
    return command; // Only apply special quoting for find and grep
  }

  return commandParts
    .map((part, index) => {
      if (index === 0) return part; // Don't quote the command itself
      if (part.startsWith("-")) return part; // Don't quote options

      // Check if part contains wildcards and is not already quoted
      const hasWildcard = ["*", "?", "[", "]"].some((char) =>
        part.includes(char),
      );
      const isQuoted =
        (part.startsWith("'") && part.endsWith("'")) ||
        (part.startsWith('"') && part.endsWith('"'));

      if (hasWildcard && !isQuoted) {
        // Escape single quotes within the part, then wrap the whole part in single quotes
        const escapedPart = part.replace(/'/g, "'\\''"); // Replaces ' with '\''
        return `'${escapedPart}'`;
      }
      return part;
    })
    .join(" ");
}

// Helper function to save execution record to message feed
async function saveExecutionRecord(
  runtime: IAgentRuntime,
  messageContext: Memory, // To get roomId, worldId
  thought: string,
  text: string,
  actions?: string[],
  attachments?: Media[], // Added attachments parameter
): Promise<void> {
  const memory: Memory = {
    id: createUniqueUuid(runtime, `shell-record-${Date.now()}`), // Ensure unique ID for these records
    content: {
      text,
      thought,
      actions: actions || ["RUN_SHELL_COMMAND_OUTCOME"],
      attachments, // Include attachments
    },
    entityId: createUniqueUuid(runtime, runtime.agentId), // This should likely be runtime.agentId if it's the agent's own record
    agentId: runtime.agentId,
    roomId: messageContext.roomId,
    worldId: messageContext.worldId,
    createdAt: Date.now(), // Add createdAt
  };
  await runtime.createMemory(memory, "messages");
}

export const runShellCommandAction: Action = {
  name: "RUN_SHELL_COMMAND",
  similes: ["EXECUTE_SHELL_COMMAND", "TERMINAL_COMMAND", "RUN_COMMAND"],
  description:
    "Executes a shell command on the host system and returns its output, error, and exit code. Handles `cd` to change current working directory for the session.",
  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ): Promise<boolean> => {
    const shellService = runtime.getService<ShellService>("SHELL" as any);
    if (!shellService) {
      logger.warn(
        "[runShellCommandAction] ShellService not available during validation.",
      );
      return false;
    }
    return true; // Always true if service is available
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    options: { command?: string },
    callback: HandlerCallback,
    _responses?: Memory[],
  ): Promise<void> => {
    const shellService = runtime.getService<ShellService>("SHELL" as any);

    if (!shellService) {
      const thought = "ShellService is not available. Cannot execute command.";
      const text = "I am currently unable to run shell commands.";
      // No direct shell output to attach here, so save a simple record
      await saveExecutionRecord(runtime, message, thought, text);
      await callback({ thought, text });
      return;
    }

    let commandToRun = options?.command;

    if (!commandToRun) {
      if (message.content.text) {
        const directCommand = message.content.text.trim();
        const commonShellCommands = [
          "ls",
          "cd",
          "pwd",
          "grep",
          "find",
          "cat",
          "echo",
          "mkdir",
          "rm",
          "mv",
          "cp",
          "chmod",
          "chown",
          "ssh",
          "scp",
          "git",
          "docker",
          "npm",
          "npx",
          "bun",
          "node",
          "python",
          "perl",
          "ruby",
          "bash",
          "zsh",
          "sh",
        ];
        const firstWord = directCommand.split(" ")[0];

        if (
          commonShellCommands.includes(firstWord) ||
          directCommand.startsWith("./") ||
          directCommand.startsWith("/")
        ) {
          commandToRun = directCommand;
        } else {
          commandToRun = await extractCommandFromMessage(runtime, message);
        }
      } else if (
        Array.isArray(message.content.actions) &&
        message.content.actions.length > 1
      ) {
        commandToRun = message.content.actions[1];
      }
    }

    // Apply quoting for wildcards using the new helper function
    if (commandToRun) {
      commandToRun = quoteShellArgs(commandToRun);
    }

    if (!commandToRun) {
      const thought =
        "No command was provided or could be extracted from the message.";
      const text = "What command would you like me to run?";
      await saveExecutionRecord(runtime, message, thought, text);
      await callback({ thought, text });
      return;
    }

    logger.info(`[runShellCommandAction] Extracted command: ${commandToRun}`);

    try {
      const { output, error, exitCode, cwd } =
        await shellService.executeCommand(commandToRun);

      // 1. Package raw output as an attachment
      const attachmentId = createUniqueUuid(
        runtime,
        `shell-output-${Date.now()}`,
      );
      const rawOutputData = {
        command: commandToRun, // Use the potentially quoted command
        exitCode,
        cwd,
        stdout: output,
        stderr: error,
      };

      const shellOutputAttachment: Media = {
        id: attachmentId,
        title: `Shell Output: ${commandToRun.substring(0, 50)}${commandToRun.length > 50 ? "..." : ""}`,
        contentType: ContentType.DOCUMENT, // Changed to ContentType.DOCUMENT
        text: JSON.stringify(rawOutputData, null, 2),
        source: "shell-command-action",
        url: `elizaos://attachment/shell-output/${attachmentId}`, // More specific placeholder URL
      };

      // 2. Generate summary/reflection with LLM
      const summaryPromptTemplate = `The following shell command was executed:
Command: {{command}}
CWD: {{cwd}}
Exit Code: {{exitCode}}
{{#if stdout}}
STDOUT:
\`\`\`
{{stdout}}
\`\`\`
{{/if}}
{{#if stderr}}
STDERR:
\`\`\`
{{stderr}}
\`\`\`
{{/if}}

# Instructions:
Based on the command and its output:
1. Briefly summarize what happened or what was learned in the "text" field (max 2-3 sentences).
2. Provide your internal "thought" process for this summary.
3. If the command was successful and produced useful output, or if it failed in an informative way, mention that the full details are in an attachment. If the command was trivial (e.g., a simple 'cd' with no error) or the output was empty and uninformative, you don't need to mention the attachment.

Respond using XML format:
<response>
  <thought>Your internal thought process.</thought>
  <text>Your summary of the command outcome.</text>
</response>`;

      const summaryState = {
        command: commandToRun, // Use the potentially quoted command
        cwd,
        exitCode,
        stdout: output.substring(0, 300000), // Cap stdout for the prompt
        stderr: error?.substring(0, 300000), // Cap stderr for the prompt
      };

      const llmPrompt = composePromptFromState({
        state: { values: summaryState, data: {}, text: "" }, // Adapt to how composePromptFromState expects state
        template: summaryPromptTemplate,
      });

      const llmResponseXml = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: llmPrompt,
      });
      const parsedLlmResponse = parseKeyValueXml(llmResponseXml);

      const summaryThought =
        parsedLlmResponse?.thought ||
        `Analyzed output of command: ${commandToRun}`;
      let summaryText =
        parsedLlmResponse?.text || `Command "${commandToRun}" executed.`;

      // Conditionally mention the attachment
      const wasInformative =
        (output && output.trim() !== "") || (error && error.trim() !== "");
      if (wasInformative) {
        summaryText += " (Full output stored as an attachment.)";
      }

      // 3. Create the main reflection/summary message
      await saveExecutionRecord(
        runtime,
        message,
        summaryThought,
        summaryText,
        ["RUN_SHELL_COMMAND_OUTCOME"], // Or a more specific action if needed
        [shellOutputAttachment], // Attach the shell output
      );

      // 4. Callback with the summary
      await callback({
        thought: summaryThought,
        text: summaryText,
        attachments: [shellOutputAttachment], // Also include in callback if frontend can use it
      });
    } catch (e: any) {
      logger.error(
        "[runShellCommandAction] Error executing command or processing output:",
        e,
      );
      const thought =
        "An unexpected error occurred while trying to execute or summarize the shell command.";
      const text = `Error during shell command execution: ${e.message}`;
      await saveExecutionRecord(runtime, message, thought, text);
      await callback({ thought, text });
    }
  },
  examples: [
    [
      { name: "user", content: { text: "list files" } },
      {
        name: "agent",
        content: {
          actions: ["RUN_SHELL_COMMAND_OUTCOME"], // This action is now the result of the summary
          thought:
            "The user wanted to list files. I ran `ls -la` and summarized the output.",
          text: "Listed files in /Users/user/project. (Full output stored as an attachment.)",
          // attachments: [ { id: '...', title: 'Shell Output: ls -la', ...} ] // Example of what might be here
        },
      },
    ],
    [
      { name: "user", content: { text: "show me running processes" } },
      {
        name: "agent",
        content: {
          actions: ["RUN_SHELL_COMMAND"],
        },
      },
    ],
    [
      { name: "user", content: { text: "cd to /tmp then list files" } },
      {
        name: "agent",
        content: {
          actions: ["RUN_SHELL_COMMAND"],
        },
      },
    ],
  ],
};

export const clearShellHistoryAction: Action = {
  name: "CLEAR_SHELL_HISTORY",
  similes: ["RESET_SHELL", "CLEAR_TERMINAL"],
  description:
    "Clears the recorded history of shell commands for the current session.",
  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ): Promise<boolean> => {
    const shellService = runtime.getService<ShellService>("SHELL" as any);
    return !!shellService;
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses?: Memory[],
  ): Promise<void> => {
    const shellService = runtime.getService<ShellService>("SHELL" as any);
    if (!shellService) {
      await callback({
        thought: "ShellService is not available. Cannot clear history.",
        text: "I am currently unable to clear shell history.",
      });
      return;
    }

    try {
      shellService.clearHistory();
      await callback({
        thought: "Shell history has been cleared successfully.",
        text: "Shell command history has been cleared.",
      });
    } catch (e: any) {
      logger.error("[clearShellHistoryAction] Error clearing history:", e);
      await callback({
        thought:
          "An unexpected error occurred while trying to clear shell history.",
        text: `Error clearing shell history: ${e.message}`,
      });
    }
  },
  examples: [
    [
      { name: "user", content: { text: "clear my shell history" } },
      {
        name: "agent",
        content: {
          actions: ["CLEAR_SHELL_HISTORY"],
          thought:
            "The user wants to clear the shell history. I will call the clearHistory method.",
          text: "Shell command history has been cleared.",
        },
      },
    ],
  ],
};

export const killAutonomousAction: Action = {
  name: "KILL_AUTONOMOUS",
  similes: ["STOP_AUTONOMOUS", "HALT_AUTONOMOUS", "KILL_AUTO_LOOP"],
  description: "Stops the autonomous agent loop for debugging purposes.",
  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ): Promise<boolean> => {
    // Always allow this action for debugging
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses?: Memory[],
  ): Promise<void> => {
    try {
      // Try to get the autonomous service and stop it
      const autonomousService = runtime.getService("AUTONOMOUS" as any);

      if (autonomousService && "stop" in autonomousService) {
        await (autonomousService as any).stop();

        const thought = "Successfully stopped the autonomous agent loop.";
        const text =
          "Autonomous loop has been killed. The agent will no longer run autonomously until restarted.";

        await saveExecutionRecord(runtime, message, thought, text, [
          "KILL_AUTONOMOUS",
        ]);
        await callback({ thought, text });
      } else {
        const thought = "Autonomous service not found or already stopped.";
        const text =
          "No autonomous loop was running or the service could not be found.";

        await saveExecutionRecord(runtime, message, thought, text, [
          "KILL_AUTONOMOUS",
        ]);
        await callback({ thought, text });
      }
    } catch (error: any) {
      logger.error(
        "[killAutonomousAction] Error stopping autonomous service:",
        error,
      );

      const thought =
        "An error occurred while trying to stop the autonomous loop.";
      const text = `Error stopping autonomous loop: ${error.message}`;

      await saveExecutionRecord(runtime, message, thought, text, [
        "KILL_AUTONOMOUS",
      ]);
      await callback({ thought, text });
    }
  },
  examples: [
    [
      { name: "user", content: { text: "kill the autonomous loop" } },
      {
        name: "agent",
        content: {
          actions: ["KILL_AUTONOMOUS"],
          thought:
            "The user wants to stop the autonomous agent loop for debugging.",
          text: "Autonomous loop has been killed. The agent will no longer run autonomously until restarted.",
        },
      },
    ],
    [
      { name: "user", content: { text: "stop autonomous mode" } },
      {
        name: "agent",
        content: {
          actions: ["KILL_AUTONOMOUS"],
        },
      },
    ],
  ],
};
