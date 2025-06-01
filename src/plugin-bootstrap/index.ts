import {
  type ActionEventPayload,
  asUUID,
  ChannelType,
  composePromptFromState,
  type Content,
  createUniqueUuid,
  type Entity,
  type EntityPayload,
  type EvaluatorEventPayload,
  EventType,
  type IAgentRuntime,
  logger,
  type Media,
  type Memory,
  messageHandlerTemplate,
  type MessagePayload,
  type MessageReceivedHandlerParams,
  ModelType,
  parseKeyValueXml,
  type Plugin,
  shouldRespondTemplate,
  type UUID,
  type WorldPayload,
} from "@elizaos/core";
import { v4 } from "uuid";

import { choiceAction } from "./actions/choice";
import { ignoreAction } from "./actions/ignore";
import { noneAction } from "./actions/none";
import sendMessageAction from "./actions/sendMessage";
import { updateSettingsAction } from "./actions/settings";
import { actionsProvider } from "./providers/actions";
import { choiceProvider } from "./providers/choice";
import { characterProvider } from "./providers/character";
import { entitiesProvider } from "./providers/entities";
import { providersProvider } from "./providers/providers";
import { settingsProvider } from "./providers/settings";
import { timeProvider } from "./providers/time";
import { TaskService } from "./services/task";

/**
 * Represents media data containing a buffer of data and the media type.
 * @typedef {Object} MediaData
 * @property {Buffer} data - The buffer of data.
 * @property {string} mediaType - The type of media.
 */
type MediaData = {
  data: Buffer;
  mediaType: string;
};

const latestResponseIds = new Map<string, Map<string, string>>();

/**
 * Escapes special characters in a string to make it JSON-safe.
 */
/* // Removing JSON specific helpers
function escapeForJson(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/```/g, '\\`\\`\\`');
}

function sanitizeJson(rawJson: string): string {
  try {
    // Try parsing directly
    JSON.parse(rawJson);
    return rawJson; // Already valid
  } catch {
    // Continue to sanitization
  }

  // first, replace all newlines with \n
  const sanitized = rawJson
    .replace(/\n/g, '\\n')

    // then, replace all backticks with \\\`
    .replace(/`/g, '\\\`');

  // Regex to find and escape the "text" field
  const fixed = sanitized.replace(/"text"\s*:\s*"([\s\S]*?)"\s*,\s*"simple"/, (_match, group) => {
    const escapedText = escapeForJson(group);
    return `"text": "${escapedText}", "simple"`;
  });

  // Validate that the result is actually parseable
  try {
    JSON.parse(fixed);
    return fixed;
  } catch (e) {
    throw new Error(`Failed to sanitize JSON: ${e.message}`);
  }
}
*/

/**
 * Fetches media data from a list of attachments, supporting both HTTP URLs and local file paths.
 *
 * @param attachments Array of Media objects containing URLs or file paths to fetch media from
 * @returns Promise that resolves with an array of MediaData objects containing the fetched media data and content type
 */
/**
 * Fetches media data from given attachments.
 * @param {Media[]} attachments - Array of Media objects to fetch data from.
 * @returns {Promise<MediaData[]>} - A Promise that resolves with an array of MediaData objects.
 */
