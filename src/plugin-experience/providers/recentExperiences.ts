import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type ProviderResult,
} from "@elizaos/core";
import { ExperienceService } from "../service.js";
import { ExperienceType, OutcomeType, type Experience } from "../types";
import {
  getExperienceStats,
  formatExperienceForDisplay,
  formatPatternSummary,
} from "../utils/experienceFormatter.js";
import { detectPatterns } from "../utils/experienceAnalyzer.js";

export const recentExperiencesProvider: Provider = {
  name: "recentExperiences",
  description: "Provides recent experiences, statistics, and detected patterns",

  async get(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<ProviderResult> {
    try {
      const experienceService = runtime.getService(
        "EXPERIENCE",
      ) as ExperienceService;
      if (!experienceService) {
        return {
          data: {
            experiences: [],
            patterns: [],
            stats: null,
          },
          text: "Experience service not available",
          values: { count: 0, limit: (state?.limit as number) || 10 },
        };
      }

      const limit = (state?.limit as number) || 10;
      const includeStats = state?.includeStats !== false;
      const includePatterns = state?.includePatterns !== false;

      const experiences: Experience[] =
        await experienceService.queryExperiences({
          limit,
          timeRange: {
            start: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
          },
        });

      let statsSummaryText: string | undefined = undefined;
      let patternsSummaryText: string | undefined = undefined;
      let experienceStats: any = null;
      let detectedPatternsResult: any[] = [];

      if (includeStats && experiences.length > 0) {
        experienceStats = getExperienceStats(experiences);
        statsSummaryText = `Total: ${experienceStats.total} | Success Rate: ${Math.round(experienceStats.successRate * 100)}% | Avg Confidence: ${Math.round(experienceStats.averageConfidence * 100)}% | Avg Importance: ${Math.round(experienceStats.averageImportance * 100)}%`;
      }

      if (includePatterns && experiences.length >= 5) {
        detectedPatternsResult = await detectPatterns(experiences);
        if (detectedPatternsResult.length > 0) {
          patternsSummaryText = detectedPatternsResult
            .slice(0, 3)
            .map((p) => formatPatternSummary(p))
            .join("\n");
        }
      }

      let summary = `Recent ${experiences.length} experiences:\n\n`;
      if (experiences.length === 0) {
        summary = "No experiences recorded yet.";
      } else {
        const topExperiences = experiences.slice(0, 3);
        topExperiences.forEach((exp, idx) => {
          summary += `${idx + 1}. ${formatExperienceForDisplay(exp)}\n\n`;
        });
        if (experiences.length > 3) {
          summary += `... and ${experiences.length - 3} more experiences.\n\n`;
        }
        if (statsSummaryText) {
          summary += `\n**Statistics:** ${statsSummaryText}\n`;
        }
        if (patternsSummaryText) {
          summary += `\n**Detected Patterns:**\n${patternsSummaryText}`;
        }
      }

      let timeRangeValue: any = null;
      if (experiences.length > 0) {
        const newest = new Date(experiences[0].createdAt);
        const oldest = new Date(experiences[experiences.length - 1].createdAt);
        timeRangeValue = {
          start: oldest.toISOString(),
          end: newest.toISOString(),
          duration: newest.getTime() - oldest.getTime(),
        };
      }

      return {
        data: {
          experiences,
          stats: experienceStats,
          patterns: detectedPatternsResult,
          statsSummary: statsSummaryText,
          patternsSummary: patternsSummaryText,
        },
        text: summary,
        values: {
          count: experiences.length,
          limit,
          includeStats,
          includePatterns,
          timeRange: timeRangeValue,
        },
      };
    } catch (error) {
      logger.error("Error in recentExperiencesProvider:", error);
      return {
        data: {
          experiences: [],
          patterns: [],
          stats: null,
        },
        text: "Error retrieving recent experiences",
        values: { count: 0, limit: (state?.limit as number) || 10 },
      };
    }
  },
};
