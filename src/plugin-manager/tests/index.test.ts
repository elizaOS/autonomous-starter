import { pluginManagerPlugin } from '../index';
import { PluginManagerService } from '../services/pluginManagerService';
import { pluginStateProvider } from '../providers/pluginStateProvider';
import { loadPluginAction } from '../actions/loadPlugin';
import { unloadPluginAction } from '../actions/unloadPlugin';

describe('Plugin Manager Index', () => {
    it('should export pluginManagerPlugin with correct definitions', () => {
        expect(pluginManagerPlugin.name).toBe('plugin-manager');
        expect(pluginManagerPlugin.description).toBe(
            'Manages dynamic loading and unloading of plugins at runtime',
        );
        expect(pluginManagerPlugin.services).toEqual([PluginManagerService]);
        expect(pluginManagerPlugin.providers).toEqual([pluginStateProvider]);
        expect(pluginManagerPlugin.actions).toEqual([
            loadPluginAction,
            unloadPluginAction,
        ]);
        expect(pluginManagerPlugin.init).toBeInstanceOf(Function);
    });
}); 