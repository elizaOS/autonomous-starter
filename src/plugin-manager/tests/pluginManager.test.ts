import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  type IAgentRuntime,
  type Plugin,
  type Action,
  type Provider,
  Service,
  type ServiceTypeName,
  createUniqueUuid,
  AgentRuntime,
  logger,
  ModelType,
} from "@elizaos/core";
import { PluginManagerService } from "../services/pluginManagerService";
import { pluginStateProvider } from "../providers/pluginStateProvider";
import { loadPluginAction } from "../actions/loadPlugin";
import { unloadPluginAction } from "../actions/unloadPlugin";
import { PluginStatus, type PluginState } from "../types";
import { v4 as uuidv4 } from "uuid";

// Mock plugin for testing
const createMockPlugin = (name: string): Plugin => ({
  name,
  description: `Mock ${name} plugin`,
  actions: [
    {
      name: `${name.toUpperCase()}_ACTION`,
      similes: [`${name} action`],
      description: `Action for ${name}`,
      examples: [],
      validate: async () => true,
      handler: async () => {},
    },
  ],
  providers: [
    {
      name: `${name}Provider`,
      description: `Provider for ${name}`,
      get: async () => ({
        text: `${name} provider data`,
        values: {},
        data: {},
      }),
    },
  ],
});

// Mock service for testing
class MockService extends Service {
  static serviceType: ServiceTypeName = "MOCK_SERVICE" as ServiceTypeName;
  override capabilityDescription = "Mock service for testing";

  static async start(runtime: IAgentRuntime): Promise<Service> {
    return new MockService(runtime);
  }

  async stop(): Promise<void> {
    // Cleanup
  }
}

const createMockPluginWithService = (name: string): Plugin => ({
  ...createMockPlugin(name),
  services: [MockService],
});

// Create a mock runtime for testing
const createMockRuntime = (): IAgentRuntime => {
  const services = new Map<ServiceTypeName, Service>();
  const localActions: Action[] = [];
  const localProviders: Provider[] = [];
  const localPlugins: Plugin[] = [];
  const localEvaluators: Action[] = []; // Using Action[] for mock evaluators as well

  const runtimeMock = {
    agentId: uuidv4() as any,
    plugins: localPlugins,
    actions: localActions,
    providers: localProviders,
    evaluators: localEvaluators,
    services,

    registerAction: vi.fn(async (action: Action) => {
      localActions.push(action);
    }),

    registerProvider: vi.fn(async (provider: Provider) => {
      localProviders.push(provider);
    }),

    registerService: vi.fn(async (service: Service) => {
      // Service registration is handled differently in plugin manager tests, often manually
    }),

    getService: vi.fn((serviceType: ServiceTypeName) => {
      return services.get(serviceType);
    }),

    emitEvent: vi.fn(async () => {}),

    getSetting: vi.fn(() => null),
    getWorldId: vi.fn(() => uuidv4() as any),
    registerEvaluator: vi.fn(async (evaluator: any) => {
      // any for mock evaluator
      localEvaluators.push(evaluator);
    }),
    useModel: vi.fn(async () => "mock response"),
  };
  return runtimeMock as any;
};

