# Task Group 2: Plugin Configuration Management

## Overview

This implementation enables ElizaOS agents to intelligently manage plugin configurations, identify missing environment variables, securely store sensitive data, and interact with users to obtain required configurations. The system ensures plugins are only activated when properly configured.

## Architecture

### Core Components

1. **Configuration Management Service** - Handles secure storage and retrieval of plugin configurations
2. **Environment Variable Discovery** - Parses plugin metadata for required configurations
3. **User Interaction System** - Facilitates agent-user communication for obtaining configs
4. **Validation System** - Ensures all requirements are met before activation

### Data Flow

```
Plugin Installation → Parse Requirements → Check Configuration → Request Missing → Store Securely → Enable Plugin
```

## Detailed Implementation

### 1. Enhanced Plugin Management Service

**File:** `packages/core/src/services/plugin-configuration-service.ts`

```typescript
import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { PluginManagementService, type DynamicPluginInfo } from './plugin-management-service';
import * as crypto from 'crypto';
import path from 'path';
import fs from 'fs-extra';

export interface PluginEnvironmentVariable {
  name: string;
  description: string;
  sensitive: boolean;
  required: boolean;
  defaultValue?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    enum?: string[];
  };
}

export interface PluginConfigurationRequest {
  pluginName: string;
  requiredVars: PluginEnvironmentVariable[];
  missingVars: string[];
  optionalVars: PluginEnvironmentVariable[];
}

export class PluginConfigurationService extends Service {
  private encryptionKey: Buffer;
  private configStore: Map<string, Record<string, any>> = new Map();
  
  static serviceName = 'pluginConfiguration';

  async initialize(): Promise<void> {
    logger.info('Initializing PluginConfigurationService');
    
    // Initialize encryption key
    this.encryptionKey = await this.getOrCreateEncryptionKey();
    
    // Load existing configurations
    await this.loadConfigurations();
  }

  async start(): Promise<void> {
    logger.info('Starting PluginConfigurationService');
  }

  async stop(): Promise<void> {
    logger.info('Stopping PluginConfigurationService');
    
    // Save configurations before stopping
    await this.saveConfigurations();
  }

  async parsePluginRequirements(pluginPath: string): Promise<{
    requiredVars: PluginEnvironmentVariable[];
    optionalVars: PluginEnvironmentVariable[];
  }> {
    const packageJsonPath = path.join(pluginPath, 'package.json');
    
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const elizaosConfig = packageJson.elizaos || {};
      
      const allVars: PluginEnvironmentVariable[] = elizaosConfig.environmentVariables || [];
      
      // Separate required and optional
      const requiredVars = allVars.filter(v => v.required !== false);
      const optionalVars = allVars.filter(v => v.required === false);
      
      return { requiredVars, optionalVars };
    } catch (error) {
      logger.error(`Failed to parse plugin requirements:`, error);
      return { requiredVars: [], optionalVars: [] };
    }
  }

  async getPluginConfiguration(pluginName: string): Promise<Record<string, string>> {
    const encrypted = this.configStore.get(pluginName);
    if (!encrypted) return {};
    
    const decrypted: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(encrypted)) {
      if (value.encrypted) {
        decrypted[key] = await this.decrypt(value.data);
      } else {
        decrypted[key] = value.data;
      }
    }
    
    return decrypted;
  }

  async setPluginConfiguration(
    pluginName: string,
    config: Record<string, string>,
    metadata?: Record<string, PluginEnvironmentVariable>
  ): Promise<void> {
    const encrypted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(config)) {
      const varMetadata = metadata?.[key];
      const isSensitive = varMetadata?.sensitive ?? key.toLowerCase().includes('key') || 
                         key.toLowerCase().includes('secret') || 
                         key.toLowerCase().includes('password');
      
      if (isSensitive) {
        encrypted[key] = {
          encrypted: true,
          data: await this.encrypt(value)
        };
      } else {
        encrypted[key] = {
          encrypted: false,
          data: value
        };
      }
    }
    
    this.configStore.set(pluginName, encrypted);
    await this.saveConfigurations();
  }

  async validateConfiguration(
    pluginName: string,
    config: Record<string, string>,
    requirements: PluginEnvironmentVariable[]
  ): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    for (const req of requirements) {
      const value = config[req.name];
      
      // Check required
      if (req.required && !value) {
        errors.push(`Missing required variable: ${req.name}`);
        continue;
      }
      
      if (value && req.validation) {
        // Pattern validation
        if (req.validation.pattern) {
          const regex = new RegExp(req.validation.pattern);
          if (!regex.test(value)) {
            errors.push(`${req.name} does not match required pattern: ${req.validation.pattern}`);
          }
        }
        
        // Length validation
        if (req.validation.minLength && value.length < req.validation.minLength) {
          errors.push(`${req.name} is too short (min: ${req.validation.minLength})`);
        }
        if (req.validation.maxLength && value.length > req.validation.maxLength) {
          errors.push(`${req.name} is too long (max: ${req.validation.maxLength})`);
        }
        
        // Enum validation
        if (req.validation.enum && !req.validation.enum.includes(value)) {
          errors.push(`${req.name} must be one of: ${req.validation.enum.join(', ')}`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async generateConfigurationRequest(pluginInfo: DynamicPluginInfo): Promise<PluginConfigurationRequest> {
    const currentConfig = await this.getPluginConfiguration(pluginInfo.name);
    const missingVars: string[] = [];
    
    // Parse full requirements from package.json
    const { requiredVars, optionalVars } = await this.parsePluginRequirements(pluginInfo.path);
    
    // Check which required vars are missing
    for (const reqVar of requiredVars) {
      if (!currentConfig[reqVar.name]) {
        missingVars.push(reqVar.name);
      }
    }
    
    return {
      pluginName: pluginInfo.name,
      requiredVars,
      missingVars,
      optionalVars
    };
  }

  async applyConfigurationToEnvironment(
    pluginName: string,
    runtime: IAgentRuntime
  ): Promise<void> {
    const config = await this.getPluginConfiguration(pluginName);
    
    // Create a scoped environment for the plugin
    const scopedEnv = { ...process.env };
    
    for (const [key, value] of Object.entries(config)) {
      scopedEnv[key] = value;
    }
    
    // Store in runtime context for plugin access
    await runtime.setContext(`plugin_env_${pluginName}`, scopedEnv);
  }

  // Encryption methods

  private async getOrCreateEncryptionKey(): Promise<Buffer> {
    const keyPath = path.join(this.runtime.getDataDir(), '.encryption-key');
    
    try {
      if (await fs.pathExists(keyPath)) {
        const keyData = await fs.readFile(keyPath);
        return Buffer.from(keyData.toString(), 'hex');
      }
    } catch (error) {
      logger.warn('Failed to load encryption key, creating new one');
    }
    
    // Generate new key
    const key = crypto.randomBytes(32);
    await fs.writeFile(keyPath, key.toString('hex'));
    
    // Secure the file
    await fs.chmod(keyPath, 0o600);
    
    return key;
  }

  private async encrypt(text: string): Promise<string> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private async decrypt(text: string): Promise<string> {
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async loadConfigurations(): Promise<void> {
    const configPath = path.join(this.runtime.getDataDir(), 'plugin-configs.json');
    
    try {
      if (await fs.pathExists(configPath)) {
        const data = await fs.readJson(configPath);
        
        for (const [plugin, config] of Object.entries(data)) {
          this.configStore.set(plugin, config as Record<string, any>);
        }
      }
    } catch (error) {
      logger.error('Failed to load plugin configurations:', error);
    }
  }

  private async saveConfigurations(): Promise<void> {
    const configPath = path.join(this.runtime.getDataDir(), 'plugin-configs.json');
    
    const data = Object.fromEntries(this.configStore);
    
    try {
      await fs.writeJson(configPath, data, { spaces: 2 });
      
      // Secure the file
      await fs.chmod(configPath, 0o600);
    } catch (error) {
      logger.error('Failed to save plugin configurations:', error);
    }
  }
}
```

