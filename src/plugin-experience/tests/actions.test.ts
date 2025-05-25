import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordExperienceAction } from '../actions/recordExperience.js';
import { queryExperiencesAction } from '../actions/queryExperiences.js';
import { analyzeOutcomeAction } from '../actions/analyzeOutcome.js';
import { ExperienceService } from '../service.js';
import { ExperienceType, OutcomeType, type Experience } from '../types.js';
import type { IAgentRuntime, Memory, State, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// Helper to generate valid UUIDs for tests
const tuuid = (): UUID => uuidv4() as UUID;

// Mock the runtime and service
const mockExperienceService = {
  recordExperience: vi.fn(),
  queryExperiences: vi.fn(),
  findSimilarExperiences: vi.fn(),
  analyzeExperiences: vi.fn(),
} as unknown as ExperienceService;

const mockRuntime = {
  agentId: tuuid(),
  getService: vi.fn().mockReturnValue(mockExperienceService),
} as unknown as IAgentRuntime;

const createMockMessage = (text: string): Memory => ({
  id: tuuid(),
  agentId: mockRuntime.agentId,
  entityId: tuuid(),
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

// Helper to create a default mock experience
const createMockExperience = (overrides: Partial<Experience> = {}): Experience => ({
  id: tuuid(),
  agentId: mockRuntime.agentId,
  type: ExperienceType.LEARNING,
  outcome: OutcomeType.NEUTRAL,
  context: 'Test context',
  action: 'test_action',
  result: 'Test result',
  learning: 'Test learning',
  domain: 'general', // Default domain
  tags: [], // Default empty tags
  confidence: 0.5,
  importance: 0.5,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  accessCount: 0,
  lastAccessedAt: Date.now(),
  ...overrides,
});

describe('Experience Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordExperienceAction', () => {
    it('should validate when message has content', async () => {
      const message = createMockMessage('I learned something new');
      const isValid = await recordExperienceAction.validate(mockRuntime, message);
      expect(isValid).toBe(true);
    });

    it('should validate when state has experience', async () => {
      const message = createMockMessage('');
      const state = createMockState({ values: { experience: 'test experience' } });
      const isValid = await recordExperienceAction.validate(mockRuntime, message, state);
      expect(isValid).toBe(true);
    });

    it('should not validate when no content or experience', async () => {
      const message = createMockMessage('');
      const isValid = await recordExperienceAction.validate(mockRuntime, message);
      expect(isValid).toBe(false);
    });

    it('should record a success experience', async () => {
      const mockExperience = createMockExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        learning: 'Successfully completed task',
        confidence: 0.8,
        importance: 0.7,
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);

      const message = createMockMessage('I successfully completed the task');
      const result = (await recordExperienceAction.handler(mockRuntime, message)) as any;

      expect(result.success).toBe(true);
      expect(result.experienceId).toBe(mockExperience.id);
      expect(result.type).toBe(ExperienceType.SUCCESS);
      expect(mockExperienceService.recordExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ExperienceType.SUCCESS,
          outcome: OutcomeType.POSITIVE,
          learning: 'I successfully completed the task',
          domain: 'general',
          tags: ['manual'],
        })
      );
    });

    it('should record a failure experience', async () => {
      const mockExperience = createMockExperience({
        type: ExperienceType.FAILURE,
        outcome: OutcomeType.NEGATIVE,
        learning: 'Task failed due to error',
        confidence: 0.8,
        importance: 0.7,
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);

      const message = createMockMessage('The task failed with an error');
      const result = (await recordExperienceAction.handler(mockRuntime, message)) as any;

      expect(result.success).toBe(true);
      expect(result.type).toBe(ExperienceType.FAILURE);
      expect(mockExperienceService.recordExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ExperienceType.FAILURE,
          outcome: OutcomeType.NEGATIVE,
        })
      );
    });

    it('should detect domain from content', async () => {
      const mockExperience = createMockExperience({
        learning: 'Shell command works',
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);

      const message = createMockMessage('I learned how to use shell commands effectively');
      await recordExperienceAction.handler(mockRuntime, message);

      expect(mockExperienceService.recordExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'shell',
        })
      );
    });

    it('should extract tags from content', async () => {
      const mockExperience = createMockExperience({
        learning: 'Tagged learning',
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);

      const message = createMockMessage('I learned something #important #coding');
      await recordExperienceAction.handler(mockRuntime, message);

      expect(mockExperienceService.recordExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['manual', 'important', 'coding'],
        })
      );
    });

    it('should use state overrides', async () => {
      const mockExperience = createMockExperience({
        type: ExperienceType.DISCOVERY,
        outcome: OutcomeType.POSITIVE,
        learning: 'State override test',
        confidence: 0.9,
        importance: 0.8,
        domain: 'testing',
        tags: ['override'],
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);

      const message = createMockMessage('Test message');
      const state = createMockState({
        values: {
          experienceType: ExperienceType.DISCOVERY,
          outcome: OutcomeType.POSITIVE,
          confidence: 0.9,
          importance: 0.8,
          domain: 'testing',
          tags: ['override'],
        },
      });

      await recordExperienceAction.handler(mockRuntime, message, state);

      expect(mockExperienceService.recordExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ExperienceType.DISCOVERY,
          outcome: OutcomeType.POSITIVE,
          confidence: 0.9,
          importance: 0.8,
          domain: 'testing',
          tags: ['manual', 'override'],
        })
      );
    });

    it('should handle service errors', async () => {
      mockExperienceService.recordExperience = vi
        .fn()
        .mockRejectedValue(new Error('Service error'));

      const message = createMockMessage('Test message');
      const result = (await recordExperienceAction.handler(mockRuntime, message)) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });

    it('should call callback with success message', async () => {
      const mockExpId = tuuid();
      const mockExperience = createMockExperience({
        id: mockExpId,
        type: ExperienceType.LEARNING,
        learning: 'Callback test',
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);

      const callback = vi.fn();
      const message = createMockMessage('Test message');

      await recordExperienceAction.handler(mockRuntime, message, createMockState(), { callback });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Recorded learning experience'),
          metadata: expect.objectContaining({
            experienceId: mockExpId,
            type: ExperienceType.LEARNING,
          }),
        })
      );
    });
  });

  describe('queryExperiencesAction', () => {
    it('should always validate', async () => {
      const message = createMockMessage('');
      const isValid = await queryExperiencesAction.validate(mockRuntime, message);
      expect(isValid).toBe(true);
    });

    it('should query experiences by type from message', async () => {
      const mockQueryResult: Experience[] = [
        createMockExperience({
          type: ExperienceType.SUCCESS,
          learning: 'Success experience',
          confidence: 0.8,
          importance: 0.7,
        }),
      ];

      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue(mockQueryResult);

      const message = createMockMessage('Show me successful experiences');
      const result = (await queryExperiencesAction.handler(mockRuntime, message)) as any;

      expect(result.success).toBe(true);
      expect(result.experiences).toEqual(mockQueryResult);
      expect(mockExperienceService.queryExperiences).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ExperienceType.SUCCESS,
          limit: 10,
        })
      );
    });

    it('should query experiences by domain from message', async () => {
      const mockQueryResult: Experience[] = [
        createMockExperience({
          type: ExperienceType.LEARNING,
          domain: 'shell',
          learning: 'Shell experience',
          confidence: 0.7,
          importance: 0.6,
        }),
      ];

      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue(mockQueryResult);

      const message = createMockMessage('Find shell command experiences');
      await queryExperiencesAction.handler(mockRuntime, message);

      expect(mockExperienceService.queryExperiences).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'shell',
          limit: 10,
        })
      );
    });

    it('should extract tags from message', async () => {
      const mockQueryResult: Experience[] = [];
      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue(mockQueryResult);

      const message = createMockMessage('Find experiences with #coding #python tags');
      await queryExperiencesAction.handler(mockRuntime, message);

      expect(mockExperienceService.queryExperiences).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['coding', 'python'],
          limit: 10,
        })
      );
    });

    it('should use state parameters to override message parsing', async () => {
      const mockQueryResult: Experience[] = [];
      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue(mockQueryResult);

      const message = createMockMessage('Find experiences');
      const state = createMockState({
        values: {
          type: ExperienceType.FAILURE,
          outcome: OutcomeType.NEGATIVE,
          domain: 'testing',
          minConfidence: 0.8,
          limit: 5,
        },
      });

      await queryExperiencesAction.handler(mockRuntime, message, state);

      expect(mockExperienceService.queryExperiences).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ExperienceType.FAILURE,
          outcome: OutcomeType.NEGATIVE,
          domain: 'testing',
          minConfidence: 0.8,
          limit: 5,
        })
      );
    });

    it('should handle empty results', async () => {
      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue([]);

      const message = createMockMessage('Find nonexistent experiences');
      const callback = vi.fn();

      const result = (await queryExperiencesAction.handler(
        mockRuntime,
        message,
        createMockState(),
        {
          callback,
        }
      )) as any;

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'No experiences found matching your criteria.',
        })
      );
    });

    it('should format results with statistics', async () => {
      const mockQueryResult: Experience[] = [
        createMockExperience({
          type: ExperienceType.SUCCESS,
          outcome: OutcomeType.POSITIVE,
          learning: 'Success 1',
          confidence: 0.8,
          importance: 0.7,
          domain: 'shell',
          createdAt: Date.now(),
        }),
        createMockExperience({
          type: ExperienceType.FAILURE,
          outcome: OutcomeType.NEGATIVE,
          learning: 'Failure 1',
          confidence: 0.9,
          importance: 0.8,
          domain: 'coding',
          createdAt: Date.now(),
        }),
      ];

      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue(mockQueryResult);

      const message = createMockMessage('Find all experiences');
      const callback = vi.fn();

      await queryExperiencesAction.handler(mockRuntime, message, createMockState(), {
        callback,
      });

      expect(callback).toHaveBeenCalledWith({
        text: expect.stringContaining('Found 2 relevant experiences'),
        actions: ['QUERY_EXPERIENCES'],
        metadata: {
          count: 2,
          stats: {
            total: 2,
            successRate: 0.5,
            averageConfidence: expect.closeTo(0.85, 2),
          },
        },
      });
    });

    it('should handle service errors', async () => {
      mockExperienceService.queryExperiences = vi.fn().mockRejectedValue(new Error('Query error'));

      const message = createMockMessage('Find experiences');
      const result = (await queryExperiencesAction.handler(mockRuntime, message)) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Query error');
    });
  });

  describe('analyzeOutcomeAction', () => {
    it('should validate with message content', async () => {
      const message = createMockMessage('The task completed successfully');
      const isValid = await analyzeOutcomeAction.validate(mockRuntime, message);
      expect(isValid).toBe(true);
    });

    it('should validate with state action and outcome', async () => {
      const message = createMockMessage('');
      const state = createMockState({ values: { action: 'test_action', outcome: 'success' } });
      const isValid = await analyzeOutcomeAction.validate(mockRuntime, message, state);
      expect(isValid).toBe(true);
    });

    it('should not validate without content or state', async () => {
      const message = createMockMessage('');
      const isValid = await analyzeOutcomeAction.validate(mockRuntime, message);
      expect(isValid).toBe(false);
    });

    it('should analyze successful outcome', async () => {
      const mockExperience = createMockExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        learning: 'Action test_action completed successfully',
        confidence: 0.7,
        importance: 0.6,
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);
      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue([]);
      mockExperienceService.analyzeExperiences = vi.fn().mockResolvedValue({
        pattern: 'Consistent success',
        reliability: 0.8,
        recommendations: ['Continue with current approach'],
        alternatives: [],
      });

      const message = createMockMessage('Task completed successfully');
      const state = createMockState({ values: { action: 'test_action', success: true } });

      const result = (await analyzeOutcomeAction.handler(mockRuntime, message, state)) as any;

      expect(result.success).toBe(true);
      expect(result.type).toBe(ExperienceType.SUCCESS);
      expect(result.outcome).toBe(OutcomeType.POSITIVE);
      expect(mockExperienceService.recordExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ExperienceType.SUCCESS,
          outcome: OutcomeType.POSITIVE,
          action: 'test_action',
        })
      );
    });

    it('should analyze failed outcome', async () => {
      const mockExperience = createMockExperience({
        type: ExperienceType.FAILURE,
        outcome: OutcomeType.NEGATIVE,
        learning: 'Action test_action failed',
        confidence: 0.85,
        importance: 0.8,
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);
      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue([]);
      mockExperienceService.analyzeExperiences = vi.fn().mockResolvedValue({
        pattern: 'Frequent failures',
        reliability: 0.3,
        recommendations: ['Review approach', 'Consider alternatives'],
        alternatives: ['Alternative approach 1'],
      });

      const message = createMockMessage('Task failed with error');
      const state = createMockState({ values: { action: 'test_action', success: false } });

      const result = (await analyzeOutcomeAction.handler(mockRuntime, message, state)) as any;

      expect(result.type).toBe(ExperienceType.FAILURE);
      expect(result.outcome).toBe(OutcomeType.NEGATIVE);
    });

    it('should detect contradictions with previous experiences', async () => {
      const prevExpId = tuuid();
      const previousExperience: Partial<Experience> = {
        id: prevExpId,
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        action: 'test_action',
        learning: 'Previous success',
      };

      const mockExperience = createMockExperience({
        type: ExperienceType.CORRECTION,
        outcome: OutcomeType.NEGATIVE,
        learning: 'Contradicts previous experience',
        confidence: 0.9,
        importance: 0.9,
      });

      mockExperienceService.queryExperiences = vi
        .fn()
        .mockResolvedValue([previousExperience as Experience]);
      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);
      mockExperienceService.analyzeExperiences = vi.fn().mockResolvedValue({
        pattern: 'Inconsistent results',
        reliability: 0.5,
        recommendations: ['Investigate changing conditions'],
        alternatives: [],
      });

      const message = createMockMessage('Task failed unexpectedly');
      const state = createMockState({ values: { action: 'test_action', success: false } });

      const result = (await analyzeOutcomeAction.handler(mockRuntime, message, state)) as any;

      expect(result.type).toBe(ExperienceType.CORRECTION);
      expect(result.contradictions).toBe(1);
      expect(mockExperienceService.recordExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ExperienceType.CORRECTION,
          relatedExperiences: [prevExpId],
          previousBelief: 'Previous success',
        })
      );
    });

    it('should detect domain from action and content', async () => {
      const mockExperience = createMockExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        learning: 'Shell action succeeded',
        confidence: 0.7,
        importance: 0.6,
        domain: 'shell',
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);
      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue([]);
      mockExperienceService.analyzeExperiences = vi.fn().mockResolvedValue({
        pattern: 'Shell command success',
        reliability: 0.75,
        recommendations: ['Continue using shell commands'],
        alternatives: [],
      });

      const message = createMockMessage('Shell command executed successfully');
      const state = createMockState({ values: { action: 'shell_execute', success: true } });

      const result = (await analyzeOutcomeAction.handler(mockRuntime, message, state)) as any;

      expect(result.domain).toBe('shell');
      expect(mockExperienceService.recordExperience).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'shell',
        })
      );
    });

    it('should handle expectation matching', async () => {
      const mockExperience = createMockExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        learning: 'Action test_action performed as expected',
        confidence: 0.9,
        importance: 0.7,
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);
      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue([]);
      mockExperienceService.analyzeExperiences = vi.fn().mockResolvedValue({
        pattern: 'Expected behavior',
        reliability: 0.9,
        recommendations: ['Continue with current approach'],
        alternatives: [],
      });

      const message = createMockMessage('Task completed with expected output');
      const state = createMockState({
        values: {
          action: 'test_action',
          success: true,
          expectation: 'expected output',
        },
      });

      const result = (await analyzeOutcomeAction.handler(mockRuntime, message, state)) as any;

      expect(result.confidence).toBe(0.9);
      expect(result.importance).toBe(0.7);
    });

    it('should handle unexpected successful outcomes', async () => {
      const mockExperience = createMockExperience({
        type: ExperienceType.DISCOVERY,
        outcome: OutcomeType.POSITIVE,
        learning: 'Unexpected but positive outcome',
        confidence: 0.8,
        importance: 0.8,
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);
      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue([]);
      mockExperienceService.analyzeExperiences = vi.fn().mockResolvedValue({
        pattern: 'Unexpected discovery',
        reliability: 0.6,
        recommendations: ['Investigate new behavior', 'Update expectations'],
        alternatives: [],
      });

      const message = createMockMessage('Task completed with different output');
      const state = createMockState({
        values: {
          action: 'test_action',
          success: true,
          expectation: 'expected output',
        },
      });

      const result = (await analyzeOutcomeAction.handler(mockRuntime, message, state)) as any;

      expect(result.type).toBe(ExperienceType.DISCOVERY);
      expect(result.importance).toBe(0.8);
    });

    it('should call callback with analysis results', async () => {
      const mockExperience = createMockExperience({
        type: ExperienceType.SUCCESS,
        outcome: OutcomeType.POSITIVE,
        learning: 'Analysis callback test',
        confidence: 0.7,
        importance: 0.6,
      });

      mockExperienceService.recordExperience = vi.fn().mockResolvedValue(mockExperience);
      mockExperienceService.queryExperiences = vi.fn().mockResolvedValue([]);
      mockExperienceService.analyzeExperiences = vi.fn().mockResolvedValue({
        pattern: 'Test pattern',
        reliability: 0.7,
        recommendations: ['Test recommendation'],
        alternatives: [],
      });

      const callback = vi.fn();
      const message = createMockMessage('Task completed');
      const state = createMockState({ values: { action: 'test_action', success: true } });

      await analyzeOutcomeAction.handler(mockRuntime, message, state, { callback });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('Outcome Analysis'),
          actions: ['ANALYZE_OUTCOME'],
        })
      );
    });

    it('should handle service errors', async () => {
      mockExperienceService.queryExperiences = vi
        .fn()
        .mockRejectedValue(new Error('Analysis error'));

      const message = createMockMessage('Task completed');
      const state = createMockState({ values: { action: 'test_action', success: true } });

      const result = (await analyzeOutcomeAction.handler(mockRuntime, message, state)) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Analysis error');
    });
  });
});
