import {
  type Action,
  type ActionExample,
  composePrompt,
  type HandlerCallback,
  type IAgentRuntime,
  logger,
  type Memory,
  ModelType,
  parseKeyValueXml,
  type State,
  type Task,
  type UUID,
} from '@elizaos/core';

// Interface for task selection properties
interface TaskSelection {
  taskId: string;
  taskName: string;
  isFound: boolean;
}

// Interface for task update properties
interface TaskUpdate {
  name?: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  urgent?: boolean;
  dueDate?: string | null;
  recurring?: 'daily' | 'weekly' | 'monthly';
}

/**
 * Template for extracting which task to update from the user's message
 */
const extractTaskTemplate = `
# Task: Extract Task Selection Information

## User Message
{{text}}

## Available Tasks
{{availableTasks}}

## Instructions
Parse the user\'s message to identify which task they want to update or modify.
Match against the list of available tasks by name or description.
If multiple tasks have similar names, choose the closest match.

Return an XML object with:
<response>
  <taskId>ID of the task being updated, or \'null\' if not found</taskId>
  <taskName>Name of the task being updated, or \'null\' if not found</taskName>
  <isFound>\'true\' or \'false\' indicating if a matching task was found</isFound>
</response>

## Example Output Format
<response>
  <taskId>123e4567-e89b-12d3-a456-426614174000</taskId>
  <taskName>Finish report</taskName>
  <isFound>true</isFound>
</response>

If no matching task was found:
<response>
  <taskId>null</taskId>
  <taskName>null</taskName>
  <isFound>false</isFound>
</response>
`;

/**
 * Template for extracting task update information
 */
const extractUpdateTemplate = `
# Task: Extract Task Update Information

## User Message
{{text}}

## Current Task Details
{{taskDetails}}

## Instructions
Parse the user\'s message to determine what changes they want to make to the task.
Only include fields that the user explicitly wants to update.

Return an XML object with these potential fields (only include fields that should be changed):
<response>
  <name>New name for the task</name>
  <description>New description for the task</description>
  <priority>New priority (1-4, where 1 is highest)</priority>
  <urgent>\'true\' or \'false\' for whether the task is urgent</urgent>
  <dueDate>New due date in ISO format (YYYY-MM-DD), or \'null\' to remove the due date</dueDate>
  <recurring>New recurrence pattern (\'daily\', \'weekly\', \'monthly\')</recurring>
</response>

## Example Output Format
<response>
  <description>Updated task description</description>
  <priority>2</priority>
  <dueDate>2023-04-30</dueDate>
</response>
`;

/**
 * Extracts which task the user wants to update
 */
async function extractTaskSelection(
  runtime: IAgentRuntime,
  message: Memory,
  availableTasks: Task[]
): Promise<TaskSelection> {
  try {
    // Format available tasks for the prompt
    const tasksText = availableTasks
      .map((task) => {
        return `ID: ${task.id}\nName: ${task.name}\nDescription: ${task.description || task.name}\nTags: ${task.tags?.join(', ') || 'none'}\n`;
      })
      .join('\n---\n');

    const prompt = composePrompt({
      state: {
        text: message.content.text,
        availableTasks: tasksText,
      },
      template: extractTaskTemplate,
    });

    const result = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      stopSequences: [],
    });

    // Parse XML from the text results
    const parsedResult = parseKeyValueXml(result) as TaskSelection | null;

    if (!parsedResult || typeof parsedResult.isFound === 'undefined') {
      logger.error('Failed to parse valid task selection information from XML');
      return { taskId: '', taskName: '', isFound: false };
    }

    // Convert string 'true'/'false' to boolean and handle 'null' strings
    const finalResult: TaskSelection = {
      taskId: parsedResult.taskId === 'null' ? '' : parsedResult.taskId || '',
      taskName: parsedResult.taskName === 'null' ? '' : parsedResult.taskName || '',
      isFound: String(parsedResult.isFound).toLowerCase() === 'true',
    };

    return finalResult;
  } catch (error) {
    logger.error('Error extracting task selection information:', error);
    return { taskId: '', taskName: '', isFound: false };
  }
}

/**
 * Extracts what updates the user wants to make to the task
 */
