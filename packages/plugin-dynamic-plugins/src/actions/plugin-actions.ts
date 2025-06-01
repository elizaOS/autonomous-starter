import { type Action, type IAgentRuntime, logger, type State } from '@elizaos/core';
import { PluginManagementService } from '../services/plugin-management-service';
import { z } from 'zod';

// Define a base input type for actions that don't need specific input beyond runtime context
interface EmptyActionInput { }

export const listAvailablePluginsAction: Action = {
  name: 'listAvailablePlugins',
  description: 'List all available plugins from the registry',
  similes: [
    'show available plugins',
    'what plugins can I install',
    'list plugin registry'
  ],
  // inputSchema: z.object({}), // Not using Zod for input schema in this version of Action type
  async handler(runtime: IAgentRuntime, _message, state): Promise<string> {
    const availablePluginsProvider = runtime.providers.find(p => p.name === 'availablePlugins');
    if (!availablePluginsProvider) {
        return 'availablePlugins provider not found.';
    }
    const result = await availablePluginsProvider.get(runtime, _message, state as State);
    return `Available plugins:\n${result.text}`;
  },
  async validate(_runtime: IAgentRuntime, _message, _state): Promise<boolean> {
    return true; // Always valid for now
  }
};

interface InstallPluginInput {
    pluginName: string;
    version?: string;
}

export const installPluginAction: Action = {
  name: 'installPlugin',
  description: 'Install a plugin from the registry',
  similes: [
    'install plugin',
    'add plugin',
    'setup plugin'
  ],
  // inputSchema: z.object({ // Not using Zod for input schema
  //   pluginName: z.string().describe('Name of the plugin to install'),
  //   version: z.string().optional().describe('Specific version to install')
  // }),
  async handler(runtime: IAgentRuntime, message, _state): Promise<string> {
    const { pluginName, version } = message.content as unknown as InstallPluginInput;
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const pluginInfo = await pluginService.installPlugin(pluginName, version);
      
      let response = `Successfully installed ${pluginInfo.name} v${pluginInfo.version}`;
      
      if (pluginInfo.requiredEnvVars.length > 0) {
        response += '\n\nThis plugin requires the following configuration items:';
        for (const envVar of pluginInfo.requiredEnvVars) {
          response += `\n- ${envVar.name}: ${envVar.description}`;
        }
        response += '\n\nPlease configure these before activating the plugin using the configurePlugin action.';
      }
      
      return response;
    } catch (error: any) {
      logger.error('Failed to install plugin:', error);
      return `Failed to install plugin: ${error.message}`;
    }
  },
  async validate(_runtime: IAgentRuntime, _message, _state): Promise<boolean> {
    return true; 
  }
};

interface ConfigurePluginInput {
    pluginName: string;
    configuration: Record<string, string>;
}

export const configurePluginAction: Action = {
  name: 'configurePlugin',
  description: 'Configure environment variables for an installed plugin',
  similes: [
    'setup plugin config',
    'set plugin environment',
    'configure plugin'
  ],
  // inputSchema: z.object({ // Not using Zod for input schema
  //   pluginName: z.string().describe('Name of the plugin to configure'),
  //   configuration: z.record(z.string()).describe('Environment variable values') 
  // }),
  async handler(runtime: IAgentRuntime, message, _state): Promise<string> {
    const { pluginName, configuration } = message.content as unknown as ConfigurePluginInput;
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const pluginInfo = await pluginService.setPluginConfiguration(pluginName, configuration);
      
      const stillMissing = pluginInfo.requiredEnvVars.filter(v => !v.isSet);
      
      if (stillMissing.length === 0) {
        return `Plugin ${pluginName} is now fully configured and ready to activate.`;
      } else {
        return `Plugin ${pluginName} configuration updated. Still missing: ${stillMissing.map(v => v.name).join(', ')}`;
      }
    } catch (error: any) {
      logger.error('Failed to configure plugin:', error);
      return `Failed to configure plugin: ${error.message}`;
    }
  },
  async validate(_runtime: IAgentRuntime, _message, _state): Promise<boolean> {
    return true; 
  }
};

