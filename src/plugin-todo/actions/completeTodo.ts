import {
  type Action,
  type ActionExample,
  composePrompt,
  createUniqueUuid,
  type HandlerCallback,
  type IAgentRuntime,
  logger,
  type Memory,
  ModelType,
  parseJSONObjectFromText,
  parseKeyValueXml,
  type State,
  type Task,
  type UUID,
  formatMessages,
} from '@elizaos/core';
import { addPoints, calculatePoints } from '../pointsService';

// Interface for task completion properties
interface TaskCompletion {
  taskId: string;
  taskName: string;
  isFound: boolean;
}

/**
 * Template for extracting task completion information from user message
 */
const extractCompletionTemplate = `
# Task: Extract Task Completion Information

## User Message
{{text}}

## Message History
{{messageHistory}}

## Available Tasks
{{availableTasks}}

## Instructions
Parse the user\'s message to identify which task they\'re marking as completed.\nMatch against the list of available tasks by name or description.\nIf multiple tasks have similar names, choose the closest match.\n\nReturn an XML object with:\n<response>\n  <taskId>ID of the task being completed, or \'null\' if not found</taskId>\n  <taskName>Name of the task being completed, or \'null\' if not found</taskName>\n  <isFound>\'true\' or \'false\' indicating if a matching task was found</isFound>\n</response>\n\n## Example Output Format
<response>\n  <taskId>123e4567-e89b-12d3-a456-426614174000</taskId>\n  <taskName>Finish report</taskName>\n  <isFound>true</isFound>\n</response>\n\nIf no matching task was found:\n<response>\n  <taskId>null</taskId>\n  <taskName>null</taskName>\n  <isFound>false</isFound>\n</response>\n`;

/**
 * Extracts which task the user wants to mark as completed
 */
async function extractTaskCompletion(
  runtime: IAgentRuntime,
  message: Memory,
  availableTasks: Task[],
  state: State
): Promise<TaskCompletion> {
  try {
    // Format available tasks for the prompt
    const tasksText = availableTasks
      .map((task) => {
        return `ID: ${task.id}\nName: ${task.name}\nDescription: ${task.description || task.name}\nTags: ${task.tags?.join(', ') || 'none'}\n`;
      })
      .join('\n---\n');

    const messageHistory = formatMessages({
      messages: state.data.messages || [],
      entities: state.data.entities || [],
    });

    const prompt = composePrompt({
      state: {
        text: message.content.text,
        availableTasks: tasksText,
        messageHistory: messageHistory,
      },
      template: extractCompletionTemplate,
    });

    const result = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      stopSequences: [],
    });

    // Parse XML from the text results
    const parsedResult = parseKeyValueXml(result) as TaskCompletion | null;

    if (!parsedResult || typeof parsedResult.isFound === 'undefined') {
      logger.error('Failed to parse valid task completion information from XML');
      return { taskId: '', taskName: '', isFound: false };
    }

    // Convert string 'true'/'false' to boolean and handle 'null' strings
    const finalResult: TaskCompletion = {
      taskId: parsedResult.taskId === 'null' ? '' : parsedResult.taskId || '',
      taskName: parsedResult.taskName === 'null' ? '' : parsedResult.taskName || '',
      isFound: String(parsedResult.isFound).toLowerCase() === 'true',
    };

    return finalResult;
  } catch (error) {
    logger.error('Error extracting task completion information:', error);
    return { taskId: '', taskName: '', isFound: false };
  }
}

/**
 * Processes a daily task completion, updating streak and reactivating for tomorrow
 */
async function processDailyTaskCompletion(
  runtime: IAgentRuntime,
  task: Task,
  entityId: UUID,
  roomId: UUID,
  worldId: UUID
): Promise<{ pointsAwarded: number; newStreak: number }> {
  // Get current streak (default to 0 if not set)
  const currentStreak = typeof task.metadata?.streak === 'number' ? task.metadata.streak : 0;
  const newStreak = currentStreak + 1;

  // Calculate points - base points for daily completion + streak bonus
  const basePoints = calculatePoints(task, 'daily');
  const streakPoints = newStreak > 1 ? calculatePoints(task, 'streakBonus') : 0;
  const totalPoints = basePoints + streakPoints;

  // Mark as completed for today by adding a completed tag temporarily
  // Update metadata BEFORE adding points to ensure it has the pointsAwarded
  await runtime.updateTask(task.id, {
    tags: [...(task.tags || []), 'completed'],
    metadata: {
      ...task.metadata,
      streak: newStreak,
      lastCompletedAt: new Date().toISOString(),
      completedToday: true,
      pointsAwarded: totalPoints,
    },
  });

  // Award points to the user
  await addPoints(
    runtime,
    entityId,
    totalPoints,
    `Completed daily task "${task.name}" (Streak: ${newStreak})`,
    roomId,
    worldId
  );

  return { pointsAwarded: totalPoints, newStreak };
}

