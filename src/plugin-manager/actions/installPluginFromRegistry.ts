import type { Action, IAgentRuntime, State, Memory } from '@elizaos/core';
import { PluginManagerService } from '../services/pluginManagerService';

export const installPluginFromRegistryAction: Action = {
  name: 'installPluginFromRegistry',
  description: 'Install a plugin from the ElizaOS plugin registry',
  similes: [
    'install plugin from registry',
    'add plugin from registry',
    'download plugin',
    'get plugin from registry'
  ],

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<string> {
    const pluginManagerService = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;
    
    if (!pluginManagerService) {
      return 'Plugin manager service not available';
    }

    // Extract plugin name from message content
    const content = message.content.text.toLowerCase();
    
    // Simple plugin name extraction - in production this would be more sophisticated
    const words = content.split(' ');
    let pluginName = '';
    let version: string | undefined;
    
    // Look for plugin name patterns
    for (let i = 0; i < words.length; i++) {
      if (words[i].startsWith('@') || words[i].startsWith('plugin-')) {
        pluginName = words[i];
        // Check if next word is a version
        if (words[i + 1] && words[i + 1].match(/^\d+\.\d+\.\d+/)) {
          version = words[i + 1];
        }
        break;
      }
    }

    if (!pluginName) {
      return 'Please specify a plugin name to install (e.g., "@elizaos/plugin-example")';
    }

    try {
      const pluginInfo = await pluginManagerService.installPluginFromRegistry(pluginName, version);
      
      let response = `Successfully installed ${pluginInfo.name} v${pluginInfo.version}`;
      
      if (pluginInfo.requiredEnvVars.length > 0) {
        response += '\n\nThis plugin requires the following environment variables:';
        for (const envVar of pluginInfo.requiredEnvVars) {
          response += `\n- ${envVar.name}: ${envVar.description}`;
        }
        response += '\n\nPlease configure these before loading the plugin.';
      } else {
        response += '\n\nThe plugin is ready to be loaded.';
      }
      
      return response;
    } catch (error: any) {
      return `Failed to install plugin ${pluginName}: ${error.message}`;
    }
  },

  async validate(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<boolean> {
    const content = message.content.text.toLowerCase();
    
    // Check if the message is about installing a plugin from registry
    const installKeywords = ['install', 'add', 'download', 'get'];
    const registryKeywords = ['plugin', 'registry'];
    
    const hasInstallKeyword = installKeywords.some(keyword => content.includes(keyword));
    const hasRegistryKeyword = registryKeywords.some(keyword => content.includes(keyword));
    
    return hasInstallKeyword && hasRegistryKeyword;
  }
}; 