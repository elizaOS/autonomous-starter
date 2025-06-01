import { describe, it, expect } from "vitest";
import { pluginManagerPlugin } from "../index";
import { PluginManagerService } from "../services/pluginManagerService";
import { PluginConfigurationService } from "../services/pluginConfigurationService";
import { PluginUserInteractionService } from "../services/pluginUserInteractionService";
import { pluginStateProvider } from "../providers/pluginStateProvider";
import { pluginConfigurationStatusProvider } from "../providers/pluginConfigurationStatus";
import { registryPluginsProvider } from "../providers/registryPluginsProvider";
import { loadPluginAction } from "../actions/loadPlugin";
import { unloadPluginAction } from "../actions/unloadPlugin";
import { startPluginConfigurationAction } from "../actions/startPluginConfiguration";
import { installPluginFromRegistryAction } from "../actions/installPluginFromRegistry";

describe("Plugin Manager Index", () => {
  it("should export pluginManagerPlugin with correct definitions", () => {
    expect(pluginManagerPlugin.name).toBe("plugin-manager");
    expect(pluginManagerPlugin.description).toBe(
      "Manages dynamic loading and unloading of plugins at runtime, including registry installation and configuration management",
    );
    expect(pluginManagerPlugin.services).toEqual([
      PluginManagerService,
      PluginConfigurationService,
      PluginUserInteractionService,
    ]);
    expect(pluginManagerPlugin.providers).toEqual([
      pluginStateProvider,
      pluginConfigurationStatusProvider,
      registryPluginsProvider,
    ]);
    expect(pluginManagerPlugin.actions).toEqual([
      loadPluginAction,
      unloadPluginAction,
      startPluginConfigurationAction,
      installPluginFromRegistryAction,
    ]);
    expect(pluginManagerPlugin.init).toBeInstanceOf(Function);
  });
});
