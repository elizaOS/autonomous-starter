import type { Plugin } from '@elizaos/core';
import { ExperienceService } from './service';
import { experienceRAGProvider } from './providers/experienceRAG';
import { recentExperiencesProvider } from './providers/recentExperiences';
import { recordExperienceAction } from './actions/recordExperience';
import { queryExperiencesAction } from './actions/queryExperiences';
import { analyzeOutcomeAction } from './actions/analyzeOutcome';
import { suggestExperimentAction } from './actions/suggestExperiment';
import { experienceEvaluator } from './evaluators/experienceEvaluator';
import { IAgentRuntime } from '@elizaos/core';
import { logger } from '@elizaos/core';

export const experiencePlugin: Plugin = {
  name: 'experience',
  description:
    'Self-learning experience system that records experiences and learns from agent interactions',

  services: [ExperienceService],

  providers: [experienceRAGProvider, recentExperiencesProvider],

  actions: [
    recordExperienceAction,
    queryExperiencesAction,
    analyzeOutcomeAction,
    suggestExperimentAction,
  ],

  evaluators: [experienceEvaluator],

  init: async (config: Record<string, any>, runtime: IAgentRuntime) => {
    logger.info('[ExperiencePlugin] Initializing self-learning experience system');

    const maxExperiences = config.maxExperiences || 10000;
    const autoRecordThreshold = config.autoRecordThreshold || 0.7;

    // await runtime.updateSetting('experience_maxExperiences', maxExperiences); // Reverted
    // await runtime.updateSetting('experience_autoRecordThreshold', autoRecordThreshold); // Reverted

    logger.info(`[ExperiencePlugin] Configuration read:
    - Max experiences: ${maxExperiences} (Note: Service currently uses internal default)
    - Auto-record threshold: ${autoRecordThreshold}`);
  },
};

// Export individual components for testing
export { ExperienceService } from './service';
export * from './types';
