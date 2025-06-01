import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTodoAction } from "../actions/createTodo";
import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { ModelType, ChannelType } from "@elizaos/core";

describe("createTodoAction", () => {
  let mockRuntime: IAgentRuntime;
  let mockCallback: HandlerCallback;
  let mockState: State;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRuntime = {
      agentId: "test-agent" as any,
      getTasks: vi.fn().mockResolvedValue([]),
      createTask: vi.fn().mockResolvedValue("new-task-id"),
      getRoom: vi.fn().mockResolvedValue({ worldId: "test-world" }),
      ensureConnection: vi.fn(),
      composeState: vi.fn().mockImplementation(async () => mockState),
      useModel: vi.fn(),
    } as any;

    mockCallback = vi.fn();

    mockState = {
      data: {
        tasks: [],
        room: { worldId: "test-world" },
        messages: [],
        entities: [],
      },
    } as any;
  });

  it("should have correct action properties", () => {
    expect(createTodoAction.name).toBe("CREATE_TODO");
    expect(createTodoAction.similes).toContain("ADD_TODO");
    expect(createTodoAction.similes).toContain("NEW_TASK");
    expect(createTodoAction.description).toContain("Creates a new todo item");
    expect(createTodoAction.validate).toBeInstanceOf(Function);
    expect(createTodoAction.handler).toBeInstanceOf(Function);
    expect(createTodoAction.examples).toHaveLength(3);
  });

  it("should validate always return true", async () => {
    const message: Memory = {
      content: { text: "Add todo" },
    } as any;

    const result = await createTodoAction.validate(mockRuntime, message);
    expect(result).toBe(true);
  });

  it("should create a daily todo successfully", async () => {
    const message: Memory = {
      content: { text: "Add daily task to do 50 pushups", source: "test" },
      roomId: "room1" as any,
      entityId: "entity1" as any,
    } as any;

    mockRuntime.useModel = vi.fn().mockResolvedValue(`
      <response>
        <name>Do 50 pushups</name>
        <description>Daily exercise routine</description>
        <taskType>daily</taskType>
        <recurring>daily</recurring>
      </response>
    `);

    await createTodoAction.handler(
      mockRuntime,
      message,
      mockState,
      {},
      mockCallback,
    );

    // Verify task was created with correct parameters
    expect(mockRuntime.createTask).toHaveBeenCalledWith({
      name: "Do 50 pushups",
      description: "Daily exercise routine",
      tags: ["TODO", "daily", "recurring-daily"],
      metadata: expect.objectContaining({
        createdAt: expect.any(String),
        description: "Daily exercise routine",
        streak: 0,
      }),
      roomId: "room1",
      worldId: "test-world",
      entityId: "entity1",
    });

    // Verify success callback
    expect(mockCallback).toHaveBeenCalledWith({
      text: expect.stringContaining('Added new daily task: "Do 50 pushups"'),
      actions: ["CREATE_TODO_SUCCESS"],
      source: "test",
    });
  });

  it("should create a one-off todo with due date", async () => {
    const message: Memory = {
      content: { text: "Add todo to finish taxes by April 15", source: "test" },
      roomId: "room1" as any,
      entityId: "entity1" as any,
    } as any;

    mockRuntime.useModel = vi.fn().mockResolvedValue(`
      <response>
        <name>Finish taxes</name>
        <description>Complete tax filing</description>
        <taskType>one-off</taskType>
        <priority>2</priority>
        <urgent>false</urgent>
        <dueDate>2024-04-15</dueDate>
      </response>
    `);

    await createTodoAction.handler(
      mockRuntime,
      message,
      mockState,
      {},
      mockCallback,
    );

    // Verify task was created with correct parameters
    expect(mockRuntime.createTask).toHaveBeenCalledWith({
      name: "Finish taxes",
      description: "Complete tax filing",
      tags: ["TODO", "one-off", "priority-2"],
      metadata: expect.objectContaining({
        createdAt: expect.any(String),
        description: "Complete tax filing",
        dueDate: "2024-04-15",
      }),
      roomId: "room1",
      worldId: "test-world",
      entityId: "entity1",
    });

    // Verify success callback
    expect(mockCallback).toHaveBeenCalledWith({
      text: expect.stringMatching(
        /Added new one-off task.*Finish taxes.*Priority 2.*Due:/,
      ),
      actions: ["CREATE_TODO_SUCCESS"],
      source: "test",
    });
  });

  it("should create an aspirational todo", async () => {
    const message: Memory = {
      content: { text: "Add goal to read more books", source: "test" },
      roomId: "room1" as any,
      entityId: "entity1" as any,
    } as any;

    mockRuntime.useModel = vi.fn().mockResolvedValue(`
      <response>
        <name>Read more books</name>
        <taskType>aspirational</taskType>
      </response>
    `);

    await createTodoAction.handler(
      mockRuntime,
      message,
      mockState,
      {},
      mockCallback,
    );

    // Verify task was created with correct parameters
    expect(mockRuntime.createTask).toHaveBeenCalledWith({
      name: "Read more books",
      description: "Read more books",
      tags: ["TODO", "aspirational"],
      metadata: expect.objectContaining({
        createdAt: expect.any(String),
      }),
      roomId: "room1",
      worldId: "test-world",
      entityId: "entity1",
    });

    // Verify success callback
    expect(mockCallback).toHaveBeenCalledWith({
      text: expect.stringMatching(
        /Added new aspirational goal.*Read more books/,
      ),
      actions: ["CREATE_TODO_SUCCESS"],
      source: "test",
    });
  });

  it("should detect and reject duplicate todos", async () => {
    const message: Memory = {
      content: { text: "Add task to clean house", source: "test" },
      roomId: "room1" as any,
      entityId: "entity1" as any,
    } as any;

    mockState.data.tasks = [
      {
        id: "existing-task",
        name: "Clean house",
        description: "Clean the entire house",
        tags: ["TODO", "one-off"],
      },
    ];

    mockRuntime.useModel = vi.fn().mockResolvedValue(`
      <response>
        <name>Clean house</name>
        <taskType>one-off</taskType>
      </response>
    `);

    await createTodoAction.handler(
      mockRuntime,
      message,
      mockState,
      {},
      mockCallback,
    );

    // Verify task was NOT created
    expect(mockRuntime.createTask).not.toHaveBeenCalled();

    // Verify duplicate warning callback
    expect(mockCallback).toHaveBeenCalledWith({
      text: expect.stringContaining(
        'already have an active task named "Clean house"',
      ),
      actions: ["CREATE_TODO_DUPLICATE"],
      source: "test",
    });
  });

  it("should handle extraction failure gracefully", async () => {
    const message: Memory = {
      content: { text: "Invalid todo request", source: "test" },
      roomId: "room1" as any,
      entityId: "entity1" as any,
    } as any;

    mockRuntime.useModel = vi.fn().mockResolvedValue("invalid XML response");

    await createTodoAction.handler(
      mockRuntime,
      message,
      mockState,
      {},
      mockCallback,
    );

    // Verify error callback
    expect(mockCallback).toHaveBeenCalledWith({
      text: expect.stringContaining("couldn't understand the details"),
      actions: ["CREATE_TODO_FAILED"],
      source: "test",
    });
  });

  it("should handle confirmation messages without creating todo", async () => {
    const message: Memory = {
      content: { text: "yes", source: "test" },
      roomId: "room1" as any,
      entityId: "entity1" as any,
    } as any;

    mockRuntime.useModel = vi.fn().mockResolvedValue(`
      <response>
        <is_confirmation>true</is_confirmation>
      </response>
    `);

    await createTodoAction.handler(
      mockRuntime,
      message,
      mockState,
      {},
      mockCallback,
    );

    // Verify no task was created
    expect(mockRuntime.createTask).not.toHaveBeenCalled();

    // Verify error callback for not understanding
    expect(mockCallback).toHaveBeenCalledWith({
      text: expect.stringContaining("couldn't understand the details"),
      actions: ["CREATE_TODO_FAILED"],
      source: "test",
    });
  });

  it("should handle createTask failure", async () => {
    const message: Memory = {
      content: { text: "Add task to test failure", source: "test" },
      roomId: "room1" as any,
      entityId: "entity1" as any,
    } as any;

    mockRuntime.useModel = vi.fn().mockResolvedValue(`
      <response>
        <name>Test failure</name>
        <taskType>one-off</taskType>
      </response>
    `);

    mockRuntime.createTask = vi.fn().mockResolvedValue(null);

    await createTodoAction.handler(
      mockRuntime,
      message,
      mockState,
      {},
      mockCallback,
    );

    // Verify error callback
    expect(mockCallback).toHaveBeenCalledWith({
      text: expect.stringContaining("encountered an error"),
      actions: ["CREATE_TODO_FAILED"],
      source: "test",
    });
  });

  it("should handle urgent one-off tasks", async () => {
    const message: Memory = {
      content: { text: "Add urgent task", source: "test" },
      roomId: "room1" as any,
      entityId: "entity1" as any,
    } as any;

    mockRuntime.useModel = vi.fn().mockResolvedValue(`
      <response>
        <name>Urgent task</name>
        <taskType>one-off</taskType>
        <priority>1</priority>
        <urgent>true</urgent>
      </response>
    `);

    await createTodoAction.handler(
      mockRuntime,
      message,
      mockState,
      {},
      mockCallback,
    );

    // Verify urgent tag was added
    expect(mockRuntime.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.arrayContaining([
          "TODO",
          "one-off",
          "priority-1",
          "urgent",
        ]),
      }),
    );
  });

  it("should use default priority when not specified", async () => {
    const message: Memory = {
      content: { text: "Add task without priority", source: "test" },
      roomId: "room1" as any,
      entityId: "entity1" as any,
    } as any;

    mockRuntime.useModel = vi.fn().mockResolvedValue(`
      <response>
        <name>Task without priority</name>
        <taskType>one-off</taskType>
      </response>
    `);

    await createTodoAction.handler(
      mockRuntime,
      message,
      mockState,
      {},
      mockCallback,
    );

    // Verify default priority 3 was used
    expect(mockRuntime.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.arrayContaining(["TODO", "one-off", "priority-3"]),
      }),
    );
  });
});
