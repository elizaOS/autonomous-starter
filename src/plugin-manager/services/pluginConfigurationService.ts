import {
  Service,
  type IAgentRuntime,
  type ServiceTypeName,
  logger,
} from "@elizaos/core";
import {
  PluginManagerServiceType,
  type PluginEnvironmentVariable,
  type PluginConfigurationRequest,
  type PluginState,
} from "../types";
import * as crypto from "crypto";
import path from "path";
import fs from "fs-extra";

export class PluginConfigurationService extends Service {
  static override serviceType: ServiceTypeName =
    PluginManagerServiceType.PLUGIN_CONFIGURATION;
  override capabilityDescription =
    "Manages secure plugin configurations and environment variables";

  private encryptionKey: Buffer | null = null;
  private configStore: Map<string, Record<string, any>> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<PluginConfigurationService> {
    const service = new PluginConfigurationService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    logger.info("[PluginConfigurationService] Initializing...");

    // Initialize encryption key
    this.encryptionKey = await this.getOrCreateEncryptionKey();

    // Load existing configurations
    await this.loadConfigurations();

    logger.success("[PluginConfigurationService] Initialized successfully");
  }

  async parsePluginRequirements(pluginPath: string): Promise<{
    requiredVars: PluginEnvironmentVariable[];
    optionalVars: PluginEnvironmentVariable[];
  }> {
    const packageJsonPath = path.join(pluginPath, "package.json");

    try {
      if (!(await fs.pathExists(packageJsonPath))) {
        logger.warn(
          `[PluginConfigurationService] No package.json found at ${packageJsonPath}`,
        );
        return { requiredVars: [], optionalVars: [] };
      }

      const packageJson = await fs.readJson(packageJsonPath);
      const elizaosConfig = packageJson.elizaos || {};

      const allVars: PluginEnvironmentVariable[] =
        elizaosConfig.environmentVariables || [];

      // Separate required and optional
      const requiredVars = allVars.filter((v) => v.required !== false);
      const optionalVars = allVars.filter((v) => v.required === false);

      return { requiredVars, optionalVars };
    } catch (error) {
      logger.error(
        `[PluginConfigurationService] Failed to parse plugin requirements:`,
        error,
      );
      return { requiredVars: [], optionalVars: [] };
    }
  }

  async getPluginConfiguration(
    pluginName: string,
  ): Promise<Record<string, string>> {
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
    metadata?: Record<string, PluginEnvironmentVariable>,
  ): Promise<void> {
    const encrypted: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      const varMetadata = metadata?.[key];
      const isSensitive = varMetadata?.sensitive ?? this.isSensitiveKey(key);

      if (isSensitive) {
        encrypted[key] = {
          encrypted: true,
          data: await this.encrypt(value),
        };
      } else {
        encrypted[key] = {
          encrypted: false,
          data: value,
        };
      }
    }

    this.configStore.set(pluginName, encrypted);
    await this.saveConfigurations();

    logger.info(
      `[PluginConfigurationService] Configuration saved for plugin: ${pluginName}`,
    );
  }

  async validateConfiguration(
    pluginName: string,
    config: Record<string, string>,
    requirements: PluginEnvironmentVariable[],
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
            errors.push(
              `${req.name} does not match required pattern: ${req.validation.pattern}`,
            );
          }
        }

        // Length validation
        if (
          req.validation.minLength &&
          value.length < req.validation.minLength
        ) {
          errors.push(
            `${req.name} is too short (min: ${req.validation.minLength})`,
          );
        }
        if (
          req.validation.maxLength &&
          value.length > req.validation.maxLength
        ) {
          errors.push(
            `${req.name} is too long (max: ${req.validation.maxLength})`,
          );
        }

        // Enum validation
        if (req.validation.enum && !req.validation.enum.includes(value)) {
          errors.push(
            `${req.name} must be one of: ${req.validation.enum.join(", ")}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async generateConfigurationRequest(
    pluginName: string,
    pluginPath: string,
  ): Promise<PluginConfigurationRequest> {
    const currentConfig = await this.getPluginConfiguration(pluginName);
    const missingVars: string[] = [];

    // Parse full requirements from package.json
    const { requiredVars, optionalVars } =
      await this.parsePluginRequirements(pluginPath);

    // Check which required vars are missing
    for (const reqVar of requiredVars) {
      if (!currentConfig[reqVar.name]) {
        missingVars.push(reqVar.name);
      }
    }

    return {
      pluginName,
      requiredVars,
      missingVars,
      optionalVars,
    };
  }

  async applyConfigurationToEnvironment(
    pluginName: string,
  ): Promise<Record<string, string>> {
    const config = await this.getPluginConfiguration(pluginName);

    // Apply configuration to process.env for plugin access
    for (const [key, value] of Object.entries(config)) {
      process.env[key] = value;
    }

    return config;
  }

  async hasValidConfiguration(
    pluginName: string,
    pluginPath: string,
  ): Promise<boolean> {
    const request = await this.generateConfigurationRequest(
      pluginName,
      pluginPath,
    );
    return request.missingVars.length === 0;
  }

  // Encryption methods

  private async getOrCreateEncryptionKey(): Promise<Buffer> {
    const dataDir = path.join(process.cwd(), "data");
    await fs.ensureDir(dataDir);
    const keyPath = path.join(dataDir, ".encryption-key");

    try {
      if (await fs.pathExists(keyPath)) {
        const keyData = await fs.readFile(keyPath);
        return Buffer.from(keyData.toString(), "hex");
      }
    } catch (error) {
      logger.warn(
        "[PluginConfigurationService] Failed to load encryption key, creating new one",
      );
    }

    // Generate new key
    const key = crypto.randomBytes(32);
    await fs.writeFile(keyPath, key.toString("hex"));

    // Secure the file
    await fs.chmod(keyPath, 0o600);

    logger.info("[PluginConfigurationService] Created new encryption key");
    return key;
  }

  private async encrypt(text: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not initialized");
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.encryptionKey, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  }

  private async decrypt(text: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error("Encryption key not initialized");
    }

    const [ivHex, encrypted] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      this.encryptionKey,
      iv,
    );

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }

  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return (
      lowerKey.includes("key") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("password") ||
      lowerKey.includes("token") ||
      lowerKey.includes("auth")
    );
  }

  private async loadConfigurations(): Promise<void> {
    const dataDir = path.join(process.cwd(), "data");
    await fs.ensureDir(dataDir);
    const configPath = path.join(dataDir, "plugin-configs.json");

    try {
      if (await fs.pathExists(configPath)) {
        const data = await fs.readJson(configPath);

        for (const [plugin, config] of Object.entries(data)) {
          this.configStore.set(plugin, config as Record<string, any>);
        }

        logger.info(
          `[PluginConfigurationService] Loaded configurations for ${this.configStore.size} plugins`,
        );
      }
    } catch (error) {
      logger.error(
        "[PluginConfigurationService] Failed to load plugin configurations:",
        error,
      );
    }
  }

  private async saveConfigurations(): Promise<void> {
    const dataDir = path.join(process.cwd(), "data");
    await fs.ensureDir(dataDir);
    const configPath = path.join(dataDir, "plugin-configs.json");

    const data = Object.fromEntries(this.configStore);

    try {
      await fs.writeJson(configPath, data, { spaces: 2 });

      // Secure the file
      await fs.chmod(configPath, 0o600);
    } catch (error) {
      logger.error(
        "[PluginConfigurationService] Failed to save plugin configurations:",
        error,
      );
    }
  }

  async stop(): Promise<void> {
    logger.info("[PluginConfigurationService] Stopping...");
    await this.saveConfigurations();
  }
}
