import { type Plugin } from '@elizaos/core';
import { PluginManagementService } from './services/plugin-management-service';
import {
  availablePluginsProvider,
  dynamicPluginsStatusProvider
} from './providers/plugin-providers';
import {
  listAvailablePluginsAction,
  installPluginAction,
  configurePluginAction,
  activatePluginAction,
  deactivatePluginAction,
  unloadPluginAction
} from './actions/plugin-actions';

const dynamicPluginsPlugin: Plugin = { // Changed to const as per convention
  name: 'dynamic-plugins',
  description: 'Enables dynamic plugin management at runtime',
  
  services: [PluginManagementService],
  
  providers: [
    availablePluginsProvider,
    dynamicPluginsStatusProvider
  ],
  
  actions: [
    listAvailablePluginsAction,
    installPluginAction,
    configurePluginAction,
    activatePluginAction,
    deactivatePluginAction,
    unloadPluginAction
  ]
  // tasks, evaluators, etc. can be added here if defined for this plugin
};

export default dynamicPluginsPlugin; 