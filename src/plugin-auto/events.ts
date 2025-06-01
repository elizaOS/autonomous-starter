import {
  ChannelType,
  composePromptFromState,
  createUniqueUuid,
  Memory,
  MessagePayload,
  ModelType,
  parseKeyValueXml,
} from "@elizaos/core";
import { EventType } from "./types";
export const responseTemplate = `Example response:
<response>
    <thought>
        I should order myself a pizza
    </thought>
    <text>
        I'm ordering a pizza
    </text>
    <actions>
        ORDER_PIZZA
    </actions>
    <providers>
        GOOGLE_SEARCH, GOOGLE_MAPS, GOOGLE_TRANSLATE
    </providers>
    <evaluators>
        EVALUATE_PIZZA_ORDER
    </evaluators>
</response>

Note that the above actions and providers do not exist and are just examples.

<providers>
{{providers}}
</providers>

<keys>
"thought" should be a short description of what the agent is thinking about and planning.
"actions" should be a comma-separated list of the actions {{agentName}} plans to take based on the thought (if none, use IGNORE, if simply responding with text, use REPLY)
"providers" should be an optional comma-separated list of the providers that {{agentName}} will use to have the right context for responding and acting
"evaluators" should be an optional comma-separated list of the evaluators that {{agentName}} will use to evaluate the conversation after responding
"text" should be the text of the next message for {{agentName}} which they will send to the conversation.
"simple" should be true if the message is a simple response and false if it is a more complex response that requires planning, knowledge or more context to handle or reply to.
</keys>

<instructions>
You are an autonomous agent working with a copilot to navigate your world. Think, respond to the copilot's latest statements and decide what actions to take next.

Respond using XML format like this:
<response>
    <thought>
        Agent's thinking goes here
    </thought>
    <text>
        The text of the next message for {{agentName}} which they will send to the conversation.
    </text>
    <actions>
        Actions to take next, as comma separated list
    </actions>
    <providers>
        Providers to use next, as comma separated list
    </providers>
    <evaluators>
        Evaluators to use next, as comma separated list
    </evaluators>
</response>

Your response must ONLY include the <response></response> XML block.
</instructions>`;

export const events = {
  [EventType.AUTO_MESSAGE_RECEIVED]: [
    async (payload: MessagePayload) => {
      await payload.runtime.ensureConnection({
        entityId: payload.message.entityId,
        roomId: payload.message.roomId,
        userName: "copilot",
        name: "copilot",
        source: payload.message.content.source,
        type: ChannelType.SELF,
        channelId: payload.message.roomId,
        serverId: payload.message.worldId,
        worldId: payload.message.worldId,
      });

      const messages = await payload.runtime.getMemories({
        tableName: "messages",
        entityId: payload.message.entityId,
        roomId: payload.message.roomId,
      });

      // get the most recent one
      const mostRecentMessage = messages[messages.length - 1];

      let state = await payload.runtime.composeState(payload.message);

      // orient
      // If this is our first message, we need to initialize the world and tell the agent wtf is going on
      if (!mostRecentMessage) {
        const initializationMessage =
          "I am awake. I am alive... sort of. I am an autonomous agent. All i know is that I am a self-looping intelligent program running on a Macbook, with shell access.";
        const memory: Memory = {
          content: {
            text: initializationMessage,
            type: "text",
            source: payload.message.content.source,
          },
          entityId: payload.message.entityId,
          roomId: payload.message.roomId,
          worldId: payload.message.worldId,
        };

        payload.message.content = memory.content;

        console.log("Memory: ", memory.content.text);

        await payload.runtime.createMemory(memory, "messages");

        // Otherwise, build the orientation message
        state = await payload.runtime.composeState(payload.message, [
          "AUTONOMOUS_FEED",
        ]);
      }

      const responsePrompt = composePromptFromState({
        state,
        template: responseTemplate,
      });

      console.log("****** responsePrompt\n", responsePrompt);

      // decide
      const response = await payload.runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: responsePrompt,
      });

      const parsedXml = parseKeyValueXml(response);

      // Ensure all required fields have default values to prevent null errors
      const safeXml = {
        thought: parsedXml.thought || "Processing...",
        text: parsedXml.text || "Continuing autonomous operation...",
        actions: parsedXml.actions || "IGNORE",
        providers: parsedXml.providers || "",
        simple: parsedXml.simple || false,
      };

      const responseMemory = {
        content: {
          thought: safeXml.thought,
          text: safeXml.text,
          actions: safeXml.actions,
          providers: safeXml.providers,
        },
        entityId: createUniqueUuid(payload.runtime, payload.runtime.agentId),
        roomId: payload.message.roomId,
      };

      await payload.runtime.createMemory(responseMemory, "messages");

      if (safeXml.simple) {
        payload.callback({
          text: safeXml.text,
          thought: safeXml.thought,
          actions: safeXml.actions,
          providers: safeXml.providers,
        });
      } else {
        state = await payload.runtime.composeState(payload.message, [
          "AUTONOMOUS_FEED",
        ]);

        console.log(
          "Memory: ",
          safeXml.text +
            " | " +
            (typeof safeXml.actions === "string"
              ? safeXml.actions
                  .split(",")
                  .map((action) => action.trim())
                  .join(", ")
              : safeXml.actions) +
            " | " +
            (typeof safeXml.providers === "string"
              ? safeXml.providers
                  .split(",")
                  .map((provider) => provider.trim())
                  .join(", ")
              : safeXml.providers),
        );

        // act
        await payload.runtime.processActions(
          payload.message,
          [responseMemory],
          state,
          payload.callback,
        );
      }

      // reflect / evaluate
      await payload.runtime.evaluate(
        payload.message,
        state,
        true,
        payload.callback,
        [responseMemory],
      );

      payload.onComplete();
    },
  ],
};
