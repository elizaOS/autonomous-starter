import { describe, it, expect, beforeEach, vi } from "vitest";
import { CharacterModificationService } from "../services/character-modification-service";
import { type IAgentRuntime, type Character, type UUID } from "@elizaos/core";

// Mock dependencies
vi.mock("@elizaos/core", () => ({
  Service: class Service {
    runtime: any;
  },
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
  stringToUuid: (str: string) => str as UUID,
}));

vi.mock("uuid", () => ({
  v4: () => "test-uuid-v4",
}));

describe("CharacterModificationService", () => {
  let service: CharacterModificationService;
  let mockRuntime: Partial<IAgentRuntime>;
  let mockCharacter: Character;

  beforeEach(() => {
    mockCharacter = {
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
      messageExamples: [],
      postExamples: [],
    } as Character;

    mockRuntime = {
      agentId: "agent-123" as UUID,
      character: mockCharacter,
      emitEvent: vi.fn().mockResolvedValue(undefined),
      updateAgent: vi.fn().mockResolvedValue(true),
      getCache: vi.fn().mockResolvedValue(null),
      setCache: vi.fn().mockResolvedValue(undefined),
    };

    service = new CharacterModificationService();
    (service as any).runtime = mockRuntime;
  });

  describe("initialize", () => {
    it("should initialize successfully", async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it("should create initial snapshot if none exists", async () => {
      await service.initialize();

      const snapshots = service.getCharacterSnapshots();
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].versionNumber).toBe(0);
    });

    it("should load cached state if available", async () => {
      const cachedState = {
        modifications: [
          {
            id: "mod-1" as UUID,
            agentId: "agent-123" as UUID,
            versionNumber: 1,
            diffXml: "<test/>",
            reasoning: "Test mod",
            appliedAt: new Date(),
            createdAt: new Date(),
          },
        ],
        snapshots: [],
        currentVersion: 1,
      };

      (mockRuntime.getCache as any).mockResolvedValueOnce(cachedState);

      await service.initialize();

      const history = service.getCharacterHistory();
      expect(history).toHaveLength(1);
      expect(history[0].reasoning).toBe("Test mod");
    });
  });

  describe("applyCharacterDiff", () => {
    const validDiffXml = `
<character-modification>
  <operations>
    <add path="bio[]" type="string">New bio entry</add>
    <modify path="system" type="string">Updated system prompt</modify>
  </operations>
  <reasoning>Test modification</reasoning>
  <timestamp>2024-01-01T00:00:00Z</timestamp>
</character-modification>`;

    beforeEach(async () => {
      await service.initialize();
    });

    it("should apply valid character diff successfully", async () => {
      const result = await service.applyCharacterDiff(validDiffXml);

      expect(result.success).toBe(true);
      expect(result.appliedChanges).toBe(2);
      expect(result.errors).toBeUndefined();

      // Check character was updated
      expect(mockRuntime.character.bio).toContain("New bio entry");
      expect(mockRuntime.character.system).toBe("Updated system prompt");
    });

    it("should reject modifications when locked", async () => {
      service.lockModifications();

      const result = await service.applyCharacterDiff(validDiffXml);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "Character modifications are currently locked",
      );
    });

    it("should validate diff structure", async () => {
      const invalidXml = "<invalid>Not a character modification</invalid>";

      const result = await service.applyCharacterDiff(invalidXml);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain(
        "Failed to parse character diff XML",
      );
    });

    it("should enforce rate limiting", async () => {
      // Apply 5 modifications (rate limit)
      for (let i = 0; i < 5; i++) {
        await service.applyCharacterDiff(validDiffXml);
      }

      // 6th should fail
      const result = await service.applyCharacterDiff(validDiffXml);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("Modification rate limit exceeded");
    });

    it("should filter by focus areas", async () => {
      const result = await service.applyCharacterDiff(validDiffXml, {
        focusAreas: ["bio"],
      });

      expect(result.success).toBe(true);
      expect(result.appliedChanges).toBe(1); // Only bio operation
      expect(mockRuntime.character.bio).toContain("New bio entry");
      expect(mockRuntime.character.system).toBe("Original system prompt");
    });

    it("should create snapshot before modification", async () => {
      const snapshotsBefore = service.getCharacterSnapshots().length;

      await service.applyCharacterDiff(validDiffXml);

      const snapshotsAfter = service.getCharacterSnapshots().length;
      expect(snapshotsAfter).toBe(snapshotsBefore + 1);
    });

    it("should emit character:updated event", async () => {
      await service.applyCharacterDiff(validDiffXml);

      expect(mockRuntime.emitEvent).toHaveBeenCalledWith(
        "character:updated",
        expect.objectContaining({
          runtime: mockRuntime,
          source: "characterModification",
          agentId: mockRuntime.agentId,
          character: mockRuntime.character,
        }),
      );
    });

    it("should handle persistence failure gracefully", async () => {
      (mockRuntime.updateAgent as any).mockResolvedValueOnce(false);

      const result = await service.applyCharacterDiff(validDiffXml);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain(
        "Failed to update agent in database",
      );
    });
  });

  describe("rollbackCharacter", () => {
    beforeEach(async () => {
      await service.initialize();

      // Apply some modifications
      const diff1 = `
<character-modification>
  <operations>
    <modify path="system" type="string">First modification</modify>
  </operations>
  <reasoning>First change</reasoning>
</character-modification>`;

      const diff2 = `
<character-modification>
  <operations>
    <modify path="system" type="string">Second modification</modify>
  </operations>
  <reasoning>Second change</reasoning>
</character-modification>`;

      console.log("Before modifications:", mockRuntime.character.system);
      await service.applyCharacterDiff(diff1);
      console.log("After first modification:", mockRuntime.character.system);
      await service.applyCharacterDiff(diff2);
      console.log("After second modification:", mockRuntime.character.system);
      
      const snapshots = service.getCharacterSnapshots();
      console.log("Snapshots count:", snapshots.length);
      snapshots.forEach((s, i) => {
        console.log(`Snapshot[${i}] version=${s.versionNumber} system="${s.characterData.system}"`);
      });
    });

    it("should rollback to previous version", async () => {
      const snapshots = service.getCharacterSnapshots();
      // Snapshots are created AFTER modifications:
      // [0] - Initial state (created in initialize) = "Original system prompt"
      // [1] - After first modification = "First modification"
      // [2] - After second modification = "Second modification"
      
      // To rollback to the state after first modification, we use snapshot[1]
      const targetSnapshot = snapshots[1];
      console.log("Rolling back to snapshot[1] with system:", targetSnapshot.characterData.system);

      const success = await service.rollbackCharacter(targetSnapshot.id);

      expect(success).toBe(true);
      console.log("After rollback, character system:", mockRuntime.character.system);
      expect(mockRuntime.character.system).toBe("First modification");
    });

    it("should rollback to initial state", async () => {
      const snapshots = service.getCharacterSnapshots();
      const initialSnapshot = snapshots[0];

      const success = await service.rollbackCharacter(initialSnapshot.id);

      expect(success).toBe(true);
      expect(mockRuntime.character.system).toBe("Original system prompt");
    });

    it("should mark rolled back modifications", async () => {
      const snapshots = service.getCharacterSnapshots();
      const targetSnapshot = snapshots[0]; // Initial state

      await service.rollbackCharacter(targetSnapshot.id);

      const history = service.getCharacterHistory();
      const rolledBackMods = history.filter((h) => h.rolledBackAt);

      expect(rolledBackMods).toHaveLength(2); // Both modifications rolled back
    });

    it("should fail for non-existent version", async () => {
      const success = await service.rollbackCharacter("non-existent-id");

      expect(success).toBe(false);
    });

    it("should validate restored character structure", async () => {
      const snapshots = service.getCharacterSnapshots();
      // Corrupt the character data
      snapshots[0].characterData = { invalid: "data" } as any;

      const success = await service.rollbackCharacter(snapshots[0].id);

      expect(success).toBe(false);
    });
  });

  describe("version management", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should increment version numbers correctly", async () => {
      expect(service.getCurrentVersion()).toBe(0);

      const diff = `
<character-modification>
  <operations>
    <add path="topics[]" type="string">new topic</add>
  </operations>
  <reasoning>Adding topic</reasoning>
</character-modification>`;

      await service.applyCharacterDiff(diff);
      expect(service.getCurrentVersion()).toBe(1);

      await service.applyCharacterDiff(diff);
      expect(service.getCurrentVersion()).toBe(2);
    });
  });

  describe("locking mechanism", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should prevent modifications when locked", async () => {
      service.lockModifications();

      const diff = `
<character-modification>
  <operations>
    <add path="topics[]" type="string">new topic</add>
  </operations>
  <reasoning>Test</reasoning>
</character-modification>`;

      const result = await service.applyCharacterDiff(diff);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "Character modifications are currently locked",
      );
    });

    it("should allow modifications after unlock", async () => {
      service.lockModifications();
      service.unlockModifications();

      const diff = `
<character-modification>
  <operations>
    <add path="topics[]" type="string">new topic</add>
  </operations>
  <reasoning>Test</reasoning>
</character-modification>`;

      const result = await service.applyCharacterDiff(diff);

      expect(result.success).toBe(true);
    });
  });

  describe("stop", () => {
    it("should clean up resources on stop", async () => {
      await service.initialize();

      // Apply a modification
      const diff = `
<character-modification>
  <operations>
    <add path="topics[]" type="string">new topic</add>
  </operations>
  <reasoning>Test</reasoning>
</character-modification>`;

      await service.applyCharacterDiff(diff);

      // Stop the service
      await service.stop();

      // Check state was saved
      expect(mockRuntime.setCache).toHaveBeenCalled();

      // Check collections were cleared
      expect(service.getCharacterHistory()).toHaveLength(0);
      expect(service.getCharacterSnapshots()).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it("should handle XML parsing errors gracefully", async () => {
      const malformedXml = "<character-modification><operations></invalid>";

      const result = await service.applyCharacterDiff(malformedXml);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain(
        "Failed to parse character diff XML",
      );
    });

    it("should handle missing runtime methods gracefully", async () => {
      // Remove updateAgent method
      delete (mockRuntime as any).updateAgent;

      const diff = `
<character-modification>
  <operations>
    <add path="topics[]" type="string">new topic</add>
  </operations>
  <reasoning>Test</reasoning>
</character-modification>`;

      const result = await service.applyCharacterDiff(diff);

      // Should succeed but log warning
      expect(result.success).toBe(true);
    });
  });
});