### 2. User Interaction Components

**File:** `packages/core/src/services/plugin-user-interaction.ts`

```typescript
import { type IAgentRuntime, type Memory, logger } from '@elizaos/core';
import { PluginConfigurationService, type PluginConfigurationRequest } from './plugin-configuration-service';
import { v4 as uuidv4 } from 'uuid';

export interface ConfigurationDialog {
  id: string;
  pluginName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  request: PluginConfigurationRequest;
  responses: Record<string, string>;
  currentVariable?: string;
  startedAt: Date;
  completedAt?: Date;
}

export class PluginUserInteractionService {
  private activeDialogs: Map<string, ConfigurationDialog> = new Map();
  private runtime: IAgentRuntime;
  private configService: PluginConfigurationService;

  constructor(runtime: IAgentRuntime, configService: PluginConfigurationService) {
    this.runtime = runtime;
    this.configService = configService;
  }

  async initiateConfigurationDialog(
    request: PluginConfigurationRequest,
    userId: string
  ): Promise<ConfigurationDialog> {
    const dialog: ConfigurationDialog = {
      id: uuidv4(),
      pluginName: request.pluginName,
      status: 'pending',
      request,
      responses: {},
      startedAt: new Date()
    };
    
    this.activeDialogs.set(dialog.id, dialog);
    
    // Create memory for tracking
    await this.createDialogMemory(dialog, userId);
    
    return dialog;
  }

  async processUserResponse(
    dialogId: string,
    userId: string,
    response: string
  ): Promise<{
    dialog: ConfigurationDialog;
    nextPrompt?: string;
    completed: boolean;
  }> {
    const dialog = this.activeDialogs.get(dialogId);
    if (!dialog) {
      throw new Error('Dialog not found');
    }
    
    dialog.status = 'in_progress';
    
    // Store response for current variable
    if (dialog.currentVariable) {
      dialog.responses[dialog.currentVariable] = response;
    }
    
    // Find next missing variable
    const nextMissing = dialog.request.missingVars.find(
      varName => !dialog.responses[varName]
    );
    
    if (nextMissing) {
      dialog.currentVariable = nextMissing;
      const varInfo = dialog.request.requiredVars.find(v => v.name === nextMissing);
      
      const nextPrompt = this.generatePromptForVariable(varInfo!);
      
      return {
        dialog,
        nextPrompt,
        completed: false
      };
    }
    
    // All variables collected
    dialog.status = 'completed';
    dialog.completedAt = new Date();
    
    // Apply configuration
    await this.applyDialogConfiguration(dialog);
    
    return {
      dialog,
      completed: true
    };
  }

  async cancelDialog(dialogId: string): Promise<void> {
    const dialog = this.activeDialogs.get(dialogId);
    if (dialog) {
      dialog.status = 'cancelled';
      this.activeDialogs.delete(dialogId);
    }
  }

  private generatePromptForVariable(varInfo: PluginEnvironmentVariable): string {
    let prompt = `I need to configure the ${varInfo.name} for the plugin.\n`;
    prompt += `${varInfo.description}\n\n`;
    
    if (varInfo.sensitive) {
      prompt += `This is a sensitive value that will be encrypted and stored securely.\n`;
    }
    
    if (varInfo.validation) {
      if (varInfo.validation.pattern) {
        prompt += `Format: ${varInfo.validation.pattern}\n`;
      }
      if (varInfo.validation.enum) {
        prompt += `Valid options: ${varInfo.validation.enum.join(', ')}\n`;
      }
      if (varInfo.validation.minLength || varInfo.validation.maxLength) {
        prompt += `Length: ${varInfo.validation.minLength || 0}-${varInfo.validation.maxLength || 'unlimited'} characters\n`;
      }
    }
    
    prompt += `\nPlease provide the value for ${varInfo.name}:`;
    
    return prompt;
  }

  private async applyDialogConfiguration(dialog: ConfigurationDialog): Promise<void> {
    // Prepare metadata for sensitive handling
    const metadata: Record<string, PluginEnvironmentVariable> = {};
    for (const varInfo of dialog.request.requiredVars) {
      metadata[varInfo.name] = varInfo;
    }
    
    // Apply the configuration
    await this.configService.setPluginConfiguration(
      dialog.pluginName,
      dialog.responses,
      metadata
    );
    
    // Update plugin status in management service
    const pluginService = this.runtime.getService('pluginManagement') as any;
    if (pluginService) {
      await pluginService.updatePluginConfigStatus(dialog.pluginName);
    }
  }

  private async createDialogMemory(dialog: ConfigurationDialog, userId: string): Promise<void> {
    const memory: Memory = {
      id: uuidv4(),
      userId,
      agentId: this.runtime.agentId,
      roomId: 'plugin-configuration',
      content: {
        text: `Started configuration dialog for plugin: ${dialog.pluginName}`,
        dialogId: dialog.id,
        pluginName: dialog.pluginName,
        requiredVars: dialog.request.missingVars
      },
      createdAt: Date.now(),
      embedding: []
    };
    
    await this.runtime.memory.createMemory(memory);
  }

  getActiveDialogs(): ConfigurationDialog[] {
    return Array.from(this.activeDialogs.values());
  }

  getDialogById(dialogId: string): ConfigurationDialog | undefined {
    return this.activeDialogs.get(dialogId);
  }
}
```