/**
 * Processes a one-off task completion, checking if it was completed on time
 */
async function processOneOffTaskCompletion(
  runtime: IAgentRuntime,
  task: Task,
  entityId: UUID,
  roomId: UUID,
  worldId: UUID
): Promise<{ pointsAwarded: number; completedOnTime: boolean }> {
  let completedOnTime = true;
  let pointStatus: 'onTime' | 'late' = 'onTime';

  // Check if the task had a due date and if it's overdue
  if (task.metadata?.dueDate) {
    const dueDate = new Date(task.metadata.dueDate as string);
    const now = new Date();

    completedOnTime = now <= dueDate;
    pointStatus = completedOnTime ? 'onTime' : 'late';
  }

  // Calculate points based on priority, urgency, and whether it was completed on time
  const points = calculatePoints(task, pointStatus);

  // Mark the task as completed
  await runtime.updateTask(task.id, {
    tags: [...(task.tags || []), 'completed'],
    metadata: {
      ...task.metadata,
      completedAt: new Date().toISOString(),
      completedOnTime,
      pointsAwarded: points,
    },
  });

  // Award points to the user
  await addPoints(
    runtime,
    entityId,
    points,
    `Completed task "${task.name}" (${completedOnTime ? 'On time' : 'Late'})`,
    roomId,
    worldId
  );

  return { pointsAwarded: points, completedOnTime };
}

/**
 * Processes an aspirational goal completion
 */
async function processAspirationalTaskCompletion(
  runtime: IAgentRuntime,
  task: Task,
  entityId: UUID,
  roomId: UUID,
  worldId: UUID
): Promise<{ pointsAwarded: number }> {
  // Fixed points for completing an aspirational goal
  const points = 50;

  // Mark the task as completed
  await runtime.updateTask(task.id, {
    tags: [...(task.tags || []), 'completed'],
    metadata: {
      ...task.metadata,
      completedAt: new Date().toISOString(),
      pointsAwarded: points,
    },
  });

  // Award points to the user
  await addPoints(
    runtime,
    entityId,
    points,
    `Achieved aspirational goal "${task.name}"`,
    roomId,
    worldId
  );

  return { pointsAwarded: points };
}

/**
 * The COMPLETE_TODO action allows users to mark a task as completed.
 */
