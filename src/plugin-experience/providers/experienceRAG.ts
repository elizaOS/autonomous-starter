import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type ProviderResult,
} from "@elizaos/core";
import { ExperienceService } from "../service.js";
import { type Experience } from "../types";
import {
  formatExperienceList,
  formatExperienceSummary,
} from "../utils/experienceFormatter.js";

export const experienceRAGProvider: Provider = {
  name: "experienceRAG",
  description: "Searches past experiences for relevant learnings and insights",

  async get(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<ProviderResult> {
    let searchQueryFromStateOrMessage =
      state?.query || message?.content?.text || "";
    try {
      const experienceService = runtime.getService(
        "EXPERIENCE",
      ) as ExperienceService;
      if (!experienceService) {
        return {
          data: {
            experiences: [],
            keyLearnings: [],
            highRelevance: 0,
            mediumRelevance: 0,
          },
          text: "Experience service not available",
          values: { query: searchQueryFromStateOrMessage },
        };
      }

      let searchQuery = "";
      if (message?.content?.text) {
        searchQuery = message.content.text;
      } else if (state?.query) {
        searchQuery = state.query as string;
      } else if (state?.currentAction) {
        searchQuery = `experiences related to ${state.currentAction}`;
      }
      searchQueryFromStateOrMessage = searchQuery; // Update with more specific query if found

      let experiences: Experience[] = [];
      let summaryText: string;
      let keyLearningsResult: string[] = [];
      let highRelevanceCount = 0;
      let mediumRelevanceCount = 0;

      if (!searchQuery) {
        const recent = await experienceService.queryExperiences({ limit: 5 });
        experiences = recent;
        summaryText = `Recent experiences:\n${formatExperienceList(recent)}`;
        keyLearningsResult = recent.map((e) => e.learning).slice(0, 3); // Extract some learnings
      } else {
        const searchResults = await experienceService.findSimilarExperiences(
          searchQuery,
          10,
        );
        experiences = searchResults;

        if (searchResults.length === 0) {
          summaryText = "No relevant past experiences found.";
        } else {
          const highRelevance = searchResults.filter(
            (e) => e.confidence >= 0.8 && e.importance >= 0.7,
          );
          const mediumRelevance = searchResults.filter(
            (e) =>
              (e.confidence >= 0.6 && e.confidence < 0.8) ||
              (e.importance >= 0.5 && e.importance < 0.7),
          );
          highRelevanceCount = highRelevance.length;
          mediumRelevanceCount = mediumRelevance.length;

          summaryText = `Found ${searchResults.length} relevant experiences:\n\n`;
          if (highRelevance.length > 0) {
            summaryText += `**Highly Relevant:**\n${formatExperienceList(highRelevance)}\n\n`;
          }
          if (mediumRelevance.length > 0) {
            summaryText += `**Potentially Relevant:**\n${formatExperienceList(mediumRelevance)}\n\n`;
          }

          keyLearningsResult = searchResults
            .filter((e) => e.confidence > 0.7)
            .map((e) => e.learning)
            .slice(0, 5);

          if (keyLearningsResult.length > 0) {
            summaryText += `**Key Learnings:**\n${keyLearningsResult.map((l, idx) => `${idx + 1}. ${l}`).join("\n")}`;
          }
        }
      }

      return {
        data: {
          experiences,
          keyLearnings: keyLearningsResult,
          highRelevance: highRelevanceCount,
          mediumRelevance: mediumRelevanceCount,
        },
        text: summaryText,
        values: { query: searchQuery },
      };
    } catch (error) {
      logger.error("Error in experienceRAGProvider:", error);
      const result: ProviderResult = {
        data: {
          experiences: [],
          keyLearnings: [],
          highRelevance: 0,
          mediumRelevance: 0,
        },
        text: "Error retrieving experiences",
        values: { query: searchQueryFromStateOrMessage },
      };
      return result;
    }
  },
};
