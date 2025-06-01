import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type ProviderResult,
  logger,
  type UUID,
  type State,
  createUniqueUuid,
} from '@elizaos/core';
import { getPoints } from '../pointsService';

/**
 * The TodosProvider fetches and formats information about a user's tasks and points.
 */
export const todosProvider: Provider = {
  name: 'TODOS',
  description: "Information about the user's current tasks, completed tasks, and points",
  get: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> => {
    try {
      logger.debug(
        '[TodosProvider] Received state:',
        JSON.stringify(state?.data?.room ?? 'No room data in state', null, 2)
      );
      logger.debug('[TodosProvider] Received message:', JSON.stringify(message, null, 2));

      const currentDate = new Date();
      const sevenDaysAgo = new Date(currentDate);
      sevenDaysAgo.setDate(currentDate.getDate() - 7);

      const roomId = message.roomId;
      console.log('*** message', message);
      // Fetch room details directly to get worldId
      const roomDetails = await runtime.getRoom(roomId);
      const worldId =
        roomDetails?.worldId || message.worldId || createUniqueUuid(runtime, message.entityId);
      console.log('*** roomDetails', roomDetails);

      // Get user's points (scoped to current interaction context)
      const userPoints = await getPoints(runtime, message.entityId as UUID, roomId, worldId);

      // Get ALL tasks for THIS ENTITY across all rooms/worlds
      const allEntityTasks = await runtime.getTasks({
        entityId: message.entityId as UUID, // ADDED: Filter by entity
      });

      console.log('*** allEntityTasks', allEntityTasks);

      // Filter out completed tasks from active
      const pendingTasks = allEntityTasks.filter((task) => !task.tags?.includes('completed'));

      // Get completed tasks in the last 7 days
      const completedTasks = allEntityTasks.filter((task) => {
        if (!task.tags?.includes('completed')) return false;

        // Check completion date if available
        if (task.metadata?.completedAt) {
          const completedAtStr = String(task.metadata.completedAt);
          const completedDate = new Date(completedAtStr);
          return !isNaN(completedDate.getTime()) && completedDate >= sevenDaysAgo;
        }

        // If no completedAt, use updatedAt as fallback
        if (task.updatedAt) {
          let updatedDate: Date;
          const updatedAtValue = task.updatedAt;
          if (typeof updatedAtValue === 'string') {
            updatedDate = new Date(updatedAtValue);
          } else {
            // If neither string nor Date-like, convert to string and try to parse
            updatedDate = new Date(String(updatedAtValue));
          }
          return !isNaN(updatedDate.getTime()) && updatedDate >= sevenDaysAgo;
        }

        return false; // No date info, exclude
      });

      // --- Format different types of tasks ---

      // Daily recurring tasks
      const dailyTasks = pendingTasks.filter((task) => task.tags?.includes('daily'));
      const formattedDailyTasks = dailyTasks
        .map((task) => {
          const streak = task.metadata?.streak || 0;
          return `- ${task.name} (daily, streak: ${streak} day${streak === 1 ? '' : 's'})`;
        })
        .join('\n');

      // One-off tasks with due dates
      const oneOffTasks = pendingTasks.filter((task) => task.tags?.includes('one-off'));
      const formattedOneOffTasks = oneOffTasks
        .map((task) => {
          const priority =
            task.tags?.find((tag) => tag.startsWith('priority-'))?.split('-')[1] || '4';
          const urgent = task.tags?.includes('urgent') ? ' 🔴 URGENT' : '';

          let dueDateText = 'no due date';
          if (task.metadata?.dueDate) {
            try {
              const dueDate = new Date(String(task.metadata.dueDate));
              if (!isNaN(dueDate.getTime())) {
                dueDateText = `due ${dueDate.toLocaleDateString()}`;
              }
            } catch (e) {
              logger.warn(`Invalid due date for task ${task.id}: ${task.metadata.dueDate}`);
            }
          }

          return `- ${task.name} (P${priority}${urgent}, ${dueDateText})`;
        })
        .join('\n');

      // Aspirational goals (no due date)
      const aspirationalTasks = pendingTasks.filter((task) => task.tags?.includes('aspirational'));
      const formattedAspirationalTasks = aspirationalTasks
        .map((task) => {
          return `- ${task.name} (aspirational goal)`;
        })
        .join('\n');

      // Recently completed tasks
      const formattedCompletedTasks = completedTasks
        .map((task) => {
          let completedDateText = 'recently';

          if (task.metadata?.completedAt) {
            try {
              const completedDate = new Date(String(task.metadata.completedAt));
              if (!isNaN(completedDate.getTime())) {
                completedDateText = completedDate.toLocaleDateString();
              }
            } catch (e) {
              logger.warn(`Invalid completion date for task ${task.id}`);
            }
          } else if (task.updatedAt) {
            try {
              let updatedDate: Date;
              const updatedAtValue = task.updatedAt;
              if (typeof updatedAtValue === 'string') {
                updatedDate = new Date(updatedAtValue);
              } else {
                // If neither string nor Date-like, convert to string and try to parse
                updatedDate = new Date(String(updatedAtValue));
              }

              if (!isNaN(updatedDate.getTime())) {
                completedDateText = updatedDate.toLocaleDateString();
              }
            } catch (e) {
              logger.warn(`Invalid updated date for task ${task.id}`);
            }
          }

          const pointsEarned = task.metadata?.pointsAwarded || 0;
          return `- ${task.name} (completed ${completedDateText}, +${pointsEarned} points)`;
        })
        .join('\n');

      // Build the provider output
      let output = `# User's Todos (Tasks)\n\nThese are the tasks which the agent is managing for the user. This is the actual list of todos, any other is probably from previous conversations.\n\n`;

      // Points summary
      output += `## Points: ${userPoints}\n`;

      // Daily tasks
      output += `\n## Daily Todos\n`;
      output += formattedDailyTasks || 'No daily todos.';

      // One-off tasks
      output += `\n\n## One-off Todos\n`;
      output += formattedOneOffTasks || 'No one-off todos.';

      // Aspirational tasks
      output += `\n\n## Aspirational Todos\n`;
      output += formattedAspirationalTasks || 'No aspirational todos.';

      // Recently completed tasks
      output += `\n\n## Recently Completed (Last 7 Days)\n`;
      output += formattedCompletedTasks || 'No todos completed in the last 7 days.';

      output +=
        '\n\nIMPORTANT: Do not tell the user that a task exists or has been added if it is not in the list above. As an AI, you may hallucinate, so it is important to ground your answer in the information above which we know to be true from the database.\n\n';

      // Construct response object
      const result: ProviderResult = {
        data: {
          userPoints,
          dailyTasks,
          oneOffTasks,
          aspirationalTasks,
          completedTasks,
        },
        values: {
          userPoints: userPoints.toString(),
          dailyTasks: formattedDailyTasks || 'None',
          oneOffTasks: formattedOneOffTasks || 'None',
          aspirationalTasks: formattedAspirationalTasks || 'None',
          completedTasks: formattedCompletedTasks || 'None',
        },
        text: output,
      };

      console.log('*** result', result);

      return result;
    } catch (error) {
      logger.error('Error in TodosProvider:', error);

      // Return a simple error message if something goes wrong
      return {
        data: {},
        values: {},
        text: 'Sorry, there was an error retrieving your tasks.',
      };
    }
  },
};

export default todosProvider;
