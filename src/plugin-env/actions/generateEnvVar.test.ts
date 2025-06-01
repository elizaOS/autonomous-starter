import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEnvVarAction } from "./generateEnvVar";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";

// Mock the generation and validation modules
vi.mock("../generation", () => ({
  generateScript: vi.fn(),
  getGenerationDescription: vi.fn(),
}));

vi.mock("../validation", () => ({
  validateEnvVar: vi.fn(),
}));

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn(() => "mock-uuid-123"),
}));

// Mock fs/promises, path, and os
vi.mock("fs/promises", () => ({
  mkdtemp: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  rmdir: vi.fn(),
}));

vi.mock("path", () => ({
  join: vi.fn((...args) => args.join("/")),
}));

vi.mock("os", () => ({
  tmpdir: vi.fn(() => "/tmp"),
}));

describe("generateEnvVarAction", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockCallback: any;
  let mockShellService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockShellService = {
      executeCommand: vi.fn(),
    };

    mockRuntime = {
      getService: vi.fn().mockReturnValue(mockShellService),
      getSetting: vi.fn(),
      getWorld: vi.fn(),
      updateWorld: vi.fn(),
    } as any;

    mockMessage = {
      id: "test-message-id",
      entityId: "test-entity-id",
      roomId: "test-room-id",
      content: {
        text: "generate SECRET_KEY",
        source: "test-source",
      },
    } as any;

    mockState = {
      values: {},
      data: {},
      text: "",
    };

    mockCallback = vi.fn();
  });

  describe("action properties", () => {
    it("should have correct name and description", () => {
      expect(generateEnvVarAction.name).toBe("GENERATE_ENV_VAR");
      expect(generateEnvVarAction.description).toContain(
        "Automatically generates environment",
      );
    });

    it("should have examples", () => {
      expect(generateEnvVarAction.examples).toBeDefined();
      expect(Array.isArray(generateEnvVarAction.examples)).toBe(true);
      expect(generateEnvVarAction.examples.length).toBeGreaterThan(0);
    });
  });

  describe("validate", () => {
    it("should return true when there are generatable environment variables", async () => {
      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              SECRET_KEY: {
                type: "secret",
                required: true,
                description: "Test secret",
                canGenerate: true,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
            },
          },
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

      const result = await generateEnvVarAction.validate(
        mockRuntime,
        mockMessage,
        mockState,
      );
      expect(result).toBe(true);
    });

    it("should return false when no world ID is available", async () => {
      (mockRuntime.getSetting as any).mockReturnValue(null);

      const result = await generateEnvVarAction.validate(
        mockRuntime,
        mockMessage,
        mockState,
      );
      expect(result).toBe(false);
    });

    it("should return false when no generatable environment variables exist", async () => {
      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              API_KEY: {
                type: "api_key",
                required: true,
                description: "Test API key",
                canGenerate: false,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
            },
          },
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

      const result = await generateEnvVarAction.validate(
        mockRuntime,
        mockMessage,
        mockState,
      );
      expect(result).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockRejectedValue(new Error("Test error"));
      const loggerSpy = vi.spyOn(logger, "error");

      const result = await generateEnvVarAction.validate(
        mockRuntime,
        mockMessage,
        mockState,
      );
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error validating GENERATE_ENV_VAR action:",
        new Error("Test error"),
      );
      loggerSpy.mockRestore();
    });
  });

  describe("handler", () => {
    beforeEach(() => {
      mockRuntime.getWorld = vi.fn();
      mockRuntime.updateWorld = vi.fn();
      mockRuntime.getService = vi.fn().mockReturnValue(mockShellService);
    });

    it("should handle missing callback", async () => {
      const loggerSpy = vi.spyOn(logger, "error");

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        "[GenerateEnvVar] Error in handler: Error: Callback is required for GENERATE_ENV_VAR action",
      );
      loggerSpy.mockRestore();
    });

    it("should handle missing world ID", async () => {
      (mockRuntime.getSetting as any).mockReturnValue(null);
      const loggerSpy = vi.spyOn(logger, "error");

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining("error"),
        actions: ["GENERATE_ENV_VAR_ERROR"],
        source: "test-source",
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        "[GenerateEnvVar] Error in handler: Error: No WORLD_ID found",
      );
      loggerSpy.mockRestore();
    });

    it("should handle missing world", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(null);
      const loggerSpy = vi.spyOn(logger, "error");

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining("error"),
        actions: ["GENERATE_ENV_VAR_ERROR"],
        source: "test-source",
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        "[GenerateEnvVar] Error in handler: Error: No environment variables metadata found",
      );
      loggerSpy.mockRestore();
    });

    it("should handle no generatable variables", async () => {
      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              API_KEY: {
                type: "api_key",
                required: true,
                description: "Test API key",
                canGenerate: false,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
            },
          },
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: "No environment variables can be auto-generated at this time.",
        actions: ["GENERATE_ENV_VAR_NONE"],
        source: "test-source",
      });
    });

    it("should successfully generate environment variables", async () => {
      const { generateScript } = await import("../generation");
      const { validateEnvVar } = await import("../validation");
      const fs = await import("fs/promises");

      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              SECRET_KEY: {
                type: "secret",
                required: true,
                description: "Test secret",
                canGenerate: true,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
            },
          },
          generationScripts: {},
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      (mockRuntime.updateWorld as any).mockResolvedValue(undefined);

      // Mock generation script
      (generateScript as any).mockReturnValue({
        variableName: "SECRET_KEY",
        pluginName: "test-plugin",
        script: 'console.log("generated-secret-value")',
        dependencies: [],
        attempts: 0,
        status: "pending",
        createdAt: Date.now(),
      });

      // Mock shell service execution
      mockShellService.executeCommand.mockResolvedValue({
        exitCode: 0,
        output: "generated-secret-value\n",
        error: null,
      });

      // Mock validation
      (validateEnvVar as any).mockResolvedValue({
        isValid: true,
        details: "Validation successful",
      });

      // Mock fs operations
      (fs.mkdtemp as any).mockResolvedValue("/tmp/eliza-env-gen-abc123");
      (fs.writeFile as any).mockResolvedValue(undefined);
      (fs.unlink as any).mockResolvedValue(undefined);
      (fs.rmdir as any).mockResolvedValue(undefined);

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "Successfully generated 1 environment variable",
        ),
        actions: ["GENERATE_ENV_VAR_SUCCESS"],
        source: "test-source",
      });

      expect(mockRuntime.updateWorld).toHaveBeenCalledWith(mockWorld);
      expect(process.env.SECRET_KEY).toBe("generated-secret-value");
    });

    it("should handle partial success when some variables fail", async () => {
      const { generateScript } = await import("../generation");
      const { validateEnvVar } = await import("../validation");
      const fs = await import("fs/promises");

      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              SECRET_KEY: {
                type: "secret",
                required: true,
                description: "Test secret",
                canGenerate: true,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
              ANOTHER_SECRET: {
                type: "secret",
                required: true,
                description: "Another secret",
                canGenerate: true,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
            },
          },
          generationScripts: {},
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      (mockRuntime.updateWorld as any).mockResolvedValue(undefined);

      // Mock generation script - first succeeds, second fails
      (generateScript as any)
        .mockReturnValueOnce({
          variableName: "SECRET_KEY",
          pluginName: "test-plugin",
          script: 'console.log("generated-secret-value")',
          dependencies: [],
          attempts: 0,
          status: "pending",
          createdAt: Date.now(),
        })
        .mockReturnValueOnce(null); // Second call returns null (no script available)

      // Mock shell service execution
      mockShellService.executeCommand.mockResolvedValue({
        exitCode: 0,
        output: "generated-secret-value\n",
        error: null,
      });

      // Mock validation
      (validateEnvVar as any).mockResolvedValue({
        isValid: true,
        details: "Validation successful",
      });

      // Mock fs operations
      (fs.mkdtemp as any).mockResolvedValue("/tmp/eliza-env-gen-abc123");
      (fs.writeFile as any).mockResolvedValue(undefined);
      (fs.unlink as any).mockResolvedValue(undefined);
      (fs.rmdir as any).mockResolvedValue(undefined);

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "Successfully generated 1 environment variable",
        ),
        actions: ["GENERATE_ENV_VAR_PARTIAL"],
        source: "test-source",
      });
    });

    it("should handle script execution failure", async () => {
      const { generateScript } = await import("../generation");
      const fs = await import("fs/promises");

      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              SECRET_KEY: {
                type: "secret",
                required: true,
                description: "Test secret",
                canGenerate: true,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
            },
          },
          generationScripts: {},
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      (mockRuntime.updateWorld as any).mockResolvedValue(undefined);

      // Mock generation script
      (generateScript as any).mockReturnValue({
        variableName: "SECRET_KEY",
        pluginName: "test-plugin",
        script: 'console.log("generated-secret-value")',
        dependencies: [],
        attempts: 0,
        status: "pending",
        createdAt: Date.now(),
      });

      // Mock shell service execution failure
      mockShellService.executeCommand.mockResolvedValue({
        exitCode: 1,
        output: "",
        error: "Script execution failed",
      });

      // Mock fs operations
      (fs.mkdtemp as any).mockResolvedValue("/tmp/eliza-env-gen-abc123");
      (fs.writeFile as any).mockResolvedValue(undefined);
      (fs.unlink as any).mockResolvedValue(undefined);
      (fs.rmdir as any).mockResolvedValue(undefined);

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "Failed to generate any environment variables",
        ),
        actions: ["GENERATE_ENV_VAR_FAILED"],
        source: "test-source",
      });
    });

    it("should handle validation failure", async () => {
      const { generateScript } = await import("../generation");
      const { validateEnvVar } = await import("../validation");
      const fs = await import("fs/promises");

      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              SECRET_KEY: {
                type: "secret",
                required: true,
                description: "Test secret",
                canGenerate: true,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
            },
          },
          generationScripts: {},
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      (mockRuntime.updateWorld as any).mockResolvedValue(undefined);

      // Mock generation script
      (generateScript as any).mockReturnValue({
        variableName: "SECRET_KEY",
        pluginName: "test-plugin",
        script: 'console.log("generated-secret-value")',
        dependencies: [],
        attempts: 0,
        status: "pending",
        createdAt: Date.now(),
      });

      // Mock shell service execution
      mockShellService.executeCommand.mockResolvedValue({
        exitCode: 0,
        output: "generated-secret-value\n",
        error: null,
      });

      // Mock validation failure
      (validateEnvVar as any).mockResolvedValue({
        isValid: false,
        error: "Validation failed",
        details: "Invalid format",
      });

      // Mock fs operations
      (fs.mkdtemp as any).mockResolvedValue("/tmp/eliza-env-gen-abc123");
      (fs.writeFile as any).mockResolvedValue(undefined);
      (fs.unlink as any).mockResolvedValue(undefined);
      (fs.rmdir as any).mockResolvedValue(undefined);

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "Failed to generate any environment variables",
        ),
        actions: ["GENERATE_ENV_VAR_FAILED"],
        source: "test-source",
      });
    });

    it("should handle missing shell service", async () => {
      const { generateScript } = await import("../generation");

      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              SECRET_KEY: {
                type: "secret",
                required: true,
                description: "Test secret",
                canGenerate: true,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
            },
          },
          generationScripts: {},
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      (mockRuntime.getService as any).mockReturnValue(null); // No shell service

      // Mock generation script
      (generateScript as any).mockReturnValue({
        variableName: "SECRET_KEY",
        pluginName: "test-plugin",
        script: 'console.log("generated-secret-value")',
        dependencies: [],
        attempts: 0,
        status: "pending",
        createdAt: Date.now(),
      });

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "Failed to generate any environment variables",
        ),
        actions: ["GENERATE_ENV_VAR_FAILED"],
        source: "test-source",
      });
    });

    it("should handle dependency installation", async () => {
      const { generateScript } = await import("../generation");
      const { validateEnvVar } = await import("../validation");
      const fs = await import("fs/promises");

      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              UUID_VAR: {
                type: "config",
                required: true,
                description: "UUID variable",
                canGenerate: true,
                status: "missing",
                attempts: 0,
                plugin: "test-plugin",
              },
            },
          },
          generationScripts: {},
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      (mockRuntime.updateWorld as any).mockResolvedValue(undefined);

      // Mock generation script with dependencies
      (generateScript as any).mockReturnValue({
        variableName: "UUID_VAR",
        pluginName: "test-plugin",
        script: 'const { v4 } = require("uuid"); console.log(v4());',
        dependencies: ["uuid"],
        attempts: 0,
        status: "pending",
        createdAt: Date.now(),
      });

      // Mock shell service execution - first for install, then for script
      mockShellService.executeCommand
        .mockResolvedValueOnce({
          exitCode: 0,
          output: "uuid@9.0.0 installed",
          error: null,
        })
        .mockResolvedValueOnce({
          exitCode: 0,
          output: "generated-uuid-value\n",
          error: null,
        });

      // Mock validation
      (validateEnvVar as any).mockResolvedValue({
        isValid: true,
        details: "Validation successful",
      });

      // Mock fs operations
      (fs.mkdtemp as any).mockResolvedValue("/tmp/eliza-env-gen-abc123");
      (fs.writeFile as any).mockResolvedValue(undefined);
      (fs.unlink as any).mockResolvedValue(undefined);
      (fs.rmdir as any).mockResolvedValue(undefined);

      await generateEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockShellService.executeCommand).toHaveBeenCalledWith(
        "npm install uuid",
      );
      expect(mockCallback).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "Successfully generated 1 environment variable",
        ),
        actions: ["GENERATE_ENV_VAR_SUCCESS"],
        source: "test-source",
      });
    });
  });
});
