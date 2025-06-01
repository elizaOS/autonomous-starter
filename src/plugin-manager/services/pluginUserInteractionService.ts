import {
  Service,
  type IAgentRuntime,
  type ServiceTypeName,
  type Memory,
  logger,
} from "@elizaos/core";
import {
  PluginManagerServiceType,
  type PluginConfigurationRequest,
  type ConfigurationDialog,
  type PluginEnvironmentVariable,
} from "../types";
import { PluginConfigurationService } from "./pluginConfigurationService";
import { v4 as uuidv4 } from "uuid";

export class PluginUserInteractionService extends Service {
  static override serviceType: ServiceTypeName =
    PluginManagerServiceType.PLUGIN_USER_INTERACTION;
  override capabilityDescription =
    "Manages user interaction dialogs for plugin configuration";

  private activeDialogs: Map<string, ConfigurationDialog> = new Map();
  private configService: PluginConfigurationService | null = null;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<PluginUserInteractionService> {
    const service = new PluginUserInteractionService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    logger.info("[PluginUserInteractionService] Initializing...");

    // Get reference to configuration service
    this.configService = this.runtime.getService(
      PluginManagerServiceType.PLUGIN_CONFIGURATION,
    ) as PluginConfigurationService;

    if (!this.configService) {
      logger.warn(
        "[PluginUserInteractionService] PluginConfigurationService not available",
      );
    }

    logger.success("[PluginUserInteractionService] Initialized successfully");
  }

  async initiateConfigurationDialog(
    request: PluginConfigurationRequest,
    userId: string,
  ): Promise<ConfigurationDialog> {
    const dialog: ConfigurationDialog = {
      id: uuidv4(),
      pluginName: request.pluginName,
      status: "pending",
      request,
      responses: {},
      startedAt: new Date(),
    };

    this.activeDialogs.set(dialog.id, dialog);

    // Create memory for tracking
    await this.createDialogMemory(dialog, userId);

    // Set first variable if there are missing vars
    if (request.missingVars.length > 0) {
      dialog.currentVariable = request.missingVars[0];
      dialog.status = "in_progress";
    } else {
      dialog.status = "completed";
      dialog.completedAt = new Date();
    }

    logger.info(
      `[PluginUserInteractionService] Started configuration dialog ${dialog.id} for plugin ${request.pluginName}`,
    );

    return dialog;
  }

  async processUserResponse(
    dialogId: string,
    userId: string,
    response: string,
  ): Promise<{
    dialog: ConfigurationDialog;
    nextPrompt?: string;
    completed: boolean;
  }> {
    const dialog = this.activeDialogs.get(dialogId);
    if (!dialog) {
      throw new Error(`Dialog ${dialogId} not found`);
    }

    dialog.status = "in_progress";

    // Store response for current variable
    if (dialog.currentVariable) {
      dialog.responses[dialog.currentVariable] = response.trim();
      logger.info(
        `[PluginUserInteractionService] Collected ${dialog.currentVariable} for plugin ${dialog.pluginName}`,
      );
    }

    // Find next missing variable
    const nextMissing = dialog.request.missingVars.find(
      (varName) => !dialog.responses[varName],
    );

    if (nextMissing) {
      dialog.currentVariable = nextMissing;
      const varInfo = dialog.request.requiredVars.find(
        (v) => v.name === nextMissing,
      );

      const nextPrompt = this.generatePromptForVariable(varInfo!);

      return {
        dialog,
        nextPrompt,
        completed: false,
      };
    }

    // All variables collected
    dialog.status = "completed";
    dialog.completedAt = new Date();
    dialog.currentVariable = undefined;

    // Apply configuration
    await this.applyDialogConfiguration(dialog);

    logger.success(
      `[PluginUserInteractionService] Completed configuration dialog ${dialog.id} for plugin ${dialog.pluginName}`,
    );

    return {
      dialog,
      completed: true,
    };
  }

  generatePromptForVariable(varInfo: PluginEnvironmentVariable): string {
    let prompt = `🔧 **Plugin Configuration Required**\n\n`;
    prompt += `I need to configure **${varInfo.name}** for the plugin.\n\n`;
    prompt += `📝 **Description**: ${varInfo.description}\n\n`;

    if (varInfo.sensitive) {
      prompt += `🔒 **Security**: This is a sensitive value that will be encrypted and stored securely.\n\n`;
    }

    if (varInfo.validation) {
      prompt += `📋 **Requirements**:\n`;
      if (varInfo.validation.pattern) {
        prompt += `- Format: \`${varInfo.validation.pattern}\`\n`;
      }
      if (varInfo.validation.enum) {
        prompt += `- Valid options: ${varInfo.validation.enum.join(", ")}\n`;
      }
      if (varInfo.validation.minLength || varInfo.validation.maxLength) {
        prompt += `- Length: ${varInfo.validation.minLength || 0}-${varInfo.validation.maxLength || "unlimited"} characters\n`;
      }
      prompt += `\n`;
    }

    if (varInfo.defaultValue) {
      prompt += `💡 **Default**: ${varInfo.defaultValue}\n\n`;
    }

    prompt += `Please provide the value for **${varInfo.name}**:`;

    return prompt;
  }