interface ActivatePluginInput {
    pluginName: string;
}

export const activatePluginAction: Action = {
  name: 'activatePlugin',
  description: 'Activate an installed and configured plugin',
  similes: [
    'enable plugin',
    'start plugin',
    'turn on plugin'
  ],
  // inputSchema: z.object({ // Not using Zod for input schema
  //   pluginName: z.string().describe('Name of the plugin to activate')
  // }),
  async handler(runtime: IAgentRuntime, message, _state): Promise<string> {
    const { pluginName } = message.content as unknown as ActivatePluginInput;
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const success = await pluginService.activatePlugin(pluginName);
      
      if (success) {
        return `Plugin ${pluginName} has been activated successfully.`;
      } else {
        const pluginInfo = pluginService.getPluginInfo(pluginName);
        if (pluginInfo?.status === 'error') {
            return `Failed to activate plugin ${pluginName}. Error: ${pluginInfo.errorDetails}. Please check logs.`;
        }
        if (pluginInfo?.status === 'needs_configuration'){
            const missingVars = pluginInfo.requiredEnvVars.filter(v => !v.isSet).map(v => v.name).join(', ');
            return `Failed to activate plugin ${pluginName}. It requires configuration for: ${missingVars}. Use the configurePlugin action.`;
        }
        return `Failed to activate plugin ${pluginName}. Check logs for details.`;
      }
    } catch (error: any) {
      logger.error('Failed to activate plugin:', error);
      return `Failed to activate plugin: ${error.message}`;
    }
  },
  async validate(_runtime: IAgentRuntime, _message, _state): Promise<boolean> {
    return true; 
  }
};

interface DeactivatePluginInput {
    pluginName: string;
}

export const deactivatePluginAction: Action = {
  name: 'deactivatePlugin',
  description: 'Deactivate an active plugin',
  similes: [
    'disable plugin',
    'stop plugin',
    'turn off plugin'
  ],
  // inputSchema: z.object({ // Not using Zod for input schema
  //   pluginName: z.string().describe('Name of the plugin to deactivate')
  // }),
  async handler(runtime: IAgentRuntime, message, _state): Promise<string> {
    const { pluginName } = message.content as unknown as DeactivatePluginInput;
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const success = await pluginService.deactivatePlugin(pluginName);
      
      if (success) {
        return `Plugin ${pluginName} has been deactivated.`;
      } else {
        return `Failed to deactivate plugin ${pluginName}.`;
      }
    } catch (error: any) {
      logger.error('Failed to deactivate plugin:', error);
      return `Failed to deactivate plugin: ${error.message}`;
    }
  },
  async validate(_runtime: IAgentRuntime, _message, _state): Promise<boolean> {
    return true; 
  }
};

interface UnloadPluginInput {
    pluginName: string;
}

export const unloadPluginAction: Action = {
  name: 'unloadPlugin',
  description: 'Unload an installed plugin from memory',
  similes: [
    'remove plugin from memory',
    'unload plugin'
  ],
  // inputSchema: z.object({ // Not using Zod for input schema
  //   pluginName: z.string().describe('Name of the plugin to unload')
  // }),
  async handler(runtime: IAgentRuntime, message, _state): Promise<string> {
    const { pluginName } = message.content as unknown as UnloadPluginInput;
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const success = await pluginService.unloadPlugin(pluginName);
      
      if (success) {
        return `Plugin ${pluginName} has been unloaded.`;
      } else {
        return `Failed to unload plugin ${pluginName}.`;
      }
    } catch (error: any) {
      logger.error('Failed to unload plugin:', error);
      return `Failed to unload plugin: ${error.message}`;
    }
  },
  async validate(_runtime: IAgentRuntime, _message, _state): Promise<boolean> {
    return true; 
  }
}; 