### 3. Enhanced Providers

**File:** `packages/core/src/providers/plugin-configuration-providers.ts`

```typescript
import { type IProvider, type IAgentRuntime } from '@elizaos/core';
import { PluginManagementService } from '../services/plugin-management-service';
import { PluginConfigurationService } from '../services/plugin-configuration-service';

export const pluginConfigurationStatusProvider: IProvider = {
  name: 'pluginConfigurationStatus',
  description: 'Provides detailed configuration status for all plugins',
  
  async getContext(runtime: IAgentRuntime): Promise<string> {
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    const configService = runtime.getService(PluginConfigurationService.serviceName) as PluginConfigurationService;
    
    if (!pluginService || !configService) {
      return 'Configuration services not available';
    }
    
    const plugins = pluginService.listInstalledPlugins();
    const configStatuses = [];
    
    for (const plugin of plugins) {
      const configRequest = await configService.generateConfigurationRequest(plugin);
      
      configStatuses.push({
        name: plugin.name,
        status: plugin.status,
        totalRequired: configRequest.requiredVars.length,
        totalOptional: configRequest.optionalVars.length,
        missingRequired: configRequest.missingVars.length,
        missingRequiredVars: configRequest.missingVars,
        configuredVars: configRequest.requiredVars
          .filter(v => !configRequest.missingVars.includes(v.name))
          .map(v => v.name),
        readyToActivate: configRequest.missingVars.length === 0
      });
    }
    
    return JSON.stringify(configStatuses, null, 2);
  }
};

export const pluginConfigurationDialogsProvider: IProvider = {
  name: 'pluginConfigurationDialogs',
  description: 'Provides active configuration dialog information',
  
  async getContext(runtime: IAgentRuntime): Promise<string> {
    const interactionService = runtime.getService('pluginUserInteraction') as any;
    
    if (!interactionService) {
      return 'User interaction service not available';
    }
    
    const dialogs = interactionService.getActiveDialogs();
    
    const dialogInfo = dialogs.map(d => ({
      id: d.id,
      plugin: d.pluginName,
      status: d.status,
      progress: `${Object.keys(d.responses).length}/${d.request.missingVars.length}`,
      currentVariable: d.currentVariable,
      startedAt: d.startedAt
    }));
    
    return JSON.stringify(dialogInfo, null, 2);
  }
};
```