  async cancelDialog(dialogId: string): Promise<void> {
    const dialog = this.activeDialogs.get(dialogId);
    if (dialog) {
      dialog.status = "cancelled";
      dialog.completedAt = new Date();
      this.activeDialogs.delete(dialogId);

      logger.info(
        `[PluginUserInteractionService] Cancelled configuration dialog ${dialogId} for plugin ${dialog.pluginName}`,
      );
    }
  }

  getActiveDialogs(): ConfigurationDialog[] {
    return Array.from(this.activeDialogs.values());
  }

  getDialogById(dialogId: string): ConfigurationDialog | undefined {
    return this.activeDialogs.get(dialogId);
  }

  getDialogByUser(userId: string): ConfigurationDialog | undefined {
    return Array.from(this.activeDialogs.values()).find(
      (dialog) => dialog.status === "in_progress",
    );
  }

  async validateUserResponse(
    varInfo: PluginEnvironmentVariable,
    value: string,
  ): Promise<{ valid: boolean; error?: string }> {
    if (!value || value.trim() === "") {
      if (varInfo.required) {
        return { valid: false, error: `${varInfo.name} is required` };
      }
      return { valid: true };
    }

    const trimmedValue = value.trim();

    if (varInfo.validation) {
      // Pattern validation
      if (varInfo.validation.pattern) {
        const regex = new RegExp(varInfo.validation.pattern);
        if (!regex.test(trimmedValue)) {
          return {
            valid: false,
            error: `${varInfo.name} does not match required format: ${varInfo.validation.pattern}`,
          };
        }
      }

      // Length validation
      if (
        varInfo.validation.minLength &&
        trimmedValue.length < varInfo.validation.minLength
      ) {
        return {
          valid: false,
          error: `${varInfo.name} is too short (minimum: ${varInfo.validation.minLength} characters)`,
        };
      }
      if (
        varInfo.validation.maxLength &&
        trimmedValue.length > varInfo.validation.maxLength
      ) {
        return {
          valid: false,
          error: `${varInfo.name} is too long (maximum: ${varInfo.validation.maxLength} characters)`,
        };
      }

      // Enum validation
      if (
        varInfo.validation.enum &&
        !varInfo.validation.enum.includes(trimmedValue)
      ) {
        return {
          valid: false,
          error: `${varInfo.name} must be one of: ${varInfo.validation.enum.join(", ")}`,
        };
      }
    }

    return { valid: true };
  }

  private async applyDialogConfiguration(
    dialog: ConfigurationDialog,
  ): Promise<void> {
    if (!this.configService) {
      throw new Error("Configuration service not available");
    }

    // Prepare metadata for sensitive handling
    const metadata: Record<string, PluginEnvironmentVariable> = {};
    for (const varInfo of dialog.request.requiredVars) {
      metadata[varInfo.name] = varInfo;
    }

    // Apply the configuration
    await this.configService.setPluginConfiguration(
      dialog.pluginName,
      dialog.responses,
      metadata,
    );

    // Update plugin status in management service
    const pluginService = this.runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER,
    ) as any;
    if (pluginService) {
      try {
        // Find plugin by name and update its configuration status
        const plugins = pluginService.getAllPlugins();
        const plugin = plugins.find((p: any) => p.name === dialog.pluginName);
        if (plugin) {
          pluginService.updatePluginState(plugin.id, {
            configurationStatus: "complete",
            configurationErrors: [],
          });
        }
      } catch (error) {
        logger.error(
          `[PluginUserInteractionService] Failed to update plugin status:`,
          error,
        );
      }
    }

    // Apply configuration to environment
    await this.configService.applyConfigurationToEnvironment(dialog.pluginName);
  }

  private async createDialogMemory(
    dialog: ConfigurationDialog,
    userId: string,
  ): Promise<void> {
    try {
      // Create a simple log for dialog tracking
      logger.info(
        `[PluginUserInteractionService] Dialog ${dialog.id} started for plugin ${dialog.pluginName} by user ${userId}`,
      );
    } catch (error) {
      logger.warn(
        "[PluginUserInteractionService] Failed to create dialog memory:",
        error,
      );
    }
  }

  // Cleanup completed dialogs after a timeout
  private async cleanupCompletedDialogs(): Promise<void> {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [dialogId, dialog] of this.activeDialogs.entries()) {
      if (
        (dialog.status === "completed" || dialog.status === "cancelled") &&
        dialog.completedAt &&
        dialog.completedAt.getTime() < cutoffTime
      ) {
        this.activeDialogs.delete(dialogId);
        logger.debug(
          `[PluginUserInteractionService] Cleaned up old dialog ${dialogId}`,
        );
      }
    }
  }

  async stop(): Promise<void> {
    logger.info("[PluginUserInteractionService] Stopping...");
    await this.cleanupCompletedDialogs();
  }
}
