import { 
  type Evaluator, 
  type IAgentRuntime, 
  type Memory,
  type State,
  generateText,
  composeContext,
  ModelClass,
  logger
} from '@elizaos/core';

const evolutionAnalysisTemplate = `Analyze the recent conversation to determine if the agent should evolve its character.

Current character traits:
{{characterState}}

Recent conversation:
{{recentMessages}}

Consider:
1. Are there repeated topics or interests that aren't reflected in the current character?
2. Has the agent struggled to connect or communicate effectively?
3. Are there new domains of knowledge the agent should incorporate?
4. Would adjusting communication style improve interactions?
5. Has the user expressed preferences that suggest character adaptations?

Respond with one of:
- SHOULD_EVOLVE: Character modification would be beneficial
- NO_CHANGE_NEEDED: Current character is well-suited
- CONSIDER_LATER: Potential for evolution but need more interactions

Response:`;

export const characterEvolutionEvaluator: Evaluator = {
  name: 'characterEvolution',
  description: 'Analyzes conversations to determine if character evolution would be beneficial',
  
  similes: [],
  
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      // Only evaluate after meaningful conversations
      let recentMessages: Memory[] = [];
      
      // Check if getMemories method exists on runtime
      if (typeof (runtime as any).getMemories === 'function' && message.roomId) {
        try {
          recentMessages = await (runtime as any).getMemories({
            roomId: message.roomId,
            count: 10,
            tableName: 'messages'
          });
        } catch (error) {
          logger.debug('Failed to get memories:', error);
        }
      }
      
      // Require at least 5 messages to evaluate
      return recentMessages.length >= 5;
    } catch (error) {
      logger.error('Error in characterEvolution validate:', error);
      return false;
    }
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options?: any,
    callback?: any
  ): Promise<void> => {
    try {
      const context = composeContext({
        state,
        template: evolutionAnalysisTemplate
      });
      
      const analysis = await generateText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM
      });
      
      if (!analysis) {
        logger.warn('No analysis generated for character evolution');
        return;
      }
      
      const decision = analysis.trim().toUpperCase();
      
      if (decision.includes('SHOULD_EVOLVE')) {
        // Log this for potential batch processing
        logger.info('Character evolution recommended based on conversation analysis');
        
        // Try to cache the recommendation if cache is available
        if (typeof (runtime as any).setCache === 'function' && message.roomId) {
          try {
            await (runtime as any).setCache(
              `evolution_recommendation_${message.roomId}`,
              {
                timestamp: new Date(),
                reason: analysis,
                conversationId: message.id
              }
            );
          } catch (cacheError) {
            logger.debug('Failed to cache evolution recommendation:', cacheError);
          }
        }
        
        logger.info('Character evolution analysis: Modification recommended');
      } else {
        logger.debug(`Character evolution analysis: ${decision}`);
      }
      
    } catch (error) {
      logger.error('Error in character evolution evaluator:', error);
    }
  },
  
  examples: []
};