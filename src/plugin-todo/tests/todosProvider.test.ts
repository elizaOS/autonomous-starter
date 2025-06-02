import { describe, it, expect, vi, beforeEach } from "vitest";
import { todosProvider } from "../providers/todos";
import type { IAgentRuntime, Memory, State, Task } from "@elizaos/core";

describe("todosProvider", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRuntime = {
      agentId: "test-agent" as any,
      getTasks: vi.fn(),
      getRoom: vi.fn().mockResolvedValue({ worldId: "test-world" }),
      getComponent: vi.fn().mockResolvedValue(null), // For points service
      createComponent: vi.fn(), // For points service
    } as any;

    mockMessage = {
      entityId: "test-entity" as any,
      roomId: "test-room" as any,
      content: { text: "test message" },
    } as any;

    mockState = {} as any;
  });

  it("should have correct provider properties", () => {
    expect(todosProvider.name).toBe("TODOS");
    expect(todosProvider.description).toBe(
      "Information about the user's current tasks, completed tasks, and points",
    );
    expect(todosProvider.get).toBeInstanceOf(Function);
  });

  it("should return formatted todos when tasks exist", async () => {
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        name: "Daily Exercise",
        description: "Do 50 pushups",
        tags: ["TODO", "daily"],
        metadata: {
          createdAt: "2024-01-01",
          streak: 5,
          lastCompletedAt: Date.now() - 24 * 60 * 60 * 1000,
        },
      } as any,
      {
        id: "task2" as any,
        name: "Finish Report",
        description: "Complete quarterly report",
        tags: ["TODO", "one-off", "priority-2"],
        metadata: {
          createdAt: "2024-01-02",
          dueDate: "2024-01-15",
        },
      } as any,
      {
        id: "task3" as any,
        name: "Read More Books",
        description: "Aspirational goal",
        tags: ["TODO", "aspirational"],
        metadata: {
          createdAt: "2024-01-03",
        },
      } as any,
      {
        id: "task4" as any,
        name: "Completed Task",
        description: "Already done",
        tags: ["TODO", "one-off", "completed"],
        metadata: {
          createdAt: "2024-01-04",
          completedAt: "2024-01-05",
        },
      } as any,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    const result = await todosProvider.get(mockRuntime, mockMessage, mockState);

    expect(mockRuntime.getTasks).toHaveBeenCalled();

    expect(result.text).toContain("User's Todos");
    expect(result.text).toContain("Points: 0");

    // Check daily tasks
    expect(result.text).toContain("Daily Todos");
    expect(result.text).toContain("Daily Exercise");
    expect(result.text).toContain("daily, streak: 5 days");

    // Check one-off tasks
    expect(result.text).toContain("One-off Todos");
    expect(result.text).toContain("Finish Report");
    expect(result.text).toContain("P2");
    expect(result.text).toContain("due");

    // Check aspirational tasks
    expect(result.text).toContain("Aspirational Todos");
    expect(result.text).toContain("Read More Books");

    // Check data object
    expect(result.data).toHaveProperty("userPoints", 0);
    expect(result.data).toHaveProperty("dailyTasks");
    expect(result.data).toHaveProperty("oneOffTasks");
    expect(result.data).toHaveProperty("aspirationalTasks");
    expect(result.data).toHaveProperty("completedTasks");
    expect(result.data.dailyTasks).toHaveLength(1);
    expect(result.data.oneOffTasks).toHaveLength(1);
    expect(result.data.aspirationalTasks).toHaveLength(1);
  });

  it("should return no tasks message when no tasks exist", async () => {
    mockRuntime.getTasks = vi.fn().mockResolvedValue([]);

    const result = await todosProvider.get(mockRuntime, mockMessage, mockState);

    expect(result.text).toContain("No daily todos");
    expect(result.text).toContain("No one-off todos");
    expect(result.text).toContain("No aspirational todos");
    expect(result.data).toEqual({
      userPoints: 0,
      dailyTasks: [],
      oneOffTasks: [],
      aspirationalTasks: [],
      completedTasks: [],
    });
  });

  it("should handle overdue tasks", async () => {
    const overdueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        name: "Overdue Task",
        description: "This is overdue",
        tags: ["TODO", "one-off"],
        metadata: {
          dueDate: overdueDate.toISOString(),
        },
      } as any,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    const result = await todosProvider.get(mockRuntime, mockMessage, mockState);

    expect(result.text).toContain("Overdue Task");
    expect(result.text).toContain("due");
  });

  it("should handle tasks without metadata gracefully", async () => {
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        name: "Task without metadata",
        description: "No metadata",
        tags: ["TODO", "one-off"],
      } as any,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    const result = await todosProvider.get(mockRuntime, mockMessage, mockState);

    expect(result.text).toContain("Task without metadata");
    expect(result.text).not.toContain("undefined");
  });

  it("should sort tasks by type correctly", async () => {
    const mockTasks: Task[] = [
      {
        id: "task3" as any,
        name: "Aspirational",
        description: "Goal",
        tags: ["TODO", "aspirational"],
      } as any,
      {
        id: "task1" as any,
        name: "Daily",
        description: "Daily task",
        tags: ["TODO", "daily"],
      } as any,
      {
        id: "task2" as any,
        name: "One-off",
        description: "One-off task",
        tags: ["TODO", "one-off"],
      } as any,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    const result = await todosProvider.get(mockRuntime, mockMessage, mockState);

    // Check that sections appear in correct order
    const dailyIndex = result.text.indexOf("Daily Todos");
    const oneOffIndex = result.text.indexOf("One-off Todos");
    const aspirationalIndex = result.text.indexOf("Aspirational Todos");

    expect(dailyIndex).toBeGreaterThan(-1);
    expect(oneOffIndex).toBeGreaterThan(-1);
    expect(aspirationalIndex).toBeGreaterThan(-1);
    expect(dailyIndex).toBeLessThan(oneOffIndex);
    expect(oneOffIndex).toBeLessThan(aspirationalIndex);
  });

  it("should handle daily tasks completed today", async () => {
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        name: "Daily Task",
        description: "Completed today",
        tags: ["TODO", "daily", "completed"],
        metadata: {
          streak: 10,
          lastCompletedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
          completedToday: true,
        },
      } as any,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    const result = await todosProvider.get(mockRuntime, mockMessage, mockState);

    // The completed task should be filtered out of active tasks
    expect(result.text).toContain("No daily todos");
    expect(result.text).toContain("Recently Completed");
  });

  it("should format priority levels correctly", async () => {
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        name: "High Priority",
        description: "Priority 1",
        tags: ["TODO", "one-off", "priority-1"],
      } as any,
      {
        id: "task2" as any,
        name: "Medium Priority",
        description: "Priority 3",
        tags: ["TODO", "one-off", "priority-3"],
      } as any,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    const result = await todosProvider.get(mockRuntime, mockMessage, mockState);

    expect(result.text).toContain("P1");
    expect(result.text).toContain("P3");
  });

  it("should handle urgent tasks", async () => {
    const mockTasks: Task[] = [
      {
        id: "task1" as any,
        name: "Urgent Task",
        description: "This is urgent",
        tags: ["TODO", "one-off", "urgent"],
      } as any,
    ];

    mockRuntime.getTasks = vi.fn().mockResolvedValue(mockTasks);

    const result = await todosProvider.get(mockRuntime, mockMessage, mockState);

    expect(result.text).toContain("URGENT");
  });
});