### 4. Configuration Actions

**File:** `packages/core/src/actions/plugin-configuration-actions.ts`

```typescript
import { type Action, type IAgentRuntime, type ActionInput, logger } from '@elizaos/core';
import { PluginManagementService } from '../services/plugin-management-service';
import { PluginConfigurationService } from '../services/plugin-configuration-service';
import { PluginUserInteractionService } from '../services/plugin-user-interaction';
import { z } from 'zod';

export const startPluginConfigurationAction: Action = {
  name: 'startPluginConfiguration',
  description: 'Start interactive configuration dialog for a plugin',
  
  similes: [
    'configure plugin interactively',
    'setup plugin step by step',
    'guide me through plugin config'
  ],
  
  inputSchema: z.object({
    pluginName: z.string().describe('Name of the plugin to configure'),
    userId: z.string().describe('User ID for the configuration dialog')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { pluginName, userId } = input as { pluginName: string; userId: string };
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    const configService = runtime.getService(PluginConfigurationService.serviceName) as PluginConfigurationService;
    const interactionService = runtime.getService('pluginUserInteraction') as PluginUserInteractionService;
    
    if (!pluginService || !configService || !interactionService) {
      return 'Required services not available';
    }
    
    try {
      const pluginInfo = pluginService.getPluginInfo(pluginName);
      if (!pluginInfo) {
        return `Plugin ${pluginName} is not installed`;
      }
      
      const configRequest = await configService.generateConfigurationRequest(pluginInfo);
      
      if (configRequest.missingVars.length === 0) {
        return `Plugin ${pluginName} is already fully configured`;
      }
      
      const dialog = await interactionService.initiateConfigurationDialog(configRequest, userId);
      
      const firstVar = configRequest.requiredVars.find(v => v.name === configRequest.missingVars[0]);
      const firstPrompt = interactionService['generatePromptForVariable'](firstVar!);
      
      return `Configuration dialog started (ID: ${dialog.id})\n\n${firstPrompt}`;
      
    } catch (error) {
      logger.error('Failed to start plugin configuration:', error);
      return `Failed to start configuration: ${error.message}`;
    }
  }
};

export const continuePluginConfigurationAction: Action = {
  name: 'continuePluginConfiguration',
  description: 'Continue an active plugin configuration dialog',
  
  similes: [
    'provide config value',
    'answer configuration question',
    'continue setup'
  ],
  
  inputSchema: z.object({
    dialogId: z.string().describe('Configuration dialog ID'),
    userId: z.string().describe('User ID'),
    value: z.string().describe('Configuration value to provide')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { dialogId, userId, value } = input as {
      dialogId: string;
      userId: string;
      value: string;
    };
    
    const interactionService = runtime.getService('pluginUserInteraction') as PluginUserInteractionService;
    
    if (!interactionService) {
      return 'User interaction service not available';
    }
    
    try {
      const result = await interactionService.processUserResponse(dialogId, userId, value);
      
      if (result.completed) {
        const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
        
        return `Configuration completed for ${result.dialog.pluginName}!\n\nThe plugin is now ready to be activated. Use the activatePlugin action to enable it.`;
      } else {
        return result.nextPrompt!;
      }
      
    } catch (error) {
      logger.error('Failed to continue plugin configuration:', error);
      return `Failed to process configuration: ${error.message}`;
    }
  }
};

export const validatePluginConfigurationAction: Action = {
  name: 'validatePluginConfiguration',
  description: 'Validate a plugin configuration without applying it',
  
  similes: [
    'check plugin config',
    'validate configuration',
    'test plugin settings'
  ],
  
  inputSchema: z.object({
    pluginName: z.string().describe('Name of the plugin'),
    configuration: z.record(z.string()).describe('Configuration to validate')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { pluginName, configuration } = input as {
      pluginName: string;
      configuration: Record<string, string>;
    };
    
    const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
    const configService = runtime.getService(PluginConfigurationService.serviceName) as PluginConfigurationService;
    
    if (!pluginService || !configService) {
      return 'Required services not available';
    }
    
    try {
      const pluginInfo = pluginService.getPluginInfo(pluginName);
      if (!pluginInfo) {
        return `Plugin ${pluginName} is not installed`;
      }
      
      const { requiredVars } = await configService.parsePluginRequirements(pluginInfo.path);
      const validation = await configService.validateConfiguration(pluginName, configuration, requiredVars);
      
      if (validation.valid) {
        return `Configuration is valid for ${pluginName}`;
      } else {
        return `Configuration validation failed:\n${validation.errors.join('\n')}`;
      }
      
    } catch (error) {
      logger.error('Failed to validate plugin configuration:', error);
      return `Failed to validate configuration: ${error.message}`;
    }
  }
};

export const exportPluginConfigurationAction: Action = {
  name: 'exportPluginConfiguration',
  description: 'Export plugin configuration (non-sensitive values only)',
  
  similes: [
    'export plugin config',
    'show plugin settings',
    'get plugin configuration'
  ],
  
  inputSchema: z.object({
    pluginName: z.string().describe('Name of the plugin')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { pluginName } = input as { pluginName: string };
    
    const configService = runtime.getService(PluginConfigurationService.serviceName) as PluginConfigurationService;
    
    if (!configService) {
      return 'Configuration service not available';
    }
    
    try {
      const config = await configService.getPluginConfiguration(pluginName);
      
      // Filter out sensitive values for export
      const exportable: Record<string, string> = {};
      for (const [key, value] of Object.entries(config)) {
        if (key.toLowerCase().includes('key') || 
            key.toLowerCase().includes('secret') || 
            key.toLowerCase().includes('password')) {
          exportable[key] = '***REDACTED***';
        } else {
          exportable[key] = value;
        }
      }
      
      return `Configuration for ${pluginName}:\n${JSON.stringify(exportable, null, 2)}`;
      
    } catch (error) {
      logger.error('Failed to export plugin configuration:', error);
      return `Failed to export configuration: ${error.message}`;
    }
  }
};
```

