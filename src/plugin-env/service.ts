import { logger, Service, type IAgentRuntime, type UUID } from "@elizaos/core";
import type {
  EnvVarMetadata,
  GenerationScriptMetadata,
  EnvVarConfig,
} from "./types";
import { canGenerateEnvVar } from "./generation";

/**
 * Environment Manager Service for handling environment variable configuration
 * Follows the same pattern as TaskService and other services in the codebase
 */
export class EnvManagerService extends Service {
  static serviceType = "ENV_MANAGER";
  capabilityDescription =
    "The agent can manage environment variables for plugins, including auto-generation and validation";

  /**
   * Start the EnvManagerService with the given runtime
   */
  static async start(runtime: IAgentRuntime): Promise<EnvManagerService> {
    const service = new EnvManagerService(runtime);
    await service.initialize();
    return service;
  }

  /**
   * Initialize the service and scan for required environment variables
   */
  async initialize(): Promise<void> {
    logger.info("[EnvManager] Initializing Environment Manager Service");
    await this.scanPluginRequirements();
  }

  /**
   * Scan all loaded plugins for required environment variables
   */
  async scanPluginRequirements(): Promise<void> {
    try {
      const worldId = this.runtime.getSetting("WORLD_ID") as UUID;
      if (!worldId) {
        logger.warn(
          "[EnvManager] No WORLD_ID found, cannot scan plugin requirements",
        );
        return;
      }

      const world = await this.runtime.getWorld(worldId);
      if (!world) {
        logger.warn(
          "[EnvManager] World not found, cannot scan plugin requirements",
        );
        return;
      }

      // Initialize metadata if it doesn't exist
      if (!world.metadata) {
        world.metadata = {};
      }
      if (!world.metadata.envVars) {
        world.metadata.envVars = {} as EnvVarMetadata;
      }
      if (!world.metadata.generationScripts) {
        world.metadata.generationScripts = {} as GenerationScriptMetadata;
      }

      // Scan character plugins for environment variable requirements
      const character = this.runtime.character;
      if (character.settings?.secrets) {
        await this.scanCharacterSecrets(
          character.settings.secrets,
          world.metadata.envVars as EnvVarMetadata,
        );
      }

      // Scan loaded plugins for additional requirements
      await this.scanLoadedPlugins(world.metadata.envVars as EnvVarMetadata);

      // Save updated metadata
      await this.runtime.updateWorld(world);

      logger.info("[EnvManager] Plugin requirements scan completed");
    } catch (error) {
      logger.error("[EnvManager] Error scanning plugin requirements:", error);
    }
  }

  /**
   * Scan character secrets configuration
   */
  private async scanCharacterSecrets(
    secrets: Record<string, any>,
    envVars: EnvVarMetadata,
  ): Promise<void> {
    for (const [key, value] of Object.entries(secrets)) {
      if (!envVars["character"]) {
        envVars["character"] = {};
      }

      if (!envVars["character"][key]) {
        const config: EnvVarConfig = {
          type: this.inferVariableType(key),
          required: true,
          description: `Character setting: ${key}`,
          canGenerate: canGenerateEnvVar(key, this.inferVariableType(key)),
          status: value ? "valid" : "missing",
          attempts: 0,
          plugin: "character",
          createdAt: Date.now(),
        };

        if (value) {
          config.value = value;
          config.validatedAt = Date.now();
        }

        envVars["character"][key] = config;
      }
    }
  }

  /**
   * Scan loaded plugins for environment variable requirements
   */
  private async scanLoadedPlugins(envVars: EnvVarMetadata): Promise<void> {
    logger.debug(
      "[EnvManager] Scanning loaded plugins for environment variable requirements...",
    );

    if (!this.runtime.plugins) {
      logger.debug("[EnvManager] No runtime plugins found to scan.");
      return;
    }

    for (const pluginInstance of this.runtime.plugins) {
      if (pluginInstance.name === "plugin-env") continue; // Skip self

      const declared = (pluginInstance as any).declaredEnvVars as Record<
        string,
        Partial<EnvVarConfig & { defaultValue?: string }>
      >;

      if (declared) {
        logger.debug(
          `[EnvManager] Found declaredEnvVars for plugin: ${pluginInstance.name}`,
        );
        if (!envVars[pluginInstance.name]) {
          envVars[pluginInstance.name] = {};
        }

        for (const [varName, declaration] of Object.entries(declared)) {
          if (!envVars[pluginInstance.name][varName]) {
            const currentValue =
              process.env[varName] || declaration.defaultValue;
            const inferredType =
              declaration.type || this.inferVariableType(varName);

            envVars[pluginInstance.name][varName] = {
              type: inferredType,
              required:
                declaration.required !== undefined
                  ? declaration.required
                  : true,
              description:
                declaration.description ||
                `${varName} for ${pluginInstance.name}`,
              canGenerate:
                declaration.canGenerate !== undefined
                  ? declaration.canGenerate
                  : canGenerateEnvVar(
                      varName,
                      inferredType,
                      declaration.description,
                    ),
              status: currentValue ? "valid" : "missing",
              attempts: 0,
              plugin: pluginInstance.name,
              createdAt: Date.now(),
              value: currentValue,
              validatedAt: currentValue ? Date.now() : undefined,
              validationMethod: declaration.validationMethod,
              // Ensure all fields from EnvVarConfig are initialized
              lastError: undefined,
            };
            logger.debug(
              `[EnvManager] Registered requirement for ${varName} from ${pluginInstance.name}`,
            );
          }
        }
      }
    }
  }

