import {
  type Evaluator,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type HandlerCallback,
} from '@elizaos/core';
import { ExperienceService } from '../service';
import { ExperienceType, OutcomeType } from '../types';

export const experienceEvaluator: Evaluator = {
  name: 'EXPERIENCE_EVALUATOR',
  similes: ['experience recorder', 'learning evaluator', 'self-reflection'],
  description:
    'Evaluates agent actions and outcomes to record significant experiences and learnings',
  alwaysRun: true,

  examples: [
    {
      prompt: 'The agent successfully executed a shell command after initially failing',
      messages: [
        {
          name: 'Autoliza',
          content: {
            text: 'Let me try to run this Python script.',
          },
        },
        {
          name: 'Autoliza',
          content: {
            text: 'Error: ModuleNotFoundError for pandas. I need to install it first.',
          },
        },
        {
          name: 'Autoliza',
          content: {
            text: 'After installing pandas, the script ran successfully and produced the expected output.',
          },
        },
      ],
      outcome:
        'Record a CORRECTION experience about needing to install dependencies before running Python scripts',
    },
    {
      prompt: 'The agent discovered a new system capability',
      messages: [
        {
          name: 'Autoliza',
          content: {
            text: 'I found that the system has jq installed, which is perfect for parsing JSON data.',
          },
        },
      ],
      outcome: 'Record a DISCOVERY experience about the availability of jq for JSON processing',
    },
  ],

  async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
    // Only evaluate agent's own messages
    return message.entityId === runtime.agentId;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
    responses?: Memory[]
  ): Promise<void> {
    const experienceService = runtime.getService('EXPERIENCE') as ExperienceService;

    if (!experienceService) {
      logger.warn('[experienceEvaluator] Experience service not available');
      return;
    }

    try {
      const messageText = message.content.text?.toLowerCase() || '';
      const previousMessages = state?.recentMessagesData || [];

      // Detect different types of experiences
      let experienceDetected = false;

      // 1. Detect failures and corrections
      if (
        messageText.includes('error') ||
        messageText.includes('failed') ||
        messageText.includes('mistake')
      ) {
        // Check if there's a subsequent success
        const hasCorrection =
          messageText.includes('fixed') ||
          messageText.includes('solved') ||
          messageText.includes('successfully') ||
          messageText.includes('now works');

        if (hasCorrection) {
          await experienceService.recordExperience({
            type: ExperienceType.CORRECTION,
            outcome: OutcomeType.POSITIVE,
            context: `Previous attempt failed, but found solution`,
            action: extractAction(messageText),
            result: 'Successfully corrected the issue',
            learning: extractLearning(messageText, 'correction'),
            domain: detectDomain(messageText),
            tags: ['correction', 'problem-solving'],
            confidence: 0.8,
            importance: 0.7,
          });
          experienceDetected = true;
        } else {
          await experienceService.recordExperience({
            type: ExperienceType.FAILURE,
            outcome: OutcomeType.NEGATIVE,
            context: extractContext(previousMessages),
            action: extractAction(messageText),
            result: extractError(messageText),
            learning: `Need to investigate: ${extractError(messageText)}`,
            domain: detectDomain(messageText),
            tags: ['failure', 'error'],
            confidence: 0.9,
            importance: 0.6,
          });
          experienceDetected = true;
        }
      }

      // 2. Detect discoveries
      if (
        messageText.includes('found') ||
        messageText.includes('discovered') ||
        messageText.includes('realized') ||
        messageText.includes('noticed')
      ) {
        await experienceService.recordExperience({
          type: ExperienceType.DISCOVERY,
          outcome: OutcomeType.POSITIVE,
          context: extractContext(previousMessages),
          action: 'exploration',
          result: extractDiscovery(messageText),
          learning: extractLearning(messageText, 'discovery'),
          domain: detectDomain(messageText),
          tags: ['discovery', 'exploration'],
          confidence: 0.7,
          importance: 0.8,
        });
        experienceDetected = true;
      }

      // 3. Detect successful completions
      if (
        messageText.includes('successfully') ||
        messageText.includes('completed') ||
        messageText.includes('finished') ||
        messageText.includes('achieved')
      ) {
        await experienceService.recordExperience({
          type: ExperienceType.SUCCESS,
          outcome: OutcomeType.POSITIVE,
          context: extractContext(previousMessages),
          action: extractAction(messageText),
          result: 'Task completed successfully',
          learning: extractLearning(messageText, 'success'),
          domain: detectDomain(messageText),
          tags: ['success', 'completion'],
          confidence: 0.9,
          importance: 0.5,
        });
        experienceDetected = true;
      }

      // 4. Detect hypotheses or plans
      if (
        messageText.includes('i think') ||
        messageText.includes('i believe') ||
        messageText.includes('hypothesis') ||
        messageText.includes('my theory')
      ) {
        await experienceService.recordExperience({
          type: ExperienceType.HYPOTHESIS,
          outcome: OutcomeType.NEUTRAL,
          context: extractContext(previousMessages),
          action: 'forming hypothesis',
          result: 'Hypothesis formed',
          learning: extractHypothesis(messageText),
          domain: detectDomain(messageText),
          tags: ['hypothesis', 'theory'],
          confidence: 0.5,
          importance: 0.6,
        });
        experienceDetected = true;
      }

      // 5. Check for pattern recognition across recent experiences
      if (!experienceDetected && previousMessages.length > 5) {
        const analysis = await experienceService.analyzeExperiences(detectDomain(messageText));

        if (analysis.frequency > 3 && analysis.reliability > 0.7) {
          await experienceService.recordExperience({
            type: ExperienceType.VALIDATION,
            outcome: OutcomeType.POSITIVE,
            context: 'Pattern detected across multiple experiences',
            action: 'pattern recognition',
            result: analysis.pattern || 'Pattern confirmed',
            learning: `Validated pattern: ${analysis.pattern}`,
            domain: detectDomain(messageText),
            tags: ['pattern', 'validation'],
            confidence: analysis.reliability,
            importance: 0.9,
          });
        }
      }
    } catch (error) {
      logger.error('[experienceEvaluator] Error evaluating experience:', error);
    }
  },
};

