import {
  type Action,
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  logger,
  type Memory,
  type State,
  type UUID,
} from "@elizaos/core";
import type { EnvVarMetadata, GenerationScriptMetadata } from "../types";
import { generateScript, getGenerationDescription } from "../generation";
import { validateEnvVar } from "../validation";
import { v4 as uuidv4 } from "uuid";

/**
 * Generate environment variable action
 */
export const generateEnvVarAction: Action = {
  name: "GENERATE_ENV_VAR",
  similes: ["AUTO_GENERATE_ENV", "CREATE_ENV_VAR", "GENERATE_VARIABLE"],
  description:
    "Automatically generates environment variables that can be created programmatically",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    try {
      const worldId = runtime.getSetting("WORLD_ID") as UUID;
      if (!worldId) return false;

      const world = await runtime.getWorld(worldId);
      if (!world?.metadata?.envVars) return false;

      const envVars = world.metadata.envVars as EnvVarMetadata;

      // Check if there are any generatable environment variables
      for (const plugin of Object.values(envVars)) {
        for (const config of Object.values(plugin)) {
          if (config.canGenerate && config.status === "missing") {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error("Error validating GENERATE_ENV_VAR action:", error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: any,
    callback?: HandlerCallback,
  ): Promise<void> => {
    try {
      if (!callback) {
        throw new Error("Callback is required for GENERATE_ENV_VAR action");
      }

      const worldId = runtime.getSetting("WORLD_ID") as UUID;
      if (!worldId) {
        throw new Error("No WORLD_ID found");
      }

      const world = await runtime.getWorld(worldId);
      if (!world?.metadata?.envVars) {
        throw new Error("No environment variables metadata found");
      }

      // Initialize generation scripts metadata if needed
      if (!world.metadata.generationScripts) {
        world.metadata.generationScripts = {} as GenerationScriptMetadata;
      }

      const envVars = world.metadata.envVars as EnvVarMetadata;
      const generationScripts = world.metadata
        .generationScripts as GenerationScriptMetadata;

      // Find generatable environment variables
      const generatableVars: Array<{
        plugin: string;
        varName: string;
        config: any;
      }> = [];

      for (const [pluginName, plugin] of Object.entries(envVars)) {
        for (const [varName, config] of Object.entries(plugin)) {
          if (config.canGenerate && config.status === "missing") {
            generatableVars.push({ plugin: pluginName, varName, config });
          }
        }
      }

      if (generatableVars.length === 0) {
        await callback({
          text: "No environment variables can be auto-generated at this time.",
          actions: ["GENERATE_ENV_VAR_NONE"],
          source: message.content.source,
        });
        return;
      }

      let generatedCount = 0;
      const results: string[] = [];

      // Process each generatable variable
      for (const { plugin, varName, config } of generatableVars) {
        try {
          logger.info(
            `[GenerateEnvVar] Generating ${varName} for plugin ${plugin}`,
          );

          // Update status to generating
          envVars[plugin][varName] = {
            ...config,
            status: "generating",
            attempts: config.attempts + 1,
          };

          // Generate the script
          const script = generateScript(
            varName,
            config.type,
            plugin,
            config.description,
          );

          if (!script) {
            logger.warn(
              `[GenerateEnvVar] No generation script available for ${varName}`,
            );
            envVars[plugin][varName] = {
              ...envVars[plugin][varName],
              status: "missing",
              lastError: "No generation script available",
            };
            results.push(`❌ ${varName}: No generation method available`);
            continue;
          }

          // Store the generation script
          const scriptId = uuidv4();
          generationScripts[scriptId] = {
            ...script,
            status: "running",
          };

          // Get shell service to execute the script
          const shellService = runtime.getService("SHELL" as any);
          if (!shellService) {
            throw new Error("Shell service not available for script execution");
          }

          // Install dependencies if needed
          if (script.dependencies.length > 0) {
            logger.info(
              `[GenerateEnvVar] Installing dependencies: ${script.dependencies.join(", ")}`,
            );

            const installCommand = `npm install ${script.dependencies.join(" ")}`;
            const installResult = await (shellService as any).executeCommand(
              installCommand,
            );

            if (installResult.exitCode !== 0) {
              throw new Error(
                `Failed to install dependencies: ${installResult.error}`,
              );
            }
          }

          // Execute the generation script
          logger.info(
            `[GenerateEnvVar] Executing generation script for ${varName}`,
          );

          // Create a temporary script file
          const fs = await import("fs/promises");
          const path = await import("path");
          const os = await import("os");

          const tempDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "eliza-env-gen-"),
          );
          const scriptPath = path.join(tempDir, `generate-${varName}.js`);

          await fs.writeFile(scriptPath, script.script);

          // Execute the script
          const executeResult = await (shellService as any).executeCommand(
            `node ${scriptPath}`,
          );

          // Clean up temporary file
          await fs.unlink(scriptPath);
          await fs.rmdir(tempDir);

          if (executeResult.exitCode !== 0) {
            throw new Error(`Script execution failed: ${executeResult.error}`);
          }

          const generatedValue = executeResult.output.trim();

          if (!generatedValue) {
            throw new Error("Script produced no output");
          }

          // Update the environment variable with generated value
          envVars[plugin][varName] = {
            ...envVars[plugin][varName],
            value: generatedValue,
            status: "validating",
          };

          // Update runtime environment
          process.env[varName] = generatedValue;

          // Validate the generated value
          const validationResult = await validateEnvVar(
            varName,
            generatedValue,
            config.type,
            config.validationMethod,
          );

          if (validationResult.isValid) {
            envVars[plugin][varName] = {
              ...envVars[plugin][varName],
              status: "valid",
              validatedAt: Date.now(),
              lastError: undefined,
            };

            generationScripts[scriptId] = {
              ...generationScripts[scriptId],
              status: "success",
              output: generatedValue,
            };

            results.push(`✅ ${varName}: Generated and validated successfully`);
            generatedCount++;

            logger.info(
              `[GenerateEnvVar] Successfully generated and validated ${varName}`,
            );
          } else {
            envVars[plugin][varName] = {
              ...envVars[plugin][varName],
              status: "invalid",
              lastError: validationResult.error,
            };

            generationScripts[scriptId] = {
              ...generationScripts[scriptId],
              status: "failed",
              error: validationResult.error,
            };

            results.push(
              `❌ ${varName}: Generated but validation failed - ${validationResult.error}`,
            );
          }
        } catch (error) {
          logger.error(`[GenerateEnvVar] Error generating ${varName}:`, error);

          envVars[plugin][varName] = {
            ...envVars[plugin][varName],
            status: "missing",
            lastError: error instanceof Error ? error.message : "Unknown error",
          };

          results.push(
            `❌ ${varName}: Generation failed - ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      // Save updated metadata
      await runtime.updateWorld(world);

      // Generate response based on results
      if (generatedCount > 0) {
        const successMessage = `🎉 Successfully generated ${generatedCount} environment variable${generatedCount > 1 ? "s" : ""}!\n\n${results.join("\n")}`;

        if (generatedCount < generatableVars.length) {
          const failedCount = generatableVars.length - generatedCount;
          const additionalMessage = `\n\n${failedCount} variable${failedCount > 1 ? "s" : ""} could not be generated and will need to be provided manually.`;

          await callback({
            text: successMessage + additionalMessage,
            actions: ["GENERATE_ENV_VAR_PARTIAL"],
            source: message.content.source,
          });
        } else {
          await callback({
            text: successMessage,
            actions: ["GENERATE_ENV_VAR_SUCCESS"],
            source: message.content.source,
          });
        }
      } else {
        await callback({
          text: `❌ Failed to generate any environment variables:\n\n${results.join("\n")}\n\nThese variables will need to be provided manually.`,
          actions: ["GENERATE_ENV_VAR_FAILED"],
          source: message.content.source,
        });
      }
    } catch (error) {
      logger.error(`[GenerateEnvVar] Error in handler: ${error}`);
      await callback?.({
        text: "I'm sorry, but I encountered an error while trying to generate environment variables. Please try again or set them manually.",
        actions: ["GENERATE_ENV_VAR_ERROR"],
        source: message.content.source,
      });
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: "Generate the missing environment variables",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "🎉 Successfully generated 3 environment variables!\n\n✅ JWT_SECRET: Generated and validated successfully\n✅ ENCRYPTION_KEY: Generated and validated successfully\n✅ SESSION_SECRET: Generated and validated successfully",
          actions: ["GENERATE_ENV_VAR_SUCCESS"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: {
          text: "Can you auto-generate the keys I need?",
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "🎉 Successfully generated 2 environment variables!\n\n✅ PRIVATE_KEY: Generated and validated successfully\n✅ DATABASE_NAME: Generated and validated successfully\n\n1 variable could not be generated and will need to be provided manually.",
          actions: ["GENERATE_ENV_VAR_PARTIAL"],
        },
      },
    ],
  ] as ActionExample[][],
};

export default generateEnvVarAction;
