import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type HandlerCallback,
} from '@elizaos/core';
import { ExperienceService } from '../service';
import { ExperienceType, OutcomeType, type ExperienceQuery } from '../types';
import { formatExperienceList, getExperienceStats } from '../utils/experienceFormatter.js';

export const queryExperiencesAction: Action = {
  name: 'queryExperiences',
  similes: [
    'search experiences',
    'find experiences',
    'look up past experiences',
    'check experience history',
  ],
  description: 'Search through past experiences to find relevant learnings',

  examples: [
    [
      {
        name: 'Autoliza',
        content: {
          text: 'Let me search for experiences related to Python errors',
          actions: ['QUERY_EXPERIENCES'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: 'Searching for experiences related to Python errors...',
          actions: ['QUERY_EXPERIENCES'],
        },
      },
    ],
    [
      {
        name: 'Autoliza',
        content: {
          text: 'I need to check what I learned about shell commands',
          actions: ['QUERY_EXPERIENCES'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: 'Looking up past experiences with shell commands.',
          actions: ['QUERY_EXPERIENCES'],
        },
      },
    ],
  ],

  async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
    const experienceService = runtime.getService('EXPERIENCE') as ExperienceService;
    return !!experienceService;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<any> {
    // Extract callback from options if not provided as parameter
    const actualCallback = callback || (options?.callback as HandlerCallback);

    const experienceService = runtime.getService('EXPERIENCE') as ExperienceService;

    if (!experienceService) {
      const errorResponse = {
        success: false,
        error: 'Experience service is not available.',
        experiences: [],
        count: 0,
      };

      if (actualCallback) {
        await actualCallback({
          text: 'Experience service is not available.',
          actions: ['QUERY_EXPERIENCES'],
        });
      }
      return errorResponse;
    }

    try {
      const messageText = message.content.text || '';

      // Build query from message and merge with state
      const query = buildQueryFromMessage(messageText);

      // Override with state parameters if provided
      if (state) {
        if (state.type) query.type = state.type;
        if (state.outcome) query.outcome = state.outcome;
        if (state.domain) query.domain = state.domain;
        if (state.tags) query.tags = state.tags;
        if (state.minConfidence) query.minConfidence = state.minConfidence;
        if (state.minImportance) query.minImportance = state.minImportance;
        if (state.limit) query.limit = state.limit;
        if (state.timeRange) query.timeRange = state.timeRange;
      }

      // Execute query
      const experiences = await experienceService.queryExperiences(query);

      if (experiences.length === 0) {
        const emptyResponse = {
          success: true,
          experiences: [],
          count: 0,
          query,
        };

        if (actualCallback) {
          await actualCallback({
            text: 'No experiences found matching your criteria.',
            actions: ['QUERY_EXPERIENCES'],
          });
        }
        return emptyResponse;
      }

      // If searching by similarity, also get similar experiences
      let similarExperiences: any[] = [];
      if (!query.type && !query.domain && !query.tags) {
        // This was a general text search, so find similar
        similarExperiences = await experienceService.findSimilarExperiences(messageText, 3);
      }

      // Format results
      const formattedResults = formatExperienceResults(experiences, similarExperiences || []);

      // Analyze patterns if we have enough experiences
      let analysis = null;
      if (experiences.length >= 3) {
        const domain = experiences[0]?.domain || 'general';
        analysis = await experienceService.analyzeExperiences(domain);
      }

      logger.info(`[queryExperiencesAction] Found ${experiences.length} experiences`);

      const successResponse = {
        success: true,
        experiences,
        similarExperiences,
        count: experiences.length,
        query,
        analysis,
      };

      if (actualCallback) {
        let response = formattedResults;

        if (analysis && analysis.recommendations.length > 0) {
          response += '\n\n**Analysis & Recommendations:**\n';
          response += analysis.recommendations.map((r) => `- ${r}`).join('\n');
        }

        // Calculate stats for metadata
        const stats = {
          total: experiences.length,
          successRate:
            experiences.filter((e) => e.outcome === 'positive').length / experiences.length,
          averageConfidence:
            experiences.reduce((sum, e) => sum + (e.confidence || 0), 0) / experiences.length,
        };

        await actualCallback({
          text: response,
          actions: ['QUERY_EXPERIENCES'],
          metadata: {
            count: experiences.length,
            stats,
          },
        });
      }

      return successResponse;
    } catch (error) {
      logger.error('[queryExperiencesAction] Error querying experiences:', error);

      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        experiences: [],
        count: 0,
      };

      if (actualCallback) {
        await actualCallback({
          text: `Failed to query experiences: ${error instanceof Error ? error.message : String(error)}`,
          actions: ['QUERY_EXPERIENCES'],
        });
      }

      return errorResponse;
    }
  },
};

function buildQueryFromMessage(text: string): ExperienceQuery {
  const query: ExperienceQuery = {};
  const lower = text.toLowerCase();

  // Extract hashtags
  const hashtagMatches = text.match(/#(\w+)/g);
  if (hashtagMatches) {
    query.tags = hashtagMatches.map((tag) => tag.substring(1)); // Remove the # symbol
  }

  // Detect experience types
  const types: ExperienceType[] = [];
  if (lower.includes('success')) types.push(ExperienceType.SUCCESS);
  if (lower.includes('fail')) types.push(ExperienceType.FAILURE);
  if (lower.includes('discover')) types.push(ExperienceType.DISCOVERY);
  if (lower.includes('correct')) types.push(ExperienceType.CORRECTION);
  if (lower.includes('learn')) types.push(ExperienceType.LEARNING);
  if (lower.includes('warning')) types.push(ExperienceType.WARNING);

  if (types.length > 0) {
    query.type = types.length === 1 ? types[0] : types;
  }

  // Detect outcome types
  if (lower.includes('positive') || lower.includes('good')) {
    query.outcome = OutcomeType.POSITIVE;
  } else if (lower.includes('negative') || lower.includes('bad')) {
    query.outcome = OutcomeType.NEGATIVE;
  }

  // Detect domains
  const domains: string[] = [];
  if (lower.match(/shell|command|terminal|bash/)) domains.push('shell');
  if (lower.match(/code|programming|function|debug/)) domains.push('coding');
  if (lower.match(/file|directory|system/)) domains.push('file');
  if (lower.match(/network|http|api/)) domains.push('network');
  if (lower.match(/data|json|database/)) domains.push('data');
  if (lower.match(/plugin|module|load/)) domains.push('plugin');

  if (domains.length > 0) {
    query.domain = domains.length === 1 ? domains[0] : domains;
  }

  // Extract importance/confidence thresholds
  if (lower.includes('important') || lower.includes('high priority')) {
    query.minImportance = 0.7;
  }
  if (lower.includes('confident') || lower.includes('certain')) {
    query.minConfidence = 0.8;
  }

  // Time range
  if (lower.includes('today')) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    query.timeRange = { start: startOfDay.getTime() };
  } else if (lower.includes('yesterday')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    query.timeRange = { start: yesterday.getTime(), end: today.getTime() };
  } else if (lower.includes('this week')) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    query.timeRange = { start: weekAgo.getTime() };
  }

  // Default limit
  query.limit = 10;

  // Include related if looking for comprehensive info
  if (lower.includes('all') || lower.includes('comprehensive')) {
    query.includeRelated = true;
    query.limit = 20;
  }

  return query;
}

