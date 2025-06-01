import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import { PluginManagerServiceType } from "../types";
import { PluginConfigurationService } from "../services/pluginConfigurationService";
import { PluginUserInteractionService } from "../services/pluginUserInteractionService";

export const pluginConfigurationStatusProvider: Provider = {
  name: "pluginConfigurationStatus",
  description:
    "Provides information about plugin configuration status, missing environment variables, and active configuration dialogs",

  get: async (runtime: IAgentRuntime, message?: Memory, state?: State) => {
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

      if (!configService || !interactionService) {
        return {
          text: "",
          data: { available: false },
          values: { configurationServicesAvailable: false },
        };
      }

      const statusData: any = {
        available: true,
        plugins: [],
        activeDialogs: [],
        totalPlugins: 0,
        configuredPlugins: 0,
        needsConfiguration: 0,
      };

      let statusText = "";

      // Get all plugins if plugin manager is available
      if (pluginManagerService) {
        try {
          const allPlugins = pluginManagerService.getAllPlugins();
          statusData.totalPlugins = allPlugins.length;

          for (const plugin of allPlugins) {
            try {
              // Try to parse plugin requirements
              const result = await configService.parsePluginRequirements(
                `./plugins/${plugin.name}`,
              );

              if (result && result.requiredVars.length > 0) {
                // Check configuration status
                const currentConfig =
                  await configService.getPluginConfiguration(plugin.name);
                const missingVars = result.requiredVars
                  .filter((varInfo) => !currentConfig[varInfo.name])
                  .map((varInfo) => varInfo.name);

                const pluginStatus = {
                  name: plugin.name,
                  status: plugin.status,
                  requiredVars: result.requiredVars.length,
                  missingVars: missingVars.length,
                  configured: missingVars.length === 0,
                  variables: result.requiredVars.map((v) => ({
                    name: v.name,
                    description: v.description,
                    required: v.required,
                    sensitive: v.sensitive,
                    configured: !!currentConfig[v.name],
                  })),
                };

                statusData.plugins.push(pluginStatus);

                if (pluginStatus.configured) {
                  statusData.configuredPlugins++;
                } else {
                  statusData.needsConfiguration++;
                }
              } else {
                // Plugin doesn't require configuration
                statusData.plugins.push({
                  name: plugin.name,
                  status: plugin.status,
                  requiredVars: 0,
                  missingVars: 0,
                  configured: true,
                  variables: [],
                });
                statusData.configuredPlugins++;
              }
            } catch (error) {
              logger.warn(
                `[pluginConfigurationStatus] Failed to check configuration for plugin ${plugin.name}:`,
                error,
              );
              // Add as unknown status
              statusData.plugins.push({
                name: plugin.name,
                status: plugin.status,
                requiredVars: 0,
                missingVars: 0,
                configured: false,
                variables: [],
                error: "Configuration check failed",
              });
            }
          }
        } catch (error) {
          logger.error(
            "[pluginConfigurationStatus] Failed to get plugins:",
            error,
          );
        }
      }

      // Get active configuration dialogs
      try {
        const activeDialogs = interactionService.getActiveDialogs();
        statusData.activeDialogs = activeDialogs.map((dialog) => ({
          id: dialog.id,
          pluginName: dialog.pluginName,
          status: dialog.status,
          currentVariable: dialog.currentVariable,
          progress: {
            completed: Object.keys(dialog.responses).length,
            total: dialog.request.missingVars.length,
          },
          startedAt: dialog.startedAt,
        }));
      } catch (error) {
        logger.warn(
          "[pluginConfigurationStatus] Failed to get active dialogs:",
          error,
        );
      }

      // Build status text
      if (statusData.totalPlugins === 0) {
        statusText = "No plugins are currently installed.";
      } else {
        statusText += `Plugin Configuration Status:\n`;
        statusText += `• Total plugins: ${statusData.totalPlugins}\n`;
        statusText += `• Fully configured: ${statusData.configuredPlugins}\n`;
        statusText += `• Need configuration: ${statusData.needsConfiguration}\n`;

        if (statusData.needsConfiguration > 0) {
          statusText += `\nPlugins needing configuration:\n`;
          statusData.plugins
            .filter((p: any) => !p.configured)
            .forEach((plugin: any) => {
              statusText += `• ${plugin.name}: ${plugin.missingVars} missing variables\n`;
            });
        }

        if (statusData.activeDialogs.length > 0) {
          statusText += `\nActive configuration dialogs:\n`;
          statusData.activeDialogs.forEach((dialog: any) => {
            statusText += `• ${dialog.pluginName}: ${dialog.progress.completed}/${dialog.progress.total} variables collected\n`;
          });
        }
      }

      return {
        text: statusText,
        data: statusData,
        values: {
          configurationServicesAvailable: true,
          totalPlugins: statusData.totalPlugins,
          configuredPlugins: statusData.configuredPlugins,
          needsConfiguration: statusData.needsConfiguration,
          activeDialogs: statusData.activeDialogs.length,
          hasUnconfiguredPlugins: statusData.needsConfiguration > 0,
          hasActiveDialogs: statusData.activeDialogs.length > 0,
        },
      };
    } catch (error) {
      logger.error(
        "[pluginConfigurationStatus] Error getting plugin configuration status:",
        error,
      );
      return {
        text: "Error retrieving plugin configuration status.",
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        values: { configurationServicesAvailable: false, error: true },
      };
    }
  },
};