export async function fetchMediaData(
  attachments: Media[],
): Promise<MediaData[]> {
  return Promise.all(
    attachments.map(async (attachment: Media) => {
      if (/^(http|https):\/\//.test(attachment.url)) {
        // Handle HTTP URLs
        const response = await fetch(attachment.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${attachment.url}`);
        }
        const mediaBuffer = Buffer.from(await response.arrayBuffer());
        const mediaType = attachment.contentType || "image/png";
        return { data: mediaBuffer, mediaType };
      }
      // if (fs.existsSync(attachment.url)) {
      //   // Handle local file paths
      //   const mediaBuffer = await fs.promises.readFile(path.resolve(attachment.url));
      //   const mediaType = attachment.contentType || 'image/png';
      //   return { data: mediaBuffer, mediaType };
      // }
      throw new Error(
        `File not found: ${attachment.url}. Make sure the path is correct.`,
      );
    }),
  );
}

/**
 * Handles incoming messages and generates responses based on the provided runtime and message information.
 *
 * @param {MessageReceivedHandlerParams} params - The parameters needed for message handling, including runtime, message, and callback.
 * @returns {Promise<void>} - A promise that resolves once the message handling and response generation is complete.
 */
const messageReceivedHandler = async ({
  runtime,
  message,
  callback,
  onComplete,
}: MessageReceivedHandlerParams): Promise<void> => {
  // Generate a new response ID
  const responseId = v4();
  // Get or create the agent-specific map
  if (!latestResponseIds.has(runtime.agentId)) {
    latestResponseIds.set(runtime.agentId, new Map<string, string>());
  }

  // if message.worldId is not set, set it to runtime.createUniqueUuid(message.entityId)
  if (!message.worldId) {
    message.worldId = createUniqueUuid(runtime, message.entityId);
  }

  console.log("*** message", message);

  await runtime.ensureConnection({
    entityId: message.entityId,
    roomId: message.roomId,
    userName:
      message.metadata[message.content.source]?.username || message.entityId,
    name:
      message.metadata[message.content.source]?.name ||
      message.metadata[message.content.source]?.username ||
      `User${message.entityId}`,
    source: message.content.source,
    channelId: message.content.channelId as string,
    serverId: message.worldId,
    type: message.content.type as ChannelType,
    worldId: message.worldId || createUniqueUuid(runtime, message.entityId),
  });

  console.log("*** message", message);

  const agentResponses = latestResponseIds.get(runtime.agentId);
  if (!agentResponses) {
    throw new Error("Agent responses map not found");
  }

  // Set this as the latest response ID for this agent+room
  agentResponses.set(message.roomId, responseId);

  // Generate a unique run ID for tracking this message handler execution
  const runId = asUUID(v4());
  const startTime = Date.now();

  // Emit run started event
  await runtime.emitEvent(EventType.RUN_STARTED, {
    runtime,
    runId,
    messageId: message.id,
    roomId: message.roomId,
    entityId: message.entityId,
    startTime,
    status: "started",
    source: "messageHandler",
  });

  // Set up timeout monitoring
  const timeoutDuration = 60 * 60 * 1000; // 1 hour
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(async () => {
      await runtime.emitEvent(EventType.RUN_TIMEOUT, {
        runtime,
        runId,
        messageId: message.id,
        roomId: message.roomId,
        entityId: message.entityId,
        startTime,
        status: "timeout",
        endTime: Date.now(),
        duration: Date.now() - startTime,
        error: "Run exceeded 60 minute timeout",
        source: "messageHandler",
      });
      reject(new Error("Run exceeded 60 minute timeout"));
    }, timeoutDuration);
  });

  const processingPromise = (async () => {
    try {
      if (message.entityId === runtime.agentId) {
        throw new Error("Message is from the agent itself");
      }

      // First, save the incoming message
      await Promise.all([
        runtime.addEmbeddingToMemory(message),
        runtime.createMemory(message, "messages"),
      ]);

      const agentUserState = await runtime.getParticipantUserState(
        message.roomId,
        runtime.agentId,
      );

      if (
        agentUserState === "MUTED" &&
        !message.content.text
          ?.toLowerCase()
          .includes(runtime.character.name.toLowerCase())
      ) {
        logger.debug("Ignoring muted room");
        return;
      }

      const state = await runtime.composeState(message);

      let responseMessages: Memory[] = [];

      const prompt = composePromptFromState({
        state,
        template:
          runtime.character.templates?.messageHandlerTemplate ||
          messageHandlerTemplate,
      });

      let responseContent: Content | null = null;

      // Retry if missing required fields
      let retries = 0;
      const maxRetries = 3;

      while (
        retries < maxRetries &&
        (!responseContent?.thought || !responseContent?.actions)
      ) {
        let response = await runtime.useModel(ModelType.TEXT_LARGE, {
          prompt,
        });

        logger.debug("*** Raw LLM Response ***\n", response);

        // Attempt to parse the XML response
        const parsedXml = parseKeyValueXml(response);
        logger.debug("*** Parsed XML Content ***\n", parsedXml);

        // Map parsed XML to Content type, handling potential missing fields
        if (parsedXml) {
          responseContent = {
            thought: parsedXml.thought || "",
            actions: parsedXml.actions || ["IGNORE"],
            providers: parsedXml.providers || [],
            text: parsedXml.text || "",
            simple: parsedXml.simple || false,
          };
        } else {
          responseContent = null;
        }

        retries++;
        if (!responseContent?.thought || !responseContent?.actions) {
          logger.warn(
            "*** Missing required fields (thought or actions), retrying... ***",
          );
        }
      }

      // Check if this is still the latest response ID for this agent+room
      const currentResponseId = agentResponses.get(message.roomId);
      if (currentResponseId !== responseId) {
        logger.info(
          `Response discarded - newer message being processed for agent: ${runtime.agentId}, room: ${message.roomId}`,
        );
        return;
      }

      if (responseContent) {
        responseContent.inReplyTo = createUniqueUuid(runtime, message.id);

        const responseMesssage = {
          id: asUUID(v4()),
          entityId: runtime.agentId,
          agentId: runtime.agentId,
          content: responseContent,
          roomId: message.roomId,
          createdAt: Date.now(),
        };

        responseMessages = [responseMesssage];
      }

      // Clean up the response ID
      agentResponses.delete(message.roomId);
      if (agentResponses.size === 0) {
        latestResponseIds.delete(runtime.agentId);
      }

      if (
        responseContent &&
        responseContent.simple &&
        responseContent.text &&
        (responseContent.length === 0 ||
          (responseContent.length === 1 &&
            responseContent.actions[0].toUpperCase() === "REPLY"))
      ) {
        await callback(responseContent);
      } else {
        await runtime.processActions(
          message,
          responseMessages,
          state,
          callback,
        );
      }
      await runtime.evaluate(message, state, true, callback, responseMessages);

      onComplete?.();

      // Emit run ended event on successful completion
      await runtime.emitEvent(EventType.RUN_ENDED, {
        runtime,
        runId,
        messageId: message.id,
        roomId: message.roomId,
        entityId: message.entityId,
        startTime,
        status: "completed",
        endTime: Date.now(),
        duration: Date.now() - startTime,
        source: "messageHandler",
      });
    } catch (error) {
      onComplete?.();
      // Emit run ended event with error
      await runtime.emitEvent(EventType.RUN_ENDED, {
        runtime,
        runId,
        messageId: message.id,
        roomId: message.roomId,
        entityId: message.entityId,
        startTime,
        status: "completed",
        endTime: Date.now(),
        duration: Date.now() - startTime,
        error: error.message,
        source: "messageHandler",
      });
      throw error;
    }
  })();

  try {
    await Promise.race([processingPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Handles the receipt of a reaction message and creates a memory in the designated memory manager.
 *
 * @param {Object} params - The parameters for the function.
 * @param {IAgentRuntime} params.runtime - The agent runtime object.
 * @param {Memory} params.message - The reaction message to be stored in memory.
 * @returns {void}
 */
const reactionReceivedHandler = async ({
  runtime,
  message,
}: {
  runtime: IAgentRuntime;
  message: Memory;
}) => {
  try {
    await runtime.createMemory(message, "messages");
  } catch (error) {
    if (error.code === "23505") {
      logger.warn("Duplicate reaction memory, skipping");
      return;
    }
    logger.error("Error in reaction handler:", error);
  }
};

/**
 * Syncs a single user into an entity
 */
/**
 * Asynchronously sync a single user with the specified parameters.
 *
 * @param {UUID} entityId - The unique identifier for the entity.
 * @param {IAgentRuntime} runtime - The runtime environment for the agent.
 * @param {any} user - The user object to sync.
 * @param {string} serverId - The unique identifier for the server.
 * @param {string} channelId - The unique identifier for the channel.
 * @param {ChannelType} type - The type of channel.
 * @param {string} source - The source of the user data.
 * @returns {Promise<void>} A promise that resolves once the user is synced.
 */
const syncSingleUser = async (
  entityId: UUID,
  runtime: IAgentRuntime,
  serverId: string,
  channelId: string,
  type: ChannelType,
  source: string,
) => {
  try {
    const entity = await runtime.getEntityById(entityId);
    logger.info(
      `Syncing user: ${entity?.metadata[source]?.username || entityId}`,
    );

    // Ensure we're not using WORLD type and that we have a valid channelId
    if (!channelId) {
      logger.warn(`Cannot sync user ${entity?.id} without a valid channelId`);
      return;
    }

    const roomId = createUniqueUuid(runtime, channelId);
    const worldId = createUniqueUuid(runtime, serverId);

    await runtime.ensureConnection({
      entityId,
      roomId,
      userName: entity?.metadata[source].username || entityId,
      name:
        entity?.metadata[source].name ||
        entity?.metadata[source].username ||
        `User${entityId}`,
      source,
      channelId,
      serverId,
      type,
      worldId,
    });

    logger.success(`Successfully synced user: ${entity?.id}`);
  } catch (error) {
    logger.error(
      `Error syncing user: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * Handles standardized server data for both WORLD_JOINED and WORLD_CONNECTED events
 */
const handleServerSync = async ({
  runtime,
  world,
  rooms,
  entities,
  source,
  onComplete,
}: WorldPayload) => {
  logger.debug(`Handling server sync event for server: ${world.name}`);
  try {
    // Create/ensure the world exists for this server
    await runtime.ensureWorldExists({
      id: world.id,
      name: world.name,
      agentId: runtime.agentId,
      serverId: world.serverId,
      metadata: {
        ...world.metadata,
      },
    });

    // First sync all rooms/channels
    if (rooms && rooms.length > 0) {
      for (const room of rooms) {
        await runtime.ensureRoomExists({
          id: room.id,
          name: room.name,
          source: source,
          type: room.type,
          channelId: room.channelId,
          serverId: world.serverId,
          worldId: world.id,
        });
      }
    }

    // Then sync all users
    if (entities && entities.length > 0) {
      // Process entities in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < entities.length; i += batchSize) {
        const entityBatch = entities.slice(i, i + batchSize);

        // check if user is in any of these rooms in rooms
        const firstRoomUserIsIn = rooms.length > 0 ? rooms[0] : null;

        // Process each user in the batch
        await Promise.all(
          entityBatch.map(async (entity: Entity) => {
            try {
              await runtime.ensureConnection({
                entityId: entity.id,
                roomId: firstRoomUserIsIn.id,
                userName: entity.metadata[source].username,
                name: entity.metadata[source].name,
                source: source,
                channelId: firstRoomUserIsIn.channelId,
                serverId: world.serverId,
                type: firstRoomUserIsIn.type,
                worldId: world.id,
              });
            } catch (err) {
              logger.warn(
                `Failed to sync user ${entity.metadata.username}: ${err}`,
              );
            }
          }),
        );

        // Add a small delay between batches if not the last batch
        if (i + batchSize < entities.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    logger.debug(
      `Successfully synced standardized world structure for ${world.name}`,
    );
    onComplete?.();
  } catch (error) {
    logger.error(
      `Error processing standardized server data: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

/**
 * Handles control messages for enabling or disabling UI elements in the frontend
 * @param {Object} params - Parameters for the handler
 * @param {IAgentRuntime} params.runtime - The runtime instance
 * @param {Object} params.message - The control message
 * @param {string} params.source - Source of the message
 */
const controlMessageHandler = async ({
  runtime,
  message,
  source,
}: {
  runtime: IAgentRuntime;
  message: {
    type: "control";
    payload: {
      action: "enable_input" | "disable_input";
      target?: string;
    };
    roomId: UUID;
  };
  source: string;
}) => {
  try {
    logger.debug(
      `[controlMessageHandler] Processing control message: ${message.payload.action} for room ${message.roomId}`,
    );

    // Here we would use a WebSocket service to send the control message to the frontend
    // This would typically be handled by a registered service with sendMessage capability

    // Get any registered WebSocket service
    const serviceNames = Array.from(runtime.getAllServices().keys());
    const websocketServiceName = serviceNames.find(
      (name) =>
        name.toLowerCase().includes("websocket") ||
        name.toLowerCase().includes("socket"),
    );

    if (websocketServiceName) {
      const websocketService = runtime.getService(websocketServiceName);
      if (websocketService && "sendMessage" in websocketService) {
        // Send the control message through the WebSocket service
        await (websocketService as any).sendMessage({
          type: "controlMessage",
          payload: {
            action: message.payload.action,
            target: message.payload.target,
            roomId: message.roomId,
          },
        });

        logger.debug(
          `[controlMessageHandler] Control message ${message.payload.action} sent successfully`,
        );
      } else {
        logger.error(
          "[controlMessageHandler] WebSocket service does not have sendMessage method",
        );
      }
    } else {
      logger.error(
        "[controlMessageHandler] No WebSocket service found to send control message",
      );
    }
  } catch (error) {
    logger.error(
      `[controlMessageHandler] Error processing control message: ${error}`,
    );
  }
};

const events = {
  [EventType.MESSAGE_RECEIVED]: [
    async (payload: MessagePayload) => {
      await messageReceivedHandler({
        runtime: payload.runtime,
        message: payload.message,
        callback: payload.callback,
        onComplete: payload.onComplete,
      });
    },
  ],

  [EventType.VOICE_MESSAGE_RECEIVED]: [
    async (payload: MessagePayload) => {
      await messageReceivedHandler({
        runtime: payload.runtime,
        message: payload.message,
        callback: payload.callback,
      });
    },
  ],

  [EventType.REACTION_RECEIVED]: [
    async (payload: MessagePayload) => {
      await reactionReceivedHandler({
        runtime: payload.runtime,
        message: payload.message,
      });
    },
  ],

  [EventType.MESSAGE_SENT]: [
    async (payload: MessagePayload) => {
      // Message sent tracking
      logger.debug(`Message sent: ${payload.message.content.text}`);
    },
  ],

  [EventType.WORLD_JOINED]: [
    async (payload: WorldPayload) => {
      await handleServerSync(payload);
    },
  ],

  [EventType.WORLD_CONNECTED]: [
    async (payload: WorldPayload) => {
      await handleServerSync(payload);
    },
  ],

  [EventType.ENTITY_JOINED]: [
    async (payload: EntityPayload) => {
      await syncSingleUser(
        payload.entityId,
        payload.runtime,
        payload.worldId,
        payload.roomId,
        payload.metadata.type,
        payload.source,
      );
    },
  ],

  [EventType.ENTITY_LEFT]: [
    async (payload: EntityPayload) => {
      try {
        // Update entity to inactive
        const entity = await payload.runtime.getEntityById(payload.entityId);
        if (entity) {
          entity.metadata = {
            ...entity.metadata,
            status: "INACTIVE",
            leftAt: Date.now(),
          };
          await payload.runtime.updateEntity(entity);
        }
        logger.info(`User ${payload.entityId} left world ${payload.worldId}`);
      } catch (error) {
        logger.error(`Error handling user left: ${error.message}`);
      }
    },
  ],

  [EventType.ACTION_STARTED]: [
    async (payload: ActionEventPayload) => {
      logger.debug(
        `Action started: ${payload.actionName} (${payload.actionId})`,
      );
    },
  ],

  [EventType.ACTION_COMPLETED]: [
    async (payload: ActionEventPayload) => {
      const status = payload.error
        ? `failed: ${payload.error.message}`
        : "completed";
      logger.debug(
        `Action ${status}: ${payload.actionName} (${payload.actionId})`,
      );
    },
  ],

  [EventType.EVALUATOR_STARTED]: [
    async (payload: EvaluatorEventPayload) => {
      logger.debug(
        `Evaluator started: ${payload.evaluatorName} (${payload.evaluatorId})`,
      );
    },
  ],

  [EventType.EVALUATOR_COMPLETED]: [
    async (payload: EvaluatorEventPayload) => {
      const status = payload.error
        ? `failed: ${payload.error.message}`
        : "completed";
      logger.debug(
        `Evaluator ${status}: ${payload.evaluatorName} (${payload.evaluatorId})`,
      );
    },
  ],

  CONTROL_MESSAGE: [controlMessageHandler],
};

export const bootstrapPlugin: Plugin = {
  name: "bootstrap",
  description: "Agent bootstrap with basic actions and evaluators",
  actions: [
    ignoreAction,
    noneAction,
    sendMessageAction,
    choiceAction,
    updateSettingsAction,
  ],
  events,
  evaluators: [],
  providers: [
    choiceProvider,
    timeProvider,
    entitiesProvider,
    settingsProvider,
    providersProvider,
    actionsProvider,
    characterProvider,
  ],
  services: [TaskService],
};

export default bootstrapPlugin;
