import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  ModelType,
  composePromptFromState,
} from "@elizaos/core";
import { ModelClass } from "../types";
import { z } from "zod";
import { CharacterModificationService } from "../services/character-modification-service";

const modifyCharacterTemplate = `You are reflecting on your recent interactions and considering updates to your personality and knowledge.

Current character state:
{{characterState}}

Recent conversations and context:
{{recentMessages}}

Based on these interactions and your current state, generate an XML diff to update your character. Focus on:
- New topics or interests that have emerged from conversations
- Refinements to your communication style based on what works well
- Additional biographical details or lore that enrich your personality
- Adjustments to better serve and connect with users

{{#if focusAreas}}
Focus specifically on these areas: {{focusAreas}}
{{/if}}

Guidelines for modifications:
{{characterDiff}}

Generate ONLY the XML diff, no other text or explanation:`;

export const modifyCharacterAction: Action = {
  name: "modifyCharacter",
  description:
    "Reflect on recent interactions and modify own character/personality",

  similes: [
    "update my personality",
    "modify my character",
    "evolve my personality",
    "adapt my behavior",
    "learn from our conversations",
    "update my knowledge about myself",
    "refine my communication style",
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const modService = runtime.getService(
      CharacterModificationService.serviceName,
    );
    return modService !== null;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback,
  ): Promise<boolean> => {
    try {
      const modService = runtime.getService(
        CharacterModificationService.serviceName,
      ) as CharacterModificationService;

      if (!modService) {
        callback?.({
          text: "Character modification service is not available.",
          action: "MODIFICATION_FAILED",
        });
        return false;
      }

      // Compose the prompt with state values
      const prompt = composePromptFromState({
        state: {
          values: {
            characterState: state.characterState || "",
            recentMessages: state.recentMessages || "",
            focusAreas: options?.focusAreas || "",
            characterDiff: state.characterDiff || "",
          },
          data: {},
          text: "",
        },
        template: modifyCharacterTemplate,
      });

      // Use runtime.useModel with ModelType
      const diffResponse = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
      });

      if (!diffResponse) {
        callback?.({
          text: "Failed to generate character modifications.",
          action: "MODIFICATION_FAILED",
        });
        return false;
      }

      // Extract XML from response
      const xmlMatch = diffResponse.match(
        /<character-modification>[\s\S]*<\/character-modification>/,
      );
      if (!xmlMatch) {
        callback?.({
          text: "Failed to generate valid modification XML.",
          action: "MODIFICATION_FAILED",
        });
        return false;
      }

      const diffXml = xmlMatch[0];

      // Apply the modifications
      const result = await modService.applyCharacterDiff(diffXml, {
        focusAreas: options?.focusAreas,
        maxChanges: options?.maxChanges || 10,
        preserveCore: true,
      });

      if (result.success) {
        const response = `Successfully updated my character:
- Applied ${result.appliedChanges} modifications
- Current version: ${modService.getCurrentVersion()}
${result.warnings && result.warnings.length > 0 ? `\nWarnings: ${result.warnings.join(", ")}` : ""}

The changes will help me better understand and communicate based on our recent interactions.`;

        callback?.({
          text: response,
          action: "CHARACTER_MODIFIED",
          data: {
            version: modService.getCurrentVersion(),
            changes: result.appliedChanges,
          },
        });

        return true;
      } else {
        callback?.({
          text: `Failed to apply character modifications: ${result.errors?.join(", ")}`,
          action: "MODIFICATION_FAILED",
        });
        return false;
      }
    } catch (error) {
      logger.error("Error in modifyCharacter action:", error);
      callback?.({
        text: `An error occurred while modifying character: ${error.message}`,
        action: "ERROR",
      });
      return false;
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "You should update your personality based on our conversations about philosophy",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "I'll reflect on our philosophical discussions and update my character accordingly.",
          action: "modifyCharacter",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: {
          text: "Can you evolve your personality to be more helpful with technical topics?",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "I'll analyze our interactions and adapt my personality to better assist with technical subjects.",
          action: "modifyCharacter",
        },
      },
    ],
  ],
};

// Additional actions for character management

export const viewCharacterHistoryAction: Action = {
  name: "viewCharacterHistory",
  description: "View the history of character modifications",

  similes: [
    "show character history",
    "view my evolution",
    "list personality changes",
  ],

  validate: async (runtime: IAgentRuntime) => {
    const modService = runtime.getService(
      CharacterModificationService.serviceName,
    );
    return modService !== null;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback,
  ): Promise<boolean> => {
    const modService = runtime.getService(
      CharacterModificationService.serviceName,
    ) as CharacterModificationService;

    if (!modService) {
      callback?.({
        text: "Character modification service is not available.",
        action: "HISTORY_FAILED",
      });
      return false;
    }

    const history = modService.getCharacterHistory();
    const current = modService.getCurrentVersion();

    if (history.length === 0) {
      callback?.({
        text: "No character modifications have been made yet.",
        action: "NO_HISTORY",
      });
      return true;
    }

    const historyText = history
      .slice(-10)
      .map(
        (h) =>
          `Version ${h.versionNumber}: ${h.reasoning} (${h.appliedAt.toISOString()})`,
      )
      .join("\n");

    callback?.({
      text: `Character Modification History (Current Version: ${current}):\n\n${historyText}`,
      action: "HISTORY_DISPLAYED",
    });

    return true;
  },

  examples: [],
};

export const rollbackCharacterAction: Action = {
  name: "rollbackCharacter",
  description: "Rollback character to a previous version",

  similes: [
    "revert character",
    "undo personality changes",
    "restore previous version",
  ],

  validate: async (runtime: IAgentRuntime) => {
    const modService = runtime.getService(
      CharacterModificationService.serviceName,
    );
    return modService !== null;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback,
  ): Promise<boolean> => {
    const modService = runtime.getService(
      CharacterModificationService.serviceName,
    ) as CharacterModificationService;

    if (!modService) {
      callback?.({
        text: "Character modification service is not available.",
        action: "ROLLBACK_FAILED",
      });
      return false;
    }

    const { versionId } = options;
    const success = await modService.rollbackCharacter(versionId);

    if (success) {
      callback?.({
        text: `Successfully rolled back character to version ${versionId}`,
        action: "CHARACTER_ROLLED_BACK",
      });
      return true;
    } else {
      callback?.({
        text: `Failed to rollback character to version ${versionId}`,
        action: "ROLLBACK_FAILED",
      });
      return false;
    }
  },

  examples: [],
};
