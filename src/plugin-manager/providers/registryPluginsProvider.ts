import type { Provider, IAgentRuntime, ProviderResult } from "@elizaos/core";
import { PluginManagerService } from "../services/pluginManagerService";

export const registryPluginsProvider: Provider = {
  name: "registryPlugins",
  description: "Provides list of available plugins from the ElizaOS registry",

  async get(runtime: IAgentRuntime): Promise<ProviderResult> {
    const pluginManagerService = runtime.getService(
      "PLUGIN_MANAGER",
    ) as PluginManagerService;

    if (!pluginManagerService) {
      return {
        text: "Plugin manager service not available",
        data: { error: "Plugin manager service not available" },
      };
    }

    try {
      const registry =
        await pluginManagerService.getAvailablePluginsFromRegistry();

      const plugins = Object.entries(registry).map(([name, entry]) => ({
        name,
        description: entry.description || "No description available",
        repository: entry.repository,
      }));

      let text = "**Available Plugins from Registry:**\n";
      if (plugins.length === 0) {
        text += "No plugins available in registry";
      } else {
        for (const plugin of plugins) {
          text += `- **${plugin.name}**: ${plugin.description}\n`;
        }
      }

      // Also show installed plugins
      const installedPlugins = pluginManagerService.listInstalledPlugins();
      if (installedPlugins.length > 0) {
        text += "\n**Installed Registry Plugins:**\n";
        for (const plugin of installedPlugins) {
          text += `- **${plugin.name}** v${plugin.version} (${plugin.status})\n`;
        }
      }

      return {
        text,
        data: {
          availablePlugins: plugins,
          installedPlugins: installedPlugins,
        },
        values: {
          availableCount: plugins.length,
          installedCount: installedPlugins.length,
        },
      };
    } catch (error: any) {
      return {
        text: `Failed to fetch registry plugins: ${error.message}`,
        data: { error: error.message },
      };
    }
  },
};
