import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type HandlerCallback,
} from '@elizaos/core';
import { PluginManagerService } from '../services/pluginManagerService';

export const unloadPluginAction: Action = {
  name: 'UNLOAD_PLUGIN',
  similes: ['unload plugin', 'disable plugin', 'deactivate plugin', 'stop plugin', 'remove plugin'],
  description: 'Unload a plugin that is currently loaded (except original plugins)',

  examples: [
    [
      {
        name: 'Autoliza',
        content: {
          text: 'I need to unload the example-plugin',
          actions: ['UNLOAD_PLUGIN'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: 'Unloading the example-plugin now.',
          actions: ['UNLOAD_PLUGIN'],
          simple: true,
        },
      },
    ],
    [
      {
        name: 'Autoliza',
        content: {
          text: 'Disable the test plugin that is running',
          actions: ['UNLOAD_PLUGIN'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: "I'll disable the test plugin for you.",
          actions: ['UNLOAD_PLUGIN'],
          simple: true,
        },
      },
    ],
  ],

  async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
    const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

    if (!pluginManager) {
      logger.warn('[unloadPluginAction] Plugin Manager service not available');
      return false;
    }

    // Check if there are any plugins that can be unloaded
    const plugins = pluginManager.getAllPlugins();
    const loadedPlugins = plugins.filter((p) => p.status === 'loaded');

    // We can't unload original plugins, so check if there are any non-original loaded plugins
    // For now, we'll assume any plugin can potentially be unloaded (the service will check)
    return loadedPlugins.length > 0;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void> {
    const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

    if (!pluginManager) {
      if (callback) {
        await callback({
          text: 'Plugin Manager service is not available.',
          actions: ['UNLOAD_PLUGIN'],
        });
      }
      return;
    }

    try {
      // Extract plugin name from message
      const messageText = message.content.text.toLowerCase();
      const plugins = pluginManager.getAllPlugins();

      // Find plugin to unload
      let pluginToUnload = null;

      // First try exact match
      for (const plugin of plugins) {
        if (messageText.includes(plugin.name.toLowerCase()) && plugin.status === 'loaded') {
          pluginToUnload = plugin;
          break;
        }
      }

      // If no exact match, provide a list of loaded plugins
      if (!pluginToUnload) {
        const loadedPlugins = plugins.filter((p) => p.status === 'loaded');

        if (loadedPlugins.length === 0) {
          if (callback) {
            await callback({
              text: 'No plugins are currently loaded that can be unloaded.',
              actions: ['UNLOAD_PLUGIN'],
            });
          }
          return;
        }

        if (callback) {
          await callback({
            text: `Please specify which plugin to unload. Currently loaded plugins: ${loadedPlugins.map((p) => p.name).join(', ')}`,
            actions: ['UNLOAD_PLUGIN'],
          });
        }
        return;
      }

      logger.info(`[unloadPluginAction] Unloading plugin: ${pluginToUnload.name}`);

      await pluginManager.unloadPlugin({ pluginId: pluginToUnload.id });

      if (callback) {
        await callback({
          text: `Successfully unloaded plugin: ${pluginToUnload.name}`,
          actions: ['UNLOAD_PLUGIN'],
        });
      }
    } catch (error) {
      logger.error('[unloadPluginAction] Error unloading plugin:', error);

      // Check if it's because it's an original plugin
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isOriginalPluginError = errorMessage.includes('Cannot unload original plugin');

      if (callback) {
        if (isOriginalPluginError) {
          await callback({
            text: `Cannot unload this plugin because it's an original plugin that was loaded at startup. Only dynamically loaded plugins can be unloaded.`,
            actions: ['UNLOAD_PLUGIN'],
          });
        } else {
          await callback({
            text: `Failed to unload plugin: ${errorMessage}`,
            actions: ['UNLOAD_PLUGIN'],
          });
        }
      }
    }
  },
};
