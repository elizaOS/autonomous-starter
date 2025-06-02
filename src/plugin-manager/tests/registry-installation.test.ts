import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  PluginManagerService,
  resetRegistryCache,
} from "../services/pluginManagerService";
import {
  type IAgentRuntime,
  type Plugin,
  Service,
  type ServiceTypeName,
  createUniqueUuid,
} from "@elizaos/core";
import type * as FSExtra from "fs-extra";
import path from "path";

// Mock fs-extra module
vi.mock("fs-extra", () => {
  const mockReadJson = vi.fn().mockImplementation(async (filePath) => {
    const pathStr = typeof filePath === "string" ? filePath : String(filePath);
    if (pathStr.includes("package.json")) {
      return {
        name: "@elizaos/plugin-example",
        version: "1.0.0",
        main: "index.js",
        elizaos: {
          requiredEnvVars: [],
        },
      };
    }
    throw new Error(`Mock not configured for ${pathStr}`);
  });

  return {
    default: {
      ensureDir: vi.fn().mockResolvedValue(undefined),
      readJson: mockReadJson,
      writeJson: vi.fn().mockResolvedValue(undefined),
      copy: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      pathExists: vi.fn().mockResolvedValue(true),
    },
    ensureDir: vi.fn().mockResolvedValue(undefined),
    readJson: mockReadJson,
    writeJson: vi.fn().mockResolvedValue(undefined),
    copy: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(true),
  };
});

// Mock execa
vi.mock("execa", () => ({
  execa: vi.fn().mockResolvedValue({ stdout: "", stderr: "" }),
}));

// Mock registry data
const mockRegistry = {
  "@elizaos/plugin-npm-example": {
    name: "@elizaos/plugin-npm-example",
    description: "Example NPM plugin",
    repository: "https://github.com/example/plugin-npm-example",
    npm: {
      repo: "@elizaos/plugin-npm-example",
      v1: "1.0.0",
    },
  },
  "@elizaos/plugin-git-example": {
    name: "@elizaos/plugin-git-example",
    description: "Example Git plugin",
    repository: "https://github.com/example/plugin-git-example",
    git: {
      repo: "https://github.com/example/plugin-git-example.git",
      v1: {
        branch: "main",
        version: "1.0.0",
      },
    },
  },
};

// Mock global fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(mockRegistry),
    statusText: "OK",
  } as Response),
);

// Create mock runtime
const createMockRuntime = (): IAgentRuntime => {
  const services = new Map<ServiceTypeName, Service>();
  const runtime = {
    agentId: "test-agent" as any,
    plugins: [],
    actions: [],
    providers: [],
    evaluators: [],
    services,
    getService: vi.fn((serviceType: ServiceTypeName) =>
      services.get(serviceType),
    ),
    emitEvent: vi.fn(async () => {}),
    getSetting: vi.fn(() => null),
    getWorldId: vi.fn(() => "test-world" as any),
    registerAction: vi.fn(),
    registerProvider: vi.fn(),
    registerEvaluator: vi.fn(),
    useModel: vi.fn(async () => "mock response"),
  };
  return runtime as any;
};

