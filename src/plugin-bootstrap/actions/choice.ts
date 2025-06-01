import {
  type Action,
  type ActionExample,
  composePrompt,
  composePromptFromState,
  getUserServerRole,
  type HandlerCallback,
  type IAgentRuntime,
  logger,
  type Memory,
  ModelType,
  parseJSONObjectFromText,
  parseKeyValueXml,
  type State,
  type UUID,
} from "@elizaos/core";

/**
 * Task: Extract selected task and option from user message
 *
 * Available Tasks:
 * {{#each tasks}}
 * Task ID: {{taskId}} - {{name}}
 * Available options:
 * {{#each options}}
 * - {{name}}: {{description}}
 * {{/each}}
 * - ABORT: Cancel this task
 * {{/each}}
 *
 * Recent Messages:
 * {{recentMessages}}
 *
 * Instructions:
 * 1. Review the user's message and identify which task and option they are selecting
 * 2. Match against the available tasks and their options, including ABORT
 * 3. Return the task ID (shortened UUID) and selected option name exactly as listed above
 * 4. If no clear selection is made, return null for both fields
 *
 * Return in JSON format:
 * ```json
 * {
 *   "taskId": "string" | null,
 *   "selectedOption": "OPTION_NAME" | null
 * }
 * ```
 *
 * Make sure to include the ```json``` tags around the JSON object.
 */
const optionExtractionTemplate = `# Task: Extract selected task and option from user message

# Recent Messages:
{{recentMessages}}

# Available Tasks:
{{#each tasks}}
Task ID: {{taskId}} - {{name}}
Available options:
{{#each options}}
- {{name}}: {{description}}
{{/each}}
- ABORT: Cancel this task

{{/each}}
# Instructions:
1. Review the user's message and identify which task and option they are selecting.
2. Match against the available tasks and their options, including ABORT.
3. Return the task ID (shortened UUID) and selected option name exactly as listed above.
4. If no clear selection is made, return null or empty strings for both fields.

Return an XML response like this:
<response>
  <taskId>string | null</taskId>
  <selectedOption>OPTION_NAME | null</selectedOption>
</response>

Your response MUST ONLY include the <response> XML block.
`;

/**
 * Represents an action that allows selecting an option for a pending task that has multiple options.
 * @type {Action}
 * @property {string} name - The name of the action
 * @property {string[]} similes - Similar words or phrases for the action
 * @property {string} description - A brief description of the action
 * @property {Function} validate - Asynchronous function to validate the action
 * @property {Function} handler - Asynchronous function to handle the action
 * @property {ActionExample[][]} examples - Examples demonstrating the usage of the action
 */
