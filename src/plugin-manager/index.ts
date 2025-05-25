import type { Plugin } from '@elizaos/core';
import { PluginManagerService } from './services/pluginManagerService';
import { pluginStateProvider } from './providers/pluginStateProvider';
import { loadPluginAction } from './actions/loadPlugin';
import { unloadPluginAction } from './actions/unloadPlugin';
import './types'; // Ensure module augmentation is loaded

export const pluginManagerPlugin: Plugin = {
  name: 'plugin-manager',
  description: 'Manages dynamic loading and unloading of plugins at runtime',

  services: [PluginManagerService],
  providers: [pluginStateProvider],
  actions: [loadPluginAction, unloadPluginAction],

  init: async (config: Record<string, any>, runtime: any) => {
    // Any initialization logic if needed
  },
};

// Export individual components for testing
export { PluginManagerService } from './services/pluginManagerService';
export * from './types';
