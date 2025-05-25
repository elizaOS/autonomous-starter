import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type HandlerCallback,
  parseKeyValueXml,
  UUID,
} from '@elizaos/core';
import { ExperienceService } from '../service.js';
import { Experience, ExperienceType, OutcomeType } from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import { detectDomain } from '../utils/experienceTextParser.js';

export const recordExperienceAction: Action = {
  name: 'recordExperience',
  description: 'Manually record a significant experience or learning',
  similes: ['log experience', 'save learning', 'record insight', 'note discovery'],
  examples: [],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Check if there's content to record
    return !!(message?.content?.text || state?.experience);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { callback?: HandlerCallback }
  ): Promise<any> => {
    try {
      const experienceService = runtime.getService('EXPERIENCE') as ExperienceService;
      if (!experienceService) {
        throw new Error('Experience service not available');
      }

      // Extract experience details from message or state
      const content = message.content.text || '';
      let type = ExperienceType.LEARNING;
      let outcome = OutcomeType.NEUTRAL;
      let learning = content;
      let confidence = 0.7;
      let importance = 0.5;
      let tags: string[] = [];
      let domain = 'general';

      // Parse type from content
      if (content.toLowerCase().includes('fail') || content.toLowerCase().includes('error')) {
        type = ExperienceType.FAILURE;
        outcome = OutcomeType.NEGATIVE;
      } else if (content.toLowerCase().includes('discover')) {
        type = ExperienceType.DISCOVERY;
        outcome = OutcomeType.POSITIVE;
      } else if (
        content.toLowerCase().includes('correct') ||
        content.toLowerCase().includes('wrong')
      ) {
        type = ExperienceType.CORRECTION;
        outcome = OutcomeType.POSITIVE;
      } else if (content.toLowerCase().includes('success')) {
        type = ExperienceType.SUCCESS;
        outcome = OutcomeType.POSITIVE;
      } else if (
        content.toLowerCase().includes('hypothesis') ||
        content.toLowerCase().includes('theory')
      ) {
        type = ExperienceType.HYPOTHESIS;
        outcome = OutcomeType.NEUTRAL;
      }

      // Extract tags from content
      const tagMatch = content.match(/#(\w+)/g);
      if (tagMatch) {
        tags = tagMatch.map((tag) => tag.substring(1));
      }

      // Detect domain from content
      domain = detectDomain(content, 'general');

      // Use state to override if provided
      if (state?.experienceType) {
        type = state.experienceType as ExperienceType;
      }
      if (state?.outcome) {
        outcome = state.outcome as OutcomeType;
      }
      if (state?.confidence !== undefined) {
        confidence = state.confidence as number;
      }
      if (state?.importance !== undefined) {
        importance = state.importance as number;
      }
      if (state?.tags) {
        tags = [...tags, ...(state.tags as string[])];
      }
      if (state?.domain) {
        domain = state.domain as string;
      }

      // Create the experience
      const experience = await experienceService.recordExperience({
        type,
        outcome,
        context: (state?.context as string) || 'Manual recording',
        action: (state?.action as string) || 'manual_record',
        result: content,
        learning,
        confidence,
        importance,
        domain,
        tags: ['manual', ...tags],
      });

      if (options?.callback) {
        await options.callback({
          text: `Recorded ${type} experience: "${learning}" with ${Math.round(confidence * 100)}% confidence and ${Math.round(importance * 100)}% importance.`,
          metadata: {
            experienceId: experience.id,
            type,
            outcome,
            confidence,
            importance,
          },
        });
      }

      return {
        success: true,
        experienceId: experience.id,
        type,
        outcome,
        learning,
        confidence,
        importance,
      };
    } catch (error) {
      logger.error('Error recording experience:', error);

      if (options?.callback) {
        await options.callback({
          text: `Failed to record experience: ${error.message}`,
          metadata: { error: error.message },
        });
      }

      return {
        success: false,
        error: error.message,
      };
    }
  },
};