// Helper functions

function extractContext(messages: Memory[]): string {
  if (!messages || messages.length === 0) return 'Unknown context';

  // Get last 3 messages for context
  const recentMessages = messages.slice(-3);
  return recentMessages
    .map((m) => m.content.text)
    .filter(Boolean)
    .join(' -> ');
}

function extractAction(text: string): string {
  // Common action patterns
  const actionPatterns = [
    /trying to (.+?)(?:\.|,|$)/i,
    /attempted to (.+?)(?:\.|,|$)/i,
    /executed (.+?)(?:\.|,|$)/i,
    /ran (.+?)(?:\.|,|$)/i,
    /performed (.+?)(?:\.|,|$)/i,
  ];

  for (const pattern of actionPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return 'performed action';
}

function extractError(text: string): string {
  const errorMatch = text.match(/error:?\s*(.+?)(?:\.|$)/i);
  if (errorMatch) return errorMatch[1].trim();

  const failedMatch = text.match(/failed:?\s*(.+?)(?:\.|$)/i);
  if (failedMatch) return failedMatch[1].trim();

  return 'encountered error';
}

function extractDiscovery(text: string): string {
  const patterns = [
    /found (?:that )?(.+?)(?:\.|,|$)/i,
    /discovered (?:that )?(.+?)(?:\.|,|$)/i,
    /realized (?:that )?(.+?)(?:\.|,|$)/i,
    /noticed (?:that )?(.+?)(?:\.|,|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return 'made a discovery';
}

function extractLearning(text: string, type: string): string {
  // Try to extract explicit learnings
  const learningMatch = text.match(/(?:learned|learning|lesson):?\s*(.+?)(?:\.|$)/i);
  if (learningMatch) return learningMatch[1].trim();

  // Generate learning based on type
  switch (type) {
    case 'correction':
      return `Corrected approach works better than initial attempt`;
    case 'discovery':
      const discovery = extractDiscovery(text);
      return discovery !== 'made a discovery'
        ? discovery
        : `New capability or information discovered`;
    case 'success':
      return `This approach successfully completes the task`;
    default:
      return `Experience recorded for future reference`;
  }
}

function extractHypothesis(text: string): string {
  const patterns = [
    /i (?:think|believe) (?:that )?(.+?)(?:\.|$)/i,
    /hypothesis:?\s*(.+?)(?:\.|$)/i,
    /theory:?\s*(.+?)(?:\.|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return 'formed hypothesis';
}

function detectDomain(text: string): string {
  const domains = {
    shell: ['command', 'terminal', 'bash', 'shell', 'execute', 'script'],
    coding: ['code', 'function', 'variable', 'syntax', 'programming', 'debug'],
    system: ['file', 'directory', 'process', 'memory', 'cpu', 'system'],
    network: ['http', 'api', 'request', 'response', 'url', 'network'],
    data: ['json', 'csv', 'database', 'query', 'data'],
  };

  const lowerText = text.toLowerCase();

  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return domain;
    }
  }

  return 'general';
}
