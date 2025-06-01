import type { Plugin } from '@elizaos/core';
import { PluginManagerService } from './services/pluginManagerService';
import { pluginStateProvider } from './providers/pluginStateProvider';
import { registryPluginsProvider } from './providers/registryPluginsProvider';
import { loadPluginAction } from './actions/loadPlugin';
import { unloadPluginAction } from './actions/unloadPlugin';
import { installPluginFromRegistryAction } from './actions/installPluginFromRegistry';
import './types'; // Ensure module augmentation is loaded

export const pluginManagerPlugin: Plugin = {
  name: 'plugin-manager',
  description: 'Manages dynamic loading and unloading of plugins at runtime, including registry installation',

  services: [PluginManagerService],
  providers: [pluginStateProvider, registryPluginsProvider],
  actions: [loadPluginAction, unloadPluginAction, installPluginFromRegistryAction],

  init: async (config: Record<string, any>, runtime: any) => {
    // Any initialization logic if needed
  },
};

// Export individual components for testing
export { PluginManagerService } from './services/pluginManagerService';
export * from './types';
