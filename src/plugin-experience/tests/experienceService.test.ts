import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ExperienceService } from "../service.js";
import { ExperienceType, OutcomeType } from "../types.js";
import type { IAgentRuntime } from "@elizaos/core";

// Mock the runtime
const mockRuntime = {
  agentId: "test-agent-123" as const,
  getService: vi.fn(),
  useModel: vi.fn(),
  emitEvent: vi.fn(),
} as unknown as IAgentRuntime;

describe("ExperienceService", () => {
  let experienceService: ExperienceService;

  beforeEach(() => {
    vi.clearAllMocks();
    experienceService = new ExperienceService(mockRuntime);

    // Mock the embedding model
    mockRuntime.useModel = vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
  });

  afterEach(async () => {
    await experienceService.stop();
  });

  describe("recordExperience", () => {
    it("should record a basic experience", async () => {
      const experienceData = {
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: "Testing context",
        action: "test_action",
        result: "Test successful",
        learning: "Testing works well",
        domain: "testing",
        tags: ["test", "success"],
        confidence: 0.8,
        importance: 0.7,
      };

      const experience =
        await experienceService.recordExperience(experienceData);

      expect(experience.id).toBeDefined();
      expect(experience.type).toBe(ExperienceType.SUCCESS);
      expect(experience.outcome).toBe(OutcomeType.POSITIVE);
      expect(experience.learning).toBe("Testing works well");
      expect(experience.confidence).toBe(0.8);
      expect(experience.importance).toBe(0.7);
      expect(experience.domain).toBe("testing");
      expect(experience.tags).toEqual(["test", "success"]);
      expect(experience.agentId).toBe("test-agent-123");
      expect(experience.createdAt).toBeDefined();
      expect(experience.accessCount).toBe(0);
    });

    it("should generate embeddings for experiences", async () => {
      const experienceData = {
        type: ExperienceType.LEARNING,
        outcome: OutcomeType.NEUTRAL,
        context: "Learning context",
        action: "learn_something",
        result: "Knowledge gained",
        learning: "New knowledge acquired",
        domain: "general",
      };

      const experience =
        await experienceService.recordExperience(experienceData);

      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        "TEXT_EMBEDDING",
        expect.objectContaining({
          prompt: expect.stringContaining("Learning context"),
        }),
      );
      expect(experience.embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });

    it("should emit events when recording experiences", async () => {
      const experienceData = {
        type: ExperienceType.DISCOVERY,
        outcome: OutcomeType.POSITIVE,
        context: "Discovery context",
        action: "discover_something",
        result: "New discovery made",
        learning: "Discovered something interesting",
        domain: "research",
      };

      const experience =
        await experienceService.recordExperience(experienceData);

      expect(mockRuntime.emitEvent).toHaveBeenCalledWith(
        "EXPERIENCE_RECORDED",
        expect.objectContaining({
          experienceId: experience.id,
          eventType: "created",
          timestamp: experience.createdAt,
        }),
      );
    });

    it("should handle missing optional fields with defaults", async () => {
      const experienceData = {
        context: "Minimal context",
        action: "minimal_action",
        result: "Minimal result",
        learning: "Minimal learning",
      };

      const experience =
        await experienceService.recordExperience(experienceData);

      expect(experience.type).toBe(ExperienceType.LEARNING);
      expect(experience.outcome).toBe(OutcomeType.NEUTRAL);
      expect(experience.confidence).toBe(0.5);
      expect(experience.importance).toBe(0.5);
      expect(experience.domain).toBe("general");
      expect(experience.tags).toEqual([]);
    });
  });

  describe("queryExperiences", () => {
    beforeEach(async () => {
      // Add some test experiences
      await experienceService.recordExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: "Shell command execution",
        action: "execute_command",
        result: "Command executed successfully",
        learning: "Shell commands work well",
        domain: "shell",
        tags: ["shell", "command"],
        confidence: 0.9,
        importance: 0.8,
      });

      await experienceService.recordExperience({
        type: ExperienceType.FAILURE,
        outcome: OutcomeType.NEGATIVE,
        context: "Code compilation",
        action: "compile_code",
        result: "Compilation failed",
        learning: "Need to check syntax",
        domain: "coding",
        tags: ["coding", "compilation"],
        confidence: 0.8,
        importance: 0.7,
      });

      await experienceService.recordExperience({
        type: ExperienceType.DISCOVERY,
        outcome: OutcomeType.POSITIVE,
        context: "System exploration",
        action: "explore_system",
        result: "Found new tool",
        learning: "System has useful tools",
        domain: "system",
        tags: ["system", "tools"],
        confidence: 0.7,
        importance: 0.9,
      });
    });

    it("should query experiences by type", async () => {
      const experiences = await experienceService.queryExperiences({
        type: ExperienceType.SUCCESS,
      });

      expect(experiences).toHaveLength(1);
      expect(experiences[0].type).toBe(ExperienceType.SUCCESS);
      expect(experiences[0].domain).toBe("shell");
    });

    it("should query experiences by outcome", async () => {
      const experiences = await experienceService.queryExperiences({
        outcome: OutcomeType.POSITIVE,
      });

      expect(experiences).toHaveLength(2);
      expect(experiences.every((e) => e.outcome === OutcomeType.POSITIVE)).toBe(
        true,
      );
    });

    it("should query experiences by domain", async () => {
      const experiences = await experienceService.queryExperiences({
        domain: "coding",
      });

      expect(experiences).toHaveLength(1);
      expect(experiences[0].domain).toBe("coding");
      expect(experiences[0].type).toBe(ExperienceType.FAILURE);
    });

    it("should query experiences by tags", async () => {
      const experiences = await experienceService.queryExperiences({
        tags: ["shell"],
      });

      expect(experiences).toHaveLength(1);
      expect(experiences[0].tags).toContain("shell");
    });

    it("should filter by minimum importance", async () => {
      const experiences = await experienceService.queryExperiences({
        minImportance: 0.85,
      });

      expect(experiences).toHaveLength(1);
      expect(experiences[0].importance).toBeGreaterThanOrEqual(0.85);
      expect(experiences[0].domain).toBe("system");
    });

    it("should filter by minimum confidence", async () => {
      const experiences = await experienceService.queryExperiences({
        minConfidence: 0.85,
      });

      expect(experiences).toHaveLength(1);
      expect(experiences[0].confidence).toBeGreaterThanOrEqual(0.85);
      expect(experiences[0].domain).toBe("shell");
    });

    it("should limit results", async () => {
      const experiences = await experienceService.queryExperiences({
        limit: 2,
      });

      expect(experiences).toHaveLength(2);
    });

    it("should filter by time range", async () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      const experiences = await experienceService.queryExperiences({
        timeRange: {
          start: oneHourAgo,
          end: now,
        },
      });

      expect(experiences.length).toBeGreaterThan(0);
      expect(
        experiences.every(
          (e) => e.createdAt >= oneHourAgo && e.createdAt <= now,
        ),
      ).toBe(true);
    });

    it("should update access counts when querying", async () => {
      const experiences = await experienceService.queryExperiences({
        type: ExperienceType.SUCCESS,
      });

      expect(experiences[0].accessCount).toBe(1);
      expect(experiences[0].lastAccessedAt).toBeDefined();

      // Query again
      const experiencesAgain = await experienceService.queryExperiences({
        type: ExperienceType.SUCCESS,
      });

      expect(experiencesAgain[0].accessCount).toBe(2);
    });

    it("should combine multiple filters", async () => {
      const experiences = await experienceService.queryExperiences({
        outcome: OutcomeType.POSITIVE,
        minConfidence: 0.8,
        domain: "shell",
      });

      expect(experiences).toHaveLength(1);
      expect(experiences[0].outcome).toBe(OutcomeType.POSITIVE);
      expect(experiences[0].confidence).toBeGreaterThanOrEqual(0.8);
      expect(experiences[0].domain).toBe("shell");
    });
  });

  describe("findSimilarExperiences", () => {
    beforeEach(async () => {
      // Add experiences with different embeddings
      mockRuntime.useModel = vi
        .fn()
        .mockResolvedValueOnce([0.1, 0.2, 0.3, 0.4, 0.5]) // First experience
        .mockResolvedValueOnce([0.2, 0.3, 0.4, 0.5, 0.6]) // Second experience
        .mockResolvedValueOnce([0.9, 0.8, 0.7, 0.6, 0.5]) // Third experience
        .mockResolvedValueOnce([0.15, 0.25, 0.35, 0.45, 0.55]); // Query embedding

      await experienceService.recordExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: "Shell command execution",
        action: "execute_command",
        result: "Command executed successfully",
        learning: "Shell commands work well",
        domain: "shell",
      });

      await experienceService.recordExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: "Terminal command execution",
        action: "run_command",
        result: "Command ran successfully",
        learning: "Terminal commands are effective",
        domain: "shell",
      });

      await experienceService.recordExperience({
        type: ExperienceType.FAILURE,
        outcome: OutcomeType.NEGATIVE,
        context: "Database query",
        action: "query_database",
        result: "Query failed",
        learning: "Database connection issues",
        domain: "database",
      });
    });

    it("should find similar experiences based on semantic similarity", async () => {
      const similar = await experienceService.findSimilarExperiences(
        "shell command execution",
        2,
      );

      expect(similar).toHaveLength(2);
      expect(similar[0].domain).toBe("shell");
      expect(similar[0].accessCount).toBe(1);
    });

    it("should return empty array for empty query", async () => {
      const similar = await experienceService.findSimilarExperiences("", 5);
      expect(similar).toHaveLength(0);
    });

    it("should handle embedding generation errors gracefully", async () => {
      mockRuntime.useModel = vi
        .fn()
        .mockRejectedValue(new Error("Embedding failed"));

      const similar = await experienceService.findSimilarExperiences(
        "test query",
        5,
      );
      expect(similar).toHaveLength(0);
    });
  });

  describe("analyzeExperiences", () => {
    beforeEach(async () => {
      // Add multiple experiences for analysis
      for (let i = 0; i < 5; i++) {
        await experienceService.recordExperience({
          type: ExperienceType.SUCCESS,
          outcome: OutcomeType.POSITIVE,
          context: `Shell command ${i}`,
          action: "execute_command",
          result: `Command ${i} executed successfully`,
          learning: `Shell command ${i} works well`,
          domain: "shell",
          confidence: 0.8 + i * 0.02,
          importance: 0.7,
        });
      }

      await experienceService.recordExperience({
        type: ExperienceType.FAILURE,
        outcome: OutcomeType.NEGATIVE,
        context: "Shell command failure",
        action: "execute_command",
        result: "Command failed",
        learning: "Some shell commands fail",
        domain: "shell",
        confidence: 0.9,
        importance: 0.8,
      });
    });

    it("should analyze experiences for a domain", async () => {
      const analysis = await experienceService.analyzeExperiences("shell");

      expect(analysis.frequency).toBe(6);
      expect(analysis.reliability).toBeGreaterThan(0.5);
      expect(analysis.pattern).toContain("command");
      expect(analysis.recommendations).toBeDefined();
      expect(analysis.alternatives).toBeDefined();
    });

    it("should analyze experiences for a specific type", async () => {
      const analysis = await experienceService.analyzeExperiences(
        "shell",
        ExperienceType.SUCCESS,
      );

      expect(analysis.frequency).toBe(5);
      expect(analysis.reliability).toBeGreaterThan(0.8);
    });

    it("should return empty analysis for no experiences", async () => {
      const analysis =
        await experienceService.analyzeExperiences("nonexistent");

      expect(analysis.frequency).toBe(0);
      expect(analysis.reliability).toBe(0);
      expect(analysis.pattern).toContain("No experiences found");
    });

    it("should generate recommendations based on reliability", async () => {
      const analysis = await experienceService.analyzeExperiences("shell");

      expect(analysis.recommendations).toContain(
        "Continue using successful approaches",
      );
    });
  });

  describe("memory management", () => {
    it("should prune old experiences when limit is exceeded", async () => {
      // Set a low limit for testing
      (experienceService as any).maxExperiences = 3;

      // Add more experiences than the limit
      for (let i = 0; i < 5; i++) {
        await experienceService.recordExperience({
          type: ExperienceType.LEARNING,
          outcome: OutcomeType.NEUTRAL,
          context: `Context ${i}`,
          action: `action_${i}`,
          result: `Result ${i}`,
          learning: `Learning ${i}`,
          domain: "test",
          confidence: 0.5,
          importance: i < 2 ? 0.1 : 0.9, // First two have low importance
        });
      }

      // Check that low importance experiences were pruned
      const allExperiences = await experienceService.queryExperiences({
        limit: 10,
      });
      expect(allExperiences.length).toBeLessThanOrEqual(3);

      // High importance experiences should remain
      const highImportanceRemaining = allExperiences.filter(
        (e) => e.importance > 0.5,
      );
      expect(highImportanceRemaining.length).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should handle embedding generation errors gracefully", async () => {
      mockRuntime.useModel = vi
        .fn()
        .mockRejectedValue(new Error("Model error"));

      const experience = await experienceService.recordExperience({
        type: ExperienceType.LEARNING,
        outcome: OutcomeType.NEUTRAL,
        context: "Test context",
        action: "test_action",
        result: "Test result",
        learning: "Test learning",
        domain: "test",
      });

      expect(experience.id).toBeDefined();
      expect(experience.embedding).toBeUndefined();
    });

    it("should handle event emission errors gracefully", async () => {
      mockRuntime.emitEvent = vi
        .fn()
        .mockRejectedValue(new Error("Event error"));

      const experience = await experienceService.recordExperience({
        type: ExperienceType.LEARNING,
        outcome: OutcomeType.NEUTRAL,
        context: "Test context",
        action: "test_action",
        result: "Test result",
        learning: "Test learning",
        domain: "test",
      });

      expect(experience.id).toBeDefined();
    });
  });

  describe("cosine similarity calculation", () => {
    it("should calculate cosine similarity correctly", async () => {
      const service = experienceService as any;

      // Test identical vectors
      const similarity1 = service.cosineSimilarity([1, 0, 0], [1, 0, 0]);
      expect(similarity1).toBe(1);

      // Test orthogonal vectors
      const similarity2 = service.cosineSimilarity([1, 0, 0], [0, 1, 0]);
      expect(similarity2).toBe(0);

      // Test opposite vectors
      const similarity3 = service.cosineSimilarity([1, 0, 0], [-1, 0, 0]);
      expect(similarity3).toBe(-1);

      // Test different length vectors
      const similarity4 = service.cosineSimilarity([1, 0], [1, 0, 0]);
      expect(similarity4).toBe(0);

      // Test zero vectors
      const similarity5 = service.cosineSimilarity([0, 0, 0], [1, 0, 0]);
      expect(similarity5).toBe(0);
    });
  });
});
