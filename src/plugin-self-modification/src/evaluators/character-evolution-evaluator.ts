import {
  type Evaluator,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  ModelType,
  composePromptFromState,
} from "@elizaos/core";
import { CharacterModificationService } from "../services/character-modification-service";

const evolutionAnalysisTemplate = `Analyze the recent conversation and determine if the agent's character should evolve based on what was learned.

Current character state:
{{characterState}}

Recent conversation:
{{recentMessages}}

Consider:
1. Are there new topics or interests that emerged?
2. Did the conversation reveal areas where the character could improve?
3. Were there communication patterns that worked particularly well?
4. Did the user express preferences about interaction style?

Respond with whether character evolution is recommended and why.`;

export const characterEvolutionEvaluator: Evaluator = {
  name: "characterEvolution",
  description:
    "Analyzes conversations to determine if character should evolve",

  validate: async (runtime: IAgentRuntime) => {
    const modService = runtime.getService(
      CharacterModificationService.serviceName,
    );
    return modService !== null;
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const modService = runtime.getService(
      CharacterModificationService.serviceName,
    ) as CharacterModificationService;

    if (!modService) {
      logger.warn("Character modification service not available");
      return;
    }

    // Check if conversation had enough substance
    const recentMessages = await runtime.getMemories({
      roomId: message.roomId,
      count: 10,
      tableName: "messages",
    });
    
    if (!recentMessages || recentMessages.length < 5) {
      logger.debug("Not enough messages for evolution analysis");
      return;
    }

    try {
      // Compose the prompt with state values
      const prompt = composePromptFromState({
        state: {
          values: {
            characterState: JSON.stringify(runtime.character),
            recentMessages: recentMessages
              .map((m) => `${m.entityId}: ${m.content.text}`)
              .join("\n"),
          },
          data: {},
          text: "",
        },
        template: evolutionAnalysisTemplate,
      });

      const analysis = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt,
      });

      // Simple heuristic: if the analysis mentions "recommend", "should", "evolve", etc.
      const shouldEvolve =
        analysis &&
        (analysis.toLowerCase().includes("recommend") ||
          analysis.toLowerCase().includes("should evolve") ||
          analysis.toLowerCase().includes("would benefit"));

      if (shouldEvolve) {
        logger.info("Character evolution recommended based on conversation");

        // Create a task for character modification instead of directly calling processActions
        await runtime.createTask({
          name: "modifyCharacter",
          description: "Modify character based on recent conversation insights",
          tags: ["character-evolution", "auto-triggered"],
          metadata: {
            focusAreas: "recent conversation insights",
            autoTrigger: true,
            conversationId: message.roomId,
          },
          roomId: message.roomId,
        });
      }
    } catch (error) {
      logger.error("Error in character evolution evaluator:", error);
    }
  },

  examples: [],
};
