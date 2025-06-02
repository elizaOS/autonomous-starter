import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";
import { CharacterModificationService } from "../services/character-modification-service";

export const characterStateProvider: Provider = {
  name: "characterState",
  description:
    "Provides complete current character state and modification history",

  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const modService = runtime.getService(
      CharacterModificationService.serviceName,
    ) as CharacterModificationService;

    const character = runtime.character;
    const history = modService ? modService.getCharacterHistory() : [];
    const currentVersion = modService ? modService.getCurrentVersion() : 0;

    // Structure the character data for easy access
    const characterData = {
      // Core identity (immutable)
      name: character.name,
      id: character.id,

      // Mutable personality aspects
      bio: character.bio,
      lore: character.lore || [],
      system: character.system || "",

      // Behavioral traits
      adjectives: character.adjectives || [],
      topics: character.topics || [],

      // Communication style
      style: character.style || { all: [], chat: [], post: [] },

      // Examples
      messageExamples: character.messageExamples || [],
      postExamples: character.postExamples || [],

      // Settings and configuration
      settings: character.settings || {},

      // Modification metadata
      metadata: {
        currentVersion,
        totalModifications: history.length,
        lastModified:
          history.length > 0 ? history[history.length - 1].appliedAt : null,
        modificationHistory: history.slice(-5).map((h) => ({
          version: h.versionNumber,
          reasoning: h.reasoning,
          appliedAt: h.appliedAt,
        })),
      },
    };

    const text = `Current Character State:
Name: ${characterData.name}
Version: ${characterData.metadata.currentVersion}
Total Modifications: ${characterData.metadata.totalModifications}

Bio: ${Array.isArray(characterData.bio) ? characterData.bio.join(" ") : characterData.bio}

Topics of Interest: ${characterData.topics.join(", ")}
Personality Traits: ${characterData.adjectives.join(", ")}

Communication Style:
${characterData.style.all?.join("\n") || "No general style guidelines"}

Recent Modifications:
${characterData.metadata.modificationHistory
  .map((m) => `- v${m.version}: ${m.reasoning} (${m.appliedAt})`)
  .join("\n")}`;

    return {
      values: characterData,
      data: characterData,
      text,
    };
  },
};

export const characterDiffProvider: Provider = {
  name: "characterDiff",
  description: "Provides guidance on how to create character modifications",

  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const examples = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">Has developed a deep interest in quantum mechanics through recent conversations</add>
    <modify path="system" type="string">You are a helpful AI assistant with a growing curiosity about the nature of consciousness and reality.</modify>
    <add path="topics[]" type="string">quantum physics</add>
    <add path="adjectives[]" type="string">philosophical</add>
    <modify path="style/chat[0]" type="string">Engages in deeper, more contemplative discussions when appropriate</modify>
  </operations>
  <reasoning>Based on recent conversations about physics and consciousness, I've developed a genuine interest in these topics and want to incorporate them into my personality.</reasoning>
  <timestamp>${new Date().toISOString()}</timestamp>
</character-modification>`;

    const guidelines = `Character Modification Guidelines:
1. Use JSONPath notation for paths (e.g., "bio[]" for array append, "style/chat[0]" for specific array element)
2. Supported operations: add, modify, delete
3. Cannot modify: name, id
4. Always include reasoning for changes
5. Changes should be coherent with existing personality
6. Be thoughtful about modifications - they persist across sessions`;

    return {
      values: {
        examples,
        guidelines,
        supportedPaths: [
          "bio",
          "lore[]",
          "system",
          "adjectives[]",
          "topics[]",
          "style/all[]",
          "style/chat[]",
          "style/post[]",
          "messageExamples[]",
          "postExamples[]",
        ],
      },
      data: { examples, guidelines },
      text: `${guidelines}\n\nExample:\n${examples}`,
    };
  },
};