### 5. Package.json Convention

**File:** Example plugin `package.json` with configuration metadata

```json
{
  "name": "@elizaos/plugin-example",
  "version": "1.0.0",
  "main": "dist/index.js",
  "elizaos": {
    "environmentVariables": [
      {
        "name": "OPENAI_API_KEY",
        "description": "Your OpenAI API key for accessing GPT models",
        "sensitive": true,
        "required": true,
        "validation": {
          "pattern": "^sk-[a-zA-Z0-9]{48}$",
          "minLength": 51
        }
      },
      {
        "name": "OPENAI_MODEL",
        "description": "The OpenAI model to use (e.g., gpt-4, gpt-3.5-turbo)",
        "sensitive": false,
        "required": false,
        "defaultValue": "gpt-3.5-turbo",
        "validation": {
          "enum": ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo-preview"]
        }
      },
      {
        "name": "MAX_TOKENS",
        "description": "Maximum tokens for API responses",
        "sensitive": false,
        "required": false,
        "defaultValue": "2000",
        "validation": {
          "pattern": "^[0-9]+$"
        }
      }
    ]
  }
}
```

### 6. Integration with Agent Logic

**File:** `packages/core/src/evaluators/plugin-configuration-evaluator.ts`

```typescript
import { type Evaluator, type IAgentRuntime, type Memory, logger } from '@elizaos/core';
import { PluginManagementService } from '../services/plugin-management-service';
import { PluginConfigurationService } from '../services/plugin-configuration-service';

export const pluginConfigurationEvaluator: Evaluator = {
  name: 'pluginConfigurationEvaluator',
  description: 'Monitors conversations for plugin configuration needs',
  
  async evaluate(runtime: IAgentRuntime, memory: Memory): Promise<void> {
    const content = memory.content.text.toLowerCase();
    
    // Check for plugin-related intent
    if (content.includes('install') || content.includes('plugin') || 
        content.includes('configure') || content.includes('setup')) {
      
      const pluginService = runtime.getService(PluginManagementService.serviceName) as PluginManagementService;
      const configService = runtime.getService(PluginConfigurationService.serviceName) as PluginConfigurationService;
      
      if (!pluginService || !configService) return;
      
      // Check for unconfigured plugins
      const plugins = pluginService.listInstalledPlugins();
      const unconfigured = [];
      
      for (const plugin of plugins) {
        if (plugin.status === 'needs_configuration') {
          const configRequest = await configService.generateConfigurationRequest(plugin);
          if (configRequest.missingVars.length > 0) {
            unconfigured.push({
              name: plugin.name,
              missing: configRequest.missingVars
            });
          }
        }
      }
      
      if (unconfigured.length > 0) {
        // Create a memory suggesting configuration
        const suggestionMemory: Memory = {
          id: crypto.randomUUID(),
          userId: memory.userId,
          agentId: runtime.agentId,
          roomId: memory.roomId,
          content: {
            text: `I noticed you have ${unconfigured.length} plugin(s) that need configuration: ${unconfigured.map(p => p.name).join(', ')}. Would you like me to help you configure them?`,
            suggestions: unconfigured
          },
          createdAt: Date.now(),
          embedding: []
        };
        
        await runtime.memory.createMemory(suggestionMemory);
      }
    }
  }
};
```

