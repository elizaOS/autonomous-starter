import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManagementService, type DynamicPluginInfo } from '../../src/services/plugin-management-service'; // Adjusted path
import { type IAgentRuntime, type Plugin, Service } from '@elizaos/core';
import fs from 'fs-extra';
import path from 'path';

// Mock @elizaos/cli/utils and other external dependencies
vi.mock('@elizaos/cli/utils', () => ({
  installPlugin: vi.fn(),
}));

vi.mock('fs-extra', async () => {
  const actualFsExtra = await vi.importActual('fs-extra');
  return {
    ...actualFsExtra,
    ensureDir: vi.fn().mockResolvedValue(undefined),
    readJson: vi.fn(),
    writeJson: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn(),
  };
});

// Mocking a simplified version of IAgentRuntime and plugin structure
const createMockRuntime = (): IAgentRuntime => {
    const mockRuntime = {
        getDataDir: vi.fn().mockReturnValue('/mock/agent/data'),
        setSecureConfig: vi.fn().mockResolvedValue(undefined),
        getSecureConfig: vi.fn().mockResolvedValue({}),
        registerAction: vi.fn().mockResolvedValue(undefined),
        unregisterAction: vi.fn().mockResolvedValue(undefined),
        registerService: vi.fn().mockResolvedValue(undefined),
        unregisterService: vi.fn().mockResolvedValue(undefined),
        registerProvider: vi.fn().mockResolvedValue(undefined),
        unregisterProvider: vi.fn().mockResolvedValue(undefined),
        registerEvaluator: vi.fn().mockResolvedValue(undefined),
        unregisterEvaluator: vi.fn().mockResolvedValue(undefined),
        registerTaskWorker: vi.fn().mockResolvedValue(undefined), // Adjusted from registerTask
        unregisterTaskWorker: vi.fn().mockResolvedValue(undefined), // Adjusted from unregisterTask
        getService: vi.fn((serviceName: string) => { // Mock getService to return a mock service
            if (serviceName === PluginManagementService.serviceName) return serviceInstance;
            // Return a generic mock service for other service names
            return {
                name: serviceName,
                start: vi.fn().mockResolvedValue(undefined),
                stop: vi.fn().mockResolvedValue(undefined),
                // Add other methods if your plugin services need them
            } as unknown as Service;
        }),
        on: vi.fn(), // Mock the 'on' method for event handling
        // Add other necessary IAgentRuntime methods and properties
        agentId: 'mock-agent-id',
        character: { name: 'MockCharacter', settings: {} },
        providers: [],
        actions: [],
        evaluators: [],
        plugins: [],
        // ... other properties
    } as unknown as IAgentRuntime;
    return mockRuntime;
};

let serviceInstance: PluginManagementService;
let mockRuntimeGlobal: IAgentRuntime;


