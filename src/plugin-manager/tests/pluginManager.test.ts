import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  type IAgentRuntime,
  type Plugin,
  type Action,
  type Provider,
  Service,
  type ServiceTypeName,
  createUniqueUuid,
  AgentRuntime,
  logger,
  ModelType,
} from '@elizaos/core';
import { PluginManagerService } from '../services/pluginManagerService';
import { pluginStateProvider } from '../providers/pluginStateProvider';
import { loadPluginAction } from '../actions/loadPlugin';
import { unloadPluginAction } from '../actions/unloadPlugin';
import { PluginStatus, type PluginState } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Mock plugin for testing
const createMockPlugin = (name: string): Plugin => ({
  name,
  description: `Mock ${name} plugin`,
  actions: [
    {
      name: `${name.toUpperCase()}_ACTION`,
      similes: [`${name} action`],
      description: `Action for ${name}`,
      examples: [],
      validate: async () => true,
      handler: async () => {},
    },
  ],
  providers: [
    {
      name: `${name}Provider`,
      description: `Provider for ${name}`,
      get: async () => ({ text: `${name} provider data`, values: {}, data: {} }),
    },
  ],
});

// Mock service for testing
class MockService extends Service {
  static serviceType: ServiceTypeName = 'MOCK_SERVICE' as ServiceTypeName;
  override capabilityDescription = 'Mock service for testing';

  static async start(runtime: IAgentRuntime): Promise<Service> {
    return new MockService(runtime);
  }

  async stop(): Promise<void> {
    // Cleanup
  }
}

const createMockPluginWithService = (name: string): Plugin => ({
  ...createMockPlugin(name),
  services: [MockService],
});

// Create a mock runtime for testing
const createMockRuntime = (): IAgentRuntime => {
  const services = new Map<ServiceTypeName, Service>();
  const actions: Action[] = [];
  const providers: Provider[] = [];
  const plugins: Plugin[] = [];

  return {
    agentId: uuidv4() as any,
    plugins,
    actions,
    providers,
    services,

    registerAction: vi.fn(async (action: Action) => {
      actions.push(action);
    }),

    registerProvider: vi.fn(async (provider: Provider) => {
      providers.push(provider);
    }),

    registerService: vi.fn(async (service: Service) => {
      // Don't add to services here, it's done in the plugin manager
    }),

    getService: vi.fn((serviceType: ServiceTypeName) => {
      return services.get(serviceType);
    }),

    emitEvent: vi.fn(async () => {}),

    // Add minimal stubs for other required methods
    getSetting: vi.fn(() => null),
    getWorldId: vi.fn(() => uuidv4() as any),
    registerEvaluator: vi.fn(async () => {}),
    evaluators: [],
    useModel: vi.fn(async () => 'mock response'),
  } as any;
};