export const completeTodoAction: Action = {
  name: 'COMPLETE_TODO',
  similes: ['MARK_COMPLETE', 'FINISH_TASK', 'DONE', 'TASK_DONE', 'TASK_COMPLETED'],
  description:
    'Marks a todo item as completed, awarding points based on the type of task, priority, and whether it was completed on time.',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Only validate if there are active (non-completed) todos in the current room
    try {
      const tasks = await runtime.getTasks({
        roomId: message.roomId,
        tags: ['TODO'],
      });
      // Filter out completed AND confirmation tasks
      const activeTasks = tasks.filter(
        (task) => !task.tags?.includes('completed') && !task.tags?.includes('AWAITING_CHOICE')
      );
      return activeTasks.length > 0;
    } catch (error) {
      logger.error('Error validating COMPLETE_TODO action:', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback
  ): Promise<void> => {
    try {
      const roomId = message.roomId;
      // Fetch room details directly to get worldId
      const roomDetails = await runtime.getRoom(roomId);
      console.log('roomDetails', roomDetails);
      const worldId = roomDetails?.worldId || createUniqueUuid(runtime, message.entityId);
      // Get all incomplete todos for this room
      const incompleteTasks = await runtime.getTasks({
        roomId: message.roomId,
        tags: ['TODO'],
      });

      // Filter out already completed tasks
      const availableTasks = incompleteTasks.filter((task) => !task.tags?.includes('completed'));

      if (availableTasks.length === 0) {
        await callback({
          text: "You don't have any incomplete tasks to mark as done. Would you like to create a new task?",
          actions: ['COMPLETE_TODO_NO_TASKS'],
          source: message.content.source,
        });
        return;
      }

      // Extract which task the user wants to complete
      const taskCompletion = options?.taskId
        ? { taskId: options.taskId, taskName: options.taskName, isFound: true }
        : await extractTaskCompletion(runtime, message, availableTasks, state);

      if (!taskCompletion.isFound) {
        await callback({
          text:
            "I couldn't determine which task you're marking as completed. Could you be more specific? Here are your current tasks:\n\n" +
            availableTasks.map((task) => `- ${task.name}`).join('\n'),
          actions: ['COMPLETE_TODO_NOT_FOUND'],
          source: message.content.source,
        });
        return;
      }

      // Find the task in the available tasks
      const task = availableTasks.find((t) => t.id === taskCompletion.taskId);

      if (!task) {
        await callback({
          text: `I couldn't find a task matching "${taskCompletion.taskName}". Please try again with the exact task name.`,
          actions: ['COMPLETE_TODO_NOT_FOUND'],
          source: message.content.source,
        });
        return;
      }

      // Process the task completion based on its type
      let responseText = '';

      if (task.tags?.includes('daily')) {
        // Process daily task
        const { pointsAwarded, newStreak } = await processDailyTaskCompletion(
          runtime,
          task,
          message.entityId as UUID,
          roomId,
          worldId
        );

        responseText =
          `🎉 Great job completing your daily task: "${task.name}"!\n\n` +
          `You've earned ${pointsAwarded} points. Current streak: ${newStreak} day${newStreak === 1 ? '' : 's'}.`;
      } else if (task.tags?.includes('one-off')) {
        // Process one-off task
        const { pointsAwarded, completedOnTime } = await processOneOffTaskCompletion(
          runtime,
          task,
          message.entityId as UUID,
          roomId,
          worldId
        );

        const timeStatus = completedOnTime ? 'on time' : 'late';
        const priority =
          task.tags?.find((tag) => tag.startsWith('priority-'))?.split('-')[1] || '4';

        responseText =
          `✅ Task completed: "${task.name}" (Priority ${priority}, ${timeStatus}).\n\n` +
          `You've earned ${pointsAwarded} points.`;
      } else if (task.tags?.includes('aspirational')) {
        // Process aspirational goal
        const { pointsAwarded } = await processAspirationalTaskCompletion(
          runtime,
          task,
          message.entityId as UUID,
          roomId,
          worldId
        );

        responseText =
          `🌟 Congratulations on achieving your aspirational goal: "${task.name}"!\n\n` +
          `This is a significant accomplishment. You've earned ${pointsAwarded} points.`;
      } else {
        // Generic completion for any other todo type
        await runtime.updateTask(task.id, {
          tags: [...(task.tags || []), 'completed'],
          metadata: {
            ...task.metadata,
            completedAt: new Date().toISOString(),
          },
        });

        responseText = `✅ Marked "${task.name}" as completed.`;
      }

      await callback({
        text: responseText,
        actions: ['COMPLETE_TODO'],
        source: message.content.source,
      });
    } catch (error) {
      logger.error('Error in completeTodo handler:', error);
      await callback({
        text: 'I encountered an error while completing your task. Please try again.',
        actions: ['COMPLETE_TODO_ERROR'],
        source: message.content.source,
      });
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'I completed my taxes',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '✅ Task completed: "Finish taxes" (Priority 2, on time).\n\nYou\'ve earned 30 points.',
          actions: ['COMPLETE_TODO'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'I did my 50 pushups today',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '🎉 Great job completing your daily task: "Do 50 pushups"!\n\nYou\'ve earned 15 points. Current streak: 3 days.',
          actions: ['COMPLETE_TODO'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'I read three books this month',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '🌟 Congratulations on achieving your aspirational goal: "Read more books"!\n\nThis is a significant accomplishment. You\'ve earned 50 points.',
          actions: ['COMPLETE_TODO'],
        },
      },
    ],
  ] as ActionExample[][],
};

export default completeTodoAction;