## Testing Strategy

### Unit Tests

```typescript
// packages/plugin-dynamic-plugins/src/__tests__/plugin-configuration-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginConfigurationService } from '../services/plugin-configuration-service';
import { createMockRuntime } from '@elizaos/test-utils';

describe('PluginConfigurationService', () => {
  let service: PluginConfigurationService;
  let mockRuntime: IAgentRuntime;
  
  beforeEach(() => {
    mockRuntime = createMockRuntime();
    service = new PluginConfigurationService();
    service.runtime = mockRuntime;
  });
  
  describe('parsePluginRequirements', () => {
    it('should parse environment variables from package.json', async () => {
      const { requiredVars, optionalVars } = await service.parsePluginRequirements('/test/plugin');
      
      expect(requiredVars).toHaveLength(1);
      expect(requiredVars[0].name).toBe('API_KEY');
      expect(requiredVars[0].sensitive).toBe(true);
      
      expect(optionalVars).toHaveLength(1);
      expect(optionalVars[0].name).toBe('LOG_LEVEL');
    });
  });
  
  describe('validateConfiguration', () => {
    it('should validate configuration against requirements', async () => {
      const requirements = [{
        name: 'API_KEY',
        description: 'API Key',
        sensitive: true,
        required: true,
        validation: {
          pattern: '^sk-[a-zA-Z0-9]{48}$'
        }
      }];
      
      const validConfig = { API_KEY: 'sk-' + 'a'.repeat(48) };
      const validation = await service.validateConfiguration('test-plugin', validConfig, requirements);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
    
    it('should reject invalid configuration', async () => {
      const requirements = [{
        name: 'API_KEY',
        description: 'API Key',
        sensitive: true,
        required: true,
        validation: {
          pattern: '^sk-[a-zA-Z0-9]{48}$'
        }
      }];
      
      const invalidConfig = { API_KEY: 'invalid-key' };
      const validation = await service.validateConfiguration('test-plugin', invalidConfig, requirements);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('API_KEY does not match required pattern');
    });
  });
  
  describe('encryption', () => {
    it('should encrypt and decrypt sensitive values', async () => {
      await service.initialize();
      
      const config = {
        API_KEY: 'secret-key-123',
        LOG_LEVEL: 'info'
      };
      
      const metadata = {
        API_KEY: { name: 'API_KEY', sensitive: true },
        LOG_LEVEL: { name: 'LOG_LEVEL', sensitive: false }
      };
      
      await service.setPluginConfiguration('test-plugin', config, metadata);
      const retrieved = await service.getPluginConfiguration('test-plugin');
      
      expect(retrieved.API_KEY).toBe('secret-key-123');
      expect(retrieved.LOG_LEVEL).toBe('info');
    });
  });
});
```

