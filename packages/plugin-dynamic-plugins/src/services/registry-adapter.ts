import { logger } from '@elizaos/core';

interface RegistryEntry {
  name: string;
  description?: string;
  repository: string;
  npm?: {
    repo: string;
    v1?: string;
  };
  git?: {
    repo: string;
    v1?: {
      branch?: string;
      version?: string;
    };
  };
}

const REGISTRY_URL = 'https://raw.githubusercontent.com/elizaos-plugins/registry/refs/heads/main/index.json';
const CACHE_DURATION = 3600000; // 1 hour

let registryCache: {
  data: Record<string, RegistryEntry>;
  timestamp: number;
} | null = null;

export async function getLocalRegistryIndex(): Promise<Record<string, RegistryEntry>> {
  // Check cache first
  if (registryCache && Date.now() - registryCache.timestamp < CACHE_DURATION) {
    return registryCache.data;
  }
  
  try {
    const response = await fetch(REGISTRY_URL);
    if (!response.ok) {
      throw new Error(`Registry fetch failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    registryCache = {
      data,
      timestamp: Date.now()
    };
    
    return data;
  } catch (error) {
    logger.error('Failed to fetch plugin registry:', error);
    
    // Return cached data if available
    if (registryCache) {
      logger.warn('Using stale registry cache');
      return registryCache.data;
    }
    
    // Return empty registry as fallback
    return {};
  }
}

export function normalizePluginName(pluginName: string): string[] {
  const baseName = pluginName
    .replace(/^@elizaos\//, '')
    .replace(/^@elizaos-plugins\//, '')
    .replace(/^plugin-/, '');
  
  return [
    pluginName,
    baseName,
    `plugin-${baseName}`,
    `@elizaos/${baseName}`,
    `@elizaos/plugin-${baseName}`,
    `@elizaos-plugins/${baseName}`,
    `@elizaos-plugins/plugin-${baseName}`
  ];
} 