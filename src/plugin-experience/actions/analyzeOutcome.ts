import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type HandlerCallback,
} from '@elizaos/core';
import { ExperienceService } from '../service';
import { ExperienceType, OutcomeType } from '../types';
import { detectDomain } from '../utils/experienceTextParser.js';

export const analyzeOutcomeAction: Action = {
  name: 'analyzeOutcome',
  similes: ['analyze result', 'validate hypothesis', 'check outcome', 'evaluate result'],
  description: 'Analyze the outcome of an action and validate any hypotheses',

  examples: [
    [
      {
        name: 'Autoliza',
        content: {
          text: 'Let me analyze whether my hypothesis about Python virtual environments was correct',
          actions: ['ANALYZE_OUTCOME'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: 'Analyzing the outcome of my hypothesis...',
          actions: ['ANALYZE_OUTCOME'],
        },
      },
    ],
    [
      {
        name: 'Autoliza',
        content: {
          text: 'I need to validate whether my approach to handling shell errors worked',
          actions: ['ANALYZE_OUTCOME'],
        },
      },
      {
        name: 'Autoliza',
        content: {
          text: 'Validating the outcome of my error handling approach.',
          actions: ['ANALYZE_OUTCOME'],
        },
      },
    ],
  ],

  async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
    const experienceService = runtime.getService('EXPERIENCE') as ExperienceService;
    if (!experienceService) return false;

    // Validate if there's content to analyze or state with action/outcome
    return !!(
      message?.content?.text ||
      (state?.action && (state?.outcome || state?.success !== undefined))
    );
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
      };

      if (actualCallback) {
        await actualCallback({
          text: 'Experience service is not available.',
          actions: ['ANALYZE_OUTCOME'],
        });
      }
      return errorResponse;
    }

    try {
      const messageText = message.content.text || '';
      const previousMessages = state?.recentMessagesData || [];

      // Look for recent hypotheses to validate
      const recentHypotheses = await experienceService.queryExperiences({
        type: ExperienceType.HYPOTHESIS,
        timeRange: {
          start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
        },
        limit: 5,
      });

      // Extract what we're trying to validate
      const validationTarget = extractValidationTarget(messageText, previousMessages);

      // Find matching hypothesis
      let matchingHypothesis = null;
      if (recentHypotheses.length > 0) {
        matchingHypothesis = findMatchingHypothesis(recentHypotheses, validationTarget);
      }

      // Analyze the outcome based on state or message
      let outcomeAnalysis: OutcomeAnalysis;
      const currentMessageDomain = detectDomain(messageText + (state?.action || ''));

      if (state?.action && state?.success !== undefined) {
        // Use state information for analysis
        outcomeAnalysis = {
          outcome: state.success ? OutcomeType.POSITIVE : OutcomeType.NEGATIVE,
          result: messageText || `Action ${state.action} ${state.success ? 'succeeded' : 'failed'}`,
          learning: generateLearning(
            state.success ? OutcomeType.POSITIVE : OutcomeType.NEGATIVE,
            messageText,
            `Action: ${state.action}`
          ),
          confidence: state.expectation
            ? messageText.toLowerCase().includes(state.expectation.toLowerCase()) ||
              state.expectation.includes('should succeed') === state.success
              ? 0.9
              : 0.7
            : 0.8,
          validated: state.expectation
            ? messageText.toLowerCase().includes(state.expectation.toLowerCase()) ||
              state.expectation.includes('should succeed') === state.success
            : null,
        };
      } else {
        // Analyze from message content
        outcomeAnalysis = analyzeOutcome(messageText, previousMessages);
      }

      // Check for contradictions with previous experiences
      const previousExperiences = await experienceService.queryExperiences({
        domain: currentMessageDomain,
        limit: 10,
      });

      const hasContradiction = previousExperiences.some(
        (exp) => exp.outcome !== outcomeAnalysis.outcome && exp.action === state?.action
      );

      // Determine experience type based on analysis
      let experienceType = ExperienceType.VALIDATION;
      if (hasContradiction) {
        experienceType = ExperienceType.CORRECTION;
      } else if (matchingHypothesis && outcomeAnalysis.validated !== null) {
        experienceType = ExperienceType.CORRECTION;
      } else if (
        outcomeAnalysis.outcome === OutcomeType.POSITIVE &&
        outcomeAnalysis.validated === false
      ) {
        experienceType = ExperienceType.DISCOVERY;
      } else if (outcomeAnalysis.outcome === OutcomeType.NEGATIVE) {
        experienceType = ExperienceType.FAILURE;
      } else if (outcomeAnalysis.outcome === OutcomeType.POSITIVE) {
        experienceType = ExperienceType.SUCCESS;
      }

      // Record the validation experience
      const validationExperience = await experienceService.recordExperience({
        type: experienceType,
        outcome: outcomeAnalysis.outcome,
        context: matchingHypothesis
          ? `Validating hypothesis: ${matchingHypothesis.learning}`
          : `Analyzing outcome: ${validationTarget}`,
        action: state?.action || 'outcome validation',
        result: outcomeAnalysis.result,
        learning: outcomeAnalysis.learning,
        domain: currentMessageDomain,
        tags: ['validation', 'analysis'],
        confidence: outcomeAnalysis.confidence,
        importance: state?.expectation && outcomeAnalysis.validated === false ? 0.8 : 0.7,
        relatedExperiences: hasContradiction
          ? previousExperiences.map((e) => e.id)
          : matchingHypothesis
            ? [matchingHypothesis.id]
            : undefined,
        previousBelief: hasContradiction ? previousExperiences[0]?.learning : undefined,
      });

      // Count contradictions if this was unexpected
      let contradictions = 0;
      if (hasContradiction) {
        // Count experiences that contradict the current outcome
        contradictions = previousExperiences.filter(
          (exp) => exp.outcome !== outcomeAnalysis.outcome && exp.action === state?.action
        ).length;
      }

      // Analyze patterns in the domain
      const domainAnalysis = await experienceService.analyzeExperiences(currentMessageDomain);

      logger.info(
        `[analyzeOutcomeAction] Recorded validation experience: ${validationExperience.id}`
      );

      const successResponse = {
        success: true,
        experienceId: validationExperience.id,
        type: experienceType,
        outcome: outcomeAnalysis.outcome,
        learning: outcomeAnalysis.learning,
        confidence: outcomeAnalysis.confidence,
        importance: validationExperience.importance,
        domain: currentMessageDomain,
        contradictions,
        validated: outcomeAnalysis.validated,
        hypothesis: matchingHypothesis,
        analysis: domainAnalysis,
      };

      // Format response
      let response = formatOutcomeAnalysis(outcomeAnalysis, matchingHypothesis, domainAnalysis);

      if (actualCallback) {
        await actualCallback({
          text: response,
          actions: ['ANALYZE_OUTCOME'],
        });
      }

      return successResponse;
    } catch (error) {
      logger.error('[analyzeOutcomeAction] Error analyzing outcome:', error);

      const errorResponse = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      if (actualCallback) {
        await actualCallback({
          text: `Failed to analyze outcome: ${error instanceof Error ? error.message : String(error)}`,
          actions: ['ANALYZE_OUTCOME'],
        });
      }

      return errorResponse;
    }
  },
};

