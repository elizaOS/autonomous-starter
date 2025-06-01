import {
  type Evaluator,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  type HandlerCallback,
  type ProviderResult,
} from "@elizaos/core";
import { ExperienceService } from "../service";
import { ExperienceType, OutcomeType } from "../types";

export const experienceEvaluator: Evaluator = {
  name: "EXPERIENCE_EVALUATOR",
  similes: ["experience recorder", "learning evaluator", "self-reflection"],
  description:
    "Evaluates agent actions and outcomes to record significant experiences and learnings",
  alwaysRun: true,

  examples: [
    {
      prompt:
        "The agent successfully executed a shell command after initially failing",
      messages: [
        {
          name: "Autoliza",
          content: {
            text: "Let me try to run this Python script.",
          },
        },
        {
          name: "Autoliza",
          content: {
            text: "Error: ModuleNotFoundError for pandas. I need to install it first.",
          },
        },
        {
          name: "Autoliza",
          content: {
            text: "After installing pandas, the script ran successfully and produced the expected output.",
          },
        },
      ],
      outcome:
        "Record a CORRECTION experience about needing to install dependencies before running Python scripts",
    },
    {
      prompt: "The agent discovered a new system capability",
      messages: [
        {
          name: "Autoliza",
          content: {
            text: "I found that the system has jq installed, which is perfect for parsing JSON data.",
          },
        },
      ],
      outcome:
        "Record a DISCOVERY experience about the availability of jq for JSON processing",
    },
  ],

  async validate(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> {
    // Only evaluate agent's own messages
    return message.entityId === runtime.agentId;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback,
    responses?: Memory[],
  ): Promise<void> {
    const experienceService = runtime.getService(
      "EXPERIENCE",
    ) as ExperienceService;

    if (!experienceService) {
      logger.warn("[experienceEvaluator] Experience service not available");
      return;
    }

    let experienceRecordedInThisHandler = false; // Flag to track if any experience was recorded

    try {
      const messageText = message.content.text?.toLowerCase() || "";
      const previousMessages = state?.recentMessagesData || [];
      const currentDomain = detectDomain(messageText);

      // Detect different types of experiences
      let experienceDetected = false;

      // Get relevant experiences using the RAG provider
      const ragProvider = runtime.providers.find(
        (p) => p.name === "experienceRAG",
      );
      const ragResult = ragProvider
        ? await ragProvider.get(runtime, message, {
            ...state,
            query: messageText,
          })
        : { data: { experiences: [] } };

      const previousExperiences = ragResult.data?.experiences || [];

      // 1. Detect failures and corrections
      if (
        messageText.includes("error") ||
        messageText.includes("failed") ||
        messageText.includes("mistake")
      ) {
        // Check if there's a subsequent success
        const hasCorrection =
          messageText.includes("fixed") ||
          messageText.includes("solved") ||
          messageText.includes("successfully") ||
          messageText.includes("now works");

        if (hasCorrection) {
          // Look for contradictions in previous experiences
          const contradictions = previousExperiences.filter(
            (exp) =>
              exp.outcome === OutcomeType.NEGATIVE &&
              exp.action === extractAction(messageText),
          );

          await experienceService.recordExperience({
            type: ExperienceType.CORRECTION,
            outcome: OutcomeType.POSITIVE,
            context: `Previous attempt failed, but found solution`,
            action: extractAction(messageText),
            result: "Successfully corrected the issue",
            learning: extractLearning(messageText, "correction"),
            domain: currentDomain,
            tags: ["correction", "problem-solving"],
            confidence: 0.8,
            importance: 0.7,
            relatedExperiences: contradictions.map((e) => e.id),
            previousBelief: contradictions[0]?.learning,
          });
          experienceDetected = true;
          experienceRecordedInThisHandler = true;
        } else {
          await experienceService.recordExperience({
            type: ExperienceType.FAILURE,
            outcome: OutcomeType.NEGATIVE,
            context: extractContext(previousMessages),
            action: extractAction(messageText),
            result: extractError(messageText),
            learning: `Need to investigate: ${extractError(messageText)}`,
            domain: currentDomain,
            tags: ["failure", "error"],
            confidence: 0.9,
            importance: 0.6,
          });
          experienceDetected = true;
          experienceRecordedInThisHandler = true;
        }
      }

      // 2. Detect discoveries
      if (
        messageText.includes("found") ||
        messageText.includes("discovered") ||
        messageText.includes("realized") ||
        messageText.includes("noticed")
      ) {
        await experienceService.recordExperience({
          type: ExperienceType.DISCOVERY,
          outcome: OutcomeType.POSITIVE,
          context: extractContext(previousMessages),
          action: "exploration",
          result: extractDiscovery(messageText),
          learning: extractLearning(messageText, "discovery"),
          domain: currentDomain,
          tags: ["discovery", "exploration"],
          confidence: 0.7,
          importance: 0.8,
        });
        experienceDetected = true;
        experienceRecordedInThisHandler = true;
      }

      // 3. Detect successful completions and validate expectations
      if (
        messageText.includes("successfully") ||
        messageText.includes("completed") ||
        messageText.includes("finished") ||
        messageText.includes("achieved")
      ) {
        const action = extractAction(messageText);
        const expectation = state?.expectation as string;
        const isExpected = expectation
          ? messageText.toLowerCase().includes(expectation.toLowerCase()) ||
            expectation.includes("should succeed")
          : true;

        await experienceService.recordExperience({
          type: isExpected ? ExperienceType.SUCCESS : ExperienceType.DISCOVERY,
          outcome: OutcomeType.POSITIVE,
          context: extractContext(previousMessages),
          action,
          result: "Task completed successfully",
          learning: extractLearning(
            messageText,
            isExpected ? "success" : "discovery",
          ),
          domain: currentDomain,
          tags: isExpected
            ? ["success", "completion"]
            : ["discovery", "unexpected"],
          confidence: isExpected ? 0.9 : 0.7,
          importance: isExpected ? 0.5 : 0.8,
        });
        experienceDetected = true;
        experienceRecordedInThisHandler = true;
      }

      // 4. Detect hypotheses or plans
      if (
        messageText.includes("i think") ||
        messageText.includes("i believe") ||
        messageText.includes("hypothesis") ||
        messageText.includes("my theory")
      ) {
        await experienceService.recordExperience({
          type: ExperienceType.HYPOTHESIS,
          outcome: OutcomeType.NEUTRAL,
          context: extractContext(previousMessages),
          action: "forming hypothesis",
          result: "Hypothesis formed",
          learning: extractHypothesis(messageText),
          domain: currentDomain,
          tags: ["hypothesis", "theory"],
          confidence: 0.5,
          importance: 0.6,
        });
        experienceDetected = true;
        experienceRecordedInThisHandler = true;
      }

      // 5. Check for pattern recognition and analyze domain
      logger.debug(
        `[experienceEvaluator] Checking pattern detection: experienceDetected=${experienceDetected}, previousMessages.length=${previousMessages.length}`,
      );
      if (!experienceDetected && previousMessages.length > 2) {
        // Lowered threshold for testing
        logger.debug(
          "[experienceEvaluator] Conditions met for pattern detection call.",
        );
        const recentProvider = runtime.providers.find(
          (p) => p.name === "recentExperiences",
        );
        const recentResult = recentProvider
          ? await recentProvider.get(runtime, message, {
              ...state,
              includePatterns: true, // Ensure this is passed
            })
          : { data: { patterns: [], stats: null } };

        const patterns = recentResult.data?.patterns || [];
        const stats = recentResult.data?.stats;

        if (patterns.length > 0 && stats?.averageConfidence > 0.7) {
          await experienceService.recordExperience({
            type: ExperienceType.VALIDATION,
            outcome: OutcomeType.POSITIVE,
            context: "Pattern detected across multiple experiences",
            action: "pattern recognition",
            result: patterns[0].description || "Pattern confirmed",
            learning: `Validated pattern: ${patterns[0].description}`,
            domain: currentDomain,
            tags: ["pattern", "validation"],
            confidence: stats.averageConfidence,
            importance: 0.9,
          });
          experienceDetected = true; // Set flag even if it was the only one
          experienceRecordedInThisHandler = true;
        }
      }

      // 6. Analyze domain trends
      if (experienceDetected) {
        // This should be based on whether any experience was recorded above
        const domainProviderResult = ragProvider
          ? await ragProvider.get(runtime, message, {
              ...state,
              query: `domain:${currentDomain}`, // Query for domain specific learnings
            })
          : { data: { keyLearnings: [] } };

        const keyLearnings = domainProviderResult.data?.keyLearnings || [];
        if (keyLearnings.length > 0) {
          await experienceService.recordExperience({
            type: ExperienceType.LEARNING,
            outcome: OutcomeType.NEUTRAL,
            context: `Domain analysis: ${currentDomain}`,
            action: "analyze_domain",
            result: "Domain patterns analyzed",
            learning: keyLearnings[0],
            domain: currentDomain,
            tags: ["analysis", "domain-learning"],
            confidence: 0.7,
            importance: 0.6,
          });
          experienceRecordedInThisHandler = true;
        }
      }

      // If no specific experience was detected and recorded by other checks,
      // consider recording a general learning experience if the message is from the agent.
      // This is a fallback to ensure agent's utterances can be captured if not fitting other patterns.
      if (
        !experienceRecordedInThisHandler &&
        message.entityId === runtime.agentId &&
        messageText.length > 10
      ) {
        logger.debug(
          "[experienceEvaluator] Recording general learning experience as fallback.",
        );
        await experienceService.recordExperience({
          type: ExperienceType.LEARNING,
          outcome: OutcomeType.NEUTRAL,
          context: extractContext(previousMessages),
          action: "general_observation",
          result: messageText,
          learning: `General observation: ${messageText}`,
          domain: currentDomain,
          tags: ["observation", "general"],
          confidence: 0.5,
          importance: 0.3,
        });
        experienceRecordedInThisHandler = true; // although not strictly necessary here as it's the last check
      }
    } catch (error) {
      logger.error("[experienceEvaluator] Error evaluating experience:", error);
      // Fallback: Record a general learning experience about the error
      if (experienceService && !experienceRecordedInThisHandler) {
        try {
          await experienceService.recordExperience({
            type: ExperienceType.LEARNING,
            outcome: OutcomeType.NEUTRAL, // Error itself is neutral from a learning perspective
            context: "Error during experience evaluation",
            action: "error_handling",
            result: `Error: ${error.message}`,
            learning: `An error occurred in experience evaluator: ${error.message}`,
            domain: "system",
            tags: ["error", "evaluator"],
            confidence: 0.9, // High confidence that an error occurred
            importance: 0.7, // Important to note evaluator errors
          });
        } catch (serviceError) {
          logger.error(
            "[experienceEvaluator] Error recording fallback error experience:",
            serviceError,
          );
        }
      }
    }
  },
};

// Helper functions

function extractContext(messages: Memory[]): string {
  if (!messages || messages.length === 0) return "Unknown context";

  // Get last 3 messages for context
  const recentMessages = messages.slice(-3);
  return recentMessages
    .map((m) => m.content.text)
    .filter(Boolean)
    .join(" -> ");
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

  return "performed action";
}

function extractError(text: string): string {
  const errorMatch = text.match(/error:?\s*(.+?)(?:\.|$)/i);
  if (errorMatch) return errorMatch[1].trim();

  const failedMatch = text.match(/failed:?\s*(.+?)(?:\.|$)/i);
  if (failedMatch) return failedMatch[1].trim();

  return "encountered error";
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

  return "made a discovery";
}

function extractLearning(text: string, type: string): string {
  // Try to extract explicit learnings
  const learningMatch = text.match(
    /(?:learned|learning|lesson):?\s*(.+?)(?:\.|$)/i,
  );
  if (learningMatch) return learningMatch[1].trim();

  // Generate learning based on type
  switch (type) {
    case "correction":
      return `Corrected approach works better than initial attempt`;
    case "discovery":
      const discovery = extractDiscovery(text);
      return discovery !== "made a discovery"
        ? discovery
        : `New capability or information discovered`;
    case "success":
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

  return "formed hypothesis";
}

function detectDomain(text: string): string {
  const domains = {
    shell: ["command", "terminal", "bash", "shell", "execute", "script"],
    coding: ["code", "function", "variable", "syntax", "programming", "debug"],
    system: ["file", "directory", "process", "memory", "cpu", "system"],
    network: ["http", "api", "request", "response", "url", "network"],
    data: ["json", "csv", "database", "query", "data"],
  };

  const lowerText = text.toLowerCase();

  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return domain;
    }
  }

  return "general";
}