async function extractTaskUpdate(
  runtime: IAgentRuntime,
  message: Memory,
  task: Task
): Promise<TaskUpdate | null> {
  try {
    // Format task details for the prompt
    let taskDetails = `Name: ${task.name}\n`;
    if (task.description) taskDetails += `Description: ${task.description}\n`;

    // Add task type
    if (task.tags?.includes('daily')) {
      taskDetails += `Type: daily\n`;
      const recurringTag = task.tags.find((tag) => tag.startsWith('recurring-'));
      if (recurringTag) {
        const recurring = recurringTag.split('-')[1];
        taskDetails += `Recurring: ${recurring}\n`;
      }
      const streak = task.metadata?.streak || 0;
      taskDetails += `Current streak: ${streak}\n`;
    } else if (task.tags?.includes('one-off')) {
      taskDetails += `Type: one-off\n`;
      const priorityTag = task.tags.find((tag) => tag.startsWith('priority-'));
      if (priorityTag) {
        const priority = priorityTag.split('-')[1];
        taskDetails += `Priority: ${priority}\n`;
      }
      taskDetails += `Urgent: ${task.tags.includes('urgent') ? 'Yes' : 'No'}\n`;
      if (task.metadata?.dueDate) {
        const dueDate = new Date(String(task.metadata.dueDate));
        taskDetails += `Due date: ${dueDate.toISOString().split('T')[0]}\n`;
      }
    } else if (task.tags?.includes('aspirational')) {
      taskDetails += `Type: aspirational goal\n`;
    }

    const prompt = composePrompt({
      state: {
        text: message.content.text,
        taskDetails,
      },
      template: extractUpdateTemplate,
    });

    const result = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
      stopSequences: [],
    });

    // Parse XML from the text results
    const parsedUpdate = parseKeyValueXml(result) as TaskUpdate | null;

    // Validate the parsed update has at least one property
    if (!parsedUpdate || Object.keys(parsedUpdate).length === 0) {
      logger.error('Failed to extract valid task update information from XML');
      return null;
    }

    // Convert specific fields from string if necessary
    const finalUpdate: TaskUpdate = { ...parsedUpdate };
    if (finalUpdate.priority) {
      const priorityVal = parseInt(String(finalUpdate.priority), 10);
      if (!isNaN(priorityVal) && priorityVal >= 1 && priorityVal <= 4) {
        finalUpdate.priority = priorityVal as 1 | 2 | 3 | 4;
      } else {
        delete finalUpdate.priority; // Remove invalid priority
      }
    }
    if (finalUpdate.urgent !== undefined)
      finalUpdate.urgent = String(finalUpdate.urgent).toLowerCase() === 'true';
    if (finalUpdate.dueDate === 'null')
      finalUpdate.dueDate = null; // Handle 'null' string for dueDate
    else if (finalUpdate.dueDate === undefined)
      delete finalUpdate.dueDate; // Ensure undefined doesn't become empty string
    else finalUpdate.dueDate = String(finalUpdate.dueDate);

    if (finalUpdate.recurring) {
      const recurringVal = String(finalUpdate.recurring).toLowerCase();
      if (['daily', 'weekly', 'monthly'].includes(recurringVal)) {
        finalUpdate.recurring = recurringVal as 'daily' | 'weekly' | 'monthly';
      } else {
        delete finalUpdate.recurring; // Remove invalid recurrence
      }
    }

    // Return null if no valid fields remain after conversion/validation
    if (Object.keys(finalUpdate).length === 0) {
      logger.warn('No valid update fields found after parsing XML.');
      return null;
    }

    return finalUpdate;
  } catch (error) {
    logger.error('Error extracting task update information:', error);
    return null;
  }
}

/**
 * Applies updates to a task
 */
async function applyTaskUpdate(
  runtime: IAgentRuntime,
  task: Task,
  update: TaskUpdate
): Promise<Task> {
  // Start with current task data
  const updatedTags = [...(task.tags || [])];
  const updatedMetadata = { ...(task.metadata || {}) };

  // Update name and description directly in task object
  const updatedTask: Partial<Task> = {
    ...(update.name ? { name: update.name } : {}),
    ...(update.description ? { description: update.description } : {}),
  };

  // Update priority (for one-off tasks)
  if (update.priority && task.tags?.includes('one-off')) {
    // Remove any existing priority tag
    const priorityIndex = updatedTags.findIndex((tag) => tag.startsWith('priority-'));
    if (priorityIndex !== -1) {
      updatedTags.splice(priorityIndex, 1);
    }

    // Add new priority tag
    updatedTags.push(`priority-${update.priority}`);
  }

  // Update urgency (for one-off tasks)
  if (update.urgent !== undefined && task.tags?.includes('one-off')) {
    // Remove urgent tag if it exists
    const urgentIndex = updatedTags.indexOf('urgent');
    if (urgentIndex !== -1) {
      updatedTags.splice(urgentIndex, 1);
    }

    // Add urgent tag if needed
    if (update.urgent) {
      updatedTags.push('urgent');
    }
  }

  // Update recurring pattern (for daily tasks)
  if (update.recurring && task.tags?.includes('daily')) {
    // Remove any existing recurring tag
    const recurringIndex = updatedTags.findIndex((tag) => tag.startsWith('recurring-'));
    if (recurringIndex !== -1) {
      updatedTags.splice(recurringIndex, 1);
    }

    // Add new recurring tag
    updatedTags.push(`recurring-${update.recurring}`);
  }

  // Update due date (for one-off tasks)
  if (update.dueDate !== undefined) {
    if (update.dueDate === null) {
      // Remove due date if specified as null
      delete updatedMetadata.dueDate;
    } else {
      // Set new due date
      updatedMetadata.dueDate = update.dueDate;
    }
  }

  // Apply the updates to the task
  await runtime.updateTask(task.id, {
    ...updatedTask,
    tags: updatedTags,
    metadata: updatedMetadata,
  });

  // Fetch the updated task
  const updatedTaskResult = await runtime.getTask(task.id);
  return updatedTaskResult!;
}

