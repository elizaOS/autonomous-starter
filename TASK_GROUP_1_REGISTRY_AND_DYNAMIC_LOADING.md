# Task Group 1: Registry Interaction & Dynamic Plugin Installation/Loading

## Overview

This implementation enables ElizaOS agents to discover, install, and dynamically load/unload plugins at runtime. The system integrates with the existing ElizaOS plugin registry and extends the AgentRuntime to support dynamic component registration.

## Architecture

### Core Components

1. **PluginManagementService** - Central service managing plugin lifecycle
2. **DynamicPluginLoader** - Handles runtime loading/unloading of plugin components
3. **Registry Integration** - Interfaces with ElizaOS plugin registry
4. **Storage Management** - Manages plugin installation directories

### Data Flow

```
User Request → Action → PluginManagementService → Registry/Installer → DynamicLoader → AgentRuntime
```

## Detailed Implementation

### 1. Plugin Management Service

**File:** `packages/core/src/services/plugin-management-service.ts`

```typescript
import { Service, type IAgentRuntime, type Plugin, logger } from '@elizaos/core';
import { installPlugin } from '@elizaos/cli/utils';
import { getLocalRegistryIndex } from './registry-adapter';
import path from 'path';
import fs from 'fs-extra';

export interface DynamicPluginInfo {
  name: string;
  version: string;
  status: 'installed' | 'loaded' | 'active' | 'inactive' | 'error' | 'needs_configuration';
  path: string;
  requiredEnvVars: Array<{
    name: string;
    description: string;
    sensitive: boolean;
    isSet: boolean;
  }>;
  errorDetails?: string;
  installedAt: Date;
  lastActivated?: Date;
}

export class PluginManagementService extends Service {
  private installedPlugins: Map<string, DynamicPluginInfo> = new Map();
  private activePlugins: Map<string, Plugin> = new Map();
  private pluginComponents: Map<string, {
    actions: string[];
    services: string[];
    providers: string[];
    evaluators: string[];
    tasks: string[];
  }> = new Map();
  
  static serviceName = 'pluginManagement';

  async initialize(): Promise<void> {
    logger.info('Initializing PluginManagementService');
    
    // Load persisted plugin state
    await this.loadPersistedState();
    
    // Verify installed plugins still exist
    await this.verifyInstalledPlugins();
    
    // Register cleanup on shutdown
    this.runtime.on('shutdown', () => this.cleanup());
  }

  async start(): Promise<void> {
    logger.info('Starting PluginManagementService');
    
    // Auto-activate previously active plugins if configured
    for (const [name, info] of this.installedPlugins) {
      if (info.status === 'active' && this.areRequiredEnvVarsSet(name)) {
        try {
          await this.activatePlugin(name);
        } catch (error) {
          logger.error(`Failed to auto-activate plugin ${name}:`, error);
          info.status = 'error';
          info.errorDetails = error.message;
        }
      }
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping PluginManagementService');
    
    // Deactivate all plugins
    for (const pluginName of this.activePlugins.keys()) {
      await this.deactivatePlugin(pluginName);
    }
    
    // Save state
    await this.persistState();
  }

  async installPlugin(pluginName: string, version?: string): Promise<DynamicPluginInfo> {
    logger.info(`Installing plugin: ${pluginName}${version ? `@${version}` : ''}`);
    
    const pluginDir = this.getPluginInstallPath(pluginName);
    
    try {
      // Ensure plugin directory exists
      await fs.ensureDir(path.dirname(pluginDir));
      
      // Install using CLI utility
      const success = await installPlugin(pluginName, pluginDir, version);
      
      if (!success) {
        throw new Error('Plugin installation failed');
      }
      
      // Parse plugin metadata
      const metadata = await this.parsePluginMetadata(pluginDir);
      
      // Create plugin info
      const pluginInfo: DynamicPluginInfo = {
        name: metadata.name,
        version: metadata.version,
        status: metadata.requiredEnvVars.length > 0 ? 'needs_configuration' : 'installed',
        path: pluginDir,
        requiredEnvVars: metadata.requiredEnvVars,
        installedAt: new Date()
      };
      
      this.installedPlugins.set(pluginName, pluginInfo);
      await this.persistState();
      
      logger.success(`Plugin ${pluginName} installed successfully`);
      return pluginInfo;
      
    } catch (error) {
      logger.error(`Failed to install plugin ${pluginName}:`, error);
      throw new Error(`Plugin installation failed: ${error.message}`);
    }
  }

  async loadPlugin(pluginName: string): Promise<boolean> {
    const pluginInfo = this.installedPlugins.get(pluginName);
    
    if (!pluginInfo) {
      throw new Error(`Plugin ${pluginName} is not installed`);
    }
    
    if (pluginInfo.status === 'needs_configuration') {
      throw new Error(`Plugin ${pluginName} requires configuration before loading`);
    }
    
    if (this.activePlugins.has(pluginName)) {
      logger.warn(`Plugin ${pluginName} is already loaded`);
      return true;
    }
    
    try {
      // Load the plugin module
      const pluginModule = await this.loadPluginModule(pluginInfo.path);
      
      if (!pluginModule) {
        throw new Error('Failed to load plugin module');
      }
      
      // Register with runtime
      await this.registerPluginComponents(pluginName, pluginModule);
      
      this.activePlugins.set(pluginName, pluginModule);
      pluginInfo.status = 'loaded';
      
      await this.persistState();
      
      logger.success(`Plugin ${pluginName} loaded successfully`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to load plugin ${pluginName}:`, error);
      pluginInfo.status = 'error';
      pluginInfo.errorDetails = error.message;
      await this.persistState();
      return false;
    }
  }

  async activatePlugin(pluginName: string): Promise<boolean> {
    const pluginInfo = this.installedPlugins.get(pluginName);
    
    if (!pluginInfo) {
      throw new Error(`Plugin ${pluginName} is not installed`);
    }
    
    // Load if not already loaded
    if (!this.activePlugins.has(pluginName)) {
      const loaded = await this.loadPlugin(pluginName);
      if (!loaded) return false;
    }
    
    const plugin = this.activePlugins.get(pluginName)!;
    
    try {
      // Start plugin services
      if (plugin.services) {
        for (const service of plugin.services) {
          const serviceInstance = this.runtime.getService(service.name);
          if (serviceInstance && typeof serviceInstance.start === 'function') {
            await serviceInstance.start();
          }
        }
      }
      
      pluginInfo.status = 'active';
      pluginInfo.lastActivated = new Date();
      
      await this.persistState();
      
      logger.success(`Plugin ${pluginName} activated successfully`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to activate plugin ${pluginName}:`, error);
      pluginInfo.status = 'error';
      pluginInfo.errorDetails = error.message;
      await this.persistState();
      return false;
    }
  }

  async deactivatePlugin(pluginName: string): Promise<boolean> {
    const pluginInfo = this.installedPlugins.get(pluginName);
    const plugin = this.activePlugins.get(pluginName);
    
    if (!pluginInfo || !plugin) {
      logger.warn(`Plugin ${pluginName} is not active`);
      return true;
    }
    
    try {
      // Stop plugin services
      if (plugin.services) {
        for (const service of plugin.services) {
          const serviceInstance = this.runtime.getService(service.name);
          if (serviceInstance && typeof serviceInstance.stop === 'function') {
            await serviceInstance.stop();
          }
        }
      }
      
      pluginInfo.status = 'inactive';
      await this.persistState();
      
      logger.success(`Plugin ${pluginName} deactivated successfully`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to deactivate plugin ${pluginName}:`, error);
      return false;
    }
  }

  async unloadPlugin(pluginName: string): Promise<boolean> {
    // First deactivate
    await this.deactivatePlugin(pluginName);
    
    const pluginInfo = this.installedPlugins.get(pluginName);
    const plugin = this.activePlugins.get(pluginName);
    
    if (!plugin) {
      logger.warn(`Plugin ${pluginName} is not loaded`);
      return true;
    }
    
    try {
      // Unregister components
      await this.unregisterPluginComponents(pluginName);
      
      this.activePlugins.delete(pluginName);
      
      if (pluginInfo) {
        pluginInfo.status = 'installed';
        await this.persistState();
      }
      
      logger.success(`Plugin ${pluginName} unloaded successfully`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to unload plugin ${pluginName}:`, error);
      return false;
    }
  }

  async setPluginConfiguration(
    pluginName: string, 
    envVars: Record<string, string>
  ): Promise<DynamicPluginInfo> {
    const pluginInfo = this.installedPlugins.get(pluginName);
    
    if (!pluginInfo) {
      throw new Error(`Plugin ${pluginName} is not installed`);
    }
    
    // Store configuration securely
    await this.storePluginConfig(pluginName, envVars);
    
    // Update required env vars status
    for (const reqVar of pluginInfo.requiredEnvVars) {
      if (envVars[reqVar.name]) {
        reqVar.isSet = true;
      }
    }
    
    // Check if all required vars are now set
    if (this.areRequiredEnvVarsSet(pluginName)) {
      pluginInfo.status = 'installed';
    }
    
    await this.persistState();
    
    return pluginInfo;
  }

  // Helper methods

  private async registerPluginComponents(pluginName: string, plugin: Plugin): Promise<void> {
    const components = {
      actions: [] as string[],
      services: [] as string[],
      providers: [] as string[],
      evaluators: [] as string[],
      tasks: [] as string[]
    };
    
    // Register actions
    if (plugin.actions) {
      for (const action of plugin.actions) {
        await this.runtime.registerAction(action);
        components.actions.push(action.name);
      }
    }
    
    // Register services
    if (plugin.services) {
      for (const service of plugin.services) {
        await this.runtime.registerService(service);
        components.services.push(service.name);
      }
    }
    
    // Register providers
    if (plugin.providers) {
      for (const provider of plugin.providers) {
        await this.runtime.registerProvider(provider);
        components.providers.push(provider.name);
      }
    }
    
    // Register evaluators
    if (plugin.evaluators) {
      for (const evaluator of plugin.evaluators) {
        await this.runtime.registerEvaluator(evaluator);
        components.evaluators.push(evaluator.name);
      }
    }
    
    // Register tasks
    if (plugin.tasks) {
      for (const task of plugin.tasks) {
        await this.runtime.registerTask(task);
        components.tasks.push(task.name);
      }
    }
    
    this.pluginComponents.set(pluginName, components);
  }

  private async unregisterPluginComponents(pluginName: string): Promise<void> {
    const components = this.pluginComponents.get(pluginName);
    if (!components) return;
    
    // Unregister in reverse order
    for (const taskName of components.tasks) {
      await this.runtime.unregisterTask(taskName);
    }
    
    for (const evaluatorName of components.evaluators) {
      await this.runtime.unregisterEvaluator(evaluatorName);
    }
    
    for (const providerName of components.providers) {
      await this.runtime.unregisterProvider(providerName);
    }
    
    for (const serviceName of components.services) {
      await this.runtime.unregisterService(serviceName);
    }
    
    for (const actionName of components.actions) {
      await this.runtime.unregisterAction(actionName);
    }
    
    this.pluginComponents.delete(pluginName);
  }

  private getPluginInstallPath(pluginName: string): string {
    const sanitizedName = pluginName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(
      this.runtime.getDataDir(),
      'runtime_plugins',
      sanitizedName
    );
  }

  private async parsePluginMetadata(pluginPath: string): Promise<{
    name: string;
    version: string;
    requiredEnvVars: Array<{
      name: string;
      description: string;
      sensitive: boolean;
      isSet: boolean;
    }>;
  }> {
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);
    
    const requiredEnvVars = packageJson.elizaos?.requiredEnvVars || [];
    
    return {
      name: packageJson.name,
      version: packageJson.version,
      requiredEnvVars: requiredEnvVars.map(v => ({ ...v, isSet: false }))
    };
  }

  private async loadPluginModule(pluginPath: string): Promise<Plugin | null> {
    try {
      // Use the same loading logic as CLI
      const mainEntry = require.resolve(pluginPath);
      const module = await import(mainEntry);
      
      // Find the plugin export
      if (module.default && this.isValidPlugin(module.default)) {
        return module.default;
      }
      
      // Search named exports
      for (const key of Object.keys(module)) {
        if (this.isValidPlugin(module[key])) {
          return module[key];
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`Failed to load plugin module:`, error);
      return null;
    }
  }

  private isValidPlugin(obj: any): obj is Plugin {
    return obj && typeof obj === 'object' && obj.name && (
      obj.actions || obj.services || obj.providers || 
      obj.evaluators || obj.tasks || obj.init
    );
  }

  private areRequiredEnvVarsSet(pluginName: string): boolean {
    const info = this.installedPlugins.get(pluginName);
    if (!info) return false;
    
    return info.requiredEnvVars.every(v => v.isSet);
  }

  private async loadPersistedState(): Promise<void> {
    const statePath = path.join(
      this.runtime.getDataDir(),
      'plugin-management-state.json'
    );
    
    try {
      if (await fs.pathExists(statePath)) {
        const state = await fs.readJson(statePath);
        
        // Restore installed plugins
        for (const [name, info] of Object.entries(state.installedPlugins || {})) {
          this.installedPlugins.set(name, info as DynamicPluginInfo);
        }
      }
    } catch (error) {
      logger.error('Failed to load plugin management state:', error);
    }
  }

  private async persistState(): Promise<void> {
    const statePath = path.join(
      this.runtime.getDataDir(),
      'plugin-management-state.json'
    );
    
    const state = {
      installedPlugins: Object.fromEntries(this.installedPlugins),
      lastUpdated: new Date().toISOString()
    };
    
    try {
      await fs.writeJson(statePath, state, { spaces: 2 });
    } catch (error) {
      logger.error('Failed to persist plugin management state:', error);
    }
  }

  private async verifyInstalledPlugins(): Promise<void> {
    for (const [name, info] of this.installedPlugins) {
      if (!await fs.pathExists(info.path)) {
        logger.warn(`Plugin ${name} installation directory missing, removing from state`);
        this.installedPlugins.delete(name);
      }
    }
  }

  private async storePluginConfig(
    pluginName: string, 
    envVars: Record<string, string>
  ): Promise<void> {
    // Store in runtime's secure config storage
    const configKey = `plugin_config_${pluginName}`;
    await this.runtime.setSecureConfig(configKey, envVars);
  }

  private async getPluginConfig(pluginName: string): Promise<Record<string, string>> {
    const configKey = `plugin_config_${pluginName}`;
    return await this.runtime.getSecureConfig(configKey) || {};
  }

  private async cleanup(): Promise<void> {
    await this.stop();
  }

  // Public API methods

  getPluginInfo(pluginName: string): DynamicPluginInfo | undefined {
    return this.installedPlugins.get(pluginName);
  }

  listInstalledPlugins(): DynamicPluginInfo[] {
    return Array.from(this.installedPlugins.values());
  }

  isPluginActive(pluginName: string): boolean {
    const info = this.installedPlugins.get(pluginName);
    return info?.status === 'active';
  }

  getPluginRequiredConfiguration(pluginName: string): Array<{
    name: string;
    description: string;
    sensitive: boolean;
    isSet: boolean;
  }> {
    const info = this.installedPlugins.get(pluginName);
    return info?.requiredEnvVars || [];
  }
}
```

### 2. Runtime Extensions

**File:** `packages/core/src/runtime-extensions.ts`

```typescript
import { type IAgentRuntime, type Plugin, type Action, type Provider, type Service, type Evaluator, type Task } from '@elizaos/core';

// Extend the AgentRuntime interface
declare module '@elizaos/core' {
  interface IAgentRuntime {
    registerAction(action: Action): Promise<void>;
    unregisterAction(actionName: string): Promise<void>;
    registerService(service: Service): Promise<void>;
    unregisterService(serviceName: string): Promise<void>;
    registerProvider(provider: Provider): Promise<void>;
    unregisterProvider(providerName: string): Promise<void>;
    registerEvaluator(evaluator: Evaluator): Promise<void>;
    unregisterEvaluator(evaluatorName: string): Promise<void>;
    registerTask(task: Task): Promise<void>;
    unregisterTask(taskName: string): Promise<void>;
    getDataDir(): string;
    setSecureConfig(key: string, value: any): Promise<void>;
    getSecureConfig(key: string): Promise<any>;
  }
}

// Implementation helpers for AgentRuntime
export class RuntimeExtensions {
  static async registerAction(runtime: IAgentRuntime, action: Action): Promise<void> {
    // Access internal action manager
    const actionManager = (runtime as any).actionManager;
    if (!actionManager) {
      throw new Error('Action manager not available');
    }
    
    actionManager.registerAction(action);
    
    // Re-initialize action if needed
    if (typeof action.init === 'function') {
      await action.init(runtime);
    }
  }

  static async unregisterAction(runtime: IAgentRuntime, actionName: string): Promise<void> {
    const actionManager = (runtime as any).actionManager;
    if (!actionManager) {
      throw new Error('Action manager not available');
    }
    
    actionManager.removeAction(actionName);
  }

  // Similar implementations for other component types...
}
```

### 3. Registry Adapter

**File:** `packages/core/src/services/registry-adapter.ts`

```typescript
import { logger } from '@elizaos/core';

interface RegistryEntry {
  name: string;
  description?: string;
  repository: string;
  npm?: {
    repo: string;
    v1?: string;
  };
  git?: {
    repo: string;
    v1?: {
      branch?: string;
      version?: string;
    };
  };
}

const REGISTRY_URL = 'https://raw.githubusercontent.com/elizaos-plugins/registry/refs/heads/main/index.json';
const CACHE_DURATION = 3600000; // 1 hour

let registryCache: {
  data: Record<string, RegistryEntry>;
  timestamp: number;
} | null = null;

export async function getLocalRegistryIndex(): Promise<Record<string, RegistryEntry>> {
  // Check cache first
  if (registryCache && Date.now() - registryCache.timestamp < CACHE_DURATION) {
    return registryCache.data;
  }
  
  try {
    const response = await fetch(REGISTRY_URL);
    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    registryCache = {
      data,
      timestamp: Date.now()
    };
    
    return data;
  } catch (error) {
    logger.error('Failed to fetch plugin registry:', error);
    
    // Return cached data if available
    if (registryCache) {
      logger.warn('Using stale registry cache');
      return registryCache.data;
    }
    
    // Return empty registry as fallback
    return {};
  }
}

export function normalizePluginName(pluginName: string): string[] {
  const baseName = pluginName
    .replace(/^@elizaos\//, '')
    .replace(/^@elizaos-plugins\//, '')
    .replace(/^plugin-/, '');
  
  return [
    pluginName,
    baseName,
    `plugin-${baseName}`,
    `@elizaos/${baseName}`,
    `@elizaos/plugin-${baseName}`,
    `@elizaos-plugins/${baseName}`,
    `@elizaos-plugins/plugin-${baseName}`
  ];
}
```

### 4. Providers

**File:** `packages/core/src/providers/plugin-providers.ts`

```typescript
import { type IProvider, type IAgentRuntime } from '@elizaos/core';
import { PluginManagementService } from '../services/plugin-management-service';
import { getLocalRegistryIndex } from '../services/registry-adapter';

export const availablePluginsProvider: IProvider = {
  name: 'availablePlugins',
  description: 'Provides list of available plugins from the registry',
  
  async getContext(runtime: IAgentRuntime): Promise<string> {
    const registry = await getLocalRegistryIndex();
    
    const plugins = Object.entries(registry).map(([name, entry]) => ({
      name,
      description: entry.description || 'No description available',
      repository: entry.repository
    }));
    
    return JSON.stringify(plugins, null, 2);
  }
};

export const dynamicPluginsStatusProvider: IProvider = {
  name: 'dynamicPluginsStatus',
  description: 'Provides status of installed dynamic plugins',
  
  async getContext(runtime: IAgentRuntime): Promise<string> {
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
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
    
    return JSON.stringify(status, null, 2);
  }
};
```

### 5. Actions

**File:** `packages/core/src/actions/plugin-actions.ts`

```typescript
import { type Action, type IAgentRuntime, type ActionInput, logger } from '@elizaos/core';
import { PluginManagementService } from '../services/plugin-management-service';
import { z } from 'zod';

export const listAvailablePluginsAction: Action = {
  name: 'listAvailablePlugins',
  description: 'List all available plugins from the registry',
  
  similes: [
    'show available plugins',
    'what plugins can I install',
    'list plugin registry'
  ],
  
  inputSchema: z.object({}),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const availablePlugins = await runtime.providers.availablePlugins.getContext(runtime);
    
    return `Available plugins:\n${availablePlugins}`;
  }
};

export const installPluginAction: Action = {
  name: 'installPlugin',
  description: 'Install a plugin from the registry',
  
  similes: [
    'install plugin',
    'add plugin',
    'setup plugin'
  ],
  
  inputSchema: z.object({
    pluginName: z.string().describe('Name of the plugin to install'),
    version: z.string().optional().describe('Specific version to install')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { pluginName, version } = input as { pluginName: string; version?: string };
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const pluginInfo = await pluginService.installPlugin(pluginName, version);
      
      let response = `Successfully installed ${pluginInfo.name} v${pluginInfo.version}`;
      
      if (pluginInfo.requiredEnvVars.length > 0) {
        response += '\n\nThis plugin requires the following environment variables:';
        for (const envVar of pluginInfo.requiredEnvVars) {
          response += `\n- ${envVar.name}: ${envVar.description}`;
        }
        response += '\n\nPlease configure these before activating the plugin.';
      }
      
      return response;
    } catch (error) {
      logger.error('Failed to install plugin:', error);
      return `Failed to install plugin: ${error.message}`;
    }
  }
};

export const configurePluginAction: Action = {
  name: 'configurePlugin',
  description: 'Configure environment variables for a plugin',
  
  similes: [
    'setup plugin config',
    'set plugin environment',
    'configure plugin'
  ],
  
  inputSchema: z.object({
    pluginName: z.string().describe('Name of the plugin to configure'),
    configuration: z.record(z.string()).describe('Environment variable values')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { pluginName, configuration } = input as {
      pluginName: string;
      configuration: Record<string, string>;
    };
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const pluginInfo = await pluginService.setPluginConfiguration(pluginName, configuration);
      
      const stillMissing = pluginInfo.requiredEnvVars.filter(v => !v.isSet);
      
      if (stillMissing.length === 0) {
        return `Plugin ${pluginName} is now fully configured and ready to activate`;
      } else {
        return `Plugin ${pluginName} configuration updated. Still missing: ${stillMissing.map(v => v.name).join(', ')}`;
      }
    } catch (error) {
      logger.error('Failed to configure plugin:', error);
      return `Failed to configure plugin: ${error.message}`;
    }
  }
};

export const activatePluginAction: Action = {
  name: 'activatePlugin',
  description: 'Activate an installed plugin',
  
  similes: [
    'enable plugin',
    'start plugin',
    'turn on plugin'
  ],
  
  inputSchema: z.object({
    pluginName: z.string().describe('Name of the plugin to activate')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { pluginName } = input as { pluginName: string };
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const success = await pluginService.activatePlugin(pluginName);
      
      if (success) {
        return `Plugin ${pluginName} has been activated successfully`;
      } else {
        return `Failed to activate plugin ${pluginName}. Check logs for details.`;
      }
    } catch (error) {
      logger.error('Failed to activate plugin:', error);
      return `Failed to activate plugin: ${error.message}`;
    }
  }
};

export const deactivatePluginAction: Action = {
  name: 'deactivatePlugin',
  description: 'Deactivate an active plugin',
  
  similes: [
    'disable plugin',
    'stop plugin',
    'turn off plugin'
  ],
  
  inputSchema: z.object({
    pluginName: z.string().describe('Name of the plugin to deactivate')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { pluginName } = input as { pluginName: string };
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const success = await pluginService.deactivatePlugin(pluginName);
      
      if (success) {
        return `Plugin ${pluginName} has been deactivated`;
      } else {
        return `Failed to deactivate plugin ${pluginName}`;
      }
    } catch (error) {
      logger.error('Failed to deactivate plugin:', error);
      return `Failed to deactivate plugin: ${error.message}`;
    }
  }
};

export const unloadPluginAction: Action = {
  name: 'unloadPlugin',
  description: 'Unload a plugin from memory',
  
  similes: [
    'remove plugin from memory',
    'unload plugin'
  ],
  
  inputSchema: z.object({
    pluginName: z.string().describe('Name of the plugin to unload')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { pluginName } = input as { pluginName: string };
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    
    if (!pluginService) {
      return 'Plugin management service not available';
    }
    
    try {
      const success = await pluginService.unloadPlugin(pluginName);
      
      if (success) {
        return `Plugin ${pluginName} has been unloaded`;
      } else {
        return `Failed to unload plugin ${pluginName}`;
      }
    } catch (error) {
      logger.error('Failed to unload plugin:', error);
      return `Failed to unload plugin: ${error.message}`;
    }
  }
};
```

### 6. Plugin Package

**File:** `packages/plugin-dynamic-plugins/src/index.ts`

```typescript
import { type Plugin } from '@elizaos/core';
import { PluginManagementService } from './services/plugin-management-service';
import {
  availablePluginsProvider,
  dynamicPluginsStatusProvider
} from './providers/plugin-providers';
import {
  listAvailablePluginsAction,
  installPluginAction,
  configurePluginAction,
  activatePluginAction,
  deactivatePluginAction,
  unloadPluginAction
} from './actions/plugin-actions';

export const dynamicPluginsPlugin: Plugin = {
  name: 'dynamic-plugins',
  description: 'Enables dynamic plugin management at runtime',
  
  services: [PluginManagementService],
  
  providers: [
    availablePluginsProvider,
    dynamicPluginsStatusProvider
  ],
  
  actions: [
    listAvailablePluginsAction,
    installPluginAction,
    configurePluginAction,
    activatePluginAction,
    deactivatePluginAction,
    unloadPluginAction
  ]
};

export default dynamicPluginsPlugin;
```

## Testing Strategy

### Unit Tests

```typescript
// packages/plugin-dynamic-plugins/src/__tests__/plugin-management-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManagementService } from '../services/plugin-management-service';
import { createMockRuntime } from '@elizaos/test-utils';

describe('PluginManagementService', () => {
  let service: PluginManagementService;
  let mockRuntime: IAgentRuntime;
  
  beforeEach(() => {
    mockRuntime = createMockRuntime();
    service = new PluginManagementService();
    service.runtime = mockRuntime;
  });
  
  describe('installPlugin', () => {
    it('should install a plugin from the registry', async () => {
      const pluginInfo = await service.installPlugin('@elizaos/plugin-example');
      
      expect(pluginInfo).toBeDefined();
      expect(pluginInfo.name).toBe('@elizaos/plugin-example');
      expect(pluginInfo.status).toBe('installed');
    });
    
    it('should identify plugins needing configuration', async () => {
      const pluginInfo = await service.installPlugin('@elizaos/plugin-with-config');
      
      expect(pluginInfo.status).toBe('needs_configuration');
      expect(pluginInfo.requiredEnvVars).toHaveLength(2);
    });
  });
  
  describe('loadPlugin', () => {
    it('should load an installed plugin', async () => {
      await service.installPlugin('@elizaos/plugin-example');
      const success = await service.loadPlugin('@elizaos/plugin-example');
      
      expect(success).toBe(true);
      expect(service.isPluginActive('@elizaos/plugin-example')).toBe(false);
    });
    
    it('should reject loading unconfigured plugins', async () => {
      await service.installPlugin('@elizaos/plugin-with-config');
      
      await expect(service.loadPlugin('@elizaos/plugin-with-config'))
        .rejects.toThrow('requires configuration');
    });
  });
  
  describe('dynamic component registration', () => {
    it('should register plugin components with runtime', async () => {
      const registerActionSpy = vi.spyOn(mockRuntime, 'registerAction');
      const registerServiceSpy = vi.spyOn(mockRuntime, 'registerService');
      
      await service.installPlugin('@elizaos/plugin-example');
      await service.loadPlugin('@elizaos/plugin-example');
      
      expect(registerActionSpy).toHaveBeenCalled();
      expect(registerServiceSpy).toHaveBeenCalled();
    });
  });
});
```

### Integration Tests

```typescript
// packages/plugin-dynamic-plugins/src/__tests__/integration.test.ts
import { describe, it, expect } from 'vitest';
import { AgentRuntime } from '@elizaos/core';
import { dynamicPluginsPlugin } from '../index';

describe('Dynamic Plugins Integration', () => {
  it('should allow full plugin lifecycle', async () => {
    const runtime = new AgentRuntime({
      character: { name: 'Test Agent' },
      plugins: [dynamicPluginsPlugin]
    });
    
    await runtime.initialize();
    
    // Install plugin
    const installResult = await runtime.executeAction('installPlugin', {
      pluginName: '@elizaos/plugin-example'
    });
    
    expect(installResult).toContain('Successfully installed');
    
    // Configure if needed
    const configResult = await runtime.executeAction('configurePlugin', {
      pluginName: '@elizaos/plugin-example',
      configuration: {
        API_KEY: 'test-key'
      }
    });
    
    expect(configResult).toContain('configured');
    
    // Activate plugin
    const activateResult = await runtime.executeAction('activatePlugin', {
      pluginName: '@elizaos/plugin-example'
    });
    
    expect(activateResult).toContain('activated successfully');
    
    // Verify plugin is active
    const status = await runtime.providers.dynamicPluginsStatus.getContext(runtime);
    expect(status).toContain('"status": "active"');
  });
});
```

## Security Considerations

1. **Plugin Validation**: All plugins must be validated before loading
2. **Sandboxing**: Plugin code runs in the same process but with limited access
3. **Environment Variables**: Sensitive configs stored securely, not in plain text
4. **Registry Trust**: Only official registry sources are trusted by default
5. **Permission Model**: Future enhancement to add permission requirements

## Performance Optimizations

1. **Lazy Loading**: Plugins loaded only when needed
2. **Registry Caching**: Registry data cached to reduce network calls
3. **Parallel Installation**: Multiple plugins can be installed concurrently
4. **Component Registration**: Optimized to minimize runtime overhead
5. **State Persistence**: Efficient JSON-based state management

## Error Handling

1. **Installation Failures**: Graceful fallback with detailed error messages
2. **Loading Failures**: Plugin marked as error state, doesn't crash agent
3. **Runtime Errors**: Plugin errors isolated from agent runtime
4. **Configuration Errors**: Clear messaging about missing requirements
5. **Network Failures**: Offline mode with cached registry data

## Future Enhancements

1. **Plugin Permissions**: Define what resources plugins can access
2. **Plugin Dependencies**: Handle inter-plugin dependencies
3. **Plugin Updates**: Automated update checking and installation
4. **Plugin Marketplace UI**: Web interface for browsing plugins
5. **Plugin Analytics**: Track plugin usage and performance metrics 