import { describe, it, expect, beforeEach, vi } from 'vitest';
import { experiencePlugin } from '../index.js';
import { ExperienceService } from '../service.js';
import { ExperienceType, OutcomeType } from '../types.js';
import { experienceEvaluator } from '../evaluators/experienceEvaluator.js';
import type { IAgentRuntime, Memory, ProviderResult, State, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate valid UUIDs for tests
const tuuid = (): UUID => uuidv4() as UUID;

// Mock runtime
const mockRuntime = {
  agentId: tuuid(),
  getService: vi.fn(),
  useModel: vi.fn(),
  emitEvent: vi.fn(),
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
  text: overrides.text || '',
  ...overrides,
});

describe('Experience Plugin Integration', () => {
  let experienceService: ExperienceService;
  let mockState: State;

  beforeEach(() => {
    vi.clearAllMocks();
    experienceService = new ExperienceService(mockRuntime);
    mockState = createMockState(); // Create a default mock state for each test

    // Mock the embedding model
    mockRuntime.useModel = vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
    mockRuntime.getService = vi.fn().mockReturnValue(experienceService);
  });

  afterEach(async () => {
    await experienceService.stop();
  });

  describe('Plugin Structure', () => {
    it('should export all required components', () => {
      expect(experiencePlugin.name).toBe('experience');
      expect(experiencePlugin.description).toContain('experiences');
      expect(experiencePlugin.services).toHaveLength(1);
      expect(experiencePlugin.providers).toHaveLength(2);
      expect(experiencePlugin.actions).toHaveLength(4);
      expect(experiencePlugin.evaluators).toHaveLength(1);
    });

    it('should have correct service type', () => {
      expect(ExperienceService.serviceType).toBe('EXPERIENCE');
    });

    it('should have all required providers', () => {
      const providerNames = experiencePlugin.providers?.map((p) => p.name) || [];
      expect(providerNames).toContain('experienceRAG');
      expect(providerNames).toContain('recentExperiences');
    });

    it('should have all required actions', () => {
      const actionNames = experiencePlugin.actions?.map((a) => a.name) || [];
      expect(actionNames).toContain('recordExperience');
      expect(actionNames).toContain('queryExperiences');
      expect(actionNames).toContain('analyzeOutcome');
      expect(actionNames).toContain('suggestExperiment');
    });

    it('should have experience evaluator', () => {
      const evaluatorNames = experiencePlugin.evaluators?.map((e) => e.name) || [];
      expect(evaluatorNames).toContain('EXPERIENCE_EVALUATOR');
    });
  });

  describe('End-to-End Experience Flow', () => {
    it('should record, query, and analyze experiences', async () => {
      // 1. Record a success experience
      const successExperience = await experienceService.recordExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: 'Shell command execution',
        action: 'execute_ls',
        result: 'Listed directory contents successfully',
        learning: 'ls command works well for directory listing',
        domain: 'shell',
        tags: ['shell', 'command', 'ls'],
        confidence: 0.9,
        importance: 0.7,
      });

      expect(successExperience.id).toBeDefined();
      expect(successExperience.type).toBe(ExperienceType.SUCCESS);

      // 2. Record a failure experience
      const failureExperience = await experienceService.recordExperience({
        type: ExperienceType.FAILURE,
        outcome: OutcomeType.NEGATIVE,
        context: 'Shell command execution',
        action: 'execute_rm',
        result: 'Permission denied',
        learning: 'rm command requires proper permissions',
        domain: 'shell',
        tags: ['shell', 'command', 'rm', 'permissions'],
        confidence: 0.8,
        importance: 0.9,
      });

      expect(failureExperience.id).toBeDefined();
      expect(failureExperience.type).toBe(ExperienceType.FAILURE);

      // 3. Query experiences by domain
      const shellExperiences = await experienceService.queryExperiences({
        domain: 'shell',
      });

      expect(shellExperiences).toHaveLength(2);
      expect(shellExperiences.every((e) => e.domain === 'shell')).toBe(true);

      // 4. Query experiences by outcome
      const positiveExperiences = await experienceService.queryExperiences({
        outcome: OutcomeType.POSITIVE,
      });

      expect(positiveExperiences).toHaveLength(1);
      expect(positiveExperiences[0].outcome).toBe(OutcomeType.POSITIVE);

      // 5. Find similar experiences
      const similarExperiences = await experienceService.findSimilarExperiences(
        'shell command execution',
        5
      );

      expect(similarExperiences.length).toBeGreaterThan(0);
      expect(similarExperiences.every((e) => e.domain === 'shell')).toBe(true);

      // 6. Analyze experiences
      const analysis = await experienceService.analyzeExperiences('shell');

      expect(analysis.frequency).toBe(2);
      expect(analysis.reliability).toBeGreaterThan(0);
      expect(analysis.recommendations).toBeDefined();
    });

    it('should handle experience corrections and contradictions', async () => {
      // Record initial experience
      await experienceService.recordExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: 'API call',
        action: 'call_api',
        result: 'API responded successfully',
        learning: 'API is reliable and fast',
        domain: 'network',
        confidence: 0.8,
        importance: 0.6,
      });

      // Record contradicting experience
      await experienceService.recordExperience({
        type: ExperienceType.FAILURE,
        outcome: OutcomeType.NEGATIVE,
        context: 'API call',
        action: 'call_api',
        result: 'API timeout',
        learning: 'API can be unreliable under load',
        domain: 'network',
        confidence: 0.9,
        importance: 0.8,
        previousBelief: 'API is reliable and fast',
        correctedBelief: 'API reliability depends on load conditions',
      });

      // Query to find related experiences
      const apiExperiences = await experienceService.queryExperiences({
        domain: 'network',
      });

      // Should find experiences with different outcomes for same action
      const outcomes = new Set(apiExperiences.map((e) => e.outcome));
      expect(outcomes.size).toBeGreaterThan(1); // Both positive and negative outcomes
    });

    it('should track access patterns and importance', async () => {
      // Record experience
      const experience = await experienceService.recordExperience({
        type: ExperienceType.LEARNING,
        outcome: OutcomeType.NEUTRAL,
        context: 'Learning test',
        action: 'test_learning',
        result: 'Knowledge gained',
        learning: 'Testing access patterns',
        domain: 'testing',
        confidence: 0.7,
        importance: 0.5,
      });

      expect(experience.accessCount).toBe(0);

      // Query the experience multiple times
      await experienceService.queryExperiences({ domain: 'testing' });
      await experienceService.queryExperiences({ domain: 'testing' });
      await experienceService.queryExperiences({ domain: 'testing' });

      // Check that access count increased
      const updatedExperiences = await experienceService.queryExperiences({ domain: 'testing' });
      expect(updatedExperiences[0].accessCount).toBeGreaterThan(0);
      expect(updatedExperiences[0].lastAccessedAt).toBeDefined();
    });
  });

  describe('Experience Evaluator Integration', () => {
    it('should validate agent messages', async () => {
      const agentMessage = createMockMessage(
        'I discovered something interesting',
        mockRuntime.agentId // Agent's own message
      );
      const userMessage = createMockMessage('Tell me about it', tuuid()); // Message from another user

      const agentValid = await experienceEvaluator.validate(mockRuntime, agentMessage, mockState);
      const userValid = await experienceEvaluator.validate(mockRuntime, userMessage, mockState);

      expect(agentValid).toBe(true);
      expect(userValid).toBe(false);
    });

    it('should detect and record discoveries', async () => {
      const message = createMockMessage(
        'I found that the system has jq installed for JSON processing'
      );

      await experienceEvaluator.handler(mockRuntime, message, mockState);

      // Check that an experience was recorded
      const experiences = await experienceService.queryExperiences({
        type: ExperienceType.DISCOVERY,
      });

      expect(experiences.length).toBeGreaterThan(0);
      expect(experiences[0].type).toBe(ExperienceType.DISCOVERY);
      expect(experiences[0].learning).toContain('jq');
    });

    it('should detect and record failures with corrections', async () => {
      const message = createMockMessage(
        'Error: ModuleNotFoundError for pandas. After installing pandas, the script ran successfully and produced the expected output.'
      );

      await experienceEvaluator.handler(mockRuntime, message, mockState);

      // Check that a correction experience was recorded
      const experiences = await experienceService.queryExperiences({
        type: ExperienceType.CORRECTION,
      });

      expect(experiences.length).toBeGreaterThan(0);
      expect(experiences[0].type).toBe(ExperienceType.CORRECTION);
      expect(experiences[0].outcome).toBe(OutcomeType.POSITIVE);
    });

    it('should detect and record hypotheses', async () => {
      const message = createMockMessage('I think the issue might be related to file permissions');

      await experienceEvaluator.handler(mockRuntime, message, mockState);

      // Check that a hypothesis experience was recorded
      const experiences = await experienceService.queryExperiences({
        type: ExperienceType.HYPOTHESIS,
      });

      expect(experiences.length).toBeGreaterThan(0);
      expect(experiences[0].type).toBe(ExperienceType.HYPOTHESIS);
      expect(experiences[0].outcome).toBe(OutcomeType.NEUTRAL);
    });

    it('should detect domain-specific experiences', async () => {
      const shellMessage = createMockMessage('Successfully executed the shell command ls -la');
      const codingMessage = createMockMessage('Fixed the function by adding proper error handling');

      await experienceEvaluator.handler(mockRuntime, shellMessage, mockState);
      await experienceEvaluator.handler(mockRuntime, codingMessage, mockState);

      const shellExperiences = await experienceService.queryExperiences({ domain: 'shell' });
      const codingExperiences = await experienceService.queryExperiences({ domain: 'coding' });

      expect(shellExperiences.length).toBeGreaterThan(0);
      expect(codingExperiences.length).toBeGreaterThan(0);
      expect(shellExperiences[0].domain).toBe('shell');
      expect(codingExperiences[0].domain).toBe('coding');
    });
  });

  describe('Provider Integration', () => {
    beforeEach(async () => {
      // Add some test experiences
      await experienceService.recordExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        context: 'File operations',
        action: 'create_file',
        result: 'File created successfully',
        learning: 'File creation works with proper permissions',
        domain: 'system',
        tags: ['file', 'create'],
        confidence: 0.9,
        importance: 0.7,
      });

      await experienceService.recordExperience({
        type: ExperienceType.DISCOVERY,
        outcome: OutcomeType.POSITIVE,
        context: 'System exploration',
        action: 'explore_tools',
        result: 'Found useful command line tools',
        learning: 'System has comprehensive CLI tools available',
        domain: 'system',
        tags: ['tools', 'cli'],
        confidence: 0.8,
        importance: 0.8,
      });
    });

    it('should provide relevant experiences via RAG provider', async () => {
      const ragProvider = experiencePlugin.providers?.find((p) => p.name === 'experienceRAG');
      expect(ragProvider).toBeDefined();

      const message = createMockMessage('file operations');
      const result = (await ragProvider!.get(mockRuntime, message, mockState)) as ProviderResult & {
        experiences?: any[];
        summary?: string;
        keyLearnings?: any[];
      };

      expect(result.data?.experiences).toBeDefined();
      expect(result.text).toContain('experiences'); // Assuming summary/keyLearnings are part of the text
    });

    it('should provide recent experiences with statistics', async () => {
      const recentProvider = experiencePlugin.providers?.find(
        (p) => p.name === 'recentExperiences'
      );
      expect(recentProvider).toBeDefined();

      const message = createMockMessage('');
      const result = (await recentProvider!.get(
        mockRuntime,
        message,
        mockState
      )) as ProviderResult & { experiences?: any[]; count?: number; stats?: any; summary?: string };

      expect(result.data?.experiences).toBeDefined();
      expect(result.values?.count).toBeGreaterThan(0);
      expect(result.data?.stats).toBeDefined();
      expect(result.text).toContain('experiences');
    });
  });

  describe('Memory Management', () => {
    it('should handle large numbers of experiences efficiently', async () => {
      // Set a low limit for testing
      (experienceService as any).maxExperiences = 10;

      // Add many experiences
      for (let i = 0; i < 15; i++) {
        await experienceService.recordExperience({
          type: ExperienceType.LEARNING,
          outcome: OutcomeType.NEUTRAL,
          context: `Context ${i}`,
          action: `action_${i}`,
          result: `Result ${i}`,
          learning: `Learning ${i}`,
          domain: 'test',
          confidence: 0.5,
          importance: i < 5 ? 0.1 : 0.9, // First 5 have low importance
        });
      }

      // Check that experiences were pruned
      const allExperiences = await experienceService.queryExperiences({ limit: 20 });
      expect(allExperiences.length).toBeLessThanOrEqual(10);

      // High importance experiences should be retained
      const highImportanceCount = allExperiences.filter((e) => e.importance > 0.5).length;
      expect(highImportanceCount).toBeGreaterThan(0);
    });

    it('should handle embedding generation failures gracefully', async () => {
      // Mock embedding failure
      mockRuntime.useModel = vi.fn().mockRejectedValue(new Error('Embedding failed'));

      const experience = await experienceService.recordExperience({
        type: ExperienceType.LEARNING,
        outcome: OutcomeType.NEUTRAL,
        context: 'Test context',
        action: 'test_action',
        result: 'Test result',
        learning: 'Test learning',
        domain: 'test',
      });

      expect(experience.id).toBeDefined();
      expect(experience.embedding).toBeUndefined();

      // Should still be able to query
      const experiences = await experienceService.queryExperiences({ domain: 'test' });
      expect(experiences).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailability gracefully', async () => {
      const mockRuntimeNoService = {
        ...mockRuntime,
        getService: vi.fn().mockReturnValue(null),
      } as unknown as IAgentRuntime;

      const ragProvider = experiencePlugin.providers?.find((p) => p.name === 'experienceRAG');
      const message = createMockMessage('test query');

      const result = (await ragProvider!.get(
        mockRuntimeNoService,
        message,
        mockState
      )) as ProviderResult & { experiences?: any[]; summary?: string };

      expect(result.data?.experiences).toEqual([]);
      expect(result.text).toContain('not available');
    });

    it('should handle malformed queries gracefully', async () => {
      const experiences = await experienceService.queryExperiences({
        // @ts-ignore - intentionally malformed query
        invalidField: 'invalid',
      });

      expect(Array.isArray(experiences)).toBe(true);
    });

    it('should handle concurrent access safely', async () => {
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
            domain: 'concurrent',
          })
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      expect(results).toHaveLength(10);
      expect(results.every((r) => r.id)).toBe(true);

      // All should be queryable
      const allExperiences = await experienceService.queryExperiences({ domain: 'concurrent' });
      expect(allExperiences).toHaveLength(10);
    });
  });
});