export const choiceAction: Action = {
  name: "CHOOSE_OPTION",
  similes: ["SELECT_OPTION", "SELECT", "PICK", "CHOOSE"],
  description: "Selects an option for a pending task that has multiple options",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
  ): Promise<boolean> => {
    // Get all tasks tagged AWAITING_CHOICE
    const pendingTasks = await runtime.getTasks({
      roomId: message.roomId,
      tags: ["AWAITING_CHOICE"],
    });

    // Filter for tasks that actually have options defined in metadata
    const tasksWithOptions =
      pendingTasks?.filter((task) => task.metadata?.options) || [];

    // If no tasks are actually awaiting a choice with options, fail validation
    if (tasksWithOptions.length === 0) {
      return false;
    }

    // --- Role Check Modification ---
    // Check if ANY of the pending tasks are TODO confirmations
    const isTodoConfirmationPending = tasksWithOptions.some(
      (task) =>
        task.tags?.includes("todo_confirmation") ||
        task.tags?.includes("todo_update") ||
        task.tags?.includes("todo_cancellation"),
    );

    // If it IS a TODO confirmation, allow any user (skip role check)
    // --- End Role Check Modification ---

    // If we passed the checks (task exists, role is ok or skipped), validation passes
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback: HandlerCallback,
    responses: Memory[],
  ): Promise<void> => {
    logger.info(
      `[choiceAction] Handler started for message: "${message.content.text}"`,
    );
    try {
      const pendingTasks = await runtime.getTasks({
        roomId: message.roomId,
        tags: ["AWAITING_CHOICE"],
      });

      if (!pendingTasks?.length) {
        // This case should ideally be caught by validate, but double-check
        logger.warn(
          "[choiceAction] No pending tasks found in handler, though validation passed.",
        );
        await callback({
          text: "I don't see any pending choices right now.",
          actions: ["NONE"],
          source: message.content.source,
        });
        return;
      }

      const tasksWithOptions = pendingTasks.filter(
        (task) => task.metadata?.options,
      );

      if (!tasksWithOptions.length) {
        logger.warn(
          "[choiceAction] Pending tasks found, but none have options metadata.",
        );
        await callback({
          text: "I found pending tasks, but none seem to have options to choose from.",
          actions: ["NONE"],
          source: message.content.source,
        });
        return;
      }
      logger.debug(
        `[choiceAction] Found ${tasksWithOptions.length} tasks with options.`,
      );

      let taskId: string | null = null;
      let selectedOption: string | null = null;
      let targetTaskFullId: UUID | null = null;

      // --- Smarter Extraction Logic ---
      if (tasksWithOptions.length === 1) {
        // --- Case 1: Only one pending task ---
        const singleTask = tasksWithOptions[0];
        targetTaskFullId = singleTask.id; // We know the full ID
        const availableOptions = (
          (singleTask.metadata.options as any[]) || []
        ).map((opt) =>
          typeof opt === "string"
            ? { name: opt, description: opt }
            : { name: opt.name, description: opt.description || opt.name },
        );
        availableOptions.push({
          name: "ABORT",
          description: "Cancel this task",
        }); // Add ABORT

        const simplePrompt = `# Task: Extract selected option for task \"${singleTask.name}\"

## User Message:
${message.content.text}

## Available Options for this task:
${availableOptions.map((opt) => `- ${opt.name}: ${opt.description}`).join("\n")}

# Instructions:
1. Review the user's message.
2. Determine which of the Available Options the user selected (match name exactly).
3. If no clear option is selected, return null or an empty string.

Return an XML response like this:
<response>
  <selectedOption>OPTION_NAME | null</selectedOption>
</response>

Your response MUST ONLY include the <response> XML block.`;

        logger.debug(
          "[choiceAction] Using simple prompt for single task:",
          simplePrompt,
        );
        const result = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt: simplePrompt,
          stopSequences: [],
        });
        const parsed = parseKeyValueXml(result);
        logger.debug("[choiceAction] Simple XML Parsing Result:", parsed);
        if (parsed && parsed.selectedOption) {
          selectedOption = parsed.selectedOption;
          // We already know the targetTaskFullId
        } else {
          logger.warn(
            "[choiceAction] Failed to extract option even for single task.",
          );
        }
      } else {
        // --- Case 2: Multiple pending tasks (Original Logic) ---
        const formattedTasks = tasksWithOptions
          .map((task) => {
            try {
              // Add try-catch for safety
              const shortId = (task.id as string).substring(0, 8);
              const optionsMeta = (task.metadata?.options as any[]) || []; // Safer access

              return {
                taskId: shortId,
                fullId: task.id,
                name: task.name,
                options: optionsMeta.map((opt) => ({
                  name: typeof opt === "string" ? opt : opt.name,
                  description:
                    typeof opt === "string" ? opt : opt.description || opt.name,
                })),
              };
            } catch (mapError) {
              logger.error(
                `[choiceAction] Error formatting task ${task?.id}:`,
                mapError,
              );
              return null; // Return null for failed tasks
            }
          })
          .filter(Boolean); // Filter out any nulls from errors

        logger.debug(`[choiceAction] Formatted tasks object:`, formattedTasks);

        const prompt = composePromptFromState({
          state: {
            values: {
              tasks: formattedTasks,
              recentMessages: message.content.text,
            },
            data: {},
            text: message.content.text,
          },
          template: optionExtractionTemplate,
        });

        const result = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt,
          stopSequences: [],
        });

        const parsed = parseKeyValueXml(result);
        logger.debug("[choiceAction] Multi-task XML Parsing Result:", parsed);

        if (parsed && parsed.taskId && parsed.selectedOption) {
          // Find the task by matching the shortened UUID
          const taskMap = new Map(
            formattedTasks.map((task) => [task.taskId, task]),
          );
          const taskInfo = taskMap.get(parsed.taskId);
          if (taskInfo) {
            taskId = parsed.taskId; // Short ID from parse
            selectedOption = parsed.selectedOption;
            targetTaskFullId = taskInfo.fullId; // Get full ID from map
          } else {
            logger.warn(
              `[choiceAction] Could not find task matching parsed shortId: ${parsed.taskId}`,
            );
          }
        } else {
          logger.warn(
            "[choiceAction] Failed to parse valid taskId and selectedOption from multi-task XML response.",
          );
        }
      }
      // --- End Smarter Extraction Logic ---

      // --- Proceed if we have a selection and a target task ---
      if (targetTaskFullId && selectedOption) {
        logger.debug(
          `[choiceAction] Proceeding - TaskId: ${targetTaskFullId}, Option: ${selectedOption}`,
        );

        // Find the actual task object using the full ID
        const selectedTask = tasksWithOptions.find(
          (task) => task.id === targetTaskFullId,
        );

        if (!selectedTask) {
          // Should not happen if targetTaskFullId is set, but check anyway
          logger.error(
            `[choiceAction] Internal error: Could not re-find task with full ID ${targetTaskFullId}`,
          );
          await callback({
            text: "An internal error occurred. Please try again.",
            actions: ["SELECT_OPTION_ERROR"],
            source: message.content.source,
          });
          return;
        }

        if (selectedOption === "ABORT") {
          await runtime.deleteTask(selectedTask.id);
          await callback({
            text: `Task "${selectedTask.name}" has been cancelled.`,
            actions: ["CHOOSE_OPTION_CANCELLED"],
            source: message.content.source,
          });
          return;
        }

        // --- Update Task for Specific Handler Worker ---
        const originalAction = selectedTask.metadata?.originalAction as string;
        const originalMetadata = { ...selectedTask.metadata }; // Copy metadata
        logger.debug(
          `[choiceAction] Original Action: ${originalAction}`,
          originalMetadata,
        ); // Log original action and metadata

        if (!originalAction) {
          logger.error(
            `Task ${selectedTask.id} is awaiting choice but missing originalAction metadata.`,
          );
          await callback({
            text: "Error: Could not determine the original action for this choice.",
            actions: ["SELECT_OPTION_ERROR"],
            source: message.content.source,
          });
          return;
        }

        // Determine the target handler worker name based on the original action
        let handlerWorkerName = "";
        switch (originalAction) {
          case "CREATE_TODO":
            handlerWorkerName = "HANDLE_TODO_CREATION_CONFIRM";
            break;
          case "UPDATE_TODO":
            handlerWorkerName = "HANDLE_TODO_UPDATE_CONFIRM";
            break;
          case "CANCEL_TODO":
            handlerWorkerName = "HANDLE_TODO_CANCELLATION_CONFIRM";
            break;
          // Add cases for other actions that use this confirmation flow
          case "TWITTER_POST": // Example if twitter post uses this too
            // Assuming the twitter post task is named 'Confirm Twitter Post'
            // We might need a different approach if it registers its own worker directly.
            // For now, let's assume it needs a handler worker if it followed this pattern.
            handlerWorkerName = "HANDLE_TWITTER_POST_CONFIRM";
            break;
          default:
            logger.error(
              `No handler worker defined for originalAction: ${originalAction}`,
            );
            await callback({
              text: `Error: Cannot process choice for action type ${originalAction}.`,
              actions: ["SELECT_OPTION_ERROR"],
              source: message.content.source,
            });
            return;
        }

        logger.debug(
          `[choiceAction] Determined handler worker name: ${handlerWorkerName}`,
        ); // Log worker name determination

        // Update the task: change name, remove AWAITING_CHOICE, add selected option to metadata
        const updatedTags = (selectedTask.tags || []).filter(
          (tag) => tag !== "AWAITING_CHOICE",
        );
        updatedTags.push("CHOICE_MADE"); // Optional: Indicate choice was processed

        const updatedMetadata = {
          ...originalMetadata,
          selectedOption: selectedOption, // Store the user's choice
        };

        try {
          await runtime.updateTask(selectedTask.id, {
            name: handlerWorkerName, // Rename task to trigger the correct worker
            tags: updatedTags,
            metadata: updatedMetadata,
          });
          logger.info(
            `[choiceAction] Successfully updated task ${selectedTask.id} to trigger worker ${handlerWorkerName} with option ${selectedOption}`,
          ); // Log success

          // Optionally provide immediate feedback, or let the handler worker provide it.
          // A simple acknowledgement might be good here.
          await callback({
            text: `Got it. Processing your choice: ${selectedOption}`,
            actions: ["CHOOSE_OPTION_PROCESSING"], // New action status
            source: message.content.source,
          });
        } catch (updateError) {
          logger.error(
            `[choiceAction] Failed to update task ${selectedTask.id} to trigger handler:`,
            updateError,
          ); // Log update error
          await callback({
            text: "Sorry, there was an error recording your choice. Please try again.",
            actions: ["SELECT_OPTION_ERROR"],
            source: message.content.source,
          });
        }
      } else {
        // Fallback: If no valid selection could be determined after trying single/multi prompts
        logger.warn(
          "[choiceAction] No valid selection determined. Listing options.",
        );
        let optionsText =
          "Please select a valid option from one of these tasks:\n\n";
        tasksWithOptions.forEach((task) => {
          const shortId = task.id.substring(0, 8);
          optionsText += `**${task.name}** (ID: ${shortId}):\n`;
          const options = ((task.metadata.options as any[]) || []).map(
            (opt: any) => (typeof opt === "string" ? opt : opt.name),
          );
          options.push("ABORT");
          optionsText += options.map((opt: any) => `- ${opt}`).join("\n");
          optionsText += "\n\n";
        });
        await callback({
          text: optionsText,
          actions: ["SELECT_OPTION_INVALID"],
          source: message.content.source,
        });
      }
    } catch (error) {
      logger.error("Error in select option handler:", error);
      await callback({
        text: "There was an error processing the option selection.",
        actions: ["SELECT_OPTION_ERROR"],
        source: message.content.source,
      });
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "post",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Selected option: post for task: Confirm Twitter Post",
          actions: ["CHOOSE_OPTION"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "I choose cancel",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Selected option: cancel for task: Confirm Twitter Post",
          actions: ["CHOOSE_OPTION"],
        },
      },
    ],
  ] as ActionExample[][],
};

export default choiceAction;
