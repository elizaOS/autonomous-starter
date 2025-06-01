import type { Plugin } from "@elizaos/core";
import { EnvManagerService } from "./service";
import { envStatusProvider } from "./providers/envStatus";
import { setEnvVarAction } from "./actions/setEnvVar";
import { generateEnvVarAction } from "./actions/generateEnvVar";

/**
 * Environment Variable Management Plugin
 *
 * This plugin provides comprehensive environment variable management for autonomous agents:
 * - Automatic detection of required environment variables from plugins
 * - Auto-generation of variables that can be created programmatically (keys, secrets, etc.)
 * - User interaction for variables that require manual input (API keys, etc.)
 * - Validation of environment variables to ensure they work correctly
 * - Persistent storage in world metadata following the same pattern as settings
 */
export const envPlugin: Plugin = {
  name: "plugin-env",
  description:
    "Environment variable management with auto-generation and validation capabilities",

  services: [EnvManagerService],

  providers: [envStatusProvider],

  actions: [setEnvVarAction, generateEnvVarAction],

  init: async (config, runtime) => {
    // Initialize the environment manager service
    // The service will automatically scan for required environment variables
    // and set up the initial metadata structure
    // No additional initialization needed as the service handles everything
    // in its start() method
  },
};

export default envPlugin;

// Export types for use by other plugins
export type {
  EnvVarConfig,
  EnvVarMetadata,
  EnvVarUpdate,
  GenerationScript,
  GenerationScriptMetadata,
  ValidationResult,
} from "./types";

// Export utility functions
export {
  canGenerateEnvVar,
  generateScript,
  getGenerationDescription,
} from "./generation";

export { validateEnvVar, validationStrategies } from "./validation";

// Export service for direct access if needed
export { EnvManagerService } from "./service";
