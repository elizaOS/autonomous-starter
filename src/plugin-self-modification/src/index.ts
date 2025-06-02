import { type Plugin } from "@elizaos/core";
import { CharacterModificationService } from "./services/character-modification-service";
import {
  characterStateProvider,
  characterDiffProvider,
} from "./providers/character-state-provider";
import {
  modifyCharacterAction,
  viewCharacterHistoryAction,
  rollbackCharacterAction,
} from "./actions/modify-character-action";
import { characterEvolutionEvaluator } from "./evaluators/character-evolution-evaluator";

// Export types for external use
export * from "./types";

// Export individual components
export { CharacterModificationService };
export {
  characterStateProvider,
  characterDiffProvider,
  modifyCharacterAction,
  viewCharacterHistoryAction,
  rollbackCharacterAction,
  characterEvolutionEvaluator,
};

export const selfModificationPlugin: Plugin = {
  name: "self-modification",
  description:
    "Enables agents to modify their own character through reflection and self-learning",

  services: [CharacterModificationService],

  providers: [characterStateProvider, characterDiffProvider],

  actions: [
    modifyCharacterAction,
    viewCharacterHistoryAction,
    rollbackCharacterAction,
  ],

  evaluators: [characterEvolutionEvaluator],
};

export default selfModificationPlugin;
