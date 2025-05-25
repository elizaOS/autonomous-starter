import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type ProviderResult,
} from '@elizaos/core';
import { ExperienceService } from '../service.js';
import { type Experience } from '../types';
import { formatExperienceList, formatExperienceSummary } from '../utils/experienceFormatter.js';

export const experienceRAGProvider: Provider = {
  name: 'experienceRAG',
  description: 'Searches past experiences for relevant learnings and insights',

  async get(runtime: IAgentRuntime, message: Memory, state?: State): Promise<any> {
    try {
      const experienceService = runtime.getService('EXPERIENCE') as ExperienceService;
      if (!experienceService) {
        return {
          experiences: [],
          summary: 'Experience service not available',
        };
      }

      // Extract search query from message or state
      let searchQuery = '';
      if (message?.content?.text) {
        searchQuery = message.content.text;
      } else if (state?.query) {
        searchQuery = state.query as string;
      } else if (state?.currentAction) {
        searchQuery = `experiences related to ${state.currentAction}`;
      }

      if (!searchQuery) {
        // Return recent experiences if no specific query
        const recent = await experienceService.queryExperiences({ limit: 5 });
        return {
          experiences: recent,
          summary: `Recent experiences:\n${formatExperienceList(recent)}`,
          count: recent.length,
        };
      }

      // Search for similar experiences using semantic search
      const experiences = await experienceService.findSimilarExperiences(searchQuery, 10);

      if (experiences.length === 0) {
        return {
          experiences: [],
          summary: 'No relevant past experiences found.',
          query: searchQuery,
        };
      }

      // Group by relevance (confidence and importance)
      const highRelevance = experiences.filter((e) => e.confidence >= 0.8 && e.importance >= 0.7);
      const mediumRelevance = experiences.filter(
        (e) =>
          (e.confidence >= 0.6 && e.confidence < 0.8) || (e.importance >= 0.5 && e.importance < 0.7)
      );

      let summary = `Found ${experiences.length} relevant experiences:\n\n`;

      if (highRelevance.length > 0) {
        summary += `**Highly Relevant:**\n${formatExperienceList(highRelevance)}\n\n`;
      }

      if (mediumRelevance.length > 0) {
        summary += `**Potentially Relevant:**\n${formatExperienceList(mediumRelevance)}\n\n`;
      }

      // Extract key learnings
      const keyLearnings = experiences
        .filter((e) => e.confidence > 0.7)
        .map((e) => e.learning)
        .slice(0, 5);

      if (keyLearnings.length > 0) {
        summary += `**Key Learnings:**\n${keyLearnings.map((l, idx) => `${idx + 1}. ${l}`).join('\n')}`;
      }

      return {
        experiences,
        summary,
        query: searchQuery,
        keyLearnings,
        highRelevance: highRelevance.length,
        mediumRelevance: mediumRelevance.length,
      };
    } catch (error) {
      logger.error('Error in experienceRAGProvider:', error);
      return {
        experiences: [],
        summary: 'Error retrieving experiences',
        error: error.message,
      };
    }
  },
};