interface OutcomeAnalysis {
  outcome: OutcomeType;
  result: string;
  learning: string;
  confidence: number;
  validated: boolean | null;
}

function extractValidationTarget(text: string, previousMessages: Memory[]): string {
  // Look for hypothesis mentions
  const hypothesisMatch = text.match(/hypothesis (?:about|regarding) (.+?)(?:\.|,|$)/i);
  if (hypothesisMatch) {
    return hypothesisMatch[1].trim();
  }

  // Look for approach mentions
  const approachMatch = text.match(/approach (?:to|for) (.+?)(?:\.|,|$)/i);
  if (approachMatch) {
    return approachMatch[1].trim();
  }

  // Use recent context
  if (previousMessages.length > 0) {
    const recent = previousMessages.slice(-2);
    const context = recent
      .map((m) => m.content.text)
      .filter(Boolean)
      .join(' ');

    // Extract key phrases
    const keyPhraseMatch = context.match(/(?:trying|testing|validating) (.+?)(?:\.|,|$)/i);
    if (keyPhraseMatch) {
      return keyPhraseMatch[1].trim();
    }
  }

  return text;
}

function findMatchingHypothesis(hypotheses: any[], target: string): any | null {
  const targetLower = target.toLowerCase();

  // Look for exact or partial matches
  for (const hypothesis of hypotheses) {
    const learningLower = hypothesis.learning.toLowerCase();

    // Check if hypothesis mentions the target
    if (learningLower.includes(targetLower) || targetLower.includes(learningLower)) {
      return hypothesis;
    }

    // Check for keyword overlap
    const targetWords = targetLower.split(/\s+/);
    const learningWords = learningLower.split(/\s+/);
    const overlap = targetWords.filter((word) => learningWords.includes(word)).length;

    if (overlap >= Math.min(3, targetWords.length * 0.5)) {
      return hypothesis;
    }
  }

  // Return most recent if no match found
  return hypotheses.length > 0 ? hypotheses[0] : null;
}

