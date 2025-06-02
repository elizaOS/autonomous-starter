import {
  type IAgentRuntime,
  type Task,
  type UUID,
  logger,
} from "@elizaos/core";
import { dbCompat } from "./dbCompatibility";

/**
 * Task service that provides database-compatible task operations
 */
export class TaskService {
  constructor(private runtime: IAgentRuntime) {}

  /**
   * Get tasks with database-compatible filtering
   */
  async getTasks(params?: {
    entityId?: UUID;
    roomId?: UUID;
    tags?: string[];
    completed?: boolean;
  }): Promise<Task[]> {
    try {
      // Get raw tasks from runtime
      const tasks = await this.runtime.getTasks(params);

      // Process tasks for database compatibility
      return tasks.map(task => this.normalizeTask(task));
    } catch (error) {
      logger.error("[TaskService] Error getting tasks:", error);
      return [];
    }
  }

  /**
   * Create a task with database-compatible data
   */
  async createTask(params: {
    name: string;
    description?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    roomId?: UUID;
    worldId?: UUID;
    entityId?: UUID;
  }): Promise<UUID | null> {
    try {
      // Pass params directly to runtime - it handles database-specific formatting internally
      const taskId = await this.runtime.createTask(params as any);
      return taskId;
    } catch (error) {
      logger.error("[TaskService] Error creating task:", error);
      return null;
    }
  }

  /**
   * Update a task with database-compatible data
   */
  async updateTask(
    taskId: UUID,
    updates: {
      tags?: string[];
      metadata?: Record<string, any>;
      completed?: boolean;
    }
  ): Promise<boolean> {
    try {
      // Pass updates directly to runtime - it handles database-specific formatting internally
      await this.runtime.updateTask(taskId, updates);
      return true;
    } catch (error) {
      logger.error("[TaskService] Error updating task:", error);
      return false;
    }
  }

  /**
   * Normalize a task from the database
   */
  private normalizeTask(task: Task): Task {
    // Ensure tags is always an array
    if (task.tags) {
      task.tags = dbCompat.parseArray(task.tags as any);
    }

    // Ensure metadata is always an object
    if (task.metadata) {
      task.metadata = dbCompat.parseJson(task.metadata as any) || {};
    }

    // Normalize boolean fields in metadata
    if (task.metadata) {
      if (task.metadata.completedToday !== undefined) {
        task.metadata.completedToday = dbCompat.parseBoolean(task.metadata.completedToday);
      }
      if (task.metadata.urgent !== undefined) {
        task.metadata.urgent = dbCompat.parseBoolean(task.metadata.urgent);
      }
    }

    // Normalize dates in metadata
    if (task.metadata) {
      if (task.metadata.dueDate) {
        const parsedDate = dbCompat.parseDate(task.metadata.dueDate);
        task.metadata.dueDate = parsedDate ? parsedDate.toISOString() : undefined;
      }
      if (task.metadata.completedAt) {
        const parsedDate = dbCompat.parseDate(task.metadata.completedAt);
        task.metadata.completedAt = parsedDate ? parsedDate.toISOString() : undefined;
      }
      if (task.metadata.lastCompletedAt) {
        const parsedDate = dbCompat.parseDate(task.metadata.lastCompletedAt);
        task.metadata.lastCompletedAt = parsedDate ? parsedDate.getTime() : undefined;
      }
      if (task.metadata.lastReminderSent) {
        const parsedDate = dbCompat.parseDate(task.metadata.lastReminderSent);
        task.metadata.lastReminderSent = parsedDate ? parsedDate.toISOString() : undefined;
      }
    }

    return task;
  }

  /**
   * Search tasks by name (case-insensitive)
   */
  async searchTasksByName(name: string, params?: {
    entityId?: UUID;
    roomId?: UUID;
    completed?: boolean;
  }): Promise<Task[]> {
    const allTasks = await this.getTasks(params);
    
    // Case-insensitive search
    const searchLower = name.toLowerCase();
    return allTasks.filter(task => 
      task.name.toLowerCase().includes(searchLower)
    );
  }
}

/**
 * Create a task service instance for the runtime
 */
export function createTaskService(runtime: IAgentRuntime): TaskService {
  return new TaskService(runtime);
} 