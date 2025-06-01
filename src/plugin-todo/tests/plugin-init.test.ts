import { describe, it, expect, vi, beforeEach } from "vitest";
import { TodoPlugin } from "../index";
import type { IAgentRuntime, Task } from "@elizaos/core";

describe("TodoPlugin Initialization", () => {
  let mockRuntime: IAgentRuntime;
  let taskWorkerId: string | undefined;
  let registeredTaskWorker: any;

  beforeEach(() => {
    vi.clearAllMocks();
    taskWorkerId = undefined;
    registeredTaskWorker = undefined;

    mockRuntime = {
      agentId: "test-agent" as any,
      getSetting: vi.fn(),
      createTask: vi.fn().mockImplementation(async () => {
        taskWorkerId = "reset-task-id";
        return taskWorkerId;
      }),
      registerTaskWorker: vi.fn().mockImplementation((worker) => {
        registeredTaskWorker = worker;
      }),
      getTasks: vi.fn(),
      updateTask: vi.fn(),
    } as any;
  });

  it("should initialize plugin with WORLD_ID", async () => {
    mockRuntime.getSetting = vi.fn().mockReturnValue("test-world-id");

    await TodoPlugin.init({}, mockRuntime);

    // Verify task was created
    expect(mockRuntime.createTask).toHaveBeenCalledWith({
      name: "RESET_DAILY_TASKS",
      description: "Resets daily tasks at the start of each day",
      tags: ["system", "recurring-daily"],
      metadata: {
        updateInterval: 24 * 60 * 60 * 1000, // 24 hours
      },
    });

    // Verify task worker was registered
    expect(mockRuntime.registerTaskWorker).toHaveBeenCalledWith({
      name: "RESET_DAILY_TASKS",
      validate: expect.any(Function),
      execute: expect.any(Function),
    });
  });

  it("should skip initialization without WORLD_ID", async () => {
    mockRuntime.getSetting = vi.fn().mockReturnValue(null);

    await TodoPlugin.init({}, mockRuntime);

    // Verify no task was created
    expect(mockRuntime.createTask).not.toHaveBeenCalled();
    expect(mockRuntime.registerTaskWorker).not.toHaveBeenCalled();
  });

  describe("Daily Task Reset Worker", () => {
    beforeEach(async () => {
      mockRuntime.getSetting = vi.fn().mockReturnValue("test-world-id");
      await TodoPlugin.init({}, mockRuntime);
    });

    it("should validate task worker", async () => {
      expect(registeredTaskWorker).toBeDefined();
      const isValid = await registeredTaskWorker.validate();
      expect(isValid).toBe(true);
    });

    it("should reset completed daily tasks", async () => {
      const mockDailyTasks: Task[] = [
        {
          id: "task1" as any,
          name: "Daily Exercise",
          description: "Do pushups",
          tags: ["daily", "completed", "TODO"],
          metadata: {
            completedToday: true,
            streak: 5,
          },
        } as any,
        {
          id: "task2" as any,
          name: "Daily Reading",
          description: "Read for 30 minutes",
          tags: ["daily", "TODO"], // Not completed
          metadata: {
            completedToday: false,
            streak: 3,
          },
        } as any,
        {
          id: "task3" as any,
          name: "One-off Task",
          description: "This should not be reset",
          tags: ["one-off", "completed", "TODO"],
          metadata: {
            completedToday: true,
          },
        } as any,
      ];

      mockRuntime.getTasks = vi.fn().mockResolvedValue(mockDailyTasks);

      // Execute the task worker
      await registeredTaskWorker.execute(mockRuntime);

      // Verify getTasks was called correctly
      expect(mockRuntime.getTasks).toHaveBeenCalledWith({
        tags: ["daily", "completed", "TODO"],
      });

      // Verify only the completed daily task was reset
      expect(mockRuntime.updateTask).toHaveBeenCalled();

      // Check the first call arguments
      const firstCall = (mockRuntime.updateTask as any).mock.calls[0];
      expect(firstCall[0]).toBe("task1");
      expect(firstCall[1].tags).toEqual(["daily", "TODO"]);
      expect(firstCall[1].metadata.completedToday).toBe(false);
      expect(firstCall[1].metadata.streak).toBe(5);
    });

    it("should handle no daily tasks gracefully", async () => {
      mockRuntime.getTasks = vi.fn().mockResolvedValue([]);

      await registeredTaskWorker.execute(mockRuntime);

      expect(mockRuntime.getTasks).toHaveBeenCalled();
      expect(mockRuntime.updateTask).not.toHaveBeenCalled();
    });

    it("should handle errors in task reset", async () => {
      mockRuntime.getTasks = vi
        .fn()
        .mockRejectedValue(new Error("Database error"));

      // Should not throw, just log error
      await registeredTaskWorker.execute(mockRuntime);
      // If we get here without throwing, the test passes
      expect(true).toBe(true);
    });

    it("should handle tasks without metadata", async () => {
      const mockDailyTasks: Task[] = [
        {
          id: "task1" as any,
          name: "Daily Task",
          description: "No metadata",
          tags: ["daily", "completed", "TODO"],
          // No metadata
        } as any,
      ];

      mockRuntime.getTasks = vi.fn().mockResolvedValue(mockDailyTasks);

      await registeredTaskWorker.execute(mockRuntime);

      // Should not update tasks without metadata
      expect(mockRuntime.updateTask).not.toHaveBeenCalled();
    });

    it("should preserve other metadata when resetting", async () => {
      const mockDailyTasks: Task[] = [
        {
          id: "task1" as any,
          name: "Daily Task",
          description: "Task with extra metadata",
          tags: ["daily", "completed", "TODO"],
          metadata: {
            completedToday: true,
            streak: 10,
            customField: "should-be-preserved",
            notes: "User notes",
          },
        } as any,
      ];

      mockRuntime.getTasks = vi.fn().mockResolvedValue(mockDailyTasks);

      await registeredTaskWorker.execute(mockRuntime);

      expect(mockRuntime.updateTask).toHaveBeenCalledWith("task1", {
        tags: ["daily", "TODO"],
        metadata: {
          completedToday: false,
          streak: 10,
          customField: "should-be-preserved",
          notes: "User notes",
        },
      });
    });
  });
});
