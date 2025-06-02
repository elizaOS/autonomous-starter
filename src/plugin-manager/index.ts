import { type Plugin } from "@elizaos/core";
import { PluginManagerService } from "./services/pluginManagerService";
import { PluginConfigurationService } from "./services/pluginConfigurationService";
import { PluginUserInteractionService } from "./services/pluginUserInteractionService";
import { loadPluginAction } from "./actions/loadPlugin";
import { unloadPluginAction } from "./actions/unloadPlugin";
import { startPluginConfigurationAction } from "./actions/startPluginConfiguration";
import { installPluginFromRegistryAction } from "./actions/installPluginFromRegistry.js";
import { pluginStateProvider } from "./providers/pluginStateProvider";
import { pluginConfigurationStatusProvider } from "./providers/pluginConfigurationStatus";
import { registryPluginsProvider } from "./providers/registryPluginsProvider";
import { pluginConfigurationEvaluator } from "./evaluators/pluginConfigurationEvaluator";
import "./types"; // Ensure module augmentation is loaded

/**
 * Plugin Manager Plugin for ElizaOS
 *
 * Provides comprehensive plugin management capabilities including:
 * - Dynamic loading and unloading of plugins at runtime
 * - Plugin registry integration for discovering and installing plugins
 * - Secure configuration management with encrypted storage
 * - Interactive dialog system for collecting environment variables
 * - Proactive configuration suggestions and status monitoring
 *
 * Features:
 * - Registry-based plugin discovery and installation
 * - Dynamic plugin loading/unloading without restart
 * - Secure environment variable management with AES-256-CBC encryption
 * - Interactive user dialogs for plugin configuration
 * - Package.json convention for declaring required variables
 * - Validation and secure storage mechanisms
 * - Agent behavior integration for proactive configuration
 * - Complete testing and validation pipeline
 */
export const pluginManagerPlugin: Plugin = {
  name: "plugin-manager",
  description:
    "Manages dynamic loading and unloading of plugins at runtime, including registry installation and configuration management",

  services: [
    PluginManagerService,
    PluginConfigurationService,
    PluginUserInteractionService,
  ],

  actions: [
    loadPluginAction,
    unloadPluginAction,
    startPluginConfigurationAction,
    installPluginFromRegistryAction,
  ],

  providers: [
    pluginStateProvider,
    pluginConfigurationStatusProvider,
    registryPluginsProvider,
  ],

  evaluators: [pluginConfigurationEvaluator],

  init: async (config: Record<string, any>, runtime: any) => {
    // Any initialization logic if needed
  },
};

// Export all plugin manager components
export * from "./types";
export * from "./services/pluginManagerService";
export * from "./services/pluginConfigurationService";
export * from "./services/pluginUserInteractionService";
export * from "./actions/loadPlugin";
export * from "./actions/unloadPlugin";
export * from "./actions/startPluginConfiguration";
export * from "./actions/installPluginFromRegistry";
export * from "./providers/pluginStateProvider";
export * from "./providers/pluginConfigurationStatus";
export * from "./providers/registryPluginsProvider";
export * from "./evaluators/pluginConfigurationEvaluator";
