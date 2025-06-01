import { describe, it, expect, vi, beforeEach } from "vitest";
import { envStatusProvider } from "./envStatus";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";

describe("envStatusProvider", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRuntime = {
      getService: vi.fn(),
      getSetting: vi.fn(),
      getWorld: vi.fn(),
    } as any;

    mockMessage = {
      id: "test-message-id",
      entityId: "test-entity-id",
      roomId: "test-room-id",
      content: {
        text: "check environment status",
      },
    } as any;

    mockState = {
      values: {},
      data: {},
      text: "",
    };
  });

  describe("provider properties", () => {
    it("should have correct name and description", () => {
      expect(envStatusProvider.name).toBe("ENV_STATUS");
      expect(envStatusProvider.description).toContain("environment variables");
    });
  });

  describe("get", () => {
    let mockEnvService: any;

    beforeEach(() => {
      mockEnvService = {
        getEnvVarStatus: vi.fn(),
        getMissingEnvVars: vi.fn(),
        getGeneratableEnvVars: vi.fn(),
      };
      (mockRuntime.getService as any).mockReturnValue(mockEnvService);
    });

    it("should return environment status when world is available", async () => {
      const mockWorld = {
        metadata: {
          envVars: {
            plugin1: {
              API_KEY: {
                type: "api_key",
                required: true,
                description: "API key",
                canGenerate: false,
                status: "missing",
                attempts: 0,
                plugin: "plugin1",
              },
              SECRET_KEY: {
                type: "secret",
                required: true,
                description: "Secret key",
                canGenerate: true,
                status: "missing",
                attempts: 0,
                plugin: "plugin1",
              },
            },
          },
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

      const result = await envStatusProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toContain("Environment Variables Status");
      expect(result.text).toContain("Plugin1 Plugin");
      expect(result.text).toContain("API_KEY");
      expect(result.text).toContain("SECRET_KEY");
      expect(result.values.hasMissing).toBe(true);
      expect(result.values.hasGeneratable).toBe(true);
    });

    it("should handle no world ID", async () => {
      (mockRuntime.getSetting as any).mockReturnValue(null);

      const result = await envStatusProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toBe("No world configuration found.");
      expect(result.values.hasMissing).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockRejectedValue(new Error("Test error"));
      const loggerSpy = vi.spyOn(logger, "error");

      const result = await envStatusProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toBe("Error retrieving environment variable status.");
      expect(result.values.hasMissing).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        "[EnvStatus] Error in environment status provider:",
        new Error("Test error"),
      );
      loggerSpy.mockRestore();
    });

    it("should handle no environment variables", async () => {
      const mockWorld = {
        metadata: {
          envVars: null,
        },
      };

      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

      const result = await envStatusProvider.get(
        mockRuntime,
        mockMessage,
        mockState,
      );

      expect(result.text).toBe("No environment variables configured yet.");
      expect(result.values.hasMissing).toBe(false);
    });
  });
});
