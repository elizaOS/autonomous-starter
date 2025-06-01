import { describe, it, expect, vi, beforeEach } from "vitest";
import { setEnvVarAction } from "./setEnvVar";
import * as ValidationModule from "../validation";
import type { IAgentRuntime, Memory, State, UUID } from "@elizaos/core";
import { logger, ModelType, composePrompt } from "@elizaos/core";
import type { EnvVarMetadata, EnvVarConfig } from "../types";

// Mock the validation module
vi.mock("../validation", () => ({
  validateEnvVar: vi.fn(),
}));

// The extractionTemplate string from setEnvVar.ts to ensure accurate prompt mocking
const extractionTemplateSource = `# Task: Extract Environment Variable Assignments from User Input

I need to extract environment variable assignments that the user wants to set based on their message.

Available Environment Variables:
{{envVarsContext}}

User message: {{content}}

For each environment variable mentioned in the user's input, extract the variable name and its new value.
Format your response as a JSON array of objects, each with 'pluginName', 'variableName', and 'value' properties.

Example response:
\`\`\`json
[
  { "pluginName": "openai", "variableName": "OPENAI_API_KEY", "value": "sk-..." },
  { "pluginName": "groq", "variableName": "GROQ_API_KEY", "value": "gsk_..." }
]
\`\`\`

IMPORTANT: Only include environment variables from the Available Environment Variables list above. Ignore any other potential variables.`;

const extractionTemplateSignature = "Extract Environment Variable Assignments"; // More specific part of the template
const successTemplateSignature =
  "Generate a response for successful environment variable updates";
const failureTemplateSignature =
  "Generate a response for failed environment variable updates";

// Helper to build envVarsContext string as used in the implementation
const buildEnvVarsContext = (envVars: EnvVarMetadata): string => {
  return Object.entries(envVars)
    .map(([pluginName, plugin]) => {
      return Object.entries(plugin)
        .filter(
          ([, config]) =>
            config.status === "missing" || config.status === "invalid",
        )
        .map(([varName, config]) => {
          const requiredStr = config.required ? "Required." : "Optional.";
          return `${pluginName}.${varName}: ${config.description} ${requiredStr}`;
        })
        .join("\n");
    })
    .filter(Boolean)
    .join("\n");
};