describe("PluginManagerService", () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    runtime = createMockRuntime();
    pluginManager = new PluginManagerService(runtime);
    // Manually register the plugin manager service
    runtime.services.set("PLUGIN_MANAGER" as ServiceTypeName, pluginManager);
  });

  describe("Service Initialization", () => {
    it("should initialize with empty plugin registry", () => {
      const plugins = pluginManager.getAllPlugins();
      expect(plugins).toHaveLength(0);
    });

    it("should register existing plugins from runtime", () => {
      const existingPlugin = createMockPlugin("existing");
      runtime.plugins.push(existingPlugin);

      const newPluginManager = new PluginManagerService(runtime);
      const plugins = newPluginManager.getAllPlugins();

      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe("existing");
      expect(plugins[0].status).toBe(PluginStatus.LOADED);
    });

    it("should initialize correctly when runtime has no initial plugins, actions, providers, evaluators or services", () => {
      const minimalRuntime: IAgentRuntime = createMockRuntime();
      minimalRuntime.plugins = undefined as any;
      minimalRuntime.actions = undefined as any;
      minimalRuntime.providers = undefined as any;
      minimalRuntime.evaluators = undefined as any;
      minimalRuntime.services = undefined as any; // Test with services itself being undefined

      // Create a new PluginManagerService instance and expect no errors
      expect(() => new PluginManagerService(minimalRuntime)).not.toThrow();

      const newPluginManager = new PluginManagerService(minimalRuntime);
      expect(newPluginManager.getAllPlugins()).toHaveLength(0);
      // Further checks could be added to assert that originalActions, originalProviders etc. are empty sets
    });
  });

  describe("Plugin Registration", () => {
    it("should register a new plugin", async () => {
      const mockPlugin = createMockPlugin("test");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      expect(pluginId).toBeDefined();
      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState).toBeDefined();
      expect(pluginState?.name).toBe("test");
      expect(pluginState?.status).toBe(PluginStatus.READY);
    });

    it("should throw error when registering duplicate plugin", async () => {
      const mockPlugin = createMockPlugin("test");
      await pluginManager.registerPlugin(mockPlugin);

      await expect(pluginManager.registerPlugin(mockPlugin)).rejects.toThrow(
        "Plugin test already registered",
      );
    });

    it("should throw error if plugin to load is not found", async () => {
      await expect(
        pluginManager.loadPlugin({ pluginId: "non-existent-id" }),
      ).rejects.toThrow("Plugin non-existent-id not found in registry");
    });

    it("should throw error if plugin to load is not ready/unloaded and not forced", async () => {
      const mockPlugin = createMockPlugin("test-building");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      pluginManager.updatePluginState(pluginId, {
        status: PluginStatus.BUILDING,
      });
      await expect(pluginManager.loadPlugin({ pluginId })).rejects.toThrow(
        "Plugin test-building is not ready to load (status: building)",
      );
    });

    it("should throw error if plugin state has no plugin instance on load", async () => {
      const mockPlugin = createMockPlugin("no-instance-plugin");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      const pluginState = pluginManager.getPlugin(pluginId);
      if (pluginState) {
        pluginManager.updatePluginState(pluginId, { plugin: undefined });
      }
      await expect(pluginManager.loadPlugin({ pluginId })).rejects.toThrow(
        "Plugin no-instance-plugin has no plugin instance",
      );
    });
  });

  describe("Plugin Loading", () => {
    it("should load a ready plugin", async () => {
      const mockPlugin = createMockPlugin("test");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      await pluginManager.loadPlugin({ pluginId });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.LOADED);
      expect(pluginState?.loadedAt).toBeDefined();

      // Check that components were registered
      expect(runtime.registerAction).toHaveBeenCalledWith(
        mockPlugin.actions![0],
      );
      expect(runtime.registerProvider).toHaveBeenCalledWith(
        mockPlugin.providers![0],
      );
      expect(runtime.plugins).toContain(mockPlugin);
    });

    it("should not reload already loaded plugin without force", async () => {
      const mockPlugin = createMockPlugin("test");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      await pluginManager.loadPlugin({ pluginId });
      const firstLoadTime = pluginManager.getPlugin(pluginId)?.loadedAt;

      // Try to load again
      await pluginManager.loadPlugin({ pluginId });
      const secondLoadTime = pluginManager.getPlugin(pluginId)?.loadedAt;

      expect(firstLoadTime).toBe(secondLoadTime);
    });

    it("should reload plugin with force flag", async () => {
      const mockPlugin = createMockPlugin("test");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      await pluginManager.loadPlugin({ pluginId });

      // Reset mocks for the specific functions we want to check for re-invocation
      const registerActionSpy = vi.spyOn(runtime, "registerAction");
      const registerProviderSpy = vi.spyOn(runtime, "registerProvider");

      // Force reload
      await pluginManager.loadPlugin({ pluginId, force: true });

      expect(registerActionSpy).toHaveBeenCalled();
      expect(registerProviderSpy).toHaveBeenCalled();

      registerActionSpy.mockRestore();
      registerProviderSpy.mockRestore();
    });

    it("should handle plugin with init function", async () => {
      const initMock = vi.fn();
      const mockPlugin: Plugin = {
        ...createMockPlugin("test"),
        init: initMock,
      };

      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      await pluginManager.loadPlugin({ pluginId });

      expect(initMock).toHaveBeenCalledWith({}, runtime);
    });

    it("should handle plugin loading errors", async () => {
      const mockPlugin: Plugin = {
        ...createMockPlugin("test"),
        init: async () => {
          throw new Error("Init failed");
        },
      };

      const pluginId = await pluginManager.registerPlugin(mockPlugin);

      await expect(pluginManager.loadPlugin({ pluginId })).rejects.toThrow(
        "Init failed",
      );

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.ERROR);
      expect(pluginState?.error).toBe("Init failed");
    });
  });

  describe("Plugin Unloading", () => {
    it("should unload a loaded plugin", async () => {
      const mockPlugin = createMockPlugin("test");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      await pluginManager.loadPlugin({ pluginId });

      // Clear mocks from loading
      vi.clearAllMocks();

      await pluginManager.unloadPlugin({ pluginId });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.UNLOADED);
      expect(pluginState?.unloadedAt).toBeDefined();

      // Check that components were removed
      expect(runtime.actions).not.toContain(mockPlugin.actions![0]);
      expect(runtime.providers).not.toContain(mockPlugin.providers![0]);
      expect(runtime.plugins).not.toContain(mockPlugin);
    });

    it("should not unload original plugins", async () => {
      const originalPlugin = createMockPlugin("original");
      runtime.plugins.push(originalPlugin);

      const newPluginManager = new PluginManagerService(runtime);
      runtime.services.set(
        "PLUGIN_MANAGER" as ServiceTypeName,
        newPluginManager,
      );

      const plugins = newPluginManager.getAllPlugins();
      const originalPluginId = plugins[0].id;

      await expect(
        newPluginManager.unloadPlugin({ pluginId: originalPluginId }),
      ).rejects.toThrow("Cannot unload original plugin original");
    });

    it("should not unload plugin if not loaded", async () => {
      const mockPlugin = createMockPlugin("test-ready");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      // Plugin is in READY state, not LOADED
      await pluginManager.unloadPlugin({ pluginId }); // Should not throw, just log and return
      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.READY); // Status should remain READY
    });

    it("should throw error if plugin to unload is not found", async () => {
      await expect(
        pluginManager.unloadPlugin({ pluginId: "non-existent-id" }),
      ).rejects.toThrow("Plugin non-existent-id not found in registry");
    });

    it("should throw error if plugin state has no plugin instance on unload", async () => {
      const mockPlugin = createMockPlugin("no-instance-unload");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      await pluginManager.loadPlugin({ pluginId });
      const pluginState = pluginManager.getPlugin(pluginId);
      if (pluginState) {
        pluginManager.updatePluginState(pluginId, { plugin: undefined });
      }
      await expect(pluginManager.unloadPlugin({ pluginId })).rejects.toThrow(
        "Plugin no-instance-unload has no plugin instance",
      );
    });

    it("should handle errors during plugin component unregistration", async () => {
      const mockPluginWithService = createMockPluginWithService(
        "service-unload-error",
      );
      const pluginId = await pluginManager.registerPlugin(
        mockPluginWithService,
      );
      await pluginManager.loadPlugin({ pluginId });

      // Simulate service stop error
      const serviceInstance = runtime.getService(MockService.serviceType);
      if (serviceInstance) {
        vi.spyOn(serviceInstance, "stop").mockRejectedValueOnce(
          new Error("Service stop failed"),
        );
      }

      await expect(pluginManager.unloadPlugin({ pluginId })).rejects.toThrow(
        "Service stop failed",
      );
      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.ERROR);
      expect(pluginState?.error).toBe("Service stop failed");
    });

    it("should handle plugins with services", async () => {
      const mockPlugin = createMockPluginWithService("test");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      await pluginManager.loadPlugin({ pluginId });

      // Manually set the service in runtime.services (simulating registration)
      const service = new MockService(runtime);
      runtime.services.set("MOCK_SERVICE" as ServiceTypeName, service);

      const stopSpy = vi.spyOn(service, "stop");

      await pluginManager.unloadPlugin({ pluginId });

      expect(stopSpy).toHaveBeenCalled();
      expect(runtime.services.has("MOCK_SERVICE" as ServiceTypeName)).toBe(
        false,
      );
    });

    it("should correctly unregister components, including evaluators, and not remove original components", async () => {
      const originalAction: Action = {
        name: "ORIGINAL_ACTION",
        handler: vi.fn(),
        similes: [],
        description: "",
        examples: [],
        validate: vi.fn(),
      };
      const originalProvider: Provider = {
        name: "ORIGINAL_PROVIDER",
        get: vi.fn(),
        description: "",
      };
      const originalEvaluator: Action = {
        name: "ORIGINAL_EVALUATOR",
        handler: vi.fn(),
        similes: [],
        description: "",
        examples: [],
        validate: vi.fn(),
      }; // Evaluator has Action shape for this mock
      class OriginalService extends Service {
        static override serviceType = "ORIGINAL_SVC" as ServiceTypeName;
        override capabilityDescription = "Original";
        static async start() {
          return new this({} as any);
        }
        async stop() {}
      }

      // Initialize runtime and THEN push original components to its arrays
      // Ensure this test uses a fresh runtime instance if beforeEach doesn't already provide a sufficiently clean one
      // or if runtime is modified by other tests in a way that interferes.
      // For this specific test, we will re-initialize runtime to ensure a clean state for testing original components.
      runtime = createMockRuntime();
      runtime.actions.push(originalAction);
      runtime.providers.push(originalProvider);
      runtime.evaluators.push(originalEvaluator as any); // Cast as any because it is Action shape
      runtime.services.set(
        "ORIGINAL_SVC" as ServiceTypeName,
        new OriginalService({} as any),
      );

      pluginManager = new PluginManagerService(runtime); // Re-initialize to capture originals based on the modified runtime
      runtime.services.set("PLUGIN_MANAGER" as ServiceTypeName, pluginManager); // Important to set it on the potentially new runtime instance

      const mockPluginWithAll: Plugin = {
        ...createMockPlugin("all-components"),
        evaluators: [
          {
            name: "TEST_EVALUATOR",
            handler: vi.fn(),
            similes: [],
            description: "",
            examples: [],
            validate: vi.fn(),
          } as any,
        ], // cast as any
        services: [MockService], // MockService has 'MOCK_SERVICE' type
      };
      const pluginId = await pluginManager.registerPlugin(mockPluginWithAll);
      await pluginManager.loadPlugin({ pluginId });

      // Manually set the mock service in runtime as loadPlugin doesn't do this for test mock
      // This is because MockService.start doesn't add to runtime.services in createMockPluginWithService
      if (mockPluginWithAll.services && mockPluginWithAll.services.length > 0) {
        const serviceClass = mockPluginWithAll.services[0];
        if (serviceClass === MockService) {
          // ensure it's the one we expect
          runtime.services.set(
            MockService.serviceType,
            new MockService(runtime),
          );
        }
      }

      expect(runtime.actions).toEqual(
        expect.arrayContaining([originalAction, mockPluginWithAll.actions![0]]),
      );
      expect(runtime.providers).toEqual(
        expect.arrayContaining([
          originalProvider,
          mockPluginWithAll.providers![0],
        ]),
      );
      expect(runtime.evaluators).toEqual(
        expect.arrayContaining([
          originalEvaluator as any,
          mockPluginWithAll.evaluators![0],
        ]),
      );
      expect(runtime.services.has(MockService.serviceType)).toBe(true);

      await pluginManager.unloadPlugin({ pluginId });

      expect(runtime.actions).toEqual([originalAction]);
      expect(runtime.providers).toEqual([originalProvider]);
      expect(runtime.evaluators).toEqual([originalEvaluator as any]);
      expect(runtime.services.has(MockService.serviceType)).toBe(false);
      expect(runtime.services.has("ORIGINAL_SVC" as ServiceTypeName)).toBe(
        true,
      ); // Original service should remain
    });
  });

  describe("Plugin State Management", () => {
    it("should get all plugins", async () => {
      await pluginManager.registerPlugin(createMockPlugin("test1"));
      await pluginManager.registerPlugin(createMockPlugin("test2"));

      const plugins = pluginManager.getAllPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins.map((p) => p.name)).toContain("test1");
      expect(plugins.map((p) => p.name)).toContain("test2");
    });

    it("should get loaded plugins only", async () => {
      const pluginId1 = await pluginManager.registerPlugin(
        createMockPlugin("test1"),
      );
      const pluginId2 = await pluginManager.registerPlugin(
        createMockPlugin("test2"),
      );

      await pluginManager.loadPlugin({ pluginId: pluginId1 });

      const loadedPlugins = pluginManager.getLoadedPlugins();
      expect(loadedPlugins).toHaveLength(1);
      expect(loadedPlugins[0].name).toBe("test1");
    });

    it("should update plugin state", async () => {
      const pluginId = await pluginManager.registerPlugin(
        createMockPlugin("test"),
      );

      pluginManager.updatePluginState(pluginId, {
        missingEnvVars: ["API_KEY", "SECRET"],
        error: "Missing configuration",
      });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.missingEnvVars).toEqual(["API_KEY", "SECRET"]);
      expect(pluginState?.error).toBe("Missing configuration");
    });
  });
});

