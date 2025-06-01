import {
  createMessageMemory,
  EventType,
  logger,
  Service,
  type IAgentRuntime,
  type MessagePayload,
  type ServiceTypeName,
  type Task,
} from '@elizaos/core';

/**
 * The Todo Reminder Service checks for overdue tasks and sends reminders to users.
 */
export class TodoReminderService extends Service {
  private timer: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour (in milliseconds)
  private readonly REMINDER_COOLDOWN = 24 * 60 * 60 * 1000; // Remind once per day (in milliseconds)

  static serviceType: ServiceTypeName = 'TODO_REMINDER' as ServiceTypeName;
  capabilityDescription = 'The agent can send reminders for overdue tasks';

  /**
   * Start the TodoReminderService with the given runtime.
   * @param {IAgentRuntime} runtime - The runtime for the TodoReminderService.
   * @returns {Promise<TodoReminderService>} A promise that resolves with the TodoReminderService instance.
   */
  static async start(runtime: IAgentRuntime): Promise<TodoReminderService> {
    const service = new TodoReminderService(runtime);
    await service.startTimer();
    return service;
  }

  /**
   * Starts a timer that periodically checks for overdue tasks
   */
  private startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(async () => {
      try {
        await this.checkOverdueTasks();
      } catch (error) {
        logger.error('Error checking overdue tasks:', error);
      }
    }, this.CHECK_INTERVAL) as unknown as NodeJS.Timeout;

    logger.info('TodoReminderService timer started with interval: ' + this.CHECK_INTERVAL + 'ms');
  }

  /**
   * Checks for overdue tasks and sends reminders
   */
  private async checkOverdueTasks() {
    try {
      logger.debug('Checking for overdue tasks...');

      // Get all tasks with "one-off" tag (not recurring) that have due dates
      const tasks = await this.runtime.getTasks({
        tags: ['one-off'],
      });

      if (!tasks || tasks.length === 0) {
        logger.debug('No one-off tasks found to check.');
        return;
      }

      const now = Date.now();
      let overdueCount = 0;
      let remindersSent = 0;

      for (const task of tasks) {
        // Skip tasks without due date metadata or with invalid type
        if (
          !task.metadata?.dueDate ||
          !['string', 'number'].includes(typeof task.metadata.dueDate)
        ) {
          if (task.metadata?.dueDate) {
            // Log if dueDate exists but is wrong type
            logger.warn(
              `Task ${task.id} has invalid dueDate type: ${typeof task.metadata.dueDate}`
            );
          }
          continue;
        }

        let dueDate: Date;
        try {
          // Ensure valid date input
          dueDate = new Date(task.metadata.dueDate as string | number);
          if (isNaN(dueDate.getTime())) {
            logger.warn(
              `Task ${task.id} has invalid date value in dueDate: ${task.metadata.dueDate}`
            );
            continue; // Skip if date parsing failed
          }
        } catch (e) {
          logger.warn(`Task ${task.id} failed to parse dueDate: ${task.metadata.dueDate}`, e);
          continue;
        }

        // Check if task is overdue
        if (dueDate.getTime() < now) {
          overdueCount++;
          // Check when the last reminder was sent (to avoid spamming)
          let lastReminderSentTime = 0;
          if (
            task.metadata?.lastReminderSent &&
            ['string', 'number'].includes(typeof task.metadata.lastReminderSent)
          ) {
            try {
              const lastReminderDate = new Date(task.metadata.lastReminderSent as string | number);
              if (!isNaN(lastReminderDate.getTime())) {
                lastReminderSentTime = lastReminderDate.getTime();
              } else {
                logger.warn(
                  `Task ${task.id} has invalid date value in lastReminderSent: ${task.metadata.lastReminderSent}`
                );
              }
            } catch (e) {
              logger.warn(
                `Task ${task.id} failed to parse lastReminderSent: ${task.metadata.lastReminderSent}`,
                e
              );
            }
          }

          // Send reminder if we haven't sent one recently
          if (now - lastReminderSentTime > this.REMINDER_COOLDOWN) {
            await this.sendReminder(task);
            remindersSent++;

            // Update metadata to record when we sent this reminder
            await this.runtime.updateTask(task.id, {
              metadata: {
                ...task.metadata,
                lastReminderSent: new Date().toISOString(),
              },
            });
          }
        }
      }

      logger.info(
        `Overdue task check completed. Found ${overdueCount} overdue tasks, sent ${remindersSent} reminders.`
      );
    } catch (error) {
      logger.error('Error in checkOverdueTasks:', error);
    }
  }

  /**
   * Sends a reminder message for an overdue task
   */
  private async sendReminder(task: Task) {
    try {
      if (!task.roomId) {
        logger.error(`Cannot send reminder for task ${task.id} - no roomId specified`);
        return;
      }

      let dueDateString: string;
      try {
        // Safely get the dueDate string, ensuring it's valid
        if (
          !task.metadata?.dueDate ||
          !['string', 'number'].includes(typeof task.metadata.dueDate)
        ) {
          logger.error(`Cannot create reminder for task ${task.id} - invalid or missing dueDate.`);
          return;
        }
        const dueDateObj = new Date(task.metadata.dueDate as string | number);
        if (isNaN(dueDateObj.getTime())) {
          logger.error(
            `Cannot create reminder for task ${task.id} - invalid date value in dueDate.`
          );
          return;
        }
        dueDateString = dueDateObj.toLocaleDateString();
      } catch (e) {
        logger.error(`Cannot create reminder for task ${task.id} - failed to parse dueDate.`, e);
        return;
      }

      const reminderText = `📅 **Task Reminder**: "${task.name}" was due on ${dueDateString}. This task is now overdue!`;

      // Create the Memory object for the reminder message
      const reminderMemory = createMessageMemory({
        // No need for ID, createMemory inside runtime handles it if persisted
        entityId: this.runtime.agentId, // The agent is sending the reminder
        agentId: this.runtime.agentId,
        roomId: task.roomId,
        content: {
          text: reminderText,
          source: TodoReminderService.serviceType, // Identify the source service
        },
        // createdAt will be handled by the event/memory system
      });

      // Construct the payload for the event
      const payload: MessagePayload = {
        runtime: this.runtime,
        message: reminderMemory,
        source: TodoReminderService.serviceType, // Source of the event
        // callback and onComplete are likely not needed for system-generated events
      };

      // Emit a MESSAGE_RECEIVED event to inject the reminder into the room's flow
      await this.runtime.emitEvent(EventType.MESSAGE_RECEIVED, payload);
      logger.debug(
        `Emitted reminder event for task: ${task.name} (${task.id}) to room ${task.roomId}`
      );
    } catch (error) {
      logger.error(`Failed to send reminder for task ${task.id}:`, error);
    }
  }

  /**
   * Immediately check for overdue tasks (can be triggered programmatically)
   */
  async checkTasksNow() {
    logger.debug('Manually triggered overdue task check');
    await this.checkOverdueTasks();
  }

  /**
   * Stops the timer if it is currently running.
   */
  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('TodoReminderService timer stopped');
    }
  }

  /**
   * Stops the reminder service in the given agent runtime.
   * @param {IAgentRuntime} runtime - The agent runtime containing the service.
   */
  static async stop(runtime: IAgentRuntime) {
    const service = runtime.getService(TodoReminderService.serviceType);
    if (service) {
      await service.stop();
    }
  }
}
