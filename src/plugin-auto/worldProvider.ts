import { addHeader, createUniqueUuid } from "@elizaos/core";

import type { IAgentRuntime, Memory, Provider, UUID } from "@elizaos/core";

const AUTO_WORLD_SEED = "autonomous_world_singleton";
const AUTO_ROOM_SEED = "autonomous_room_singleton";

/**
 * Provider that gives information about the autonomous world and room setup
 */
export const autonomousWorldProvider: Provider = {
  name: "AUTONOMOUS_WORLD",
  description: "Information about the autonomous world and room setup",
  position: 50,
  get: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      // Get the WORLD_ID setting
      const worldId = runtime.getSetting("WORLD_ID") as UUID;
      const autonomousRoomId = createUniqueUuid(runtime, AUTO_ROOM_SEED);

      if (!worldId) {
        return {
          data: {
            worldId: null,
            roomId: autonomousRoomId,
            status: "no_world_id",
          },
          values: {
            autonomousWorld:
              "No WORLD_ID configured - autonomous system may not be fully initialized.",
          },
          text: "No WORLD_ID configured - autonomous system may not be fully initialized.",
        };
      }

      // Get world and room information
      const [world, room] = await Promise.all([
        runtime.getWorld(worldId),
        runtime.getRoom(autonomousRoomId),
      ]);

      const worldInfo = world
        ? {
            id: world.id,
            name: world.name,
            serverId: world.serverId,
            agentId: world.agentId,
          }
        : null;

      const roomInfo = room
        ? {
            id: room.id,
            name: room.name,
            type: room.type,
            worldId: room.worldId,
            source: room.source,
          }
        : null;

      const statusText = [
        `# Autonomous World Status`,
        ``,
        `**World ID:** ${worldId}`,
        `**World Status:** ${world ? "Found" : "Not Found"}`,
        world ? `**World Name:** ${world.name}` : "",
        ``,
        `**Autonomous Room ID:** ${autonomousRoomId}`,
        `**Room Status:** ${room ? "Found" : "Not Found"}`,
        room ? `**Room Name:** ${room.name}` : "",
        room ? `**Room Type:** ${room.type}` : "",
        room ? `**Room World ID:** ${room.worldId}` : "",
        ``,
        `**Agent ID:** ${runtime.agentId}`,
        `**Character Name:** ${runtime.character.name}`,
      ]
        .filter(Boolean)
        .join("\n");

      const formattedText = addHeader(
        "# Autonomous World Information",
        statusText,
      );

      return {
        data: {
          worldId,
          worldInfo,
          roomId: autonomousRoomId,
          roomInfo,
          agentId: runtime.agentId,
          characterName: runtime.character.name,
          status: world && room ? "ready" : "incomplete",
        },
        values: {
          autonomousWorld: statusText,
          worldStatus: world ? "ready" : "missing",
          roomStatus: room ? "ready" : "missing",
        },
        text: formattedText,
      };
    } catch (error) {
      console.error("[AutonomousWorldProvider] Error:", error);
      return {
        data: {
          error: error.message,
          status: "error",
        },
        values: {
          autonomousWorld: `Error retrieving autonomous world information: ${error.message}`,
        },
        text: `Error retrieving autonomous world information: ${error.message}`,
      };
    }
  },
};