describe("Plugin Manager Actions", () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    runtime = createMockRuntime();
    pluginManager = new PluginManagerService(runtime);
    runtime.services.set("PLUGIN_MANAGER" as ServiceTypeName, pluginManager);
  });

  describe("Load Plugin Action", () => {
    it("should validate when loadable plugins exist", async () => {
      await pluginManager.registerPlugin(createMockPlugin("test"));

      const isValid = await loadPluginAction.validate(runtime, {} as any);
      expect(isValid).toBe(true);
    });

    it("should not validate when no loadable plugins exist", async () => {
      const isValid = await loadPluginAction.validate(runtime, {} as any);
      expect(isValid).toBe(false);
    });

    it("should not validate if plugin manager is not available", async () => {
      runtime.services.delete("PLUGIN_MANAGER" as ServiceTypeName);
      const isValid = await loadPluginAction.validate(runtime, {} as any);
      expect(isValid).toBe(false);
    });

    it("should load plugin by name", async () => {
      const pluginId = await pluginManager.registerPlugin(
        createMockPlugin("test-plugin"),
      );

      const callback = vi.fn();
      const message = {
        content: { text: "Load the test-plugin" },
      } as any;

      await loadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        callback,
      );

      expect(callback).toHaveBeenCalledWith({
        text: "Successfully loaded plugin: test-plugin",
        actions: ["LOAD_PLUGIN"],
      });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.LOADED);
    });

    it("should handle plugin manager not available in handler", async () => {
      runtime.services.delete("PLUGIN_MANAGER" as ServiceTypeName);
      const message = { content: { text: "Load test plugin" } } as any;
      await loadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        undefined,
      );
      // No assertion needed, just checking for no errors and coverage
    });

    it("should handle no plugin available to load in handler without callback", async () => {
      const message = { content: { text: "Load test plugin" } } as any;
      await loadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        undefined,
      );
      // No assertion needed, just checking for no errors and coverage
    });

    it("should handle missing environment variables in handler without callback", async () => {
      const pluginId = await pluginManager.registerPlugin(
        createMockPlugin("test"),
      );
      pluginManager.updatePluginState(pluginId, {
        missingEnvVars: ["API_KEY"],
      });
      const message = { content: { text: "Load test plugin" } } as any;
      await loadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        undefined,
      );
      // No assertion needed, just checking for no errors and coverage
    });

    it("should handle plugin loading error in handler without callback", async () => {
      const mockPlugin: Plugin = {
        ...createMockPlugin("test"),
        init: async () => {
          throw new Error("Init failed");
        },
      };
      await pluginManager.registerPlugin(mockPlugin);
      const message = { content: { text: "Load test plugin" } } as any;
      await loadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        undefined,
      );
      // No assertion needed, just checking for no errors and coverage
    });

    it("should handle missing environment variables", async () => {
      const pluginId = await pluginManager.registerPlugin(
        createMockPlugin("test"),
      );
      pluginManager.updatePluginState(pluginId, {
        missingEnvVars: ["API_KEY"],
      });

      const callback = vi.fn();
      const message = {
        content: { text: "Load test plugin" },
      } as any;

      await loadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        callback,
      );

      expect(callback).toHaveBeenCalledWith({
        text: expect.stringContaining("missing environment variables: API_KEY"),
        actions: ["LOAD_PLUGIN"],
      });
    });
  });

  describe("Unload Plugin Action", () => {
    it("should validate when loaded plugins exist", async () => {
      const pluginId = await pluginManager.registerPlugin(
        createMockPlugin("test"),
      );
      await pluginManager.loadPlugin({ pluginId });

      const isValid = await unloadPluginAction.validate(runtime, {} as any);
      expect(isValid).toBe(true);
    });

    it("should not validate if plugin manager is not available", async () => {
      runtime.services.delete("PLUGIN_MANAGER" as ServiceTypeName);
      const isValid = await unloadPluginAction.validate(runtime, {} as any);
      expect(isValid).toBe(false);
    });

    it("should unload plugin by name", async () => {
      const pluginId = await pluginManager.registerPlugin(
        createMockPlugin("test-plugin"),
      );
      await pluginManager.loadPlugin({ pluginId });

      const callback = vi.fn();
      const message = {
        content: { text: "Unload the test-plugin" },
      } as any;

      await unloadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        callback,
      );

      expect(callback).toHaveBeenCalledWith({
        text: "Successfully unloaded plugin: test-plugin",
        actions: ["UNLOAD_PLUGIN"],
      });

      const pluginState = pluginManager.getPlugin(pluginId);
      expect(pluginState?.status).toBe(PluginStatus.UNLOADED);
    });

    it("should handle plugin manager not available in handler", async () => {
      runtime.services.delete("PLUGIN_MANAGER" as ServiceTypeName);
      const message = { content: { text: "Unload test plugin" } } as any;
      await unloadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        undefined,
      );
      // No assertion needed, just checking for no errors and coverage
    });

    it("should handle no plugin available to unload in handler without callback", async () => {
      const message = { content: { text: "Unload test plugin" } } as any;
      await unloadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        undefined,
      );
      // No assertion needed, just checking for no errors and coverage
    });

    it("should handle no exact match for plugin to unload in handler without callback", async () => {
      await pluginManager.registerPlugin(createMockPlugin("loaded-plugin"));
      const loadedPlugin = pluginManager
        .getAllPlugins()
        .find((p) => p.name === "loaded-plugin")!;
      await pluginManager.loadPlugin({ pluginId: loadedPlugin.id });
      const message = {
        content: { text: "Unload non_existent_plugin" },
      } as any;
      await unloadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        undefined,
      );
      // No assertion needed, just checking for no errors and coverage
    });

    it("should handle plugin unloading error in handler without callback (not original plugin error)", async () => {
      const mockPlugin = createMockPlugin("error-plugin");
      const pluginId = await pluginManager.registerPlugin(mockPlugin);
      await pluginManager.loadPlugin({ pluginId });

      // Simulate an error during unload that is not "Cannot unload original plugin"
      vi.spyOn(pluginManager, "unloadPlugin").mockRejectedValueOnce(
        new Error("Generic unload error"),
      );

      const message = { content: { text: "Unload error-plugin" } } as any;
      await unloadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        undefined,
      );
      // No assertion needed, just checking for no errors and coverage
      vi.restoreAllMocks(); // Or mockManager.restoreAllMocks(); if using a TestBed like setup
    });

    it("should handle unloading original plugins", async () => {
      const originalPlugin = createMockPlugin("original");
      runtime.plugins.push(originalPlugin);

      const newPluginManager = new PluginManagerService(runtime);
      runtime.services.set(
        "PLUGIN_MANAGER" as ServiceTypeName,
        newPluginManager,
      );

      const callback = vi.fn();
      const message = {
        content: { text: "Unload original plugin" },
      } as any;

      await unloadPluginAction.handler(
        runtime,
        message,
        undefined,
        undefined,
        callback,
      );

      expect(callback).toHaveBeenCalledWith({
        text: expect.stringContaining(
          "original plugin that was loaded at startup",
        ),
        actions: ["UNLOAD_PLUGIN"],
      });
    });
  });

  it("should handle error during service registration in registerPluginComponents", async () => {
    class FailingService extends Service {
      static override serviceType: ServiceTypeName =
        "FAILING_SERVICE" as ServiceTypeName;
      override capabilityDescription = "Failing Service";
      static async start(runtime: IAgentRuntime): Promise<Service> {
        throw new Error("Service start failed");
      }
      async stop(): Promise<void> {}
    }
    const pluginWithFailingService: Plugin = {
      ...createMockPlugin("failing-service-plugin"),
      services: [FailingService],
    };

    const pluginId = await pluginManager.registerPlugin(
      pluginWithFailingService,
    );
    // Expect loadPlugin to not throw, but log the error and continue
    await expect(pluginManager.loadPlugin({ pluginId })).resolves.not.toThrow();

    const pluginState = pluginManager.getPlugin(pluginId);
    // The plugin itself should still be marked as loaded, as service registration failure is handled gracefully
    expect(pluginState?.status).toBe(PluginStatus.LOADED);
    // Check logs or emitted events if detailed error checking is needed outside plugin state
    // For now, ensuring the service is not in runtime.services is enough
    expect(
      runtime.getService("FAILING_SERVICE" as ServiceTypeName),
    ).toBeUndefined();
  });

  it("should handle runtime.plugins being initially undefined during component registration", async () => {
    const testRuntime = createMockRuntime();
    testRuntime.plugins = undefined as any; // Set plugins to undefined
    pluginManager = new PluginManagerService(testRuntime);
    testRuntime.services.set(
      "PLUGIN_MANAGER" as ServiceTypeName,
      pluginManager,
    );

    const mockPlugin = createMockPlugin("runtime-plugins-test");
    const pluginId = await pluginManager.registerPlugin(mockPlugin);
    await pluginManager.loadPlugin({ pluginId });

    expect(testRuntime.plugins).toBeDefined();
    expect(testRuntime.plugins).toHaveLength(1);
    expect(testRuntime.plugins![0].name).toBe("runtime-plugins-test");
  });
});

