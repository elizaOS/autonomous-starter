import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type HandlerCallback,
} from '@elizaos/core';
import { ExperienceService } from '../service';
import { ActiveLearningManager } from '../utils/activeLearning';
import { detectDomain } from '../utils/experienceTextParser.js';

export const suggestExperimentAction: Action = {
  name: 'suggestExperiment',
  similes: [
    'suggest experiment',
    'what should I test',
    'identify learning gaps',
    'find uncertainties',
  ],
  description: 'Suggest experiments to test hypotheses and fill learning gaps',

  examples: [
    [
      {
        name: 'Autoliza',
        content: {
          text: 'I should identify what experiments would help me learn more',
          actions: ['SUGGEST_EXPERIMENT'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: 'Analyzing learning gaps and suggesting experiments...',
          actions: ['SUGGEST_EXPERIMENT'],
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
    const experienceService = runtime.getService('EXPERIENCE') as ExperienceService;

    if (!experienceService) {
      const errorResponse = {
        success: false,
        error: 'Experience service is not available.',
      };

      if (callback) {
        await callback({
          text: 'Experience service is not available.',
          actions: ['SUGGEST_EXPERIMENT'],
        });
      }
      return errorResponse;
    }

    try {
      const activeLearning = new ActiveLearningManager();

      // Get all experiences
      const allExperiences = await experienceService.queryExperiences({
        limit: 1000,
      });

      // Extract domain from message or state
      const messageText = message.content.text || '';
      const targetDomain = state?.domain || extractDomain(messageText);

      // Identify learning gaps
      const gaps = activeLearning.identifyLearningGaps(allExperiences);

      // Get suggested experiment
      const experiment = activeLearning.suggestNextExperiment(allExperiences);

      // Generate curriculum if requested
      let curriculum = null;
      if (messageText.includes('curriculum') || messageText.includes('plan')) {
        curriculum = activeLearning.generateLearningCurriculum(allExperiences, targetDomain);
      }

      // Format response
      let response = formatExperimentSuggestion(experiment, gaps, curriculum);

      const successResponse = {
        success: true,
        experiment,
        gaps,
        curriculum,
        totalExperiences: allExperiences.length,
        targetDomain,
      };

      if (callback) {
        await callback({
          text: response,
          actions: ['SUGGEST_EXPERIMENT'],
          metadata: successResponse,
        });
      }

      return successResponse;
    } catch (error) {
      logger.error('[suggestExperimentAction] Error suggesting experiment:', error);

      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      if (callback) {
        await callback({
          text: `Failed to suggest experiment: ${error instanceof Error ? error.message : String(error)}`,
          actions: ['SUGGEST_EXPERIMENT'],
        });
      }

      return errorResponse;
    }
  },
};

function extractDomain(text: string): string | undefined {
  const lower = text.toLowerCase();

  if (lower.includes('shell') || lower.includes('command')) return 'shell';
  if (lower.includes('code') || lower.includes('programming')) return 'coding';
  if (lower.includes('file') || lower.includes('system')) return 'system';
  if (lower.includes('network') || lower.includes('api')) return 'network';
  if (lower.includes('data') || lower.includes('json')) return 'data';

  return undefined;
}

function formatExperimentSuggestion(
  experiment: any,
  gaps: any[],
  curriculum: any[] | null
): string {
  let response = '**Learning Analysis:**\n\n';

  // Learning gaps summary
  if (gaps.length > 0) {
    response += '**Identified Learning Gaps:**\n';
    gaps.slice(0, 5).forEach((gap, index) => {
      response += `${index + 1}. **${gap.domain}**: ${gap.description} (uncertainty: ${(gap.uncertainty * 100).toFixed(0)}%)\n`;
    });
    response += '\n';
  } else {
    response += 'No significant learning gaps identified. Knowledge appears comprehensive.\n\n';
  }

  // Suggested experiment
  if (experiment) {
    response += '**Recommended Experiment:**\n';
    response += `📊 **Hypothesis**: ${experiment.hypothesis}\n`;
    response += `🎯 **Action**: ${experiment.action}\n`;
    response += `📈 **Expected Outcome**: ${experiment.expectedOutcome}\n`;
    response += `🏷️ **Domain**: ${experiment.domain}\n`;
    response += `⚡ **Priority**: ${(experiment.priority * 100).toFixed(0)}%\n\n`;

    response +=
      '**Rationale**: This experiment will help resolve the highest priority uncertainty in your knowledge base.\n\n';
  }

  // Learning curriculum
  if (curriculum && curriculum.length > 0) {
    response += '**Suggested Learning Curriculum:**\n';
    curriculum.slice(0, 5).forEach((exp, index) => {
      response += `\n${index + 1}. ${exp.hypothesis}\n`;
      response += `   - Action: ${exp.action}\n`;
      response += `   - Priority: ${(exp.priority * 100).toFixed(0)}%\n`;
    });

    if (curriculum.length > 5) {
      response += `\n... and ${curriculum.length - 5} more experiments\n`;
    }
  }

  // Recommendations
  response += '\n**Recommendations:**\n';
  if (experiment) {
    response += '1. Execute the recommended experiment to reduce uncertainty\n';
    response += '2. Record detailed observations during the experiment\n';
    response += '3. Analyze the outcome to update your knowledge base\n';
  } else {
    response += '1. Continue exploring new domains to expand knowledge\n';
    response += '2. Validate existing knowledge through practice\n';
    response += '3. Look for edge cases in well-understood domains\n';
  }

  return response;
}
