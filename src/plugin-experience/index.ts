import type { Plugin } from '@elizaos/core';
import { ExperienceService } from './service';
import { experienceRAGProvider } from './providers/experienceRAG';
import { recentExperiencesProvider } from './providers/recentExperiences';
import { experienceEvaluator } from './evaluators/experienceEvaluator';
import { IAgentRuntime } from '@elizaos/core';
import { logger } from '@elizaos/core';

export const experiencePlugin: Plugin = {
  name: 'experience',
  description:
    'Self-learning experience system that records experiences and learns from agent interactions',

  services: [ExperienceService],

  providers: [experienceRAGProvider, recentExperiencesProvider],

  evaluators: [experienceEvaluator],

  init: async (config: Record<string, any>, runtime: IAgentRuntime) => {
    logger.info('[ExperiencePlugin] Initializing self-learning experience system');

    const maxExperiences = config.maxExperiences || 10000;
    const autoRecordThreshold = config.autoRecordThreshold || 0.7;

    logger.info(`[ExperiencePlugin] Configuration read:
    - Max experiences: ${maxExperiences}
    - Auto-record threshold: ${autoRecordThreshold}`);

    // Initialize the experience service
    const experienceService = runtime.getService('EXPERIENCE') as ExperienceService;
    if (!experienceService) {
      logger.warn('[ExperiencePlugin] Experience service not available during initialization');
    }
  },
};

// Export individual components for testing
export { ExperienceService } from './service';
export * from './types';
