import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRuntime, type Character, type Plugin, type IAgentRuntime, Service } from '@elizaos/core';
import { dynamicPluginsPlugin } from '../../src/index'; // Adjusted path
import { PluginManagementService, type DynamicPluginInfo } from '../../src/services/plugin-management-service'; // Adjusted path
import fs from 'fs-extra';
import path from 'path';

// Mock external dependencies used by PluginManagementService and its helpers
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


const mockCharacter: Character = {
  id: 'test-agent-char-id' as any,
  name: 'Test Agent',
  username: 'testagent',
  bio: 'A test agent',
  plugins: ['dynamic-plugins'], // Refer to plugin by name
  settings: {
    DATA_DIR: '/tmp/test-agent-data' // Mock data dir for tests
  },
  // ... other required Character properties
};

const mockCorePlugin: Plugin = {
    name: 'dynamic-plugins',
    description: 'Enables dynamic plugin management at runtime',
    services: [PluginManagementService as unknown as typeof Service],
    providers: [
        // Mock providers or use actual if they don't have heavy deps
        { name: 'availablePlugins', description: '', get: vi.fn().mockResolvedValue({ text: '[]' }) },
        { name: 'dynamicPluginsStatus', description: '', get: vi.fn().mockResolvedValue({ text: '[]' }) }
    ],
    actions: [
        // Mock actions or use actual if they don't have heavy deps
        { name: 'listAvailablePlugins', description: '', handler: vi.fn(), validate: vi.fn() },
        { name: 'installPlugin', description: '', handler: vi.fn(), validate: vi.fn() },
        { name: 'configurePlugin', description: '', handler: vi.fn(), validate: vi.fn() },
        { name: 'activatePlugin', description: '', handler: vi.fn(), validate: vi.fn() },
    ]
};


