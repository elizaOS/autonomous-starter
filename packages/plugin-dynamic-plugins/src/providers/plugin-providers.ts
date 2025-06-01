import { type Provider as IProvider, type IAgentRuntime, type ProviderResult } from '@elizaos/core'; // Adjusted IProvider import to Provider
import { PluginManagementService } from '../services/plugin-management-service'; // Adjusted path
import { getLocalRegistryIndex } from '../services/registry-adapter'; // Adjusted path

export const availablePluginsProvider: IProvider = {
  name: 'availablePlugins',
  description: 'Provides list of available plugins from the registry',
  
  async get(runtime: IAgentRuntime): Promise<ProviderResult> { // Changed to get and ProviderResult
    const registry = await getLocalRegistryIndex();
    
    const plugins = Object.entries(registry).map(([name, entry]) => ({
      name,
      description: entry.description || 'No description available',
      repository: entry.repository
    }));
    
    // ProviderResult expects { text?: string, data?: object, values?: object }
    return {
        text: JSON.stringify(plugins, null, 2),
        data: { plugins },
        values: { availablePluginsCount: plugins.length }
    };
  }
};

export const dynamicPluginsStatusProvider: IProvider = {
  name: 'dynamicPluginsStatus',
  description: 'Provides status of installed dynamic plugins',
  
  async get(runtime: IAgentRuntime): Promise<ProviderResult> { // Changed to get and ProviderResult
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return {
          text: 'Plugin management service not available',
          data: { error: 'Plugin management service not available' }
      };
    }
    
    const plugins = pluginService.listInstalledPlugins();
    
    const status = plugins.map(p => ({
      name: p.name,
      version: p.version,
      status: p.status,
      requiresConfig: p.requiredEnvVars.filter(v => !v.isSet).length > 0,
      missingVars: p.requiredEnvVars.filter(v => !v.isSet).map(v => v.name),
      error: p.errorDetails
    }));
    
    return {
        text: JSON.stringify(status, null, 2),
        data: { pluginsStatus: status }, // Changed to avoid conflict with plugins from availablePluginsProvider
        values: { installedPluginsCount: status.length }
    };
  }
}; 