/**
 * The UPDATE_TODO action allows users to modify an existing task.
 */
export const updateTodoAction: Action = {
  name: 'UPDATE_TODO',
  similes: ['EDIT_TODO', 'MODIFY_TASK', 'CHANGE_TASK', 'MODIFY_TODO', 'EDIT_TASK'],
  description: 'Updates an existing todo item immediately based on user description.',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    // Simpler validation: Only check if *any* active (non-completed) TODO exists
    try {
      const tasks = await runtime.getTasks({
        roomId: message.roomId,
        tags: ['TODO'],
      });
      const activeTasks = tasks.filter((task) => !task.tags?.includes('completed'));
      return activeTasks.length > 0;
    } catch (error) {
      logger.error('Error validating UPDATE_TODO action:', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any, // Not used in this simplified flow
    callback: HandlerCallback
  ): Promise<void> => {
    try {
      // Get all active todos for this room
      const tasks = await runtime.getTasks({
        roomId: message.roomId,
        tags: ['TODO'],
      });
      const availableTasks = tasks.filter((task) => !task.tags?.includes('completed'));

      if (availableTasks.length === 0) {
        await callback({
          text: "You don't have any active tasks to update. Would you like to create a new task?",
          actions: ['UPDATE_TODO_NO_TASKS'],
          source: message.content.source,
        });
        return;
      }

      // Phase 1: Extract which task to update
      const taskSelection = await extractTaskSelection(runtime, message, availableTasks);
      if (!taskSelection.isFound) {
        await callback({
          text:
            "I couldn't determine which task you want to update. Could you be more specific? Here are your current tasks:\n\n" +
            availableTasks.map((task) => `- ${task.name}`).join('\n'),
          actions: ['UPDATE_TODO_NOT_FOUND'],
          source: message.content.source,
        });
        return;
      }

      const task = availableTasks.find((t) => t.id === taskSelection.taskId);
      if (!task) {
        await callback({
          text: `I couldn't find a task matching "${taskSelection.taskName}". Please try again with the exact task name.`,
          actions: ['UPDATE_TODO_NOT_FOUND'],
          source: message.content.source,
        });
        return;
      }

      // Phase 2: Extract what updates to make
      const update = await extractTaskUpdate(runtime, message, task);
      if (!update) {
        await callback({
          text: `I couldn't determine what changes you want to make to "${task.name}". Could you please specify what you want to update, such as the name, description, priority, or due date?`,
          actions: ['UPDATE_TODO_INVALID_UPDATE'],
          source: message.content.source,
        });
        return;
      }

      // Phase 3: Apply the update directly
      const updatedTask = await applyTaskUpdate(runtime, task, update);

      await callback({
        text: `✓ Task updated: "${updatedTask.name}" has been updated.`, // Use updated name
        actions: ['UPDATE_TODO_SUCCESS'], // Different action name
        source: message.content.source,
      });
    } catch (error) {
      logger.error('Error in updateTodo handler:', error);
      await callback({
        text: 'I encountered an error while trying to update your task. Please try again.',
        actions: ['UPDATE_TODO_ERROR'],
        source: message.content.source,
      });
    }
  },

  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Update my taxes task to be due on April 18 instead',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '✓ Task updated: "Finish taxes" has been updated.',
          actions: ['UPDATE_TODO_SUCCESS'],
        },
      },
      {
        name: '{{name1}}',
        content: {
          text: 'Change the priority of my report task to high priority and make it urgent',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: '✓ Task updated: "Write report" has been updated.',
          actions: ['UPDATE_TODO_SUCCESS'],
        },
      },
    ],
  ] as ActionExample[][],
};

export default updateTodoAction;