### Integration Tests

```typescript
// packages/plugin-dynamic-plugins/src/__tests__/configuration-dialog.test.ts
import { describe, it, expect } from 'vitest';
import { AgentRuntime } from '@elizaos/core';
import { dynamicPluginsPlugin } from '../index';

describe('Configuration Dialog Integration', () => {
  it('should complete full configuration dialog', async () => {
    const runtime = new AgentRuntime({
      character: { name: 'Test Agent' },
      plugins: [dynamicPluginsPlugin]
    });
    
    await runtime.initialize();
    
    // Install plugin with requirements
    await runtime.executeAction('installPlugin', {
      pluginName: '@elizaos/plugin-openai'
    });
    
    // Start configuration dialog
    const startResult = await runtime.executeAction('startPluginConfiguration', {
      pluginName: '@elizaos/plugin-openai',
      userId: 'test-user'
    });
    
    expect(startResult).toContain('Configuration dialog started');
    expect(startResult).toContain('OPENAI_API_KEY');
    
    // Extract dialog ID
    const dialogId = startResult.match(/ID: ([a-f0-9-]+)/)?.[1];
    
    // Provide API key
    const continueResult = await runtime.executeAction('continuePluginConfiguration', {
      dialogId,
      userId: 'test-user',
      value: 'sk-' + 'a'.repeat(48)
    });
    
    expect(continueResult).toContain('Configuration completed');
    
    // Verify plugin is ready
    const status = await runtime.providers.pluginConfigurationStatus.getContext(runtime);
    expect(status).toContain('"readyToActivate": true');
  });
});
```

