import type { Plugin, IAgentRuntime, UUID } from '@elizaos/core';

// Extend the core service types with plugin manager service
declare module '@elizaos/core' {
  interface ServiceTypeRegistry {
    PLUGIN_MANAGER: 'PLUGIN_MANAGER';
  }
}

// Export service type constant
export const PluginManagerServiceType = {
  PLUGIN_MANAGER: 'PLUGIN_MANAGER' as const,
} satisfies Partial<import('@elizaos/core').ServiceTypeRegistry>;

export enum PluginStatus {
  BUILDING = 'building',
  READY = 'ready',
  LOADED = 'loaded',
  ERROR = 'error',
  UNLOADED = 'unloaded',
}

export interface PluginState {
  id: string;
  name: string;
  status: PluginStatus;
  plugin?: Plugin;
  missingEnvVars: string[];
  buildLog: string[];
  sourceCode?: string;
  packageJson?: any;
  error?: string;
  createdAt: number;
  loadedAt?: number;
  unloadedAt?: number;
  version?: string;
  dependencies?: Record<string, string>;
}

export interface PluginRegistry {
  plugins: Map<string, PluginState>;
  getPlugin(id: string): PluginState | undefined;
  getAllPlugins(): PluginState[];
  getLoadedPlugins(): PluginState[];
  updatePluginState(id: string, update: Partial<PluginState>): void;
}

export interface CreatePluginParams {
  name: string;
  description: string;
  capabilities: string[];
  dependencies?: string[];
}

export interface LoadPluginParams {
  pluginId: string;
  force?: boolean;
}

export interface UnloadPluginParams {
  pluginId: string;
}

export interface PluginManagerConfig {
  maxBuildAttempts?: number;
  buildTimeout?: number;
  pluginDirectory?: string;
  enableHotReload?: boolean;
}

export const EventType = {
  PLUGIN_BUILDING: 'PLUGIN_BUILDING',
  PLUGIN_READY: 'PLUGIN_READY',
  PLUGIN_LOADED: 'PLUGIN_LOADED',
  PLUGIN_UNLOADED: 'PLUGIN_UNLOADED',
  PLUGIN_ERROR: 'PLUGIN_ERROR',
  PLUGIN_ENV_MISSING: 'PLUGIN_ENV_MISSING',
} as const;
