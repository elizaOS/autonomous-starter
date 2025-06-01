import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { experiencePlugin } from "../index.js";
import { ExperienceService } from "../service.js";
import { ExperienceType, OutcomeType } from "../types.js";
import { experienceEvaluator } from "../evaluators/experienceEvaluator.js";
import type {
  IAgentRuntime,
  Memory,
  ProviderResult,
  State,
  UUID,
  Provider,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

// Helper to generate valid UUIDs for tests
const tuuid = (): UUID => uuidv4() as UUID;

// Mock providers - these will be default mocks, can be overridden in specific tests/describes
const mockRAGProvider: Provider = {
  name: "experienceRAG",
  description: "Mock RAG provider",
  get: vi.fn(), // Default empty mock
};

const mockRecentProvider: Provider = {
  name: "recentExperiences",
  description: "Mock recent experiences provider",
  get: vi.fn(), // Default empty mock
};

// Mock runtime
const mockRuntime = {
  agentId: tuuid(),
  getService: vi.fn(),
  useModel: vi.fn(),
  emitEvent: vi.fn(),
  providers: [mockRAGProvider, mockRecentProvider],
} as unknown as IAgentRuntime;

const createMockMessage = (text: string, entityId?: UUID): Memory => ({
  id: tuuid(),
  agentId: mockRuntime.agentId,
  entityId: entityId || mockRuntime.agentId, // entityId is the sender
  roomId: tuuid(),
  content: { text },
  createdAt: Date.now(),
  embedding: [],
});

const createMockState = (overrides: Partial<State> = {}): State => ({
  values: overrides.values || {},
  data: overrides.data || {},
  text: overrides.text || "",
  ...overrides,
});

describe("Experience Plugin Integration", () => {
  let experienceService: ExperienceService;
  let mockState: State;

  // General beforeEach for the entire integration suite
  beforeEach(() => {
    vi.clearAllMocks(); // Clear all mocks before each test in the suite
    experienceService = new ExperienceService(mockRuntime);
    mockState = createMockState();
    mockRuntime.useModel = vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
    mockRuntime.getService = vi.fn().mockReturnValue(experienceService);

    // Reset specific provider mocks to a default behavior if needed, or leave them empty
    // if they are meant to be set in more specific describe blocks or tests
    (mockRAGProvider.get as jest.Mock).mockImplementation(async () => ({
      data: { experiences: [], keyLearnings: [] },
      text: "Default mock RAG response",
    }));
    (mockRecentProvider.get as jest.Mock).mockImplementation(async () => ({
      data: {
        experiences: [],
        patterns: [],
        stats: { averageConfidence: 0.7, total: 0 },
      },
      text: "Default mock Recent response",
      values: { count: 0 },
    }));
  });

  afterEach(async () => {
    await experienceService.stop();
  });

  describe("Plugin Structure", () => {
    it("should export all required components", () => {
      expect(experiencePlugin.name).toBe("experience");
      expect(experiencePlugin.description).toContain("experiences");
      expect(experiencePlugin.services).toHaveLength(1);
      expect(experiencePlugin.providers).toHaveLength(2);
      expect(experiencePlugin.evaluators).toHaveLength(1);
    });

    it("should have correct service type", () => {
      expect(ExperienceService.serviceType).toBe("EXPERIENCE");
    });

    it("should have all required providers", () => {
      const providerNames =
        experiencePlugin.providers?.map((p) => p.name) || [];
      expect(providerNames).toContain("experienceRAG");
      expect(providerNames).toContain("recentExperiences");
    });

    it("should have experience evaluator", () => {
      const evaluatorNames =
        experiencePlugin.evaluators?.map((e) => e.name) || [];
      expect(evaluatorNames).toContain("EXPERIENCE_EVALUATOR");
    });
  });

  describe("End-to-End Experience Flow", () => {
    it("should record, query, and analyze experiences", async () => {
      // 1. Record a success experience
      const successExperience = await experienceService.recordExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: "Shell command execution",
        action: "execute_ls",
        result: "Listed directory contents successfully",
        learning: "ls command works well for directory listing",
        domain: "shell",
        tags: ["shell", "command", "ls"],
        confidence: 0.9,
        importance: 0.7,
      });

      expect(successExperience.id).toBeDefined();
      expect(successExperience.type).toBe(ExperienceType.SUCCESS);

      // 2. Record a failure experience
      const failureExperience = await experienceService.recordExperience({
        type: ExperienceType.FAILURE,
        outcome: OutcomeType.NEGATIVE,
        context: "Shell command execution",
        action: "execute_rm",
        result: "Permission denied",
        learning: "rm command requires proper permissions",
        domain: "shell",
        tags: ["shell", "command", "rm", "permissions"],
        confidence: 0.8,
        importance: 0.9,
      });

      expect(failureExperience.id).toBeDefined();
      expect(failureExperience.type).toBe(ExperienceType.FAILURE);

      // 3. Query experiences by domain
      const shellExperiences = await experienceService.queryExperiences({
        domain: "shell",
      });

      expect(shellExperiences).toHaveLength(2);
      expect(shellExperiences.every((e) => e.domain === "shell")).toBe(true);

      // 4. Query experiences by outcome
      const positiveExperiences = await experienceService.queryExperiences({
        outcome: OutcomeType.POSITIVE,
      });

      expect(positiveExperiences).toHaveLength(1);
      expect(positiveExperiences[0].outcome).toBe(OutcomeType.POSITIVE);

      // 5. Find similar experiences
      const similarExperiences = await experienceService.findSimilarExperiences(
        "shell command execution",
        5,
      );

      expect(similarExperiences.length).toBeGreaterThan(0);
      expect(similarExperiences.every((e) => e.domain === "shell")).toBe(true);

      // 6. Analyze experiences
      const analysis = await experienceService.analyzeExperiences("shell");

      expect(analysis.frequency).toBe(2);
      expect(analysis.reliability).toBeGreaterThan(0);
      expect(analysis.recommendations).toBeDefined();
    });

    it("should handle experience corrections and contradictions", async () => {
      // Record initial experience
      await experienceService.recordExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: "API call",
        action: "call_api",
        result: "API responded successfully",
        learning: "API is reliable and fast",
        domain: "network",
        confidence: 0.8,
        importance: 0.6,
      });

      // Record contradicting experience
      await experienceService.recordExperience({
        type: ExperienceType.FAILURE,
        outcome: OutcomeType.NEGATIVE,
        context: "API call",
        action: "call_api",
        result: "API timeout",
        learning: "API can be unreliable under load",
        domain: "network",
        confidence: 0.9,
        importance: 0.8,
        previousBelief: "API is reliable and fast",
        correctedBelief: "API reliability depends on load conditions",
      });

      // Query to find related experiences
      const apiExperiences = await experienceService.queryExperiences({
        domain: "network",
      });

      // Should find experiences with different outcomes for same action
      const outcomes = new Set(apiExperiences.map((e) => e.outcome));
      expect(outcomes.size).toBeGreaterThan(1); // Both positive and negative outcomes
    });

    it("should track access patterns and importance", async () => {
      // Record experience
      const experience = await experienceService.recordExperience({
        type: ExperienceType.LEARNING,
        outcome: OutcomeType.NEUTRAL,
        context: "Learning test",
        action: "test_learning",
        result: "Knowledge gained",
        learning: "Testing access patterns",
        domain: "testing",
        confidence: 0.7,
        importance: 0.5,
      });

      expect(experience.accessCount).toBe(0);

      // Query the experience multiple times
      await experienceService.queryExperiences({ domain: "testing" });
      await experienceService.queryExperiences({ domain: "testing" });
      await experienceService.queryExperiences({ domain: "testing" });

      // Check that access count increased
      const updatedExperiences = await experienceService.queryExperiences({
        domain: "testing",
      });
      expect(updatedExperiences[0].accessCount).toBeGreaterThan(0);
      expect(updatedExperiences[0].lastAccessedAt).toBeDefined();
    });
  });

  describe("Experience Evaluator Integration", () => {
    beforeEach(() => {
      // More specific default mocks for this block if needed, or rely on the outer beforeEach
      // For instance, RAG might be called more specifically here
      (mockRAGProvider.get as jest.Mock).mockImplementation(
        async (runtime, message, state) => {
          const query = state?.query?.toLowerCase() || "";
          let experiences = [
            { id: tuuid(), learning: "Generic RAG for evaluator" },
          ];
          let keyLearnings = query.startsWith("domain:")
            ? [`Learning for ${query}`]
            : [];
          return {
            data: { experiences, keyLearnings },
            text: "Evaluator RAG response",
          };
        },
      );
      (mockRecentProvider.get as jest.Mock).mockImplementation(
        async (runtime, message, state) => ({
          data: {
            experiences: [],
            patterns: state?.includePatterns
              ? [
                  {
                    description: "Pattern for evaluator",
                    frequency: 3,
                    significance: "medium",
                  },
                ]
              : [],
            stats: { averageConfidence: 0.8, total: 5 },
          },
          text: "Evaluator Recent response",
          values: { count: 0 },
        }),
      );
    });

    it("should validate agent messages", async () => {
      const agentMessage = createMockMessage(
        "Agent message",
        mockRuntime.agentId,
      );
      const userMessage = createMockMessage("User message", tuuid());
      expect(
        await experienceEvaluator.validate(
          mockRuntime,
          agentMessage,
          mockState,
        ),
      ).toBe(true);
      expect(
        await experienceEvaluator.validate(mockRuntime, userMessage, mockState),
      ).toBe(false);
    });

    it("should detect and record discoveries using providers", async () => {
      const discoveryText =
        "I found that the system has jq installed for JSON processing";
      const message = createMockMessage(discoveryText);
      mockState.recentMessagesData = [];

      // Specific mock for the first RAG call (general query)
      (mockRAGProvider.get as jest.Mock).mockResolvedValueOnce({
        data: { experiences: [], keyLearnings: [] }, // No prior similar experiences
        text: "Initial RAG for discovery",
      });
      // Specific mock for the second RAG call (domain analysis)
      (mockRAGProvider.get as jest.Mock).mockResolvedValueOnce({
        data: {
          experiences: [],
          keyLearnings: ["Key learning for system domain via jq discovery"],
        },
        text: "Domain RAG for discovery",
      });

      await experienceEvaluator.handler(mockRuntime, message, mockState);

      expect(mockRAGProvider.get).toHaveBeenCalledTimes(2);
      expect(mockRAGProvider.get).toHaveBeenNthCalledWith(
        1,
        mockRuntime,
        message,
        expect.objectContaining({ query: discoveryText.toLowerCase() }),
      );
      expect(mockRAGProvider.get).toHaveBeenNthCalledWith(
        2,
        mockRuntime,
        message,
        expect.objectContaining({ query: `domain:system` }),
      );

      const experiences = await experienceService.queryExperiences({
        type: ExperienceType.DISCOVERY,
      });
      expect(experiences.length).toBeGreaterThan(0);
      expect(experiences[0].learning).toContain("jq");

      const learningExperiences = await experienceService.queryExperiences({
        type: ExperienceType.LEARNING,
        domain: "system",
      });
      expect(learningExperiences.length).toBeGreaterThan(0);
      expect(learningExperiences[0].learning).toContain(
        "Key learning for system domain via jq discovery",
      );
    });

    it("should use pattern detection from recentExperiences provider", async () => {
      const message = createMockMessage(
        "Agent message that does not trigger other specific detections",
      );
      mockState.recentMessagesData = [
        createMockMessage("p1"),
        createMockMessage("p2"),
        createMockMessage("p3"),
      ];

      // Specific mock for this test's recentProvider call
      (mockRecentProvider.get as jest.Mock).mockResolvedValueOnce({
        data: {
          experiences: [],
          patterns: [
            {
              description:
                "Test pattern from recent for pattern detection test",
              frequency: 5,
              significance: "high",
            },
          ],
          stats: { averageConfidence: 0.85, total: 10 }, // Ensure high confidence for pattern to be recorded
        },
        text: "Recent experiences for pattern detection test",
        values: { count: 3 },
      });

      await experienceEvaluator.handler(mockRuntime, message, mockState);

      expect(mockRecentProvider.get).toHaveBeenCalledWith(
        mockRuntime,
        message,
        expect.objectContaining({ includePatterns: true }),
      );

      const experiences = await experienceService.queryExperiences({
        type: ExperienceType.VALIDATION,
      });
      expect(experiences.length).toBeGreaterThan(0);
      expect(experiences[0].learning).toContain(
        "Test pattern from recent for pattern detection test",
      );
    });

    it("should handle provider errors gracefully and record a learning experience", async () => {
      const message = createMockMessage(
        "Test message causing RAG provider error",
      );
      mockState.recentMessagesData = [];

      // Mock RAGProvider.get to reject specifically for THIS test case
      (mockRAGProvider.get as jest.Mock).mockRejectedValueOnce(
        new Error("Isolated RAG error"),
      );
      // Ensure recent provider is benign for this specific test call if it gets called
      (mockRecentProvider.get as jest.Mock).mockResolvedValueOnce({
        data: { experiences: [], patterns: [], stats: null },
        text: "Recent provider benign response during RAG error",
        values: { count: 0 },
      });

      await experienceEvaluator.handler(mockRuntime, message, mockState);

      const learningExperiences = await experienceService.queryExperiences({
        type: ExperienceType.LEARNING,
        domain: "system",
      });
      expect(learningExperiences.length).toBeGreaterThan(0);
      expect(learningExperiences[0].learning).toContain(
        "An error occurred in experience evaluator: Isolated RAG error",
      );
    });
  });

  describe("Provider Integration", () => {
    beforeEach(async () => {
      // This block needs its own fresh setup for service and experiences
      vi.clearAllMocks();
      experienceService = new ExperienceService(mockRuntime);
      mockRuntime.getService = vi.fn().mockReturnValue(experienceService);

      await experienceService.recordExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: "File ops success",
        action: "mkfile",
        result: "Created",
        learning: "mkfile works",
        domain: "system",
      });
      await experienceService.recordExperience({
        type: ExperienceType.DISCOVERY,
        outcome: OutcomeType.POSITIVE,
        context: "Tool discovery",
        action: "findtool",
        result: "Found it",
        learning: "new tool available",
        domain: "system",
      });
    });

    it("should provide relevant experiences via RAG provider", async () => {
      const ragProvider = experiencePlugin.providers?.find(
        (p) => p.name === "experienceRAG",
      );
      expect(ragProvider).toBeDefined();
      const message = createMockMessage("system file ops");

      const expectedExperiences = await experienceService.queryExperiences({
        domain: "system",
      });
      // Mock the data that the RAG provider would use to generate its text
      (mockRAGProvider.get as jest.Mock).mockResolvedValueOnce({
        data: {
          experiences: expectedExperiences,
          keyLearnings: ["RAG Learning for file ops"],
        },
        // text: 'RAG success for provider test' // We expect the provider to generate its own text
        // Let the actual provider generate the text based on the mocked data
      });

      const result = await ragProvider!.get(mockRuntime, message, mockState);
      expect(result.data).toBeDefined();
      expect(result.data.experiences).toEqual(expectedExperiences);
      // Assert based on content expected from formatExperienceList with expectedExperiences
      expect(result.text).toContain("Found 2 relevant experiences"); // From the actual provider logic
      expect(result.text).toContain("mkfile works");
      expect(result.text).toContain("new tool available");
    });

    it("should provide recent experiences with statistics", async () => {
      const recentProvider = experiencePlugin.providers?.find(
        (p) => p.name === "recentExperiences",
      );
      expect(recentProvider).toBeDefined();
      const message = createMockMessage("");
      const recentExperiencesData = await experienceService.queryExperiences({
        limit: 2,
      });

      // Mock the data that the Recent provider would use
      (mockRecentProvider.get as jest.Mock).mockResolvedValueOnce({
        data: {
          experiences: recentExperiencesData,
          patterns: [],
          stats: {
            averageConfidence: 0.85,
            total: recentExperiencesData.length,
          },
        },
        // text: 'Recent success for provider test', // Provider will generate its own text
        values: { count: recentExperiencesData.length },
      });

      const result = await recentProvider!.get(mockRuntime, message, mockState);
      expect(result.data).toBeDefined();
      expect(result.data.experiences).toEqual(recentExperiencesData);
      expect(result.values?.count).toBe(recentExperiencesData.length);
      expect(result.data.stats?.total).toBe(recentExperiencesData.length);
      // Assert based on content expected from the recentExperiences provider's formatting
      expect(result.text).toContain(
        `Recent ${recentExperiencesData.length} experiences`,
      );
      expect(result.text).toContain("mkfile works");
      expect(result.text).toContain("Statistics"); // It adds a statistics summary
    });
  });

  describe("Memory Management", () => {
    // These tests should be mostly self-contained or use the general beforeEach
    it("should handle large numbers of experiences efficiently", async () => {
      (experienceService as any).maxExperiences = 10;
      for (let i = 0; i < 15; i++) {
        await experienceService.recordExperience({
          type: ExperienceType.LEARNING,
          context: `Ctx ${i}`,
          action: `act_${i}`,
          result: `Res ${i}`,
          learning: `Learn ${i}`,
          importance: i < 5 ? 0.1 : 0.9, // Make some less important
        });
      }
      const allExperiences = await experienceService.queryExperiences({
        limit: 20,
      });
      expect(allExperiences.length).toBeLessThanOrEqual(10);
      const highImportanceCount = allExperiences.filter(
        (e) => e.importance > 0.5,
      ).length;
      expect(highImportanceCount).toBeGreaterThanOrEqual(5); // At least the 10 - 5 = 5 high importance ones should remain, possibly more if some low imp were kept
    });

    it("should handle embedding generation failures gracefully", async () => {
      (mockRuntime.useModel as jest.Mock).mockRejectedValueOnce(
        new Error("Embedding model fail"),
      );
      const experience = await experienceService.recordExperience({
        learning: "No embedding",
      });
      expect(experience.id).toBeDefined();
      expect(experience.embedding).toBeUndefined();
      const experiences = await experienceService.queryExperiences({
        domain: "general",
      });
      expect(experiences.some((e) => e.id === experience.id)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle service unavailability gracefully", async () => {
      const mockRuntimeNoService = {
        ...mockRuntime,
        getService: vi.fn().mockReturnValue(null),
      } as unknown as IAgentRuntime;
      const ragProvider = experiencePlugin.providers?.find(
        (p) => p.name === "experienceRAG",
      );
      const result = await ragProvider!.get(
        mockRuntimeNoService,
        createMockMessage("q"),
        createMockState(),
      );
      expect(result.data?.experiences).toEqual([]);
      expect(result.text).toContain("not available");
    });

    it("should handle malformed queries gracefully", async () => {
      const experiences = await experienceService.queryExperiences({
        // @ts-ignore - intentionally malformed query
        invalidField: "invalid",
      });

      expect(Array.isArray(experiences)).toBe(true);
    });

    it("should handle concurrent access safely", async () => {
      // Create multiple concurrent operations
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          experienceService.recordExperience({
            type: ExperienceType.LEARNING,
            outcome: OutcomeType.NEUTRAL,
            context: `Concurrent context ${i}`,
            action: `concurrent_action_${i}`,
            result: `Concurrent result ${i}`,
            learning: `Concurrent learning ${i}`,
            domain: "concurrent",
          }),
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(10);
      expect(results.every((r) => r.id)).toBe(true);

      // All should be queryable
      const allExperiences = await experienceService.queryExperiences({
        domain: "concurrent",
      });
      expect(allExperiences).toHaveLength(10);
    });
  });
});

// Helper function
function detectDomain(text: string): string {
  const domains = {
    shell: ["command", "terminal", "bash", "shell", "execute", "script"],
    coding: ["code", "function", "variable", "syntax", "programming", "debug"],
    system: ["file", "directory", "process", "memory", "cpu", "system"],
    network: ["http", "api", "request", "response", "url", "network"],
    data: ["json", "csv", "database", "query", "data"],
  };
  const lowerText = text.toLowerCase();
  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return domain;
    }
  }
  return "general";
}
