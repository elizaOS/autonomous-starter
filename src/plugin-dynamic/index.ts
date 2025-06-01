import { type Plugin } from "@elizaos/core";
import { PluginCreationService } from "./services/plugin-creation-service";
import {
  createPluginAction,
  checkPluginCreationStatusAction,
  cancelPluginCreationAction,
  createPluginFromDescriptionAction,
} from "./actions/plugin-creation-actions";
import {
  pluginCreationJobsProvider,
  pluginCreationCapabilitiesProvider,
} from "./providers/plugin-creation-providers";

export const pluginCreationPlugin: Plugin = {
  name: "@elizaos/plugin-dynamic-creation",
  description:
    "Enables agents to autonomously create new plugins using AI-driven development",
  services: [PluginCreationService],
  actions: [
    createPluginAction,
    checkPluginCreationStatusAction,
    cancelPluginCreationAction,
    createPluginFromDescriptionAction,
  ],
  providers: [pluginCreationJobsProvider, pluginCreationCapabilitiesProvider],
};

export default pluginCreationPlugin;

// Re-export types and utilities
export {
  PluginCreationService,
  type PluginSpecification,
  type PluginCreationJob,
} from "./services/plugin-creation-service";
export * from "./utils/plugin-templates";