describe('PluginManagerService', () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    runtime = createMockRuntime();
    pluginManager = new PluginManagerService(runtime);
    // Manually register the plugin manager service
    runtime.services.set('PLUGIN_MANAGER' as ServiceTypeName, pluginManager);
  });

  describe('Service Initialization', () => {
    it('should initialize with empty plugin registry', () => {
      const plugins = pluginManager.getAllPlugins();
      expect(plugins).toHaveLength(0);
    });

    it('should register existing plugins from runtime', () => {
      const existingPlugin = createMockPlugin('existing');
      runtime.plugins.push(existingPlugin);

      const newPluginManager = new PluginManagerService(runtime);
      const plugins = newPluginManager.getAllPlugins();

      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('existing');
      expect(plugins[0].status).toBe(PluginStatus.LOADED);
    });
  });

  describe('Plugin Registration', () => {
    it('should register a new plugin', async () => {
      const mockPlugin = createMockPlugin('test');
      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      expect(pluginId).toBeDefined();
      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState).toBeDefined();
      expect(pluginState?.name).toBe('test');
      expect(pluginState?.status).toBe(PluginStatus.READY);
    });

    it('should throw error when registering duplicate plugin', async () => {
      const mockPlugin = createMockPlugin('test');
      await pluginManager.registerPlugin(mockPlugin);

      await expect(pluginManager.registerPlugin(mockPlugin)).rejects.toThrow(
        'Plugin test already registered'
      );
    });
  });

  describe('Plugin Loading', () => {
    it('should load a ready plugin', async () => {
      const mockPlugin = createMockPlugin('test');
      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      await pluginManager.loadPlugin({ pluginId });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.LOADED);
      expect(pluginState?.loadedAt).toBeDefined();

      // Check that components were registered
      expect(runtime.registerAction).toHaveBeenCalledWith(mockPlugin.actions![0]);
      expect(runtime.registerProvider).toHaveBeenCalledWith(mockPlugin.providers![0]);
      expect(runtime.plugins).toContain(mockPlugin);
    });

    it('should not reload already loaded plugin without force', async () => {
      const mockPlugin = createMockPlugin('test');
      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      await pluginManager.loadPlugin({ pluginId });
      const firstLoadTime = pluginManager.getPlugin(pluginId)?.loadedAt;

      // Try to load again
      await pluginManager.loadPlugin({ pluginId });
      const secondLoadTime = pluginManager.getPlugin(pluginId)?.loadedAt;

      expect(firstLoadTime).toBe(secondLoadTime);
    });

    it('should reload plugin with force flag', async () => {
      const mockPlugin = createMockPlugin('test');
      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      await pluginManager.loadPlugin({ pluginId });

      // Reset mocks
      vi.clearAllMocks();

      // Force reload
      await pluginManager.loadPlugin({ pluginId, force: true });

      expect(runtime.registerAction).toHaveBeenCalled();
    });

    it('should handle plugin with init function', async () => {
      const initMock = vi.fn();
      const mockPlugin: Plugin = {
        ...createMockPlugin('test'),
        init: initMock,
      };

      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      await pluginManager.loadPlugin({ pluginId });

      expect(initMock).toHaveBeenCalledWith({}, runtime);
    });

    it('should handle plugin loading errors', async () => {
      const mockPlugin: Plugin = {
        ...createMockPlugin('test'),
        init: async () => {
          throw new Error('Init failed');
        },
      };

      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      await expect(pluginManager.loadPlugin({ pluginId })).rejects.toThrow('Init failed');

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.ERROR);
      expect(pluginState?.error).toBe('Init failed');
    });
  });

  describe('Plugin Unloading', () => {
    it('should unload a loaded plugin', async () => {
      const mockPlugin = createMockPlugin('test');
      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      await pluginManager.loadPlugin({ pluginId });

      // Clear mocks from loading
      vi.clearAllMocks();

      await pluginManager.unloadPlugin({ pluginId });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.UNLOADED);
      expect(pluginState?.unloadedAt).toBeDefined();

      // Check that components were removed
      expect(runtime.actions).not.toContain(mockPlugin.actions![0]);
      expect(runtime.providers).not.toContain(mockPlugin.providers![0]);
      expect(runtime.plugins).not.toContain(mockPlugin);
    });

    it('should not unload original plugins', async () => {
      const originalPlugin = createMockPlugin('original');
      runtime.plugins.push(originalPlugin);

      const newPluginManager = new PluginManagerService(runtime);
      runtime.services.set('PLUGIN_MANAGER' as ServiceTypeName, newPluginManager);

      const plugins = newPluginManager.getAllPlugins();
      const originalPluginId = plugins[0].id;

      await expect(newPluginManager.unloadPlugin({ pluginId: originalPluginId })).rejects.toThrow(
        'Cannot unload original plugin original'
      );
    });

    it('should handle plugin with services', async () => {
      const mockPlugin = createMockPluginWithService('test');
      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      await pluginManager.loadPlugin({ pluginId });

      // Manually set the service in runtime.services (simulating registration)
      const service = new MockService(runtime);
      runtime.services.set('MOCK_SERVICE' as ServiceTypeName, service);

      const stopSpy = vi.spyOn(service, 'stop');

      await pluginManager.unloadPlugin({ pluginId });

      expect(stopSpy).toHaveBeenCalled();
      expect(runtime.services.has('MOCK_SERVICE' as ServiceTypeName)).toBe(false);
    });
  });

  describe('Plugin State Management', () => {
    it('should get all plugins', async () => {
      await pluginManager.registerPlugin(createMockPlugin('test1'));
      await pluginManager.registerPlugin(createMockPlugin('test2'));

      const plugins = pluginManager.getAllPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins.map((p) => p.name)).toContain('test1');
      expect(plugins.map((p) => p.name)).toContain('test2');
    });

    it('should get loaded plugins only', async () => {
      const pluginId1 = await pluginManager.registerPlugin(createMockPlugin('test1'));
      const pluginId2 = await pluginManager.registerPlugin(createMockPlugin('test2'));

      await pluginManager.loadPlugin({ pluginId: pluginId1 });

      const loadedPlugins = pluginManager.getLoadedPlugins();
      expect(loadedPlugins).toHaveLength(1);
      expect(loadedPlugins[0].name).toBe('test1');
    });

    it('should update plugin state', async () => {
      const pluginId = await pluginManager.registerPlugin(createMockPlugin('test'));

      pluginManager.updatePluginState(pluginId, {
        missingEnvVars: ['API_KEY', 'SECRET'],
        error: 'Missing configuration',
      });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.missingEnvVars).toEqual(['API_KEY', 'SECRET']);
      expect(pluginState?.error).toBe('Missing configuration');
    });
  });
});

