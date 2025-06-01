import { describe, it, expect } from 'vitest';
import { pluginManagerPlugin } from '../index';
import { PluginManagerService } from '../services/pluginManagerService';
import { pluginStateProvider } from '../providers/pluginStateProvider';
import { registryPluginsProvider } from '../providers/registryPluginsProvider';
import { loadPluginAction } from '../actions/loadPlugin';
import { unloadPluginAction } from '../actions/unloadPlugin';
import { installPluginFromRegistryAction } from '../actions/installPluginFromRegistry';

describe('Plugin Manager Index', () => {
    it('should export pluginManagerPlugin with correct definitions', () => {
        expect(pluginManagerPlugin.name).toBe('plugin-manager');
        expect(pluginManagerPlugin.description).toBe(
            'Manages dynamic loading and unloading of plugins at runtime, including registry installation',
        );
        expect(pluginManagerPlugin.services).toEqual([PluginManagerService]);
        expect(pluginManagerPlugin.providers).toEqual([pluginStateProvider, registryPluginsProvider]);
        expect(pluginManagerPlugin.actions).toEqual([
            loadPluginAction,
            unloadPluginAction,
            installPluginFromRegistryAction,
        ]);
        expect(pluginManagerPlugin.init).toBeInstanceOf(Function);
    });
}); 