## Security Best Practices

1. **Encryption at Rest**: All sensitive values encrypted using AES-256-CBC
2. **Secure Key Storage**: Encryption keys stored with restricted file permissions
3. **Memory Sanitization**: Sensitive values cleared from memory after use
4. **Audit Logging**: All configuration changes logged (without sensitive values)
5. **Validation**: Input validation prevents injection attacks
6. **Scoped Access**: Plugins only access their own configurations

## User Experience Considerations

1. **Progressive Disclosure**: Only ask for required variables first
2. **Clear Descriptions**: Each variable includes helpful description
3. **Validation Feedback**: Immediate feedback on invalid inputs
4. **Resume Capability**: Can resume interrupted configuration dialogs
5. **Bulk Configuration**: Support for configuring multiple plugins
6. **Export/Import**: Non-sensitive configs can be exported/imported

## Integration with Agent Behavior

1. **Proactive Suggestions**: Agent suggests configuration when needed
2. **Context Awareness**: Agent understands configuration state in conversations
3. **Error Recovery**: Agent can guide through configuration errors
4. **Completion Tracking**: Agent knows when plugins are ready to activate
5. **Security Reminders**: Agent reminds about sensitive value handling

## Future Enhancements

1. **Configuration Templates**: Pre-defined configs for common scenarios
2. **Environment Profiles**: Different configs for dev/staging/prod
3. **Batch Configuration**: Configure multiple plugins at once
4. **Configuration History**: Track and rollback configuration changes
5. **External Vaults**: Integration with HashiCorp Vault, AWS Secrets Manager 