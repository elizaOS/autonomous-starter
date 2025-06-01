import type { Plugin } from '@elizaos/core';
import { type IAgentRuntime, logger, Service, type ServiceTypeName } from '@elizaos/core';

import { routes } from './apis';

// Import actions
import { cancelTodoAction } from './actions/cancelTodo';
import { completeTodoAction } from './actions/completeTodo';
import { createTodoAction } from './actions/createTodo';
import { updateTodoAction } from './actions/updateTodo';

// Import providers
import { todosProvider } from './providers/todos';

// Import services
import { TodoReminderService } from './reminderService';

/**
 * The TodoService class manages the todo functionality for the agent.
 */
export class TodoService extends Service {
  static serviceType = 'TODO' as ServiceTypeName;
  capabilityDescription = 'The agent can manage to-do lists with daily recurring and one-off tasks';

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  /**
   * Starts the TodoService with the given runtime.
   * @param {IAgentRuntime} runtime - The runtime for the TodoService.
   * @returns {Promise<TodoService>} A promise that resolves with the TodoService instance.
   */
  static async start(runtime: IAgentRuntime): Promise<TodoService> {
    const service = new TodoService(runtime);
    await service.init({});
    return service;
  }

  /**
   * Stops the TodoService in the given agent runtime.
   * @param {IAgentRuntime} runtime - The agent runtime containing the service.
   * @returns {Promise<void>} A promise that resolves once the service has been stopped.
   */
  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService(TodoService.serviceType);
    if (service) {
      await service.stop();
    }
  }

  /**
   * Stops the TodoService.
   * @returns {Promise<void>} A promise that resolves once the service has been stopped.
   */
  async stop(): Promise<void> {
    // No specific cleanup needed for this service
    logger.info('TodoService stopped');
  }

  /**
   * Initializes the TodoService with the given configuration.
   * @param {Record<string, string>} config - The configuration for the TodoService.
   * @returns {Promise<void>} A promise that resolves once the service has been initialized.
   */
  async init(config: Record<string, string>): Promise<void> {
    logger.info('TodoService initialized');
  }
}

/**
 * The TodoPlugin provides task management functionality with daily recurring and one-off tasks,
 * including creating, completing, updating, and deleting tasks, as well as a point system for
 * task completion.
 */
export const TodoPlugin: Plugin = {
  name: 'todo',
  description: 'Provides task management functionality with daily recurring and one-off tasks.',
  providers: [todosProvider],
  actions: [createTodoAction, completeTodoAction, updateTodoAction, cancelTodoAction],
  services: [TodoService, TodoReminderService],
  routes,
  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    logger.info('TodoPlugin initialized');

    // Setup daily task reset for recurring tasks
    // This creates a task that will run at the start of each day to reset daily tasks

    // TOOD: Look and see if we already have this task. If we do, we don't need to create it again.
    const resetTaskId = await runtime.createTask({
      name: 'RESET_DAILY_TASKS',
      description: 'Resets daily tasks at the start of each day',
      tags: ['system', 'recurring-daily'],
      metadata: {
        updateInterval: 24 * 60 * 60 * 1000, // 24 hours
      },
    });

    // Register the task worker to handle daily task reset

    // Do we have to run this every single time?
    runtime.registerTaskWorker({
      name: 'RESET_DAILY_TASKS',
      validate: async () => true,
      execute: async (runtime) => {
        logger.info('Executing daily task reset');
        try {
          // Get all daily tasks across all rooms
          const dailyTasks = await runtime.getTasks({
            tags: ['daily', 'completed', 'TODO'],
          });

          // Reset each completed daily task
          for (const task of dailyTasks) {
            if (task.tags?.includes('completed') && task.metadata?.completedToday) {
              // Remove the completed tag so the task is active again
              const updatedTags = task.tags.filter((tag) => tag !== 'completed');

              await runtime.updateTask(task.id, {
                tags: updatedTags,
                metadata: {
                  ...task.metadata,
                  completedToday: false,
                },
              });

              logger.debug(`Reset daily task: ${task.name}`);
            }
          }

          logger.info('Daily task reset completed');
        } catch (error) {
          logger.error('Error resetting daily tasks:', error);
        }
      },
    });

    logger.info('Daily task reset scheduled');
  },
};

export default TodoPlugin;