describe('PluginManagementService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockRuntimeGlobal = createMockRuntime();
    serviceInstance = new PluginManagementService(mockRuntimeGlobal); // Pass runtime to constructor
    // service.runtime = mockRuntime; // This is done in constructor now
    
    // Reset fs-extra mocks for each test
    (fs.pathExists as vi.Mock).mockResolvedValue(false); // Default to path not existing
    (fs.readJson as vi.Mock).mockImplementation(async (filePath) => {
        if (filePath.endsWith('plugin-management-state.json')) {
            return Promise.resolve({ installedPlugins: {} }); // Default empty state
        }
        if (filePath.endsWith('package.json')) {
            // Provide a mock package.json response for parsePluginMetadata
            return Promise.resolve({
                name: 'mock-plugin',
                version: '1.0.0',
                elizaos: { requiredEnvVars: [] }
            });
        }
        return Promise.reject(new Error(`fs.readJson mock not implemented for ${filePath}`));
    });
    // Initialize the service which loads persisted state
    await serviceInstance.initialize();
  });

  describe('installPlugin', () => {
    it('should install a plugin and update persisted state', async () => {
      const mockPluginName = '@elizaos/plugin-example';
      (fs.pathExists as vi.Mock).mockResolvedValueOnce(false); // For state file initially
      (fs.pathExists as vi.Mock).mockResolvedValueOnce(true); // For package.json after install
      (fs.readJson as vi.Mock).mockResolvedValueOnce({ name: mockPluginName, version: '1.0.0', elizaos: {} }); // For package.json
      vi.mocked(await import('@elizaos/cli/utils')).installPlugin.mockResolvedValue(true);

      const pluginInfo = await serviceInstance.installPlugin(mockPluginName);

      expect(pluginInfo).toBeDefined();
      expect(pluginInfo.name).toBe(mockPluginName);
      expect(pluginInfo.status).toBe('installed');
      expect(fs.ensureDir).toHaveBeenCalled();
      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('plugin-management-state.json'),
        expect.objectContaining({
          installedPlugins: expect.objectContaining({
            [mockPluginName]: expect.objectContaining({ name: mockPluginName, status: 'installed' })
          })
        }),
        { spaces: 2 }
      );
    });

    it('should identify plugins needing configuration from package.json', async () => {
      const mockPluginName = '@elizaos/plugin-with-config';
      const requiredEnvVars = [{ name: 'API_KEY', description: 'API key for service', sensitive: true }];
      (fs.pathExists as vi.Mock).mockResolvedValueOnce(false); // state
      (fs.pathExists as vi.Mock).mockResolvedValueOnce(true); // package.json
      (fs.readJson as vi.Mock).mockResolvedValueOnce({ 
          name: mockPluginName, 
          version: '1.0.0', 
          elizaos: { requiredEnvVars }
      });
      vi.mocked(await import('@elizaos/cli/utils')).installPlugin.mockResolvedValue(true);

      const pluginInfo = await serviceInstance.installPlugin(mockPluginName);

      expect(pluginInfo.status).toBe('needs_configuration');
      expect(pluginInfo.requiredEnvVars).toHaveLength(1);
      expect(pluginInfo.requiredEnvVars[0].name).toBe('API_KEY');
      expect(pluginInfo.requiredEnvVars[0].isSet).toBe(false);
    });
  });

  describe('loadPlugin', () => {
    beforeEach(async () => {
        // Ensure a mock plugin is considered "installed" for load tests
        const mockPluginName = '@elizaos/plugin-example';
        const pluginPath = path.join(mockRuntimeGlobal.getDataDir(), 'runtime_plugins', mockPluginName.replace(/[^a-zA-Z0-9-_]/g, '_'));
        (fs.pathExists as vi.Mock).mockImplementation(async (p) => p === pluginPath);
        serviceInstance['installedPlugins'].set(mockPluginName, {
            name: mockPluginName, 
            version: '1.0.0', 
            status: 'installed', 
            path: pluginPath, 
            requiredEnvVars: [],
            installedAt: new Date(),
        } as DynamicPluginInfo);

        // Mock dynamic import for loadPluginModule
        vi.mock(pluginPath, () => ({
            default: { name: 'mock-plugin-default', actions: [{name: 'testAction', handler: vi.fn(), validate: vi.fn()}] } as Plugin
        }), { virtual: true });
    });

    it('should load an installed plugin', async () => {
      const mockPluginName = '@elizaos/plugin-example';
      const success = await serviceInstance.loadPlugin(mockPluginName);
      expect(success).toBe(true);
      const pluginInfo = serviceInstance.getPluginInfo(mockPluginName);
      expect(pluginInfo?.status).toBe('loaded');
      // Check if runtime registration methods were called
      expect(mockRuntimeGlobal.registerAction).toHaveBeenCalled();
    });

    it('should reject loading unconfigured plugins', async () => {
      const mockPluginName = '@elizaos/plugin-with-config';
      serviceInstance['installedPlugins'].set(mockPluginName, {
        name: mockPluginName, version: '1.0.0', status: 'needs_configuration', 
        path: '/mock/path/to/plugin-with-config', 
        requiredEnvVars: [{ name: 'API_KEY', description: '', sensitive: false, isSet: false }],
        installedAt: new Date(),
      } as DynamicPluginInfo);

      await expect(serviceInstance.loadPlugin(mockPluginName))
        .rejects.toThrow('requires configuration before loading');
    });
  });

   describe('activatePlugin', () => {
    const mockPluginName = '@elizaos/plugin-example';
    let mockPlugin: Plugin;

    beforeEach(async () => {
      mockPlugin = {
        name: 'mock-plugin-default',
        description: 'A mock plugin',
        actions: [{ name: 'testAction', handler: vi.fn(), validate: vi.fn() }],
        services: [{ serviceType: 'mockServiceType', start: vi.fn(), stop: vi.fn() } as unknown as typeof Service ],
      };
      const pluginPath = path.join(mockRuntimeGlobal.getDataDir(), 'runtime_plugins', mockPluginName.replace(/[^a-zA-Z0-9-_]/g, '_'));
      (fs.pathExists as vi.Mock).mockImplementation(async (p) => p === pluginPath );
      
      serviceInstance['installedPlugins'].set(mockPluginName, {
        name: mockPluginName, version: '1.0.0', status: 'installed', path: pluginPath, 
        requiredEnvVars: [], installedAt: new Date()
      } as DynamicPluginInfo);

      // Mock dynamic import for loadPluginModule
      vi.mock(pluginPath, () => ({ default: mockPlugin }), { virtual: true });

      // Mock runtime.getService for the specific service this plugin might use
      (mockRuntimeGlobal.getService as vi.Mock).mockImplementation((serviceName: string) => {
        if (serviceName === 'mockServiceType') {
          return { name: 'mockServiceType', start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined) } as unknown as Service;
        }
        return null;
      });
    });

    it('should activate a loaded plugin and start its services', async () => {
      await serviceInstance.loadPlugin(mockPluginName); // Ensure plugin is loaded first
      const success = await serviceInstance.activatePlugin(mockPluginName);
      expect(success).toBe(true);
      const pluginInfo = serviceInstance.getPluginInfo(mockPluginName);
      expect(pluginInfo?.status).toBe('active');
      
      // Check if service's start method was called
      const mockServiceInstance = mockRuntimeGlobal.getService('mockServiceType');
      expect(mockServiceInstance?.start).toHaveBeenCalled();
    });
  });

  // TODO: Add tests for deactivatePlugin, unloadPlugin, setPluginConfiguration, persistState, loadPersistedState, etc.
}); 