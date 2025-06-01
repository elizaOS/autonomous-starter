import { Plugin } from "@elizaos/core";
import { PluginCreationService } from "./services/plugin-creation-service";
import {
  createPluginAction,
  checkPluginCreationStatusAction,
  cancelPluginCreationAction,
  createPluginFromDescriptionAction,
} from "./actions/plugin-creation-actions";
import {
  pluginCreationStatusProvider,
  pluginCreationCapabilitiesProvider,
} from "./providers/plugin-creation-providers";

// Export the plugin
export const pluginDynamic: Plugin = {
  name: "@elizaos/plugin-dynamic",
  description: "Dynamic plugin creation system with AI-powered code generation",
  actions: [
    createPluginAction,
    checkPluginCreationStatusAction,
    cancelPluginCreationAction,
    createPluginFromDescriptionAction,
  ],
  providers: [pluginCreationStatusProvider, pluginCreationCapabilitiesProvider],
  services: [PluginCreationService],
  evaluators: [],
};

// Export individual components
export {
  PluginCreationService,
  createPluginAction,
  checkPluginCreationStatusAction,
  cancelPluginCreationAction,
  createPluginFromDescriptionAction,
  pluginCreationStatusProvider,
  pluginCreationCapabilitiesProvider,
};

// Default export
export default pluginDynamic;

// Re-export types and utilities
export {
  type PluginSpecification,
  type PluginCreationJob,
} from "./services/plugin-creation-service";
export * from "./utils/plugin-templates";
