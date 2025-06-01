import {
  type Evaluator,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import { PluginManagerServiceType } from "../types";
import { PluginConfigurationService } from "../services/pluginConfigurationService";
import { PluginUserInteractionService } from "../services/pluginUserInteractionService";

export const pluginConfigurationEvaluator: Evaluator = {
  name: "pluginConfigurationEvaluator",
  description:
    "Evaluates plugin configuration needs and suggests configuration when plugins require environment variables",
  examples: [],
  alwaysRun: false,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    try {
      // Check if plugin configuration services are available
      const configService = runtime.getService(
        PluginManagerServiceType.PLUGIN_CONFIGURATION,
      );
      const interactionService = runtime.getService(
        PluginManagerServiceType.PLUGIN_USER_INTERACTION,
      );

      if (!configService || !interactionService) {
        return false;
      }

      // Run if message mentions plugins, configuration, or setup
      const text = message.content.text.toLowerCase();
      const pluginKeywords = [
        "plugin",
        "configure",
        "setup",
        "install",
        "environment",
        "env var",
        "api key",
        "token",
        "config",
      ];

      return pluginKeywords.some((keyword) => text.includes(keyword));
    } catch (error) {
      logger.error(
        "[pluginConfigurationEvaluator] Error in validation:",
        error,
      );
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<string> => {
    try {
      const configService = runtime.getService(
        PluginManagerServiceType.PLUGIN_CONFIGURATION,
      ) as PluginConfigurationService;
      const interactionService = runtime.getService(
        PluginManagerServiceType.PLUGIN_USER_INTERACTION,
      ) as PluginUserInteractionService;
      const pluginManagerService = runtime.getService(
        PluginManagerServiceType.PLUGIN_MANAGER,
      ) as any;

      if (!configService || !interactionService || !pluginManagerService) {
        return "";
      }

      // Check for unconfigured plugins
      const unconfiguredPlugins: Array<{
        name: string;
        missingVars: string[];
        requiredVars: any[];
      }> = [];

      try {
        const allPlugins = pluginManagerService.getAllPlugins();

        for (const plugin of allPlugins) {
          try {
            const result = await configService.parsePluginRequirements(
              `./plugins/${plugin.name}`,
            );

            if (result && result.requiredVars.length > 0) {
              const currentConfig = await configService.getPluginConfiguration(
                plugin.name,
              );
              const missingVars = result.requiredVars
                .filter((varInfo) => !currentConfig[varInfo.name])
                .map((varInfo) => varInfo.name);

              if (missingVars.length > 0) {
                unconfiguredPlugins.push({
                  name: plugin.name,
                  missingVars,
                  requiredVars: result.requiredVars,
                });
              }
            }
          } catch (error) {
            // Skip plugins that can't be parsed
            logger.debug(
              `[pluginConfigurationEvaluator] Failed to check plugin ${plugin.name}:`,
              error,
            );
          }
        }
      } catch (error) {
        logger.warn(
          "[pluginConfigurationEvaluator] Failed to check plugins:",
          error,
        );
        return "";
      }

      // Check if there are active configuration dialogs
      const activeDialogs = interactionService.getActiveDialogs();

      // Generate evaluation response based on context
      let evaluation = "";

      // If user mentioned specific plugin names, focus on those
      const text = message.content.text.toLowerCase();
      const mentionedPlugins = unconfiguredPlugins.filter((plugin) =>
        text.includes(plugin.name.toLowerCase()),
      );

      if (mentionedPlugins.length > 0) {
        evaluation += `\n💡 **Configuration Suggestion**: `;

        if (mentionedPlugins.length === 1) {
          const plugin = mentionedPlugins[0];
          evaluation += `The ${plugin.name} plugin requires configuration before it can be used. `;
          evaluation += `It needs ${plugin.missingVars.length} environment variable${plugin.missingVars.length > 1 ? "s" : ""}: `;
          evaluation +=
            plugin.missingVars.map((v) => `**${v}**`).join(", ") + ". ";
          evaluation += `Would you like me to help you configure it?`;
        } else {
          evaluation += `I noticed you mentioned ${mentionedPlugins.length} plugins that need configuration: `;
          evaluation += mentionedPlugins.map((p) => p.name).join(", ") + ". ";
          evaluation += `Would you like me to help you configure them?`;
        }
      } else if (unconfiguredPlugins.length > 0 && activeDialogs.length === 0) {
        // General suggestion when there are unconfigured plugins
        if (
          text.includes("plugin") ||
          text.includes("setup") ||
          text.includes("configure")
        ) {
          evaluation += `\n📋 **Plugin Status**: `;
          evaluation += `You have ${unconfiguredPlugins.length} plugin${unconfiguredPlugins.length > 1 ? "s" : ""} that need${unconfiguredPlugins.length === 1 ? "s" : ""} configuration: `;
          evaluation +=
            unconfiguredPlugins.map((p) => p.name).join(", ") + ". ";
          evaluation += `Say "configure [plugin name]" to set up any of these plugins.`;
        }
      } else if (activeDialogs.length > 0) {
        // Remind about ongoing configuration dialogs
        const activePlugin = activeDialogs[0];
        if (activePlugin.status === "in_progress") {
          evaluation += `\n⏳ **Ongoing Configuration**: `;
          evaluation += `You have an active configuration dialog for the ${activePlugin.pluginName} plugin. `;
          evaluation += `We're currently collecting: **${activePlugin.currentVariable}**. `;
          evaluation += `Please provide the required value to continue.`;
        }
      }

      // Special handling for installation/setup messages
      if (text.includes("install") && text.includes("plugin")) {
        if (unconfiguredPlugins.length > 0) {
          evaluation += `\n⚠️ **Post-Installation**: `;
          evaluation += `After installing plugins, you may need to configure them with API keys or other settings. `;
          evaluation += `Check the plugin configuration status to see what needs to be set up.`;
        }
      }

      return evaluation;
    } catch (error) {
      logger.error("[pluginConfigurationEvaluator] Error in handler:", error);
      return "";
    }
  },
};
