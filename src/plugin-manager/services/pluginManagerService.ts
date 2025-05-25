import {
  Service,
  type IAgentRuntime,
  type ServiceTypeName,
  logger,
  type Plugin,
  createUniqueUuid,
} from '@elizaos/core';
import {
  PluginStatus,
  type PluginState,
  type PluginRegistry,
  type LoadPluginParams,
  type UnloadPluginParams,
  type PluginManagerConfig,
  EventType,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class PluginManagerService extends Service implements PluginRegistry {
  static override serviceType: ServiceTypeName = 'PLUGIN_MANAGER' as ServiceTypeName;
  override capabilityDescription = 'Manages dynamic loading and unloading of plugins at runtime';

  public plugins: Map<string, PluginState> = new Map();
  private pluginManagerConfig: PluginManagerConfig;
  private originalPlugins: Plugin[] = [];
  private originalActions: Set<string> = new Set();
  private originalProviders: Set<string> = new Set();
  private originalEvaluators: Set<string> = new Set();
  private originalServices: Set<string> = new Set();

  constructor(runtime: IAgentRuntime, config?: PluginManagerConfig) {
    super(runtime);
    this.pluginManagerConfig = {
      maxBuildAttempts: 3,
      buildTimeout: 60000,
      pluginDirectory: './plugins',
      enableHotReload: true,
      ...config,
    };

    // Store original plugins from runtime initialization
    this.originalPlugins = [...(runtime.plugins || [])];

    // Store original component names
    this.storeOriginalComponents();

    // Initialize registry with existing plugins
    this.initializeRegistry();

    logger.info('[PluginManagerService] Initialized with config:', this.pluginManagerConfig);
  }

  static async start(
    runtime: IAgentRuntime,
    config?: PluginManagerConfig
  ): Promise<PluginManagerService> {
    const service = new PluginManagerService(runtime, config);
    return service;
  }

  private storeOriginalComponents(): void {
    // Store original action names
    if (this.runtime.actions) {
      for (const action of this.runtime.actions) {
        this.originalActions.add(action.name);
      }
    }

    // Store original provider names
    if (this.runtime.providers) {
      for (const provider of this.runtime.providers) {
        this.originalProviders.add(provider.name);
      }
    }

    // Store original evaluator names
    if (this.runtime.evaluators) {
      for (const evaluator of this.runtime.evaluators) {
        this.originalEvaluators.add(evaluator.name);
      }
    }

    // Store original service types
    if (this.runtime.services) {
      for (const [serviceType] of this.runtime.services) {
        this.originalServices.add(serviceType);
      }
    }
  }

  private initializeRegistry(): void {
    // Register existing plugins
    for (const plugin of this.originalPlugins) {
      const pluginId = createUniqueUuid(this.runtime, plugin.name);
      const state: PluginState = {
        id: pluginId,
        name: plugin.name,
        status: PluginStatus.LOADED,
        plugin,
        missingEnvVars: [],
        buildLog: [],
        createdAt: Date.now(),
        loadedAt: Date.now(),
      };
      this.plugins.set(pluginId, state);
    }
  }

  getPlugin(id: string): PluginState | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginState[] {
    return Array.from(this.plugins.values());
  }

  getLoadedPlugins(): PluginState[] {
    return this.getAllPlugins().filter((p) => p.status === PluginStatus.LOADED);
  }

  updatePluginState(id: string, update: Partial<PluginState>): void {
    const existing = this.plugins.get(id);
    if (existing) {
      this.plugins.set(id, { ...existing, ...update });
    }
  }

  async loadPlugin({ pluginId, force = false }: LoadPluginParams): Promise<void> {
    const pluginState = this.plugins.get(pluginId);

    if (!pluginState) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    if (pluginState.status === PluginStatus.LOADED && !force) {
      logger.info(`[PluginManagerService] Plugin ${pluginState.name} already loaded`);
      return;
    }

    if (
      pluginState.status !== PluginStatus.READY &&
      pluginState.status !== PluginStatus.UNLOADED &&
      !force
    ) {
      throw new Error(
        `Plugin ${pluginState.name} is not ready to load (status: ${pluginState.status})`
      );
    }

    if (!pluginState.plugin) {
      throw new Error(`Plugin ${pluginState.name} has no plugin instance`);
    }

    try {
      logger.info(`[PluginManagerService] Loading plugin ${pluginState.name}...`);

      // Emit loading event
      await this.runtime.emitEvent(EventType.PLUGIN_BUILDING, {
        pluginId,
        pluginName: pluginState.name,
      });

      // Initialize plugin if it has an init function
      if (pluginState.plugin.init) {
        await pluginState.plugin.init({}, this.runtime);
      }

      // Register plugin components
      await this.registerPluginComponents(pluginState.plugin);

      // Update state
      this.updatePluginState(pluginId, {
        status: PluginStatus.LOADED,
        loadedAt: Date.now(),
        error: undefined,
      });

      // Emit loaded event
      await this.runtime.emitEvent(EventType.PLUGIN_LOADED, {
        pluginId,
        pluginName: pluginState.name,
      });

      logger.success(`[PluginManagerService] Plugin ${pluginState.name} loaded successfully`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[PluginManagerService] Failed to load plugin ${pluginState.name}:`, errorMsg);

      this.updatePluginState(pluginId, {
        status: PluginStatus.ERROR,
        error: errorMsg,
      });

      await this.runtime.emitEvent(EventType.PLUGIN_ERROR, {
        pluginId,
        pluginName: pluginState.name,
        error: errorMsg,
      });

      throw error;
    }
  }

  async unloadPlugin({ pluginId }: UnloadPluginParams): Promise<void> {
    const pluginState = this.plugins.get(pluginId);

    if (!pluginState) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    if (pluginState.status !== PluginStatus.LOADED) {
      logger.info(`[PluginManagerService] Plugin ${pluginState.name} is not loaded`);
      return;
    }

    // Check if this is an original plugin
    const isOriginal = this.originalPlugins.some((p) => p.name === pluginState.name);
    if (isOriginal) {
      throw new Error(`Cannot unload original plugin ${pluginState.name}`);
    }

    try {
      logger.info(`[PluginManagerService] Unloading plugin ${pluginState.name}...`);

      if (!pluginState.plugin) {
        throw new Error(`Plugin ${pluginState.name} has no plugin instance`);
      }

      // Unregister plugin components
      await this.unregisterPluginComponents(pluginState.plugin);

      // Update state
      this.updatePluginState(pluginId, {
        status: PluginStatus.UNLOADED,
        unloadedAt: Date.now(),
      });

      // Emit unloaded event
      await this.runtime.emitEvent(EventType.PLUGIN_UNLOADED, {
        pluginId,
        pluginName: pluginState.name,
      });

      logger.success(`[PluginManagerService] Plugin ${pluginState.name} unloaded successfully`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[PluginManagerService] Failed to unload plugin ${pluginState.name}:`, errorMsg);

      this.updatePluginState(pluginId, {
        status: PluginStatus.ERROR,
        error: errorMsg,
      });

      throw error;
    }
  }

  async registerPlugin(plugin: Plugin): Promise<string> {
    const pluginId = createUniqueUuid(this.runtime, plugin.name);

    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${plugin.name} already registered`);
    }

    const state: PluginState = {
      id: pluginId,
      name: plugin.name,
      status: PluginStatus.READY,
      plugin,
      missingEnvVars: [],
      buildLog: [],
      createdAt: Date.now(),
    };

    this.plugins.set(pluginId, state);

    await this.runtime.emitEvent(EventType.PLUGIN_READY, {
      pluginId,
      pluginName: plugin.name,
    });

    return pluginId;
  }

  private async registerPluginComponents(plugin: Plugin): Promise<void> {
    // Register actions
    if (plugin.actions) {
      for (const action of plugin.actions) {
        await this.runtime.registerAction(action);
      }
    }

    // Register providers
    if (plugin.providers) {
      for (const provider of plugin.providers) {
        await this.runtime.registerProvider(provider);
      }
    }

    // Register evaluators
    if (plugin.evaluators) {
      for (const evaluator of plugin.evaluators) {
        await this.runtime.registerEvaluator(evaluator);
      }
    }

    // Register services - services are registered differently
    if (plugin.services) {
      for (const ServiceClass of plugin.services) {
        try {
          const service = await ServiceClass.start(this.runtime);
          const serviceType = ServiceClass.serviceType as ServiceTypeName;
          this.runtime.services.set(serviceType, service);
        } catch (error) {
          logger.error(`Failed to register service ${ServiceClass.serviceType}:`, error);
        }
      }
    }

    // Add plugin to runtime plugins array
    if (!this.runtime.plugins) {
      this.runtime.plugins = [];
    }
    this.runtime.plugins.push(plugin);
  }

  private async unregisterPluginComponents(plugin: Plugin): Promise<void> {
    // Remove actions (by filtering out plugin actions)
    if (plugin.actions && this.runtime.actions) {
      for (const action of plugin.actions) {
        if (!this.originalActions.has(action.name)) {
          const index = this.runtime.actions.findIndex((a) => a.name === action.name);
          if (index !== -1) {
            this.runtime.actions.splice(index, 1);
          }
        }
      }
    }

    // Remove providers (by filtering out plugin providers)
    if (plugin.providers && this.runtime.providers) {
      for (const provider of plugin.providers) {
        if (!this.originalProviders.has(provider.name)) {
          const index = this.runtime.providers.findIndex((p) => p.name === provider.name);
          if (index !== -1) {
            this.runtime.providers.splice(index, 1);
          }
        }
      }
    }

    // Remove evaluators (by filtering out plugin evaluators)
    if (plugin.evaluators && this.runtime.evaluators) {
      for (const evaluator of plugin.evaluators) {
        if (!this.originalEvaluators.has(evaluator.name)) {
          const index = this.runtime.evaluators.findIndex((e) => e.name === evaluator.name);
          if (index !== -1) {
            this.runtime.evaluators.splice(index, 1);
          }
        }
      }
    }

    // Stop and remove services
    if (plugin.services && this.runtime.services) {
      for (const ServiceClass of plugin.services) {
        const serviceType = ServiceClass.serviceType;
        if (!this.originalServices.has(serviceType)) {
          const service = this.runtime.services.get(serviceType as ServiceTypeName);
          if (service) {
            await service.stop();
            this.runtime.services.delete(serviceType as ServiceTypeName);
          }
        }
      }
    }

    // Remove plugin from runtime plugins array
    if (this.runtime.plugins) {
      const index = this.runtime.plugins.findIndex((p) => p.name === plugin.name);
      if (index !== -1) {
        this.runtime.plugins.splice(index, 1);
      }
    }
  }

  async stop(): Promise<void> {
    logger.info('[PluginManagerService] Stopping...');
    // Clean up any resources
  }
}
