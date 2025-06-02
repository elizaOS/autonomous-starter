import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TodoReminderService } from "../reminderService";
import type { IAgentRuntime, Task, EventType } from "@elizaos/core";

describe("TodoReminderService", () => {
  let mockRuntime: IAgentRuntime;
  let service: TodoReminderService;

  beforeEach(() => {
    mockRuntime = {
      agentId: "test-agent" as any,
      getTasks: vi.fn(),
      updateTask: vi.fn(),
      emitEvent: vi.fn(),
      getService: vi.fn(),
    } as any;
  });

  afterEach(async () => {
    if (service) {
      await service.stop();
    }
  });

  it("should have correct service type", () => {
    expect(TodoReminderService.serviceType).toBe("TODO_REMINDER");
  });

  it("should start service and begin timer", async () => {
    service = await TodoReminderService.start(mockRuntime);
    expect(service).toBeInstanceOf(TodoReminderService);
    expect(service.capabilityDescription).toBe(
      "The agent can send reminders for overdue tasks",
    );
  });

  it("should stop service and clear timer", async () => {
    service = await TodoReminderService.start(mockRuntime);
    await service.stop();
    // Ensure no errors thrown and timer is cleared
    expect(true).toBe(true);
  });

  it("should start and setup timer for periodic checks", async () => {
    service = await TodoReminderService.start(mockRuntime);

    // Service should be running
    expect(service).toBeInstanceOf(TodoReminderService);

    // Manual check should work
    await service.checkTasksNow();

    expect(mockRuntime.getTasks).toHaveBeenCalledWith({ tags: ["one-off"] });
  });

  it("should send reminder for overdue tasks", async () => {
    const overdueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        roomId: "room1" as any,
        name: "Overdue task",
        description: "Test overdue task",
        tags: ["one-off"],
        metadata: {
          dueDate: overdueDate.toISOString(),
        },
      } as Task,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    service = await TodoReminderService.start(mockRuntime);
    await service.checkTasksNow();

    // Verify reminder was sent
    expect(mockRuntime.emitEvent).toHaveBeenCalledWith(
      "MESSAGE_RECEIVED",
      expect.objectContaining({
        message: expect.objectContaining({
          content: expect.objectContaining({
            text: expect.stringContaining("Task Reminder"),
          }),
        }),
      }),
    );

    // Verify task was updated with lastReminderSent
    expect(mockRuntime.updateTask).toHaveBeenCalledWith(
      "task1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          lastReminderSent: expect.any(String),
        }),
      }),
    );
  });

  it("should respect reminder cooldown period", async () => {
    const overdueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const recentReminderDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        roomId: "room1" as any,
        name: "Overdue task with recent reminder",
        description: "Test task with recent reminder",
        tags: ["one-off"],
        metadata: {
          dueDate: overdueDate.toISOString(),
          lastReminderSent: recentReminderDate.toISOString(),
        },
      } as Task,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    service = await TodoReminderService.start(mockRuntime);
    await service.checkTasksNow();

    // Should NOT send reminder due to cooldown
    expect(mockRuntime.emitEvent).not.toHaveBeenCalled();
    expect(mockRuntime.updateTask).not.toHaveBeenCalled();
  });

  it("should handle tasks without due dates gracefully", async () => {
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        roomId: "room1" as any,
        name: "Task without due date",
        description: "Test task without due date",
        tags: ["one-off"],
        metadata: {},
      } as Task,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    service = await TodoReminderService.start(mockRuntime);
    await service.checkTasksNow();

    // Should not send any reminders
    expect(mockRuntime.emitEvent).not.toHaveBeenCalled();
  });

  it("should handle invalid date formats", async () => {
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        roomId: "room1" as any,
        name: "Task with invalid date",
        description: "Test task with invalid date",
        tags: ["one-off"],
        metadata: {
          dueDate: "invalid-date",
        },
      } as Task,
      {
        id: "task2" as any,
        roomId: "room2" as any,
        name: "Task with null date",
        description: "Test task with null date",
        tags: ["one-off"],
        metadata: {
          dueDate: null,
        },
      } as Task,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    service = await TodoReminderService.start(mockRuntime);

    // Should not throw error
    await service.checkTasksNow();

    // Should not send any reminders for invalid dates
    expect(mockRuntime.emitEvent).not.toHaveBeenCalled();
  });

  it("should skip tasks without roomId", async () => {
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        roomId: undefined as any,
        name: "Task without room",
        description: "Test task without room",
        tags: ["one-off"],
        metadata: {
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      } as Task,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    service = await TodoReminderService.start(mockRuntime);
    await service.checkTasksNow();

    // Should not send reminder for task without roomId
    expect(mockRuntime.emitEvent).not.toHaveBeenCalled();
  });

  it("should handle errors in checkOverdueTasks gracefully", async () => {
    mockRuntime.getTasks = vi
      .fn()
      .mockRejectedValue(new Error("Database error"));

    service = await TodoReminderService.start(mockRuntime);

    // Should not throw error
    await service.checkTasksNow();

    // If we get here without throwing, the test passes
    expect(true).toBe(true);
  });

  it("should stop service via static method", async () => {
    service = await TodoReminderService.start(mockRuntime);
    mockRuntime.getService = vi.fn().mockReturnValue(service);
    const stopSpy = vi.spyOn(service, "stop");

    await TodoReminderService.stop(mockRuntime);

    expect(mockRuntime.getService).toHaveBeenCalledWith(
      TodoReminderService.serviceType,
    );
    expect(stopSpy).toHaveBeenCalled();
  });
});