function analyzeOutcome(text: string, previousMessages: Memory[]): OutcomeAnalysis {
  const lower = text.toLowerCase();
  const context = previousMessages
    .slice(-3)
    .map((m) => m.content.text)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let outcome = OutcomeType.NEUTRAL;
  let confidence = 0.7;
  let validated: boolean | null = null;

  // Detect positive outcomes
  if (
    lower.includes('worked') ||
    lower.includes('success') ||
    lower.includes('correct') ||
    lower.includes('confirmed')
  ) {
    outcome = OutcomeType.POSITIVE;
    confidence = 0.9;
    validated = true;
  }

  // Detect negative outcomes
  else if (
    lower.includes('failed') ||
    lower.includes('error') ||
    lower.includes('wrong') ||
    lower.includes('incorrect')
  ) {
    outcome = OutcomeType.NEGATIVE;
    confidence = 0.9;
    validated = false;
  }

  // Detect mixed outcomes
  else if (lower.includes('partially') || lower.includes('somewhat') || lower.includes('mixed')) {
    outcome = OutcomeType.MIXED;
    confidence = 0.8;
    validated = null;
  }

  // Extract result
  let result = 'Outcome analyzed';
  const resultMatch = text.match(/(?:result|outcome|produced|got) (.+?)(?:\.|$)/i);
  if (resultMatch) {
    result = resultMatch[1].trim();
  }

  // Generate learning
  let learning = generateLearning(outcome, text, context);

  return {
    outcome,
    result,
    learning,
    confidence,
    validated,
  };
}

function generateLearning(outcome: OutcomeType, text: string, context: string): string {
  const lower = text.toLowerCase();

  // Try to extract explicit learning
  const learningMatch = text.match(/(?:learned|shows|indicates|means) (?:that )?(.+?)(?:\.|$)/i);
  if (learningMatch) {
    return learningMatch[1].trim();
  }

  // Generate based on outcome
  switch (outcome) {
    case OutcomeType.POSITIVE:
      if (lower.includes('hypothesis')) {
        return 'Hypothesis was correct and approach validated';
      }
      return 'Approach was successful and can be used in similar situations';

    case OutcomeType.NEGATIVE:
      if (lower.includes('hypothesis')) {
        return 'Hypothesis was incorrect, need to revise understanding';
      }
      return 'Approach did not work, need to try alternative methods';

    case OutcomeType.MIXED:
      return 'Approach had mixed results, may need refinement';

    default:
      return 'Outcome recorded for future reference';
  }
}

function formatOutcomeAnalysis(
  analysis: OutcomeAnalysis,
  hypothesis: any | null,
  domainAnalysis: any
): string {
  let response = '**Outcome Analysis:**\n\n';

  // Outcome summary
  const outcomeEmoji = {
    positive: '✅',
    negative: '❌',
    neutral: '➖',
    mixed: '🔄',
  }[analysis.outcome];

  response += `${outcomeEmoji} **Outcome:** ${analysis.outcome}\n`;
  response += `📊 **Result:** ${analysis.result}\n`;
  response += `💡 **Learning:** ${analysis.learning}\n`;
  response += `🎯 **Confidence:** ${(analysis.confidence * 100).toFixed(0)}%\n\n`;

  // Hypothesis validation
  if (hypothesis && analysis.validated !== null) {
    response += '**Hypothesis Validation:**\n';
    response += `Original hypothesis: "${hypothesis.learning}"\n`;
    response += `Status: ${analysis.validated ? '✅ Confirmed' : '❌ Rejected'}\n\n`;
  }

  // Domain insights
  if (domainAnalysis && domainAnalysis.recommendations.length > 0) {
    response += '**Domain Insights:**\n';
    response += `Pattern: ${domainAnalysis.pattern}\n`;
    response += `Reliability: ${(domainAnalysis.reliability * 100).toFixed(0)}%\n`;

    if (domainAnalysis.recommendations.length > 0) {
      response += '\n**Recommendations:**\n';
      domainAnalysis.recommendations.forEach((rec: string, i: number) => {
        response += `${i + 1}. ${rec}\n`;
      });
    }

    if (domainAnalysis.alternatives && domainAnalysis.alternatives.length > 0) {
      response += '\n**Alternative Approaches:**\n';
      domainAnalysis.alternatives.forEach((alt: string, i: number) => {
        response += `${i + 1}. ${alt}\n`;
      });
    }
  }

  return response;
}