describe('Dynamic Plugins Integration', () => {
  let runtime: IAgentRuntime;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup fs-extra mocks for a clean slate each time
    (fs.pathExists as vi.Mock).mockResolvedValue(false); // Default: state file doesn't exist
    (fs.readJson as vi.Mock).mockImplementation(async (filePath) => {
        if (filePath.endsWith('plugin-management-state.json')) {
            return { installedPlugins: {} }; // Fresh state
        }
        // Mock package.json for any plugin being "installed"
        if (filePath.includes('package.json')) {
            const pluginName = path.basename(path.dirname(filePath));
            if (pluginName === 'plugin-example') {
                return { name: '@elizaos/plugin-example', version: '1.0.0', elizaos: { requiredEnvVars: [] } };
            }
            if (pluginName === 'plugin-with-config') {
                return { 
                    name: '@elizaos/plugin-with-config', 
                    version: '1.0.0', 
                    elizaos: { requiredEnvVars: [{name: 'API_KEY', description: 'Test API Key', sensitive: false}] }
                };
            }
            return { name: pluginName, version: '0.0.0' }; // Generic mock
        }
        throw new Error(`fs.readJson mock not handled for ${filePath}`);
    });
    (fs.writeJson as vi.Mock).mockResolvedValue(undefined);
    (fs.ensureDir as vi.Mock).mockResolvedValue(undefined);
    vi.mocked(await import('@elizaos/cli/utils')).installPlugin.mockResolvedValue(true);

    // Mock dynamic import for a test plugin
    const examplePluginPath = path.resolve(mockCharacter.settings.DATA_DIR, 'runtime_plugins', 'plugin-example');
    vi.mock(examplePluginPath, () => ({
        default: {
            name: '@elizaos/plugin-example',
            description: 'An example plugin',
            actions: [{ name: 'exampleAction', handler: vi.fn(), validate: vi.fn() }]
        } as Plugin
    }), { virtual: true });

    const pluginWithConfigPath = path.resolve(mockCharacter.settings.DATA_DIR, 'runtime_plugins', 'plugin-with-config');
    vi.mock(pluginWithConfigPath, () => ({
        default: {
            name: '@elizaos/plugin-with-config',
            description: 'Plugin needing config',
            services: [], // Add mock service if activate is tested thoroughly
        } as Plugin
    }), { virtual: true });


    // We pass the actual dynamicPluginsPlugin to the runtime
    runtime = new AgentRuntime({
      character: mockCharacter,
      plugins: [dynamicPluginsPlugin], // Use the actual plugin here
      // Mock other dependencies of AgentRuntime if necessary
      adapter: {
        // Provide minimal mock of IDatabaseAdapter methods used by runtime/service if any
        // For this test, PluginManagementService uses runtime.getDataDir, set/getSecureConfig, on.
        // AgentRuntime itself uses many more if we were to test core AgentRuntime features.
        init: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        getAgent: vi.fn().mockResolvedValue(mockCharacter as any),
        ensureAgentExists: vi.fn().mockResolvedValue(mockCharacter as any),
        createEntity: vi.fn().mockResolvedValue(true),
        getEntityById: vi.fn().mockResolvedValue(null),
        getRoom: vi.fn().mockResolvedValue(null),
        createRoom: vi.fn().mockResolvedValue('mock-room-id' as any),
        addParticipant: vi.fn().mockResolvedValue(true),
        getParticipantsForRoom: vi.fn().mockResolvedValue([]),
        ensureEmbeddingDimension: vi.fn().mockResolvedValue(undefined),
        // ... any other methods that might be called during AgentRuntime.initialize or by PluginManagementService
      } as any,
    });

    await runtime.initialize();
    
    // Ensure data directory exists for plugin installations by PluginManagementService
    await fs.ensureDir(path.join(mockCharacter.settings.DATA_DIR, 'runtime_plugins'));
  });

  it('should allow full plugin lifecycle: install, configure, activate, deactivate, unload', async () => {
    const examplePluginName = '@elizaos/plugin-example';
    const pluginWithConfigName = '@elizaos/plugin-with-config';

    // 1. List available (mocked, as registry is external)
    // This would typically be an action call if the action itself isn't mocked
    // For now, we assume listAvailablePluginsAction would work if called.

    // 2. Install a plugin that needs no config
    const installResult1 = await runtime.actions.find(a => a.name === 'installPlugin')?.handler?.(runtime, { content: { pluginName: examplePluginName } } as any, {} as any);
    expect(installResult1).toContain('Successfully installed @elizaos/plugin-example');
    let pms = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    expect(pms.getPluginInfo(examplePluginName)?.status).toBe('installed');

    // 3. Install a plugin that needs config
    const installResult2 = await runtime.actions.find(a => a.name === 'installPlugin')?.handler?.(runtime, { content: { pluginName: pluginWithConfigName } } as any, {} as any);
    expect(installResult2).toContain('Successfully installed @elizaos/plugin-with-config');
    expect(installResult2).toContain('requires the following configuration');
    expect(pms.getPluginInfo(pluginWithConfigName)?.status).toBe('needs_configuration');

    // 4. Configure the plugin
    const configResult = await runtime.actions.find(a => a.name === 'configurePlugin')?.handler?.(runtime, { content: { pluginName: pluginWithConfigName, configuration: { API_KEY: 'test-key' } } }as any, {} as any);
    expect(configResult).toContain('fully configured and ready to activate');
    expect(pms.getPluginInfo(pluginWithConfigName)?.status).toBe('installed'); // Status changes after config

    // 5. Activate the first plugin
    const activateResult1 = await runtime.actions.find(a => a.name === 'activatePlugin')?.handler?.(runtime, { content: { pluginName: examplePluginName } } as any, {} as any);
    expect(activateResult1).toContain('activated successfully');
    expect(pms.isPluginActive(examplePluginName)).toBe(true);

    // 6. Activate the second plugin (now configured)
    const activateResult2 = await runtime.actions.find(a => a.name === 'activatePlugin')?.handler?.(runtime, { content: { pluginName: pluginWithConfigName } } as any, {} as any);
    expect(activateResult2).toContain('activated successfully');
    expect(pms.isPluginActive(pluginWithConfigName)).toBe(true);
    
    // Verify plugin components (like actions from plugin-example) are registered
    // This requires the mock for examplePluginPath to correctly provide an action
    // And PluginManagementService to correctly call runtime.registerAction
    expect(runtime.registerAction).toHaveBeenCalledWith(expect.objectContaining({ name: 'exampleAction' }));

    // 7. Deactivate a plugin
    const deactivateResult = await runtime.actions.find(a => a.name === 'deactivatePlugin')?.handler?.(runtime, { content: { pluginName: examplePluginName } } as any, {} as any);
    expect(deactivateResult).toContain('deactivated');
    expect(pms.isPluginActive(examplePluginName)).toBe(false);
    expect(pms.getPluginInfo(examplePluginName)?.status).toBe('inactive');

    // 8. Unload the plugin
    const unloadResult = await runtime.actions.find(a => a.name === 'unloadPlugin')?.handler?.(runtime, { content: { pluginName: examplePluginName } } as any, {} as any);
    expect(unloadResult).toContain('unloaded');
    expect(pms.getPluginInfo(examplePluginName)?.status).toBe('installed'); // Back to installed state
    expect(runtime.unregisterAction).toHaveBeenCalledWith('exampleAction');

    // 9. Check status provider (basic check)
    const statusProvider = runtime.providers.find(p => p.name === 'dynamicPluginsStatus');
    const statusData = await statusProvider?.get(runtime, {} as any, {} as any);
    expect(statusData?.text).toBeDefined();
    const parsedStatus = JSON.parse(statusData!.text!);
    expect(parsedStatus.some((p: any) => p.name === examplePluginName && p.status === 'installed')).toBe(true);
    expect(parsedStatus.some((p: any) => p.name === pluginWithConfigName && p.status === 'active')).toBe(true);
  });
}); 