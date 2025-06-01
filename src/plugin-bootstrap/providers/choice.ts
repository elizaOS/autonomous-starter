import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
} from "@elizaos/core";
import { logger } from "@elizaos/core";

// Define an interface for option objects
/**
 * Interface for an object representing an option.
 * @typedef {Object} OptionObject
 * @property {string} name - The name of the option.
 * @property {string} [description] - The description of the option (optional).
 */
interface OptionObject {
  name: string;
  description?: string;
}

/**
 * Choice provider function that retrieves all pending tasks with options for a specific room
 *
 * @param {IAgentRuntime} runtime - The runtime object for the agent
 * @param {Memory} message - The message memory object
 * @returns {Promise<ProviderResult>} A promise that resolves with the provider result containing the pending tasks with options
 */
export const choiceProvider: Provider = {
  name: "CHOICE",
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<ProviderResult> => {
    // Get all pending tasks for this room with options
    const pendingTasks = await runtime.getTasks({
      roomId: message.roomId,
      tags: ["AWAITING_CHOICE"],
    });

    if (!pendingTasks || pendingTasks.length === 0) {
      return {
        data: {
          tasks: [],
        },
        values: {
          tasks: "No pending choices for the moment.",
        },
        text: "No pending choices for the moment.",
      };
    }

    // Filter tasks that have options
    const tasksWithOptions = pendingTasks.filter(
      (task) => task.metadata?.options,
    );

    if (tasksWithOptions.length === 0) {
      return {
        data: {
          tasks: [],
        },
        values: {
          tasks: "No pending choices for the moment.",
        },
        text: "No pending choices for the moment.",
      };
    }
    // Format tasks into a readable list
    let output = "# Pending Tasks\n\n";
    output += "The following tasks are awaiting your selection:\n\n";

    tasksWithOptions.forEach((task, index) => {
      output += `${index + 1}. **${task.name}**\n`;
      if (task.description) {
        output += `   ${task.description}\n`;
      }

      // List available options
      if (task.metadata?.options) {
        output += "   Options:\n";

        const options = task.metadata.options as Array<string | OptionObject>; // Type assertion

        if (options.every((opt) => typeof opt === "string")) {
          (options as string[]).forEach((optionName) => {
            output += `   - \`${optionName}\`\n`; // Just list string option
          });
        } else if (
          options.every(
            (opt) => typeof opt === "object" && opt !== null && "name" in opt,
          )
        ) {
          (options as OptionObject[]).forEach((optionObj) => {
            output += `   - \`${optionObj.name}\` ${optionObj.description ? `- ${optionObj.description}` : ""}\n`;
          });
        } else {
          // Handle mixed or unexpected format - log error or provide generic message
          logger.warn(
            `[choiceProvider] Task ${task.id} has options in an unexpected format.`,
          );
          output += `   - Options format unclear for this task.\n`;
        }
      }
      output += "\n";
    });

    output +=
      "To select an option, reply with the option name (e.g., 'post' or 'cancel').\n";

    return {
      data: {
        tasks: tasksWithOptions,
      },
      values: {
        tasks: output,
      },
      text: output,
    };
  },
};

export default choiceProvider;
