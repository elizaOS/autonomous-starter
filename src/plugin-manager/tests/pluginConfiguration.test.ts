import { describe, it, expect } from "vitest";
import { PluginConfigurationService } from "../services/pluginConfigurationService";
import { PluginUserInteractionService } from "../services/pluginUserInteractionService";
import { startPluginConfigurationAction } from "../actions/startPluginConfiguration";
import { pluginConfigurationStatusProvider } from "../providers/pluginConfigurationStatus";
import { pluginConfigurationEvaluator } from "../evaluators/pluginConfigurationEvaluator";
import { pluginManagerPlugin } from "../index";

describe("Plugin Configuration System", () => {
  it("should export all required components", () => {
    expect(PluginConfigurationService).toBeDefined();
    expect(PluginUserInteractionService).toBeDefined();
    expect(startPluginConfigurationAction).toBeDefined();
    expect(pluginConfigurationStatusProvider).toBeDefined();
    expect(pluginConfigurationEvaluator).toBeDefined();
    expect(pluginManagerPlugin).toBeDefined();
  });

  it("should have correct plugin structure", () => {
    expect(pluginManagerPlugin.name).toBe("plugin-manager");
    expect(pluginManagerPlugin.description).toContain(
      "configuration management",
    );
    expect(pluginManagerPlugin.services).toHaveLength(3);
    expect(pluginManagerPlugin.actions).toHaveLength(4);
    expect(pluginManagerPlugin.providers).toHaveLength(3);
    expect(pluginManagerPlugin.evaluators).toHaveLength(1);
  });

  it("should have valid action structure", () => {
    expect(startPluginConfigurationAction.name).toBe(
      "START_PLUGIN_CONFIGURATION",
    );
    expect(startPluginConfigurationAction.description).toContain(
      "configuration dialog",
    );
    expect(startPluginConfigurationAction.validate).toBeTypeOf("function");
    expect(startPluginConfigurationAction.handler).toBeTypeOf("function");
  });

  it("should have valid provider structure", () => {
    expect(pluginConfigurationStatusProvider.name).toBe(
      "pluginConfigurationStatus",
    );
    expect(pluginConfigurationStatusProvider.description).toContain(
      "configuration status",
    );
    expect(pluginConfigurationStatusProvider.get).toBeTypeOf("function");
  });

  it("should have valid evaluator structure", () => {
    expect(pluginConfigurationEvaluator.name).toBe(
      "pluginConfigurationEvaluator",
    );
    expect(pluginConfigurationEvaluator.description).toContain(
      "configuration needs",
    );
    expect(pluginConfigurationEvaluator.validate).toBeTypeOf("function");
    expect(pluginConfigurationEvaluator.handler).toBeTypeOf("function");
    expect(pluginConfigurationEvaluator.alwaysRun).toBe(false);
  });
});