describe("Registry Installation", () => {
  let runtime: IAgentRuntime;
  let pluginManager: PluginManagerService;
  let fs: typeof FSExtra;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetRegistryCache(); // Reset the module-level cache between tests

    runtime = createMockRuntime();
    pluginManager = new PluginManagerService(runtime);
    runtime.services.set("PLUGIN_MANAGER" as ServiceTypeName, pluginManager);

    // Get mocked fs-extra
    fs = await import("fs-extra");

    // Reset the mock implementation to default
    vi.mocked(fs.readJson).mockClear();
    vi.mocked(fs.readJson).mockImplementation(async (filePath) => {
      const pathStr =
        typeof filePath === "string" ? filePath : String(filePath);
      if (pathStr.includes("package.json")) {
        return {
          name: "@elizaos/plugin-example",
          version: "1.0.0",
          main: "index.js",
          elizaos: {
            requiredEnvVars: [],
          },
        };
      }
      throw new Error(`Mock not configured for ${pathStr}`);
    });
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("getAvailablePluginsFromRegistry", () => {
    it("should fetch and return available plugins from registry", async () => {
      const registry = await pluginManager.getAvailablePluginsFromRegistry();

      expect(registry).toEqual(mockRegistry);
      expect(fetch).toHaveBeenCalledWith(
        "https://raw.githubusercontent.com/elizaos-plugins/registry/refs/heads/main/index.json",
      );
    });

    it("should use cached registry data when available", async () => {
      // First call
      await pluginManager.getAvailablePluginsFromRegistry();

      // Second call within cache duration
      await pluginManager.getAvailablePluginsFromRegistry();

      // Should only fetch once due to caching
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should handle registry fetch errors gracefully", async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

      const registry = await pluginManager.getAvailablePluginsFromRegistry();

      expect(registry).toEqual({});
    });
  });

  describe("installPluginFromRegistry", () => {
    let execa: any;

    beforeEach(async () => {
      // Mock execa for npm and git commands
      const execaMod = await import("execa");
      execa = execaMod.execa;
      vi.mocked(execa).mockResolvedValue({ stdout: "", stderr: "" } as any);
    });

    it("should install plugin from npm repository", async () => {
      const pluginName = "@elizaos/plugin-npm-example";

      const pluginInfo =
        await pluginManager.installPluginFromRegistry(pluginName);

      expect(pluginInfo).toEqual({
        name: "@elizaos/plugin-example",
        version: "1.0.0",
        status: "installed",
        path: expect.stringContaining("plugin-npm-example"),
        requiredEnvVars: [],
        installedAt: expect.any(Date),
      });

      expect(execa).toHaveBeenCalledWith(
        "npm",
        [
          "install",
          "@elizaos/plugin-npm-example@1.0.0",
          "--prefix",
          expect.any(String),
        ],
        { stdio: "pipe" },
      );
    });

    it("should install plugin from git repository", async () => {
      const pluginName = "@elizaos/plugin-git-example";

      const pluginInfo =
        await pluginManager.installPluginFromRegistry(pluginName);

      expect(pluginInfo).toEqual({
        name: "@elizaos/plugin-example",
        version: "1.0.0",
        status: "installed",
        path: expect.stringContaining("plugin-git-example"),
        requiredEnvVars: [],
        installedAt: expect.any(Date),
      });

      expect(execa).toHaveBeenCalledWith(
        "git",
        [
          "clone",
          "https://github.com/example/plugin-git-example.git",
          expect.any(String),
        ],
        { stdio: "pipe" },
      );
    });

    it("should handle plugins with required environment variables", async () => {
      vi.mocked(fs.readJson).mockImplementation(async (filePath) => {
        const pathStr =
          typeof filePath === "string" ? filePath : String(filePath);
        if (pathStr.includes("package.json")) {
          return {
            name: "@elizaos/plugin-with-config",
            version: "1.0.0",
            main: "index.js",
            elizaos: {
              requiredEnvVars: [
                {
                  name: "API_KEY",
                  description: "API key for the service",
                  sensitive: true,
                },
              ],
            },
          };
        }
        throw new Error(`Mock not configured for ${pathStr}`);
      });

      const pluginName = "@elizaos/plugin-npm-example";
      const pluginInfo =
        await pluginManager.installPluginFromRegistry(pluginName);

      expect(pluginInfo.status).toBe("needs_configuration");
      expect(pluginInfo.requiredEnvVars).toHaveLength(1);
      expect(pluginInfo.requiredEnvVars[0]).toEqual({
        name: "API_KEY",
        description: "API key for the service",
        sensitive: true,
        isSet: false,
      });
    });

    it("should throw error for non-existent plugin", async () => {
      const pluginName = "@elizaos/non-existent-plugin";

      await expect(
        pluginManager.installPluginFromRegistry(pluginName),
      ).rejects.toThrow(
        "Plugin @elizaos/non-existent-plugin not found in registry",
      );
    });

    it("should throw error when installation fails", async () => {
      vi.mocked(execa).mockRejectedValueOnce(new Error("npm install failed"));

      const pluginName = "@elizaos/plugin-npm-example";

      await expect(
        pluginManager.installPluginFromRegistry(pluginName),
      ).rejects.toThrow("npm install failed");
    });
  });

  describe("loadInstalledPlugin", () => {
    it("should load a previously installed plugin", async () => {
      // First install the plugin
      const pluginName = "@elizaos/plugin-npm-example";
      const pluginInfo =
        await pluginManager.installPluginFromRegistry(pluginName);

      // Mock the plugin module loading
      const mockPlugin: Plugin = {
        name: pluginInfo.name,
        description: "Test plugin",
        actions: [],
        providers: [],
        evaluators: [],
      };

      // Mock the loadPluginModule method instead of file system
      const loadPluginModuleSpy = vi.spyOn(
        pluginManager as any,
        "loadPluginModule",
      );
      loadPluginModuleSpy.mockResolvedValueOnce(mockPlugin);

      const pluginId = await pluginManager.loadInstalledPlugin(pluginName);

      expect(pluginId).toBeDefined();
      expect(pluginInfo.status).toBe("loaded");

      // Verify plugin was registered and loaded
      const loadedPlugin = pluginManager.getPlugin(pluginId);
      expect(loadedPlugin).toBeDefined();
      expect(loadedPlugin?.status).toBe("loaded" as any);

      loadPluginModuleSpy.mockRestore();
    });

    it("should throw error for non-installed plugin", async () => {
      const pluginName = "@elizaos/non-installed-plugin";

      await expect(
        pluginManager.loadInstalledPlugin(pluginName),
      ).rejects.toThrow(
        "Plugin @elizaos/non-installed-plugin is not installed",
      );
    });

    it("should throw error for plugin requiring configuration", async () => {
      // Install plugin with required configuration
      vi.mocked(fs.readJson).mockImplementation(async (filePath) => {
        const pathStr =
          typeof filePath === "string" ? filePath : String(filePath);
        if (pathStr.includes("package.json")) {
          return {
            name: "@elizaos/plugin-with-config",
            version: "1.0.0",
            main: "index.js",
            elizaos: {
              requiredEnvVars: [
                {
                  name: "API_KEY",
                  description: "Required key",
                  sensitive: true,
                },
              ],
            },
          };
        }
        throw new Error(`Mock not configured for ${pathStr}`);
      });

      const pluginName = "@elizaos/plugin-npm-example";
      await pluginManager.installPluginFromRegistry(pluginName);

      await expect(
        pluginManager.loadInstalledPlugin(pluginName),
      ).rejects.toThrow("requires configuration before loading");
    });
  });

  describe("listInstalledPlugins", () => {
    it("should return list of installed plugins", async () => {
      // Install multiple plugins
      await pluginManager.installPluginFromRegistry(
        "@elizaos/plugin-npm-example",
      );
      await pluginManager.installPluginFromRegistry(
        "@elizaos/plugin-git-example",
      );

      const installedPlugins = pluginManager.listInstalledPlugins();

      expect(installedPlugins).toHaveLength(2);
      expect(installedPlugins.map((p) => p.name)).toContain(
        "@elizaos/plugin-example",
      );
    });

    it("should return empty list when no plugins installed", () => {
      const installedPlugins = pluginManager.listInstalledPlugins();

      expect(installedPlugins).toHaveLength(0);
    });
  });

  describe("getInstalledPluginInfo", () => {
    it("should return plugin info for installed plugin", async () => {
      const pluginName = "@elizaos/plugin-npm-example";
      await pluginManager.installPluginFromRegistry(pluginName);

      const pluginInfo = pluginManager.getInstalledPluginInfo(pluginName);

      expect(pluginInfo).toBeDefined();
      expect(pluginInfo?.name).toBe("@elizaos/plugin-example");
      expect(pluginInfo?.status).toBe("installed");
    });

    it("should return undefined for non-installed plugin", () => {
      const pluginInfo = pluginManager.getInstalledPluginInfo(
        "@elizaos/non-existent",
      );

      expect(pluginInfo).toBeUndefined();
    });
  });
});