describe("Plugin State Provider", () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;

  beforeEach(() => {
    runtime = createMockRuntime();
    pluginManager = new PluginManagerService(runtime);
    runtime.services.set("PLUGIN_MANAGER" as ServiceTypeName, pluginManager);
  });

  it("should provide plugin state information", async () => {
    const pluginId1 = await pluginManager.registerPlugin(
      createMockPlugin("test1"),
    );
    const pluginId2 = await pluginManager.registerPlugin(
      createMockPlugin("test2"),
    );

    await pluginManager.loadPlugin({ pluginId: pluginId1 });
    pluginManager.updatePluginState(pluginId2, {
      missingEnvVars: ["API_KEY"],
    });

    const result = await pluginStateProvider.get(runtime, {} as any, {} as any);

    expect(result.text).toContain("Loaded Plugins:");
    expect(result.text).toContain("test1 (loaded)");
    expect(result.text).toContain("Ready to Load:");
    expect(result.text).toContain("test2 (ready)");
    expect(result.text).toContain("Missing ENV vars: API_KEY");

    expect(result.values?.loadedCount).toBe(1);
    expect(result.values?.readyCount).toBe(1);
    expect(result.values?.missingEnvVars).toContain("API_KEY");
  });

  it("should provide state for plugins with errors and building status", async () => {
    const errorPlugin = createMockPlugin("error-plugin");
    const errorPluginId = await pluginManager.registerPlugin(errorPlugin);
    pluginManager.updatePluginState(errorPluginId, {
      status: PluginStatus.ERROR,
      error: "Test Error",
    });

    const buildingPlugin = createMockPlugin("building-plugin");
    const buildingPluginId = await pluginManager.registerPlugin(buildingPlugin);
    pluginManager.updatePluginState(buildingPluginId, {
      status: PluginStatus.BUILDING,
    });

    // Mock loadedAt for one plugin
    const loadedPlugin = createMockPlugin("loaded-plugin-with-time");
    const loadedPluginId = await pluginManager.registerPlugin(loadedPlugin);
    await pluginManager.loadPlugin({ pluginId: loadedPluginId });
    const pluginState = pluginManager.getPlugin(loadedPluginId);
    if (pluginState) {
      // Ensure pluginState is not null
      pluginManager.updatePluginState(loadedPluginId, { loadedAt: Date.now() });
    }

    const result = await pluginStateProvider.get(runtime, {} as any, {} as any);

    expect(result.text).toContain("error-plugin (error)");
    expect(result.text).toContain("Error: Test Error");
    expect(result.text).toContain("building-plugin (building)");
    expect(result.text).toContain("loaded-plugin-with-time (loaded)");
    expect(result.text).toMatch(/Loaded at: .*/); // Check for loadedAt timestamp
    expect(result.values?.errorCount).toBe(1);
    expect(result.values?.buildingCount).toBe(1);
  });

  it("should provide a message when no plugins are registered", async () => {
    // Ensure no plugins are registered by creating a new manager for a clean runtime
    const newRuntime = createMockRuntime();
    new PluginManagerService(newRuntime); // This will initialize an empty plugin manager
    newRuntime.services.set(
      "PLUGIN_MANAGER" as ServiceTypeName,
      new PluginManagerService(newRuntime),
    );

    const result = await pluginStateProvider.get(
      newRuntime,
      {} as any,
      {} as any,
    );
    expect(result.text).toBe("No plugins registered in the Plugin Manager.");
  });

  it("should handle errors when getting plugin state", async () => {
    vi.spyOn(pluginManager, "getAllPlugins").mockImplementation(() => {
      throw new Error("Test error getting plugins");
    });

    const result = await pluginStateProvider.get(runtime, {} as any, {} as any);

    expect(result.text).toBe("Error retrieving plugin state information");
    expect(result.data?.error).toBe("Test error getting plugins");
    vi.restoreAllMocks();
  });

  it("should handle when plugin manager is not available", async () => {
    runtime.services.delete("PLUGIN_MANAGER" as ServiceTypeName);

    const result = await pluginStateProvider.get(runtime, {} as any, {} as any);

    expect(result.text).toBe("Plugin Manager service is not available");
    expect(result.data?.error).toBe("Plugin Manager service not found");
  });
});
