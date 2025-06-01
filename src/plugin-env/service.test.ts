import { describe, it, expect, beforeEach, vi } from "vitest";
import { EnvManagerService } from "./service";
import {
  IAgentRuntime,
  Character,
  Plugin,
  World,
  Service,
  UUID,
  logger,
} from "@elizaos/core";

// Mock the logger from @elizaos/core
vi.mock("@elizaos/core", async (importOriginal) => {
  const originalCore = (await importOriginal()) as Record<string, any>;
  return {
    ...originalCore,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

// Create a mock runtime that matches the actual IAgentRuntime interface
const createMockRuntime = (): IAgentRuntime => {
  const mockRuntime = {
    // Properties from IAgentRuntime
    agentId: "test-agent-id" as UUID,
    character: {
      id: "test-character-id" as UUID,
      name: "Test Character",
      bio: "Test bio",
      settings: { secrets: {} },
    } as Character,
    providers: [],
    actions: [],
    evaluators: [],
    plugins: [] as Plugin[],
    services: new Map(),
    events: new Map(),
    fetch: vi.fn(),
    routes: [],

    // Methods from IAgentRuntime
    registerPlugin: vi.fn(),
    initialize: vi.fn(),
    getConnection: vi.fn(),
    getService: vi.fn(),
    getAllServices: vi.fn(),
    registerService: vi.fn(),
    registerDatabaseAdapter: vi.fn(),
    setSetting: vi.fn(),
    getSetting: vi.fn(),
    getConversationLength: vi.fn(),
    processActions: vi.fn(),
    evaluate: vi.fn(),
    registerProvider: vi.fn(),
    registerAction: vi.fn(),
    registerEvaluator: vi.fn(),
    ensureConnection: vi.fn(),
    ensureParticipantInRoom: vi.fn(),
    ensureWorldExists: vi.fn(),
    ensureRoomExists: vi.fn(),
    composeState: vi.fn(),
    useModel: vi.fn(),
    registerModel: vi.fn(),
    getModel: vi.fn(),
    registerEvent: vi.fn(),
    getEvent: vi.fn(),
    emitEvent: vi.fn(),
    registerTaskWorker: vi.fn(),
    getTaskWorker: vi.fn(),
    stop: vi.fn(),
    addEmbeddingToMemory: vi.fn(),
    getEntityById: vi.fn(),
    getRoom: vi.fn(),
    createEntity: vi.fn(),
    createRoom: vi.fn(),
    addParticipant: vi.fn(),
    getRooms: vi.fn(),
    registerSendHandler: vi.fn(),
    sendMessageToTarget: vi.fn(),

    // Methods from IDatabaseAdapter (inherited by IAgentRuntime)
    db: {},
    init: vi.fn(),
    close: vi.fn(),
    getAgent: vi.fn(),
    getAgents: vi.fn(),
    createAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
    ensureAgentExists: vi.fn(),
    ensureEmbeddingDimension: vi.fn(),
    getEntityByIds: vi.fn(),
    getEntitiesForRoom: vi.fn(),
    createEntities: vi.fn(),
    updateEntity: vi.fn(),
    getComponent: vi.fn(),
    getComponents: vi.fn(),
    createComponent: vi.fn(),
    updateComponent: vi.fn(),
    deleteComponent: vi.fn(),
    getMemories: vi.fn(),
    getMemoryById: vi.fn(),
    getMemoriesByIds: vi.fn(),
    getMemoriesByRoomIds: vi.fn(),
    getMemoriesByServerId: vi.fn(),
    getCachedEmbeddings: vi.fn(),
    log: vi.fn(),
    getLogs: vi.fn(),
    deleteLog: vi.fn(),
    searchMemories: vi.fn(),
    createMemory: vi.fn(),
    updateMemory: vi.fn(),
    deleteMemory: vi.fn(),
    deleteAllMemories: vi.fn(),
    countMemories: vi.fn(),
    createWorld: vi.fn(),
    getWorld: vi.fn(),
    removeWorld: vi.fn(),
    getAllWorlds: vi.fn(),
    updateWorld: vi.fn(),
    getRoomsByIds: vi.fn(),
    createRooms: vi.fn(),
    deleteRoom: vi.fn(),
    deleteRoomsByWorldId: vi.fn(),
    updateRoom: vi.fn(),
    getRoomsForParticipant: vi.fn(),
    getRoomsForParticipants: vi.fn(),
    getRoomsByWorld: vi.fn(),
    removeParticipant: vi.fn(),
    getParticipantsForEntity: vi.fn(),
    getParticipantsForRoom: vi.fn(),
    addParticipantsRoom: vi.fn(),
    getParticipantUserState: vi.fn(),
    setParticipantUserState: vi.fn(),
    createRelationship: vi.fn(),
    updateRelationship: vi.fn(),
    getRelationship: vi.fn(),
    getRelationships: vi.fn(),
    getCache: vi.fn(),
    setCache: vi.fn(),
    deleteCache: vi.fn(),
    createTask: vi.fn(),
    getTasks: vi.fn(),
    getTask: vi.fn(),
    getTasksByName: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getMemoriesByWorldId: vi.fn(),
  } as unknown as IAgentRuntime;

  return mockRuntime;
};

describe("EnvManagerService", () => {
  let envService: EnvManagerService;
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime();
    envService = new EnvManagerService(mockRuntime);
  });

  it("should be defined", () => {
    expect(envService).toBeDefined();
  });

  describe("initialize", () => {
    it("should call scanPluginRequirements and log initialization", async () => {
      const scanSpy = vi.spyOn(envService, "scanPluginRequirements");
      await envService.initialize();
      expect(scanSpy).toHaveBeenCalled();
    });
  });

  describe("scanPluginRequirements", () => {
    it("should log a warning if WORLD_ID is not found", async () => {
      (mockRuntime.getSetting as any).mockReturnValue(null);
      const warnSpy = vi.spyOn(logger, "warn");
      await envService.scanPluginRequirements();
      expect(warnSpy).toHaveBeenCalledWith(
        "[EnvManager] No WORLD_ID found, cannot scan plugin requirements",
      );
    });

    it("should log a warning if world is not found", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(null);
      const warnSpy = vi.spyOn(logger, "warn");
      await envService.scanPluginRequirements();
      expect(warnSpy).toHaveBeenCalledWith(
        "[EnvManager] World not found, cannot scan plugin requirements",
      );
    });

    it("should initialize metadata if it does not exist", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id" as UUID);
      const mockWorld = {
        id: "test-world-id" as UUID,
        name: "Test World",
        agentId: "test-agent-id" as UUID,
        serverId: "test-server",
        metadata: {},
      } as World;
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      await envService.scanPluginRequirements();
      expect(mockWorld.metadata?.envVars).toBeDefined();
      expect(mockWorld.metadata?.generationScripts).toBeDefined();
      expect(mockRuntime.updateWorld).toHaveBeenCalledWith(mockWorld);
    });

    it("should scan character secrets and loaded plugins", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id" as UUID);
      const mockWorld = {
        id: "test-world-id" as UUID,
        name: "Test World",
        agentId: "test-agent-id" as UUID,
        serverId: "test-server",
        metadata: {
          envVars: {},
          generationScripts: {},
        },
      } as World;
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

      // Update character to have secrets
      mockRuntime.character.settings = {
        secrets: { CHARACTER_API_KEY: "test-key" },
      };
      mockRuntime.plugins = [
        {
          name: "test-plugin",
          description: "Test plugin",
          declaredEnvVars: {
            PLUGIN_VAR: { description: "A test var", required: true },
          },
        } as unknown as Plugin,
      ];

      const scanCharacterSecretsSpy = vi.spyOn(
        envService as any,
        "scanCharacterSecrets",
      );
      const scanLoadedPluginsSpy = vi.spyOn(
        envService as any,
        "scanLoadedPlugins",
      );
      const logSpy = vi.spyOn(logger, "info");

      await envService.scanPluginRequirements();

      expect(scanCharacterSecretsSpy).toHaveBeenCalled();
      expect(scanLoadedPluginsSpy).toHaveBeenCalled();
      expect(mockRuntime.updateWorld).toHaveBeenCalledWith(mockWorld);
      expect(logSpy).toHaveBeenCalledWith(
        "[EnvManager] Plugin requirements scan completed",
      );
    });

    it("should handle existing envVars and generationScripts metadata", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id" as UUID);
      const existingEnvVars = {
        "existing-plugin": {
          EXISTING_VAR: {
            type: "config",
            required: true,
            description: "Existing variable",
            canGenerate: false,
            status: "valid",
            attempts: 1,
            plugin: "existing-plugin",
            createdAt: Date.now(),
          },
        },
      };
      const existingGenerationScripts = {
        script1: {
          variableName: "OLD_SECRET",
          pluginName: "old-plugin",
          script: 'console.log("old secret")',
          dependencies: [],
          attempts: 1,
          status: "success",
          createdAt: Date.now(),
        },
      };
      const mockWorld = {
        id: "test-world-id" as UUID,
        name: "Test World",
        agentId: "test-agent-id" as UUID,
        serverId: "test-server",
        metadata: {
          envVars: existingEnvVars,
          generationScripts: existingGenerationScripts,
        },
      } as World;
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

      await envService.scanPluginRequirements();

      expect(mockWorld.metadata?.envVars).toEqual(existingEnvVars);
      expect(mockWorld.metadata?.generationScripts).toEqual(
        existingGenerationScripts,
      );
      expect(mockRuntime.updateWorld).toHaveBeenCalledWith(mockWorld);
    });
  });

  describe("getEnvVarsForPlugin", () => {
    it("should return null if WORLD_ID is not found", async () => {
      (mockRuntime.getSetting as any).mockReturnValue(null);
      const result = await envService.getEnvVarsForPlugin("test-plugin");
      expect(result).toBeNull();
    });

    it("should return null if world is not found", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(null);
      const result = await envService.getEnvVarsForPlugin("test-plugin");
      expect(result).toBeNull();
    });

    it("should return plugin env vars if they exist", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      const mockWorld = {
        id: "test-world-id" as UUID,
        agentId: "test-agent-id" as UUID,
        serverId: "test-server",
        name: "Test World",
        metadata: {
          envVars: {
            "test-plugin": {
              TEST_VAR: {
                type: "config" as const,
                required: true,
                description: "Test variable",
                canGenerate: false,
                status: "valid" as const,
                attempts: 0,
                plugin: "test-plugin",
                createdAt: Date.now(),
              },
            },
          },
        },
      } as World;
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);

      const result = await envService.getEnvVarsForPlugin("test-plugin");
      expect(result).toEqual(mockWorld.metadata.envVars["test-plugin"]);
    });
  });

  describe("updateEnvVar", () => {
    it("should return false if WORLD_ID is not found", async () => {
      (mockRuntime.getSetting as any).mockReturnValue(null);
      const result = await envService.updateEnvVar("test-plugin", "TEST_VAR", {
        value: "test",
      });
      expect(result).toBe(false);
    });

    it("should return false if world is not found", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      (mockRuntime.getWorld as any).mockResolvedValue(null);
      const result = await envService.updateEnvVar("test-plugin", "TEST_VAR", {
        value: "test",
      });
      expect(result).toBe(false);
    });

    it("should update environment variable and return true", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      const mockWorld = {
        metadata: {
          envVars: {},
        },
      };
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      (mockRuntime.updateWorld as any).mockResolvedValue(undefined);

      const result = await envService.updateEnvVar("test-plugin", "TEST_VAR", {
        value: "test-value",
        status: "valid" as const,
      });

      expect(result).toBe(true);
      expect(mockRuntime.updateWorld).toHaveBeenCalledWith(mockWorld);
      expect(process.env.TEST_VAR).toBe("test-value");
    });

    it("should not update process.env if updateEnvVar fails", async () => {
      (mockRuntime.getSetting as any).mockReturnValue("test-world-id");
      const mockWorld = {
        metadata: {
          envVars: {},
        },
      };
      (mockRuntime.getWorld as any).mockResolvedValue(mockWorld);
      (mockRuntime.updateWorld as any).mockRejectedValue(
        new Error("Update failed"),
      );

      process.env.FAIL_VAR = "initial";
      const result = await envService.updateEnvVar("fail-plugin", "FAIL_VAR", {
        value: "new-value",
        status: "valid" as const,
      });

      expect(result).toBe(false);
      expect(process.env.FAIL_VAR).toBe("initial");
      delete process.env.FAIL_VAR;
    });
  });

  describe("hasMissingEnvVars", () => {
    it("should return false if no env vars exist", async () => {
      vi.spyOn(envService, "getAllEnvVars").mockResolvedValue(null);
      const result = await envService.hasMissingEnvVars();
      expect(result).toBe(false);
    });

    it("should return true if there are missing required env vars", async () => {
      const mockEnvVars = {
        "test-plugin": {
          MISSING_VAR: {
            type: "config" as const,
            required: true,
            description: "Missing variable",
            canGenerate: false,
            status: "missing" as const,
            attempts: 0,
            plugin: "test-plugin",
            createdAt: Date.now(),
          },
        },
      };
      vi.spyOn(envService, "getAllEnvVars").mockResolvedValue(mockEnvVars);

      const result = await envService.hasMissingEnvVars();
      expect(result).toBe(true);
    });

    it("should return false if all required env vars are present", async () => {
      const mockEnvVars = {
        "test-plugin": {
          PRESENT_VAR: {
            type: "config" as const,
            required: true,
            description: "Present variable",
            canGenerate: false,
            status: "valid" as const,
            attempts: 0,
            plugin: "test-plugin",
            createdAt: Date.now(),
          },
          OPTIONAL_MISSING_VAR: {
            type: "config" as const,
            required: false,
            description: "Optional missing variable",
            canGenerate: false,
            status: "missing" as const,
            attempts: 0,
            plugin: "test-plugin",
            createdAt: Date.now(),
          },
        },
      };
      vi.spyOn(envService, "getAllEnvVars").mockResolvedValue(mockEnvVars);

      const result = await envService.hasMissingEnvVars();
      expect(result).toBe(false);
    });
  });

  describe("getMissingEnvVars", () => {
    it("should return empty array if no env vars exist", async () => {
      vi.spyOn(envService, "getAllEnvVars").mockResolvedValue(null);
      const result = await envService.getMissingEnvVars();
      expect(result).toEqual([]);
    });

    it("should return missing required env vars", async () => {
      const mockEnvVars = {
        "test-plugin": {
          MISSING_VAR: {
            type: "config" as const,
            required: true,
            description: "Missing variable",
            canGenerate: false,
            status: "missing" as const,
            attempts: 0,
            plugin: "test-plugin",
            createdAt: Date.now(),
          },
          PRESENT_VAR: {
            type: "config" as const,
            required: true,
            description: "Present variable",
            canGenerate: false,
            status: "valid" as const,
            attempts: 0,
            plugin: "test-plugin",
            createdAt: Date.now(),
          },
        },
      };
      vi.spyOn(envService, "getAllEnvVars").mockResolvedValue(mockEnvVars);

      const result = await envService.getMissingEnvVars();
      expect(result).toHaveLength(1);
      expect(result[0].varName).toBe("MISSING_VAR");
      expect(result[0].plugin).toBe("test-plugin");
    });

    it("should only return required missing env vars", async () => {
      const mockEnvVars = {
        "test-plugin": {
          REQUIRED_MISSING_VAR: {
            type: "config" as const,
            required: true,
            description: "Required missing variable",
            canGenerate: false,
            status: "missing" as const,
            attempts: 0,
            plugin: "test-plugin",
            createdAt: Date.now(),
          },
          OPTIONAL_MISSING_VAR: {
            type: "config" as const,
            required: false,
            description: "Optional missing variable",
            canGenerate: false,
            status: "missing" as const,
            attempts: 0,
            plugin: "test-plugin",
            createdAt: Date.now(),
          },
        },
      };
      vi.spyOn(envService, "getAllEnvVars").mockResolvedValue(mockEnvVars);

      const result = await envService.getMissingEnvVars();
      expect(result).toHaveLength(1);
      expect(result[0].varName).toBe("REQUIRED_MISSING_VAR");
    });
  });

  describe("getGeneratableEnvVars", () => {
    it("should return only missing env vars that can be generated", async () => {
      const mockMissingVars = [
        {
          plugin: "test-plugin",
          varName: "GENERATABLE_VAR",
          config: {
            type: "api_key" as const,
            required: true,
            description: "Generatable variable",
            canGenerate: true,
            status: "missing" as const,
            attempts: 0,
            plugin: "test-plugin",
            createdAt: Date.now(),
          },
        },
        {
          plugin: "test-plugin",
          varName: "NON_GENERATABLE_VAR",
          config: {
            type: "config" as const,
            required: true,
            description: "Non-generatable variable",
            canGenerate: false,
            status: "missing" as const,
            attempts: 0,
            plugin: "test-plugin",
            createdAt: Date.now(),
          },
        },
      ];
      vi.spyOn(envService, "getMissingEnvVars").mockResolvedValue(
        mockMissingVars,
      );

      const result = await envService.getGeneratableEnvVars();
      expect(result).toHaveLength(1);
      expect(result[0].varName).toBe("GENERATABLE_VAR");
      expect(result[0].config.canGenerate).toBe(true);
    });

    it("should return empty array if getMissingEnvVars returns empty", async () => {
      vi.spyOn(envService, "getMissingEnvVars").mockResolvedValue([]);
      const result = await envService.getGeneratableEnvVars();
      expect(result).toEqual([]);
    });
  });
});
