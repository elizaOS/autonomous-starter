import { sql } from 'drizzle-orm';
import {
  type IAgentRuntime,
  type Route,
  logger,
  type Task,
  createUniqueUuid,
  ChannelType,
  type Room,
  type World,
  type UUID,
} from '@elizaos/core';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Define the equivalent of __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the path to the frontend distribution directory, assuming it's in 'dist'
// relative to the package root (which is two levels up from src/plugin-todo)
const frontendDist = path.resolve(__dirname, '../dist');

const frontPagePath = path.resolve(frontendDist, 'index.html');
const assetsPath = path.resolve(frontendDist, 'assets');
console.log('*** frontPagePath', frontPagePath);
console.log('*** assetsPath', assetsPath);
/**
 * Definition of routes with type, path, and handler for each route.
 * Routes include fetching trending tokens, wallet information, tweets, sentiment analysis, and signals.
 */

export const routes: Route[] = [
  {
    type: 'GET',
    path: '/hello',
    handler: async (_req: any, res: any) => {
      res.send('hello');
    },
  },
  // Serve the frontend index.html for the main /todos path
  {
    type: 'GET',
    path: '/todos',
    handler: async (_req: any, res: any, runtime: IAgentRuntime) => {
      // const route = _req.url; // Unused variable
      if (fs.existsSync(frontPagePath)) {
        res.sendFile(frontPagePath);
      } else {
        res.status(404).send('Frontend not built. Run build command in frontend directory.');
      }
    },
  },
  // Serve static assets for the frontend
  {
    type: 'GET',
    path: '/todos/assets/*',
    handler: async (req: any, res: any) => {
      // Extract the requested asset path relative to '/todos/assets/'
      const assetRelativePath = req.path.split('/todos/assets/')[1];
      if (!assetRelativePath) {
        return res.status(400).send('Invalid asset path');
      }
      // Construct the full path to the asset within the frontendDist/assets directory
      const filePath = path.resolve(assetsPath, assetRelativePath); // Corrected base path

      // Basic security check to prevent path traversal
      if (!filePath.startsWith(assetsPath)) {
        return res.status(403).send('Forbidden');
      }

      // Check if the file exists and serve it
      if (fs.existsSync(filePath)) {
        // Let express handle MIME types based on file extension
        res.sendFile(filePath);
      } else {
        res.status(404).send('Asset not found');
      }
    },
  },
  // API route to get all TODOs, structured by world and room
  {
    type: 'GET',
    path: '/api/todos',
    handler: async (req: any, res: any, runtime: IAgentRuntime) => {
      try {
        // 1. Get all room IDs the agent is a participant in
        const agentRoomIds = await runtime.getRoomsForParticipant(runtime.agentId);
        if (!agentRoomIds || agentRoomIds.length === 0) {
          logger.debug(
            `[API /api/todos] Agent ${runtime.agentId} is not a participant in any rooms.`
          );
          return res.json([]); // No rooms for this agent
        }
        logger.debug(
          `[API /api/todos] Agent ${runtime.agentId} is in rooms: ${agentRoomIds.join(', ')}`
        );

        // 2. Fetch details for these specific rooms
        const agentRooms: Room[] = [];
        // Fetch rooms in batches if needed, but likely fine for typical numbers
        for (const roomId of agentRoomIds) {
          const room = await runtime.getRoom(roomId);
          if (room) {
            agentRooms.push(room);
          } else {
            logger.warn(`[API /api/todos] Could not fetch details for room ID: ${roomId}`);
          }
        }
        if (agentRooms.length === 0) {
          logger.debug(
            `[API /api/todos] No valid room details found for agent's participated rooms.`
          );
          return res.json([]);
        }

        // 3. Fetch all TODO tasks for these specific rooms - Fetch individually
        const tasksByRoom = new Map<string, Task[]>();
        // const allAgentRoomTasks = await runtime.getTasks({
        //   roomIds: agentRoomIds, // Assuming getTasks can accept roomIds array - REMOVED
        //   tags: ['TODO'],
        // });

        // Fetch tasks per room since roomIds array likely not supported
        for (const roomId of agentRoomIds) {
          const tasks = await runtime.getTasks({ roomId, tags: ['TODO'] });
          tasksByRoom.set(roomId, tasks || []);
        }

        // 4. Group rooms by World ID and fetch World details
        const roomsByWorld = new Map<string, Room[]>();
        const worldIds = new Set<UUID>();
        for (const room of agentRooms) {
          const worldId = room.worldId;
          if (worldId) {
            worldIds.add(worldId);
            if (!roomsByWorld.has(worldId)) {
              roomsByWorld.set(worldId, []);
            }
            roomsByWorld.get(worldId)?.push(room);
          } else {
            logger.warn(`[API /api/todos] Room ${room.id} is missing worldId.`);
            // Handle rooms without worldId (e.g., add to a default/unknown world)
            const unknownWorldId = 'unknown-world';
            if (!roomsByWorld.has(unknownWorldId)) roomsByWorld.set(unknownWorldId, []);
            roomsByWorld.get(unknownWorldId)?.push(room);
          }
        }

        const worldsMap = new Map<string, World>();
        for (const worldId of worldIds) {
          const world = await runtime.getWorld(worldId);
          if (world) worldsMap.set(worldId, world);
        }
        // Add placeholder for unknown world if needed
        if (roomsByWorld.has('unknown-world')) {
          worldsMap.set('unknown-world', {
            id: 'unknown-world' as UUID,
            name: 'Rooms without World',
          } as World);
        }

        // 5. Structure the final response
        const structuredResponse = Array.from(worldsMap.entries()).map(([worldId, world]) => {
          const rooms = roomsByWorld.get(worldId) || [];
          return {
            worldId: world.id,
            worldName: world.name || `World ${world.id.substring(0, 6)}`,
            rooms: rooms.map((room) => ({
              roomId: room.id,
              roomName: room.name || `Room ${room.id.substring(0, 6)}`,
              tasks: tasksByRoom.get(room.id) || [],
            })),
          };
        });

        res.json(structuredResponse);
      } catch (error) {
        console.error('Error fetching structured todos:', error);
        logger.error('[API /api/todos] Error fetching structured todos:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        res.status(500).send('Error fetching todos');
      }
    },
  },
  // API route to get all tags
  {
    type: 'GET',
    path: '/api/tags',
    handler: async (_req: any, res: any, runtime: IAgentRuntime) => {
      try {
        // Use runtime.db which should be the Drizzle instance from the adapter
        if (!runtime.db || typeof runtime.db.execute !== 'function') {
          logger.error('[API /api/tags] runtime.db is not available or not a Drizzle instance.');
          return res.status(500).send('Database connection not available');
        }

        // Execute a raw SQL query to get distinct tags
        // The specific query might need adjustment based on your SQL dialect (e.g., PostgreSQL)
        const query = sql`SELECT DISTINCT unnest(tags) as tag FROM tasks WHERE tags IS NOT NULL;`;
        // Cast runtime.db to access execute method if needed, or ensure adapter exposes it correctly
        // Assuming runtime.db has an 'execute' method compatible with Drizzle's raw SQL execution
        const result = await (runtime.db as any).execute(query);

        // Drizzle's execute might return results differently depending on the driver
        // Adapting for common patterns (e.g., pg driver returning 'rows')
        const tags = Array.isArray(result)
          ? result.map((row: any) => row.tag)
          : (result as any).rows // Node-postgres likely returns object with 'rows'
            ? (result as any).rows.map((row: { tag: string }) => row.tag)
            : []; // Fallback

        res.json(tags.filter(Boolean)); // Filter out any null/empty tags
      } catch (error) {
        console.error('Error fetching unique tags:', error);
        logger.error('[API /api/tags] Error fetching unique tags:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        res.status(500).send('Error fetching tags');
      }
    },
  },
  // API route to create a new TODO
  {
    type: 'POST',
    path: '/api/todos',
    handler: async (req: any, res: any, runtime: IAgentRuntime) => {
      try {
        const { name, type, priority, dueDate, isUrgent, roomId } = req.body; // Assume roomId is passed in body

        if (!name || !type || !roomId) {
          return res.status(400).send('Missing required fields: name, type, roomId');
        }

        const tags = ['TODO'];
        const metadata: Record<string, any> = {};

        // --- Determine Task Type and Tags ---
        if (type === 'daily') {
          tags.push('daily', 'recurring-daily');
          metadata.streak = 0; // Initialize streak for daily tasks
          metadata.completedToday = false;
        } else if (type === 'one-off') {
          tags.push('one-off');
          if (dueDate) {
            // Validate date format if necessary
            try {
              metadata.dueDate = new Date(dueDate).toISOString();
            } catch (e) {
              return res.status(400).send('Invalid due date format');
            }
          }
          if (priority && priority >= 1 && priority <= 4) {
            tags.push(`priority-${priority}`);
          } else {
            tags.push('priority-4'); // Default priority
          }
          if (isUrgent) {
            tags.push('urgent');
          }
        } else if (type === 'aspirational') {
          tags.push('aspirational');
          // No specific metadata needed initially
        } else {
          return res.status(400).send('Invalid task type');
        }

        const worldId = createUniqueUuid(runtime, runtime.agentId);

        await runtime.ensureConnection({
          entityId: runtime.agentId,
          roomId: roomId,
          worldId: worldId,
          type: ChannelType.GROUP,
          name: name.trim(),
          source: 'the-system',
          worldName: 'The System',
        });

        const newTask = await runtime.createTask({
          name,
          description: `User added TODO: ${name}`, // Simple description
          tags,
          metadata,
          roomId, // Associate task with the correct room
        });

        res.status(201).json(newTask);
      } catch (error) {
        console.error('Error creating todo:', error);
        res.status(500).send('Error creating todo');
      }
    },
  },
  // API route to complete a TODO
  {
    type: 'PUT',
    path: '/api/todos/:id/complete',
    handler: async (req: any, res: any, runtime: IAgentRuntime) => {
      try {
        const taskId = req.params.id;
        // Make context optional for points calculation
        const { entityId, roomId, worldId } = req.body;

        // Task ID is still required
        if (!taskId) {
          return res.status(400).send('Missing taskId');
        }

        // It's good practice to ensure roomId exists on the task itself if we need it,
        // even if not passed in the body (unless points are skipped)
        const task = await runtime.getTask(taskId);
        if (!task) {
          return res.status(404).send('Task not found');
        }

        // Check if already completed
        if (task.tags?.includes('completed')) {
          return res.status(400).send('Task already completed');
        }

        const now = new Date();
        const metadataUpdate: Record<string, any> = {
          ...task.metadata,
          completedAt: now.toISOString(),
          pointsAwarded: 0, // Default points to 0
        };
        const tagsUpdate = [...(task.tags || []), 'completed'];

        let pointsMessage = ''; // Default points message

        // --- Points Calculation (only if context is provided) ---
        if (entityId && task.roomId && worldId) {
          // Use task.roomId, ensure worldId is passed
          let pointsReason = 'Task completed';
          let completionStatus: 'onTime' | 'late' | 'daily' | 'streakBonus' = 'onTime';

          if (task.tags?.includes('daily')) {
            metadataUpdate.completedToday = true;
            metadataUpdate.lastCompletedDate = now.toISOString().split('T')[0];
            const currentStreak = metadataUpdate.streak || 0;
            metadataUpdate.streak = currentStreak + 1;
            completionStatus = 'daily';
            pointsReason = `Daily task completed (Streak: ${metadataUpdate.streak})`;
          } else if (task.tags?.includes('one-off') && metadataUpdate.dueDate) {
            if (now.getTime() > new Date(metadataUpdate.dueDate).getTime()) {
              completionStatus = 'late';
              pointsReason = 'Task completed (late)';
            } else {
              completionStatus = 'onTime';
              pointsReason = 'Task completed (on time)';
            }
          } else if (task.tags?.includes('aspirational')) {
            pointsReason = 'Aspirational goal progress';
            completionStatus = 'onTime';
          }

          // Calculate points using the imported function
          const { calculatePoints, addPoints } = await import('./pointsService');
          const pointsToAdd = calculatePoints(task, completionStatus);

          // Add streak bonus points if applicable
          let streakBonusPoints = 0;
          if (task.tags?.includes('daily') && metadataUpdate.streak > 1) {
            streakBonusPoints = calculatePoints(task, 'streakBonus');
          }

          const totalPoints = pointsToAdd + streakBonusPoints;
          metadataUpdate.pointsAwarded = totalPoints; // Update points in metadata

          // Add points to the user
          if (totalPoints > 0) {
            let combinedReason = pointsReason;
            if (streakBonusPoints > 0) combinedReason += ` + Streak Bonus`;

            // Use task.roomId here, as it's guaranteed to exist on the task object
            const success = await addPoints(
              runtime,
              entityId,
              totalPoints,
              combinedReason,
              task.roomId,
              worldId
            );
            if (success) {
              pointsMessage = ` Awarded ${totalPoints} points.`;
              logger.info(
                `Awarded ${totalPoints} points to ${entityId} for task ${taskId}. Reason: ${combinedReason}`
              );
            } else {
              pointsMessage = ' Failed to award points.';
              logger.error(`Failed to award points to ${entityId} for task ${taskId}.`);
            }
          }
        } else {
          // Log if points are skipped due to missing context
          if (!entityId || !task.roomId || !worldId) {
            logger.warn(
              `Skipping points calculation for task ${taskId} completion due to missing entityId, roomId, or worldId.`
            );
          }
          // Handle non-point related metadata updates for daily tasks even if context is missing
          if (task.tags?.includes('daily')) {
            metadataUpdate.completedToday = true;
            metadataUpdate.lastCompletedDate = now.toISOString().split('T')[0];
            const currentStreak = metadataUpdate.streak || 0;
            metadataUpdate.streak = currentStreak + 1;
          }
        }

        // Update the task with tags and potentially updated metadata (points, streak etc)
        await runtime.updateTask(taskId, {
          tags: tagsUpdate,
          metadata: metadataUpdate,
        });

        // Return the final task state
        const updatedTask = await runtime.getTask(taskId);
        res.json({ message: `Task ${taskId} completed.${pointsMessage}`, task: updatedTask });
      } catch (error: any) {
        console.error(`Error completing todo ${req.params.id}:`, error);
        logger.error(`Error completing todo ${req.params.id}:`, error); // Added logger
        res.status(500).send(`Error completing todo: ${error.message}`);
      }
    },
  },
  // API route to uncomplete a TODO
  {
    type: 'PUT',
    path: '/api/todos/:id/uncomplete',
    handler: async (req: any, res: any, runtime: IAgentRuntime) => {
      try {
        const taskId = req.params.id;
        if (!taskId) {
          return res.status(400).send('Missing taskId');
        }

        const task = await runtime.getTask(taskId);
        if (!task) {
          return res.status(404).send('Task not found');
        }

        // Check if already incomplete
        if (!task.tags?.includes('completed')) {
          return res.status(400).send('Task is already not completed');
        }

        // --- Logic to reverse completion ---
        const tagsUpdate = (task.tags || []).filter((tag) => tag !== 'completed');
        const metadataUpdate = { ...task.metadata };
        delete metadataUpdate.completedAt;
        delete metadataUpdate.pointsAwarded; // Optionally remove awarded points
        // Optionally handle streak reduction for daily tasks if needed
        if (task.tags?.includes('daily') && metadataUpdate.completedToday) {
          // Simple approach: just mark not completed today, streak logic can be complex
          delete metadataUpdate.completedToday;
          // Optionally decrement streak if the completion was *today*
          // const currentStreak = metadataUpdate.streak || 0;
          // if (currentStreak > 0) metadataUpdate.streak = currentStreak - 1;
        }

        await runtime.updateTask(taskId, {
          tags: tagsUpdate,
          metadata: metadataUpdate,
        });

        const updatedTask = await runtime.getTask(taskId);
        res.json({ message: `Task ${taskId} marked as not completed.`, task: updatedTask });
      } catch (error: any) {
        console.error(`Error uncompleting todo ${req.params.id}:`, error);
        logger.error(`Error uncompleting todo ${req.params.id}:`, error);
        res.status(500).send(`Error uncompleting todo: ${error.message}`);
      }
    },
  },
  // API route to update an existing TODO
  {
    type: 'PUT',
    path: '/api/todos/:id',
    handler: async (req: any, res: any, runtime: IAgentRuntime) => {
      try {
        const taskId = req.params.id;
        const updateData: TaskUpdate = req.body; // Directly use interface from updateTodo.ts

        if (!taskId) {
          return res.status(400).send('Missing task ID');
        }
        if (!updateData || Object.keys(updateData).length === 0) {
          return res.status(400).send('Missing update data');
        }

        const task = await runtime.getTask(taskId);
        if (!task) {
          return res.status(404).send('Task not found');
        }

        // --- Apply updates (similar logic to applyTaskUpdate in updateTodo.ts) ---
        const updatedTags = [...(task.tags || [])];
        const updatedMetadata = { ...(task.metadata || {}) };
        const updatedTaskData: Partial<Task> = {};

        if (updateData.name) updatedTaskData.name = updateData.name;
        if (updateData.description) updatedTaskData.description = updateData.description;

        if (updateData.priority && task.tags?.includes('one-off')) {
          const idx = updatedTags.findIndex((tag) => tag.startsWith('priority-'));
          if (idx !== -1) updatedTags.splice(idx, 1);
          updatedTags.push(`priority-${updateData.priority}`);
        }
        if (updateData.urgent !== undefined && task.tags?.includes('one-off')) {
          const idx = updatedTags.indexOf('urgent');
          if (idx !== -1) updatedTags.splice(idx, 1);
          if (updateData.urgent) updatedTags.push('urgent');
        }
        if (updateData.recurring && task.tags?.includes('daily')) {
          const idx = updatedTags.findIndex((tag) => tag.startsWith('recurring-'));
          if (idx !== -1) updatedTags.splice(idx, 1);
          updatedTags.push(`recurring-${updateData.recurring}`);
        }
        if (updateData.dueDate !== undefined) {
          if (updateData.dueDate === null) {
            delete updatedMetadata.dueDate;
          } else {
            try {
              updatedMetadata.dueDate = new Date(updateData.dueDate).toISOString();
            } catch (e) {
              return res.status(400).send('Invalid due date format provided');
            }
          }
        }

        await runtime.updateTask(taskId, {
          ...updatedTaskData,
          tags: updatedTags,
          metadata: updatedMetadata,
        });

        const finalTask = await runtime.getTask(taskId);
        res.json({ message: `Task ${taskId} updated successfully`, task: finalTask });
      } catch (error: any) {
        console.error(`Error updating todo ${req.params.id}:`, error);
        logger.error(`Error updating todo ${req.params.id}:`, error);
        res.status(500).send(`Error updating todo: ${error.message}`);
      }
    },
  },
  // API route to delete a TODO
  {
    type: 'DELETE',
    path: '/api/todos/:id',
    handler: async (req: any, res: any, runtime: IAgentRuntime) => {
      try {
        const taskId = req.params.id;
        if (!taskId) {
          return res.status(400).send('Missing task ID');
        }

        // Check if task exists before attempting deletion for better error handling
        const task = await runtime.getTask(taskId);
        if (!task) {
          return res.status(404).send('Task not found');
        }

        await runtime.deleteTask(taskId); // Assume deleteTask returns void or boolean, handle potential failure

        // Verify deletion (optional, but good practice)
        const deletedTask = await runtime.getTask(taskId);
        if (deletedTask === null) {
          // Check if task is truly gone
          res.status(200).send(`Task ${taskId} deleted successfully`);
        } else {
          // Log the failure if deletion didn't work as expected
          logger.error(`Attempted to delete task ${taskId} but it still exists.`);
          return res.status(500).send('Failed to delete task');
        }
      } catch (error) {
        console.error(`Error deleting todo ${req.params.id}:`, error);
        res.status(500).send('Error deleting todo');
      }
    },
  },
  // API route to create a new room in a world
  {
    type: 'POST',
    path: '/api/worlds/:worldId/rooms',
    handler: async (req: any, res: any, runtime: IAgentRuntime) => {
      try {
        const worldId = req.params.worldId;
        const { name } = req.body;

        if (!worldId) {
          return res.status(400).send('Missing worldId parameter');
        }
        if (!name || typeof name !== 'string' || name.trim() === '') {
          return res.status(400).send('Missing or invalid room name in request body');
        }

        // Check if world exists (optional but good practice)
        const worldExists = await runtime.getWorld(worldId);
        if (!worldExists) {
          return res.status(404).send(`World with ID ${worldId} not found`);
        }

        // Create a new UUID for the room using the core helper
        const roomId = createUniqueUuid(runtime, `${worldId}-${name.trim()}`); // Seed with world and name

        // ensure connection

        await runtime.ensureConnection({
          entityId: runtime.agentId,
          roomId: roomId,
          worldId: worldId,
          type: ChannelType.GROUP,
          name: name.trim(),
          source: 'the-system',
          worldName: 'The System',
        });

        // Create the room using runtime
        // We need to provide necessary fields for createRoom
        // Assuming sensible defaults for source, type, etc.
        const createdRoomId = await runtime.createRoom({
          id: roomId,
          name: name.trim(),
          worldId: worldId,
          // --- Provide defaults or derive other fields as needed ---
          source: 'thesystem-todo-plugin', // Identify the source
          type: ChannelType.GROUP, // Use GROUP as a reasonable default
          channelId: roomId, // Often useful to set channelId == roomId
          serverId: worldExists.serverId || 'default', // Use world's serverId or default
          // metadata: {} // Add any specific metadata if needed
        });

        if (!createdRoomId) {
          throw new Error('Failed to create room, runtime.createRoom returned null/undefined');
        }

        // Fetch the newly created room to return it
        const newRoom = await runtime.getRoom(roomId);

        res.status(201).json(newRoom);
      } catch (error: any) {
        console.error(`Error creating room in world ${req.params.worldId}:`, error);
        logger.error(`Error creating room in world ${req.params.worldId}:`, error);
        res.status(500).send(`Error creating room: ${error.message}`);
      }
    },
  },
  // API route to get all tasks (debug)
  {
    type: 'GET',
    path: '/api/all-tasks',
    handler: async (_req: any, res: any, runtime: IAgentRuntime) => {
      try {
        // Call getTasks without filters to get all tasks for the agent
        const allTasks = await runtime.getTasks({}); // Empty params object

        // Map the results to include only the desired IDs
        const taskIdentifiers = (allTasks || []).map((task) => ({
          id: task.id,
          name: task.name,
          entityId: task.entityId,
          roomId: task.roomId,
          worldId: task.worldId,
        }));

        res.json(taskIdentifiers); // Return the mapped list
      } catch (error) {
        console.error('Error fetching all tasks:', error);
        logger.error('[API /api/all-tasks] Error fetching all tasks:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        res.status(500).send('Error fetching all tasks');
      }
    },
  },
];

export default routes;

// --- Helper Interface (mirror from updateTodo.ts) ---
interface TaskUpdate {
  name?: string;
  description?: string;
  priority?: 1 | 2 | 3 | 4;
  urgent?: boolean;
  dueDate?: string | null; // Expect ISO string or null
  recurring?: 'daily' | 'weekly' | 'monthly';
}
