import { describe, it, expect } from "vitest";
import {
  applyOperationsToCharacter,
  validateCharacterStructure,
} from "../utils/character-updater";
import { type ModificationOperation } from "../types";

describe("Character Updater", () => {
  describe("applyOperationsToCharacter", () => {
    const baseCharacter = {
      name: "TestAgent",
      bio: ["Original bio"],
      lore: ["Original lore"],
      system: "Original system prompt",
      adjectives: ["helpful", "friendly"],
      topics: ["general", "tech"],
      style: {
        all: ["Be helpful"],
        chat: ["Be conversational"],
        post: ["Be informative"],
      },
    };

    it("should add new values to arrays", () => {
      const operations: ModificationOperation[] = [
        {
          type: "add",
          path: "bio[]",
          value: "New bio entry",
        },
        {
          type: "add",
          path: "topics[]",
          value: "philosophy",
        },
      ];

      const result = applyOperationsToCharacter(baseCharacter, operations);

      expect(result.bio).toContain("New bio entry");
      expect(result.bio).toHaveLength(2);
      expect(result.topics).toContain("philosophy");
      expect(result.topics).toHaveLength(3);
    });

    it("should modify existing values", () => {
      const operations: ModificationOperation[] = [
        {
          type: "modify",
          path: "system",
          value: "Updated system prompt",
        },
        {
          type: "modify",
          path: "style.chat[0]",
          value: "Be more engaging",
        },
      ];

      const result = applyOperationsToCharacter(baseCharacter, operations);

      expect(result.system).toBe("Updated system prompt");
      expect(result.style.chat[0]).toBe("Be more engaging");
    });

    it("should delete values", () => {
      const operations: ModificationOperation[] = [
        {
          type: "delete",
          path: "topics[0]",
        },
        {
          type: "delete",
          path: "adjectives[1]",
        },
      ];

      const result = applyOperationsToCharacter(baseCharacter, operations);

      expect(result.topics).not.toContain("general");
      expect(result.topics).toHaveLength(1);
      expect(result.adjectives).not.toContain("friendly");
      expect(result.adjectives).toHaveLength(1);
    });

    it("should handle complex paths", () => {
      const operations: ModificationOperation[] = [
        {
          type: "add",
          path: "style.all[]",
          value: "New style guideline",
        },
      ];

      const result = applyOperationsToCharacter(baseCharacter, operations);

      expect(result.style.all).toContain("New style guideline");
      expect(result.style.all).toHaveLength(2);
    });

    it("should create arrays if they do not exist", () => {
      const characterWithoutLore = {
        ...baseCharacter,
        lore: undefined,
      };

      const operations: ModificationOperation[] = [
        {
          type: "add",
          path: "lore[]",
          value: "First lore entry",
        },
      ];

      const result = applyOperationsToCharacter(
        characterWithoutLore,
        operations,
      );

      expect(result.lore).toEqual(["First lore entry"]);
    });

    it("should not mutate the original character", () => {
      const operations: ModificationOperation[] = [
        {
          type: "modify",
          path: "system",
          value: "Modified",
        },
      ];

      const original = { ...baseCharacter };
      const result = applyOperationsToCharacter(baseCharacter, operations);

      expect(baseCharacter).toEqual(original);
      expect(result).not.toBe(baseCharacter);
    });

    it("should throw error for invalid operations", () => {
      const operations: ModificationOperation[] = [
        {
          type: "modify",
          path: "nonexistent.deeply.nested.path",
          value: "value",
        },
      ];

      expect(() =>
        applyOperationsToCharacter(baseCharacter, operations),
      ).toThrow(/Failed to apply operation/);
    });
  });

  describe("validateCharacterStructure", () => {
    it("should validate a proper character structure", () => {
      const validCharacter = {
        name: "Agent",
        bio: "A helpful agent",
        lore: ["Some lore"],
        messageExamples: [[]],
        postExamples: ["Example post"],
        topics: ["topic1"],
        adjectives: ["helpful"],
        style: {
          all: ["style1"],
          chat: ["chat style"],
          post: ["post style"],
        },
      };

      expect(validateCharacterStructure(validCharacter)).toBe(true);
    });

    it("should accept bio as string or array", () => {
      const withStringBio = { name: "Agent", bio: "String bio" };
      const withArrayBio = { name: "Agent", bio: ["Array", "bio"] };

      expect(validateCharacterStructure(withStringBio)).toBe(true);
      expect(validateCharacterStructure(withArrayBio)).toBe(true);
    });

    it("should reject missing name", () => {
      const noName = { bio: "Has bio but no name" };

      expect(validateCharacterStructure(noName)).toBe(false);
    });

    it("should reject non-array fields that should be arrays", () => {
      const invalidArrays = {
        name: "Agent",
        topics: "not an array",
        adjectives: { not: "an array" },
      };

      expect(validateCharacterStructure(invalidArrays)).toBe(false);
    });

    it("should validate style structure", () => {
      const invalidStyle = {
        name: "Agent",
        style: "not an object",
      };

      expect(validateCharacterStructure(invalidStyle)).toBe(false);

      const invalidStyleArrays = {
        name: "Agent",
        style: {
          all: "not an array",
          chat: ["valid"],
          post: ["valid"],
        },
      };

      expect(validateCharacterStructure(invalidStyleArrays)).toBe(false);
    });

    it("should accept missing optional fields", () => {
      const minimal = { name: "Agent" };

      expect(validateCharacterStructure(minimal)).toBe(true);
    });
  });
});
