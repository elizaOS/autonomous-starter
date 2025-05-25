import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type ProviderResult,
} from '@elizaos/core';
import { ExperienceService } from '../service.js';
import { ExperienceType, OutcomeType } from '../types';
import { getExperienceStats, formatExperienceForDisplay } from '../utils/experienceFormatter.js';
import { detectPatterns } from '../utils/experienceAnalyzer.js';
import { formatPatternSummary } from '../utils/experienceFormatter.js';

export const recentExperiencesProvider: Provider = {
  name: 'recentExperiences',
  description: 'Provides recent experiences, statistics, and detected patterns',

  async get(runtime: IAgentRuntime, message: Memory, state?: State): Promise<any> {
    try {
      const experienceService = runtime.getService('EXPERIENCE') as ExperienceService;
      if (!experienceService) {
        return {
          experiences: [],
          stats: null,
          patterns: [],
          summary: 'Experience service not available',
        };
      }

      // Get limit from state or default
      const limit = (state?.limit as number) || 10;
      const includeStats = state?.includeStats !== false;
      const includePatterns = state?.includePatterns !== false;

      // Get recent experiences
      const experiences = await experienceService.queryExperiences({
        limit,
        timeRange: {
          start: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
        },
      });

      let result: any = {
        experiences,
        count: experiences.length,
      };

      // Add statistics if requested
      if (includeStats && experiences.length > 0) {
        const stats = getExperienceStats(experiences);
        result.stats = stats;

        // Create a summary of stats
        result.statsSummary = `Total: ${stats.total} | Success Rate: ${Math.round(stats.successRate * 100)}% | Avg Confidence: ${Math.round(stats.averageConfidence * 100)}% | Avg Importance: ${Math.round(stats.averageImportance * 100)}%`;
      }

      // Detect patterns if requested
      if (includePatterns && experiences.length >= 5) {
        const patterns = await detectPatterns(experiences);
        result.patterns = patterns;

        if (patterns.length > 0) {
          result.patternsSummary = patterns
            .slice(0, 3)
            .map((p) => formatPatternSummary(p))
            .join('\n');
        }
      }

      // Create formatted summary
      let summary = `Recent ${experiences.length} experiences:\n\n`;

      if (experiences.length === 0) {
        summary = 'No experiences recorded yet.';
      } else {
        // Show top 3 experiences in detail
        const topExperiences = experiences.slice(0, 3);
        topExperiences.forEach((exp, idx) => {
          summary += `${idx + 1}. ${formatExperienceForDisplay(exp)}\n\n`;
        });

        if (experiences.length > 3) {
          summary += `... and ${experiences.length - 3} more experiences.\n\n`;
        }

        if (result.statsSummary) {
          summary += `\n**Statistics:** ${result.statsSummary}\n`;
        }

        if (result.patternsSummary) {
          summary += `\n**Detected Patterns:**\n${result.patternsSummary}`;
        }
      }

      result.summary = summary;

      // Add time range
      if (experiences.length > 0) {
        const newest = new Date(experiences[0].createdAt);
        const oldest = new Date(experiences[experiences.length - 1].createdAt);
        result.timeRange = {
          start: oldest.toISOString(),
          end: newest.toISOString(),
          duration: newest.getTime() - oldest.getTime(),
        };
      }

      return result;
    } catch (error) {
      logger.error('Error in recentExperiencesProvider:', error);
      return {
        experiences: [],
        stats: null,
        patterns: [],
        summary: 'Error retrieving recent experiences',
        error: error.message,
      };
    }
  },
};