describe("setEnvVarAction", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockCallback: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = {
      getService: vi.fn(),
      getSetting: vi.fn(),
      getWorld: vi.fn(),
      updateWorld: vi.fn(),
      useModel: vi.fn(),
      character: { name: "TestAgent", bio: "Test Bio" } as any, // For templates
    } as any;
    mockMessage = {
      id: "test-message-id" as UUID,
      agentId: "test-agent-id" as UUID,
      roomId: "test-room-id" as UUID,
      content: {
        text: "set OPENAI_API_KEY to sk-test123",
        source: "test-source",
      },
      createdAt: Date.now(),
    } as Memory;
    mockState = {
      values: { agentName: "TestAgent" },
      data: {},
      text: "set OPENAI_API_KEY to sk-test123",
    };
    mockCallback = vi.fn();
  });

  describe("action properties", () => {
    it("should have correct name and description", () => {
      expect(setEnvVarAction.name).toBe("SET_ENV_VAR");
      expect(setEnvVarAction.description).toContain(
        "Sets environment variables",
      );
    });
    it("should have examples", () => {
      expect(setEnvVarAction.examples).toBeDefined();
      expect(Array.isArray(setEnvVarAction.examples)).toBe(true);
      expect(setEnvVarAction.examples.length).toBeGreaterThan(0);
    });
  });

  describe("validate", () => {
    const baseConfig: EnvVarConfig = {
      type: "api_key",
      description: "Test API key",
      canGenerate: false,
      attempts: 0,
      plugin: "test-plugin",
      required: true,
      status: "missing",
    };
    it("should return true when there are missing environment variables", async () => {
      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              API_KEY: { ...baseConfig, status: "missing" },
            },
          },
        },
      };
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      const result = await setEnvVarAction.validate(
        mockRuntime,
        mockMessage,
        mockState,
      );
      expect(result).toBe(true);
    });
    it("should return false when no world ID is available", async () => {
      (mockRuntime.getSetting as any).mockReturnValue(null);
      const result = await setEnvVarAction.validate(
        mockRuntime,
        mockMessage,
        mockState,
      );
      expect(result).toBe(false);
    });
    it("should return false when no missing environment variables exist", async () => {
      const mockWorld = {
        metadata: {
          envVars: {
            "test-plugin": {
              API_KEY: { ...baseConfig, status: "valid", value: "xyz" },
            },
          },
        },
      };
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      const result = await setEnvVarAction.validate(
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
      const result = await setEnvVarAction.validate(
        mockRuntime,
        mockMessage,
        mockState,
      );
      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error validating SET_ENV_VAR action:",
        new Error("Test error"),
      );
      loggerSpy.mockRestore();
    });
  });

  describe("handler", () => {
    beforeEach(() => {
      mockRuntime.useModel = vi.fn();
      mockRuntime.getWorld = vi.fn();
      mockRuntime.updateWorld = vi.fn();
    });

    const ERROR_CALLBACK_PAYLOAD = {
      text: "I'm sorry, but I encountered an error while processing your environment variable update. Please try again or contact support if the issue persists.",
      actions: ["ENV_VAR_UPDATE_ERROR"],
      source: "test-source",
    };

    it("should handle missing world ID", async () => {
      (mockRuntime.getSetting as any).mockReturnValue(null);
      const loggerSpy = vi.spyOn(logger, "error");
      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(ERROR_CALLBACK_PAYLOAD);
      expect(loggerSpy).toHaveBeenCalledWith(
        "[SetEnvVar] Error in handler: Error: No WORLD_ID found",
      );
      loggerSpy.mockRestore();
    });

    it("should handle missing world", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(null);
      const loggerSpy = vi.spyOn(logger, "error");
      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(ERROR_CALLBACK_PAYLOAD);
      expect(loggerSpy).toHaveBeenCalledWith(
        "[SetEnvVar] Error in handler: Error: No environment variables metadata found",
      );
      loggerSpy.mockRestore();
    });

    it("should handle missing state or callback", async () => {
      const loggerSpy = vi.spyOn(logger, "error");
      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        undefined,
        {},
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith(ERROR_CALLBACK_PAYLOAD);
      expect(loggerSpy).toHaveBeenCalledWith(
        "[SetEnvVar] Error in handler: Error: State and callback are required for SET_ENV_VAR action",
      );
      mockCallback.mockClear();
      loggerSpy.mockClear();
      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        undefined,
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        "[SetEnvVar] Error in handler: Error: State and callback are required for SET_ENV_VAR action",
      );
      loggerSpy.mockRestore();
    });

    it("should successfully extract and update environment variables", async () => {
      const openAIKeyConfig: EnvVarConfig = {
        type: "api_key",
        required: true,
        description: "OpenAI API key for GPT models",
        status: "missing",
        attempts: 0,
        plugin: "openai",
        canGenerate: false,
      };
      const currentMockWorld = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: { OPENAI_API_KEY: openAIKeyConfig },
          } as EnvVarMetadata,
        },
      };
      const updatedMockWorld = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: {
              OPENAI_API_KEY: {
                ...openAIKeyConfig,
                status: "valid",
                value: "sk-test123",
              },
            },
          } as EnvVarMetadata,
        },
      };
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      let callCount = 0;
      (mockRuntime.getWorld as any).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return JSON.parse(JSON.stringify(currentMockWorld));
        } else {
          return JSON.parse(JSON.stringify(updatedMockWorld));
        }
      });
      (mockRuntime.updateWorld as any).mockResolvedValue(undefined);

      const envVarsContext = buildEnvVarsContext(
        currentMockWorld.metadata.envVars,
      );

      (mockRuntime.useModel as any)
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            // For extraction - just return the expected JSON
            return JSON.stringify([
              {
                pluginName: "openai",
                variableName: "OPENAI_API_KEY",
                value: "sk-test123",
              },
            ]);
          },
        )
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            if (
              params.prompt.includes(
                "Generate a response for successful environment variable updates",
              )
            ) {
              return JSON.stringify({
                text: "✅ OPENAI_API_KEY validated successfully!",
                actions: ["ENV_VAR_UPDATED"],
              });
            }
            throw new Error(
              "Success template prompt mock condition not met in 'successfully extract'",
            );
          },
        );

      (ValidationModule.validateEnvVar as any).mockResolvedValue({
        isValid: true,
        details: "API key validated",
      });

      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(ValidationModule.validateEnvVar).toHaveBeenCalledWith(
        "OPENAI_API_KEY",
        "sk-test123",
        "api_key",
        undefined,
      );
      expect(mockCallback).toHaveBeenCalledWith({
        text: "✅ OPENAI_API_KEY validated successfully!",
        actions: ["ENV_VAR_UPDATED"],
        source: "test-source",
      });
    });

    it("should handle validation failure", async () => {
      const openAIKeyConfig: EnvVarConfig = {
        type: "api_key",
        required: true,
        description: "OpenAI API key",
        status: "missing",
        attempts: 0,
        plugin: "openai",
        canGenerate: false,
      };
      const currentMockWorld = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: { OPENAI_API_KEY: openAIKeyConfig },
          } as EnvVarMetadata,
        },
      };
      const updatedMockWorld = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: {
              OPENAI_API_KEY: {
                ...openAIKeyConfig,
                status: "invalid",
                value: "invalid-key",
                lastError: "Invalid key",
              },
            },
          } as EnvVarMetadata,
        },
      };
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      let callCount = 0;
      (mockRuntime.getWorld as any).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return JSON.parse(JSON.stringify(currentMockWorld));
        } else {
          return JSON.parse(JSON.stringify(updatedMockWorld));
        }
      });
      (mockRuntime.updateWorld as any).mockResolvedValue(undefined);

      const envVarsContext = buildEnvVarsContext(
        currentMockWorld.metadata.envVars,
      );

      (mockRuntime.useModel as any)
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            // For extraction - return the expected JSON
            return JSON.stringify([
              {
                pluginName: "openai",
                variableName: "OPENAI_API_KEY",
                value: "invalid-key",
              },
            ]);
          },
        )
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            if (
              params.prompt.includes(
                "Generate a response for successful environment variable updates",
              )
            ) {
              return JSON.stringify({
                text: "❌ OPENAI_API_KEY validation failed: Invalid key",
                actions: ["ENV_VAR_UPDATED"],
              });
            }
            throw new Error(
              "Success template prompt mock condition not met in 'validation failure'",
            );
          },
        );

      (ValidationModule.validateEnvVar as any).mockResolvedValue({
        isValid: false,
        error: "Invalid key",
      });

      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(ValidationModule.validateEnvVar).toHaveBeenCalledWith(
        "OPENAI_API_KEY",
        "invalid-key",
        "api_key",
        undefined,
      );
      expect(mockCallback).toHaveBeenCalledWith({
        text: "❌ OPENAI_API_KEY validation failed: Invalid key",
        actions: ["ENV_VAR_UPDATED"],
        source: "test-source",
      });
    });

    it("should handle multiple environment variable updates", async () => {
      const openAIKeyConfig: EnvVarConfig = {
        status: "missing",
        type: "api_key",
        required: true,
        description: "OpenAI key for GPT",
        attempts: 0,
        plugin: "openai",
        canGenerate: false,
      };
      const groqKeyConfig: EnvVarConfig = {
        status: "missing",
        type: "api_key",
        required: true,
        description: "Groq API key",
        attempts: 0,
        plugin: "groq",
        canGenerate: false,
      };
      const currentMockWorld = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: { OPENAI_API_KEY: openAIKeyConfig },
            groq: { GROQ_API_KEY: groqKeyConfig },
          } as EnvVarMetadata,
        },
      };
      const updatedMockWorld = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: {
              OPENAI_API_KEY: {
                ...openAIKeyConfig,
                status: "valid",
                value: "sk-test123",
              },
            },
            groq: {
              GROQ_API_KEY: {
                ...groqKeyConfig,
                status: "valid",
                value: "gsk-test456",
              },
            },
          } as EnvVarMetadata,
        },
      };
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      let callCount = 0;
      (mockRuntime.getWorld as any).mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return JSON.parse(JSON.stringify(currentMockWorld));
        } else {
          return JSON.parse(JSON.stringify(updatedMockWorld));
        }
      });
      (mockRuntime.updateWorld as any).mockResolvedValue(undefined);

      const envVarsContext = buildEnvVarsContext(
        currentMockWorld.metadata.envVars,
      );

      (mockRuntime.useModel as any)
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            // For extraction - return the expected JSON
            return JSON.stringify([
              {
                pluginName: "openai",
                variableName: "OPENAI_API_KEY",
                value: "sk-test123",
              },
              {
                pluginName: "groq",
                variableName: "GROQ_API_KEY",
                value: "gsk-test456",
              },
            ]);
          },
        )
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            if (
              params.prompt.includes(
                "Generate a response for successful environment variable updates",
              )
            ) {
              return JSON.stringify({
                text: "✅ Successfully updated 2 environment variables!",
                actions: ["ENV_VAR_UPDATED"],
              });
            }
            throw new Error(
              "Success template prompt mock condition not met for multiple updates",
            );
          },
        );
      (ValidationModule.validateEnvVar as any).mockResolvedValue({
        isValid: true,
      });

      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith({
        text: "✅ Successfully updated 2 environment variables!",
        actions: ["ENV_VAR_UPDATED"],
        source: "test-source",
      });
    });

    it("should handle world update failure", async () => {
      const openAIKeyConfig: EnvVarConfig = {
        type: "api_key",
        required: true,
        status: "missing",
        attempts: 0,
        plugin: "openai",
        description: "OpenAI key",
        canGenerate: false,
      };
      const mockWorldInitial = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: { OPENAI_API_KEY: openAIKeyConfig },
          } as EnvVarMetadata,
        },
      };
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockImplementation(async () =>
        JSON.parse(JSON.stringify(mockWorldInitial)),
      );
      (mockRuntime.updateWorld as any).mockRejectedValue(
        new Error("DB Update Failed"),
      );

      const envVarsContext = buildEnvVarsContext(
        mockWorldInitial.metadata.envVars,
      );

      (mockRuntime.useModel as any)
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            // For extraction - return the expected JSON
            return JSON.stringify([
              {
                pluginName: "openai",
                variableName: "OPENAI_API_KEY",
                value: "sk-test123",
              },
            ]);
          },
        )
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            if (
              params.prompt.includes(
                "Generate a response for failed environment variable updates",
              )
            ) {
              // Expect failure template now
              return JSON.stringify({
                text: "Update failed internally due to DB issue.",
                actions: ["ENV_VAR_UPDATE_FAILED"],
              });
            }
            throw new Error(
              `Unexpected prompt for useModel in world update failure (second call): ${params.prompt.substring(0, 100)}`,
            );
          },
        );

      (ValidationModule.validateEnvVar as any).mockResolvedValue({
        isValid: true,
      });

      const loggerSpy = vi.spyOn(logger, "error");
      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        text: "Update failed internally due to DB issue.",
        actions: ["ENV_VAR_UPDATE_FAILED"],
        source: "test-source",
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error processing environment variable updates:",
        new Error("DB Update Failed"),
      );
      loggerSpy.mockRestore();
    });

    it("should handle no extracted environment variables", async () => {
      const openAIKeyConfig: EnvVarConfig = {
        status: "missing",
        type: "api_key",
        required: true,
        description: "OpenAI key",
        canGenerate: false,
        attempts: 0,
        plugin: "openai",
      };
      const currentMockWorld = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: { OPENAI_API_KEY: openAIKeyConfig },
          } as EnvVarMetadata,
        },
      };
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(
        JSON.parse(JSON.stringify(currentMockWorld)),
      );

      const envVarsContext = buildEnvVarsContext(
        currentMockWorld.metadata.envVars,
      );

      (mockRuntime.useModel as any)
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            if (
              params.prompt.includes(extractionTemplateSource) &&
              params.prompt.includes(envVarsContext)
            ) {
              return JSON.stringify([]);
            }
            throw new Error(
              "Extraction prompt mock condition not met for no extracted test",
            );
          },
        )
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            if (params.prompt.includes(failureTemplateSignature)) {
              return JSON.stringify({
                text: "I couldn't understand which to set.",
                actions: ["ENV_VAR_UPDATE_FAILED"],
              });
            }
            throw new Error(
              "Failure template prompt mock condition not met for no extracted test",
            );
          },
        );

      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith({
        text: "I couldn't understand which to set.",
        actions: ["ENV_VAR_UPDATE_FAILED"],
        source: "test-source",
      });
    });

    it("should handle extraction errors (e.g. invalid JSON from model)", async () => {
      const openAIKeyConfig: EnvVarConfig = {
        status: "missing",
        type: "api_key",
        required: true,
        description: "OpenAI key",
        canGenerate: false,
        attempts: 0,
        plugin: "openai",
      };
      const currentMockWorld = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: { OPENAI_API_KEY: openAIKeyConfig },
          } as EnvVarMetadata,
        },
      };
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(
        JSON.parse(JSON.stringify(currentMockWorld)),
      );
      const loggerSpy = vi.spyOn(logger, "error");

      const envVarsContext = buildEnvVarsContext(
        currentMockWorld.metadata.envVars,
      );

      (mockRuntime.useModel as any)
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            // For extraction - return invalid JSON to trigger error
            return "this is not json";
          },
        )
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            if (
              params.prompt.includes(
                "Generate a response for failed environment variable updates",
              )
            ) {
              return JSON.stringify({
                text: "I couldn't understand the format of the environment variable data provided.",
                actions: ["ENV_VAR_UPDATE_FAILED"],
              });
            }
            throw new Error(
              "Failure template prompt mock condition not met for extraction error test",
            );
          },
        );

      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith({
        text: "I couldn't understand the format of the environment variable data provided.",
        actions: ["ENV_VAR_UPDATE_FAILED"],
        source: "test-source",
      });
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error parsing JSON from model response:",
        expect.any(Error),
      );
      loggerSpy.mockRestore();
    });

    it("should handle invalid variable names in extraction (not in metadata)", async () => {
      const openAIKeyConfig: EnvVarConfig = {
        status: "missing",
        type: "api_key",
        required: true,
        description: "OpenAI key",
        canGenerate: false,
        attempts: 0,
        plugin: "openai",
      };
      const currentMockWorld = {
        agentId: "test-agent" as UUID,
        metadata: {
          envVars: {
            openai: { OPENAI_API_KEY: openAIKeyConfig },
          } as EnvVarMetadata,
        },
      };
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(
        JSON.parse(JSON.stringify(currentMockWorld)),
      );

      const envVarsContext = buildEnvVarsContext(
        currentMockWorld.metadata.envVars,
      );

      (mockRuntime.useModel as any)
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            if (
              params.prompt.includes(extractionTemplateSignature) &&
              params.prompt.includes(envVarsContext)
            ) {
              return JSON.stringify([
                {
                  pluginName: "someplugin",
                  variableName: "NON_EXISTENT_VAR",
                  value: "test",
                },
              ]);
            }
            throw new Error(
              "Extraction prompt mock condition not met for invalid var name test",
            );
          },
        )
        .mockImplementationOnce(
          async (modelType: string, params: { prompt: string }) => {
            if (params.prompt.includes(failureTemplateSignature)) {
              return JSON.stringify({
                text: "I couldn't find those variables.",
                actions: ["ENV_VAR_UPDATE_FAILED"],
              });
            }
            throw new Error(
              "Failure template prompt mock condition not met for invalid var name test",
            );
          },
        );

      await setEnvVarAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback,
      );
      expect(mockCallback).toHaveBeenCalledWith({
        text: "I couldn't find those variables.",
        actions: ["ENV_VAR_UPDATE_FAILED"],
        source: "test-source",
      });
    });
  });
});
