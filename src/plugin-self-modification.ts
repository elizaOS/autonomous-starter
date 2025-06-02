import { type Plugin } from "@elizaos/core";

// Re-export the self-modification plugin
// This wrapper allows us to include the plugin without TypeScript complaining about rootDir
export { selfModificationPlugin } from "./plugin-self-modification/src/index";

// Re-export types for convenience
export type {
  CharacterModification,
  CharacterSnapshot,
  CharacterDiff,
  ModificationOperation,
  ModificationOptions,
  ValidationResult,
} from "./plugin-self-modification/src/types";
