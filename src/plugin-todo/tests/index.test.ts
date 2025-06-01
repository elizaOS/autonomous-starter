import { describe, it, expect, vi, beforeEach } from "vitest";
import { TodoPlugin, TodoService } from "../index";
import type { IAgentRuntime } from "@elizaos/core";

describe("TodoPlugin", () => {
  it("should export TodoPlugin with correct structure", () => {
    expect(TodoPlugin).toBeDefined();
    expect(TodoPlugin.name).toBe("todo");
    expect(TodoPlugin.description).toBe(
      "Provides task management functionality with daily recurring and one-off tasks.",
    );
    expect(TodoPlugin.providers).toHaveLength(1);
    expect(TodoPlugin.actions).toHaveLength(4);
    expect(TodoPlugin.services).toHaveLength(2);
    expect(TodoPlugin.routes).toBeDefined();
    expect(TodoPlugin.init).toBeInstanceOf(Function);
  });

  it("should have all required actions", () => {
    const actionNames = TodoPlugin.actions.map((action) => action.name);
    expect(actionNames).toContain("CREATE_TODO");
    expect(actionNames).toContain("COMPLETE_TODO");
    expect(actionNames).toContain("UPDATE_TODO");
    expect(actionNames).toContain("CANCEL_TODO");
  });

  it("should have all required services", () => {
    expect(TodoPlugin.services).toContain(TodoService);
    expect(
      TodoPlugin.services.some((s) => s.name === "TodoReminderService"),
    ).toBe(true);
  });
});

describe("TodoService", () => {
  let mockRuntime: IAgentRuntime;

  beforeEach(() => {
    mockRuntime = {
      agentId: "test-agent" as any,
      getSetting: vi.fn(),
      getService: vi.fn(),
      createTask: vi.fn(),
      registerTaskWorker: vi.fn(),
      getTasks: vi.fn(),
      updateTask: vi.fn(),
    } as any;
  });

  it("should have correct service type", () => {
    expect(TodoService.serviceType).toBe("TODO");
  });

  it("should start and initialize service", async () => {
    const service = await TodoService.start(mockRuntime);
    expect(service).toBeInstanceOf(TodoService);
    expect(service.capabilityDescription).toBe(
      "The agent can manage to-do lists with daily recurring and one-off tasks",
    );
  });

  it("should stop service gracefully", async () => {
    const service = await TodoService.start(mockRuntime);
    await service.stop();
    // If we get here without throwing, the test passes
    expect(true).toBe(true);
  });

  it("should stop service via static method", async () => {
    const service = await TodoService.start(mockRuntime);
    mockRuntime.getService = vi.fn().mockReturnValue(service);

    await TodoService.stop(mockRuntime);
    expect(mockRuntime.getService).toHaveBeenCalledWith(
      TodoService.serviceType,
    );
  });
});
