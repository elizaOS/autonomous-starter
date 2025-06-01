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
        } catch (error: any) {
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
      
    } catch (error: any) {
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
      
    } catch (error: any) {
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
        for (const serviceDef of plugin.services) {
          // Assuming serviceDef is a class constructor with a static serviceName or name property
           // plugins should register service *definitions* (classes), not instances.
          // The runtime (or plugin manager) should instantiate them.
          // Let's assume serviceDef has a static `serviceType` or `name` to get the service from runtime
          const serviceName = (serviceDef as any).serviceType || (serviceDef as any).name || (serviceDef as any).serviceName;
          if (serviceName) {
            const serviceInstance = this.runtime.getService(serviceName);
            if (serviceInstance && typeof (serviceInstance as any).start === 'function') {
              await (serviceInstance as any).start();
            }
          } else {
            logger.warn(`Cannot determine service name for plugin ${pluginName}. Service will not be started.`);
          }
        }
      }
      
      pluginInfo.status = 'active';
      pluginInfo.lastActivated = new Date();
      
      await this.persistState();
      
      logger.success(`Plugin ${pluginName} activated successfully`);
      return true;
      
    } catch (error: any) {
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
         for (const serviceDef of plugin.services) {
          const serviceName = (serviceDef as any).serviceType || (serviceDef as any).name || (serviceDef as any).serviceName;
          if (serviceName) {
            const serviceInstance = this.runtime.getService(serviceName);
            if (serviceInstance && typeof (serviceInstance as any).stop === 'function') {
              await (serviceInstance as any).stop();
            }
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
      pluginInfo.status = 'installed'; // Status changes to 'installed' if all config is set
    } else {
      pluginInfo.status = 'needs_configuration'; // Remains needs_configuration if not all set
    }
    
    await this.persistState();
    
    return pluginInfo;
  }

  // Helper methods

  private async registerPluginComponents(pluginName: string, plugin: Plugin): Promise<void> {
    const components = {
      actions: [] as string[],
      services: [] as string[], // Store service names or identifiers
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
      for (const serviceClass of plugin.services) { // serviceClass should be a class constructor
        await this.runtime.registerService(serviceClass); // Runtime handles instantiation
        const serviceName = (serviceClass as any).serviceType || (serviceClass as any).name || (serviceClass as any).serviceName;
        if(serviceName) components.services.push(serviceName);
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
    
    // Register tasks (assuming TaskWorker has a name property)
    if (plugin.tasks) {
      for (const taskWorker of plugin.tasks) { // Assuming plugin.tasks is an array of TaskWorker
        await this.runtime.registerTaskWorker(taskWorker);
        components.tasks.push(taskWorker.name);
      }
    }
    
    this.pluginComponents.set(pluginName, components);
  }

  private async unregisterPluginComponents(pluginName: string): Promise<void> {
    const components = this.pluginComponents.get(pluginName);
    if (!components) return;
    
    // Unregister in reverse order
    for (const taskName of components.tasks) {
      await this.runtime.unregisterTaskWorker(taskName);
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
    
    const requiredEnvVarsConfig = packageJson.elizaos?.requiredEnvVars || [];
    const requiredEnvVars = requiredEnvVarsConfig.map((v: any) => ({
      name: v.name,
      description: v.description,
      sensitive: v.sensitive || false, // Default to false if not specified
      isSet: false // Initially, no var is set
    }));
    
    return {
      name: packageJson.name,
      version: packageJson.version,
      requiredEnvVars
    };
  }

  private async loadPluginModule(pluginPath: string): Promise<Plugin | null> {
    try {
      // Dynamically import the plugin's main entry file
      // The actual main file path might be specified in package.json "main" field
      const packageJsonPath = path.join(pluginPath, 'package.json');
      let mainEntry = pluginPath; // Default to pluginPath if package.json or main is not found

      if (await fs.pathExists(packageJsonPath)) {
          const packageJson = await fs.readJson(packageJsonPath);
          if (packageJson.main) {
              mainEntry = path.resolve(pluginPath, packageJson.main);
          }
      }
      
      // Ensure the path is absolute for dynamic import or use a resolver if needed
      // For ES modules, import() expects a URL or an absolute path.
      // If mainEntry is relative, resolve it.
      if (!path.isAbsolute(mainEntry)) {
          mainEntry = path.resolve(mainEntry);
      }

      const module = await import(mainEntry);
      
      // Find the plugin export
      // Common patterns: module.default, or a named export like 'pluginNamePlugin'
      if (module.default && this.isValidPlugin(module.default)) {
        return module.default;
      }
      
      for (const key of Object.keys(module)) {
        if (this.isValidPlugin(module[key])) {
          return module[key];
        }
      }
      
      logger.error(`Could not find a valid plugin export in ${mainEntry}`);
      return null;
    } catch (error: any) {
      logger.error(`Failed to load plugin module from ${pluginPath}:`, error);
      return null;
    }
  }

  private isValidPlugin(obj: any): obj is Plugin {
    // Add checks for new plugin components like tasks, events, routes if necessary
    return obj && typeof obj === 'object' && obj.name && (
      obj.actions || obj.services || obj.providers || 
      obj.evaluators || obj.tasks || obj.init || obj.events || obj.routes
    );
  }

  private areRequiredEnvVarsSet(pluginName: string): boolean {
    const info = this.installedPlugins.get(pluginName);
    if (!info || !info.requiredEnvVars) return true; // No vars required, or info missing (should not happen)
    
    return info.requiredEnvVars.every(v => v.isSet);
  }

  private async loadPersistedState(): Promise<void> {
    const statePath = path.join(
      this.runtime.getDataDir(),
      'plugin-management-state.json'
    );
    
    try {
      if (await fs.pathExists(statePath)) {
        const stateData = await fs.readJson(statePath);
        if (stateData.installedPlugins) {
            for (const [name, infoObj] of Object.entries(stateData.installedPlugins)) {
              // Make sure infoObj is correctly typed before setting
              const info = infoObj as DynamicPluginInfo;
              // Convert date strings back to Date objects
              if (info.installedAt) info.installedAt = new Date(info.installedAt);
              if (info.lastActivated) info.lastActivated = new Date(info.lastActivated);
              this.installedPlugins.set(name, info);
            }
        }
      }
    } catch (error) {
      logger.error('Failed to load plugin management state:', error);
      // Optionally, reset state or handle corruption
      this.installedPlugins.clear();
    }
  }

  private async persistState(): Promise<void> {
    const statePath = path.join(
      this.runtime.getDataDir(),
      'plugin-management-state.json'
    );
    
    // Convert Map to an object for JSON serialization
    const installedPluginsObject = Object.fromEntries(this.installedPlugins.entries());

    const state = {
      installedPlugins: installedPluginsObject,
      lastUpdated: new Date().toISOString()
    };
    
    try {
      await fs.ensureDir(path.dirname(statePath)); // Ensure directory exists
      await fs.writeJson(statePath, state, { spaces: 2 });
    } catch (error) {
      logger.error('Failed to persist plugin management state:', error);
    }
  }

  private async verifyInstalledPlugins(): Promise<void> {
    const pluginsToDelete: string[] = [];
    for (const [name, info] of this.installedPlugins) {
      if (!await fs.pathExists(info.path)) {
        logger.warn(`Plugin ${name} installation directory ${info.path} missing, removing from state`);
        pluginsToDelete.push(name);
      }
    }
    if (pluginsToDelete.length > 0) {
        pluginsToDelete.forEach(name => this.installedPlugins.delete(name));
        await this.persistState(); // Persist changes if any plugins were removed
    }
  }

  private async storePluginConfig(
    pluginName: string, 
    envVars: Record<string, string>
  ): Promise<void> {
    const configKey = `plugin_config_${pluginName.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
    await this.runtime.setSecureConfig(configKey, envVars);
  }

  private async getPluginConfig(pluginName: string): Promise<Record<string, string> | null> {
    const configKey = `plugin_config_${pluginName.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
    const config = await this.runtime.getSecureConfig(configKey);
    return config || null; // Return null if no config found
  }


  private async cleanup(): Promise<void> {
    logger.info('PluginManagementService cleanup initiated.');
    await this.stop(); // This already calls persistState
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
    if (!info) {
        throw new Error(`Plugin ${pluginName} not found.`);
    }
    return info.requiredEnvVars || [];
  }
} 