  /**
   * Infer the type of an environment variable from its name
   */
  private inferVariableType(varName: string): EnvVarConfig["type"] {
    const lowerName = varName.toLowerCase();

    if (lowerName.includes("api_key") || lowerName.includes("token")) {
      return "api_key";
    } else if (lowerName.includes("private_key")) {
      return "private_key";
    } else if (lowerName.includes("public_key")) {
      return "public_key";
    } else if (lowerName.includes("url") || lowerName.includes("endpoint")) {
      return "url";
    } else if (lowerName.includes("secret") || lowerName.includes("key")) {
      return "secret";
    } else {
      return "config";
    }
  }

  /**
   * Get environment variables for a specific plugin
   */
  async getEnvVarsForPlugin(
    pluginName: string,
  ): Promise<Record<string, EnvVarConfig> | null> {
    try {
      const worldId = this.runtime.getSetting("WORLD_ID") as UUID;
      if (!worldId) return null;

      const world = await this.runtime.getWorld(worldId);
      if (!world?.metadata?.envVars) return null;

      const envVars = world.metadata.envVars as EnvVarMetadata;
      return envVars[pluginName] || null;
    } catch (error) {
      logger.error(
        `[EnvManager] Error getting env vars for plugin ${pluginName}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get all environment variables
   */
  async getAllEnvVars(): Promise<EnvVarMetadata | null> {
    try {
      const worldId = this.runtime.getSetting("WORLD_ID") as UUID;
      if (!worldId) return null;

      const world = await this.runtime.getWorld(worldId);
      return (world?.metadata?.envVars as EnvVarMetadata) || null;
    } catch (error) {
      logger.error("[EnvManager] Error getting all env vars:", error);
      return null;
    }
  }

  /**
   * Update an environment variable
   */
  async updateEnvVar(
    pluginName: string,
    varName: string,
    updates: Partial<EnvVarConfig>,
  ): Promise<boolean> {
    try {
      const worldId = this.runtime.getSetting("WORLD_ID") as UUID;
      if (!worldId) return false;

      const world = await this.runtime.getWorld(worldId);
      if (!world) return false;

      // Initialize metadata if needed
      if (!world.metadata) world.metadata = {};
      if (!world.metadata.envVars)
        world.metadata.envVars = {} as EnvVarMetadata;

      const envVars = world.metadata.envVars as EnvVarMetadata;
      if (!envVars[pluginName]) envVars[pluginName] = {};

      // Update the environment variable
      const currentConfig = envVars[pluginName][varName] || {
        type: "config" as const,
        required: false,
        description: "",
        canGenerate: false,
        status: "missing" as const,
        attempts: 0,
        plugin: pluginName,
        createdAt: Date.now(),
      };

      envVars[pluginName][varName] = {
        ...currentConfig,
        ...updates,
      };

      // Save to world
      await this.runtime.updateWorld(world);

      // Update runtime environment if value was set
      if (updates.value !== undefined) {
        process.env[varName] = updates.value;
        logger.info(
          `[EnvManager] Updated environment variable ${varName} for plugin ${pluginName}`,
        );
      }

      return true;
    } catch (error) {
      logger.error(`[EnvManager] Error updating env var ${varName}:`, error);
      return false;
    }
  }

  /**
   * Check if there are missing environment variables
   */
  async hasMissingEnvVars(): Promise<boolean> {
    const envVars = await this.getAllEnvVars();
    if (!envVars) return false;

    for (const plugin of Object.values(envVars)) {
      for (const config of Object.values(plugin)) {
        if (config.required && config.status === "missing") {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get missing environment variables
   */
  async getMissingEnvVars(): Promise<
    Array<{ plugin: string; varName: string; config: EnvVarConfig }>
  > {
    const envVars = await this.getAllEnvVars();
    if (!envVars) return [];

    const missing: Array<{
      plugin: string;
      varName: string;
      config: EnvVarConfig;
    }> = [];

    for (const [pluginName, plugin] of Object.entries(envVars)) {
      for (const [varName, config] of Object.entries(plugin)) {
        if (config.required && config.status === "missing") {
          missing.push({ plugin: pluginName, varName, config });
        }
      }
    }

    return missing;
  }

  /**
   * Get generatable environment variables
   */
  async getGeneratableEnvVars(): Promise<
    Array<{ plugin: string; varName: string; config: EnvVarConfig }>
  > {
    const missing = await this.getMissingEnvVars();
    return missing.filter(({ config }) => config.canGenerate);
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    logger.info("[EnvManager] Environment Manager Service stopped");
  }

  /**
   * Static method to stop the service
   */
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService("ENV_MANAGER");
    if (service) {
      await service.stop();
    }
  }
}