function formatExperienceResults(experiences: any[], similarExperiences: any[]): string {
  let result = `**Found ${experiences.length} relevant experiences:**\n\n`;

  // Group by type for better organization
  const byType = new Map<string, any[]>();
  for (const exp of experiences) {
    if (!byType.has(exp.type)) {
      byType.set(exp.type, []);
    }
    byType.get(exp.type)!.push(exp);
  }

  // Format each type group
  for (const [type, exps] of byType) {
    result += `📌 **${type.charAt(0).toUpperCase() + type.slice(1)} Experiences:**\n`;

    exps.slice(0, 3).forEach((exp, index) => {
      const emoji = getOutcomeEmoji(exp.outcome);
      const confidence = `${(exp.confidence * 100).toFixed(0)}%`;
      const time = formatRelativeTime(exp.createdAt);

      result += `\n${index + 1}. ${emoji} **${exp.learning}**\n`;
      result += `   Context: ${exp.context}\n`;
      result += `   Action: ${exp.action}\n`;
      result += `   Result: ${exp.result}\n`;
      result += `   Confidence: ${confidence} | ${time}\n`;

      if (exp.correctedBelief) {
        result += `   Correction: ${exp.previousBelief} → ${exp.correctedBelief}\n`;
      }
    });

    if (exps.length > 3) {
      result += `   ... and ${exps.length - 3} more ${type} experiences\n`;
    }
    result += '\n';
  }

  // Add similar experiences if any
  if (similarExperiences.length > 0) {
    result += '\n**Similar Experiences (by context):**\n';
    similarExperiences.forEach((exp, index) => {
      const emoji = getOutcomeEmoji(exp.outcome);
      result += `${index + 1}. ${emoji} ${exp.learning} (${exp.type})\n`;
    });
  }

  return result;
}

function getOutcomeEmoji(outcome: string): string {
  const emojis: Record<string, string> = {
    positive: '✅',
    negative: '❌',
    neutral: '➖',
    mixed: '🔄',
  };
  return emojis[outcome] || '❓';
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