describe('Plugin Manager Actions', () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    runtime = createMockRuntime();
    pluginManager = new PluginManagerService(runtime);
    runtime.services.set('PLUGIN_MANAGER' as ServiceTypeName, pluginManager);
  });

  describe('Load Plugin Action', () => {
    it('should validate when loadable plugins exist', async () => {
      await pluginManager.registerPlugin(createMockPlugin('test'));

      const isValid = await loadPluginAction.validate(runtime, {} as any);
      expect(isValid).toBe(true);
    });

    it('should not validate when no loadable plugins exist', async () => {
      const isValid = await loadPluginAction.validate(runtime, {} as any);
      expect(isValid).toBe(false);
    });

    it('should load plugin by name', async () => {
      const pluginId = await pluginManager.registerPlugin(createMockPlugin('test-plugin'));

      const callback = vi.fn();
      const message = {
        content: { text: 'Load the test-plugin' },
      } as any;

      await loadPluginAction.handler(runtime, message, undefined, undefined, callback);

      expect(callback).toHaveBeenCalledWith({
        text: 'Successfully loaded plugin: test-plugin',
        actions: ['LOAD_PLUGIN'],
      });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.LOADED);
    });

    it('should handle missing environment variables', async () => {
      const pluginId = await pluginManager.registerPlugin(createMockPlugin('test'));
      pluginManager.updatePluginState(pluginId, {
        missingEnvVars: ['API_KEY'],
      });

      const callback = vi.fn();
      const message = {
        content: { text: 'Load test plugin' },
      } as any;

      await loadPluginAction.handler(runtime, message, undefined, undefined, callback);

      expect(callback).toHaveBeenCalledWith({
        text: expect.stringContaining('missing environment variables: API_KEY'),
        actions: ['LOAD_PLUGIN'],
      });
    });
  });

  describe('Unload Plugin Action', () => {
    it('should validate when loaded plugins exist', async () => {
      const pluginId = await pluginManager.registerPlugin(createMockPlugin('test'));
      await pluginManager.loadPlugin({ pluginId });

      const isValid = await unloadPluginAction.validate(runtime, {} as any);
      expect(isValid).toBe(true);
    });

    it('should unload plugin by name', async () => {
      const pluginId = await pluginManager.registerPlugin(createMockPlugin('test-plugin'));
      await pluginManager.loadPlugin({ pluginId });

      const callback = vi.fn();
      const message = {
        content: { text: 'Unload the test-plugin' },
      } as any;

      await unloadPluginAction.handler(runtime, message, undefined, undefined, callback);

      expect(callback).toHaveBeenCalledWith({
        text: 'Successfully unloaded plugin: test-plugin',
        actions: ['UNLOAD_PLUGIN'],
      });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.UNLOADED);
    });

    it('should handle unloading original plugins', async () => {
      const originalPlugin = createMockPlugin('original');
      runtime.plugins.push(originalPlugin);

      const newPluginManager = new PluginManagerService(runtime);
      runtime.services.set('PLUGIN_MANAGER' as ServiceTypeName, newPluginManager);

      const callback = vi.fn();
      const message = {
        content: { text: 'Unload original plugin' },
      } as any;

      await unloadPluginAction.handler(runtime, message, undefined, undefined, callback);

      expect(callback).toHaveBeenCalledWith({
        text: expect.stringContaining('original plugin that was loaded at startup'),
        actions: ['UNLOAD_PLUGIN'],
      });
    });
  });
});

describe('Plugin State Provider', () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    runtime = createMockRuntime();
    pluginManager = new PluginManagerService(runtime);
    runtime.services.set('PLUGIN_MANAGER' as ServiceTypeName, pluginManager);
  });

  it('should provide plugin state information', async () => {
    const pluginId1 = await pluginManager.registerPlugin(createMockPlugin('test1'));
    const pluginId2 = await pluginManager.registerPlugin(createMockPlugin('test2'));

    await pluginManager.loadPlugin({ pluginId: pluginId1 });
    pluginManager.updatePluginState(pluginId2, {
      missingEnvVars: ['API_KEY'],
    });

    const result = await pluginStateProvider.get(runtime, {} as any, {} as any);

    expect(result.text).toContain('Loaded Plugins:');
    expect(result.text).toContain('test1 (loaded)');
    expect(result.text).toContain('Ready to Load:');
    expect(result.text).toContain('test2 (ready)');
    expect(result.text).toContain('Missing ENV vars: API_KEY');

    expect(result.values?.loadedCount).toBe(1);
    expect(result.values?.readyCount).toBe(1);
    expect(result.values?.missingEnvVars).toContain('API_KEY');
  });

  it('should handle when plugin manager is not available', async () => {
    runtime.services.delete('PLUGIN_MANAGER' as ServiceTypeName);

    const result = await pluginStateProvider.get(runtime, {} as any, {} as any);

    expect(result.text).toBe('Plugin Manager service is not available');
    expect(result.data?.error).toBe('Plugin Manager service not found');
  });
});
