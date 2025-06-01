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
    // Only evaluate after meaningful conversations
    const recentMessages = message.roomId ? 
      await runtime.getMemories({
        roomId: message.roomId,
        count: 10,
        tableName: 'messages'
      }) : [];
      
    return recentMessages.length >= 5;
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ): Promise<{ success: boolean; response?: string }> => {
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
        return { success: false };
      }
      
      const decision = analysis.trim().toUpperCase();
      
      if (decision.includes('SHOULD_EVOLVE')) {
        // Log this for potential batch processing
        logger.info('Character evolution recommended based on conversation analysis');
        
        // Could trigger automatic evolution in future versions
        // For now, just track the recommendation
        await runtime.setCache(
          `evolution_recommendation_${message.roomId}`,
          {
            timestamp: new Date(),
            reason: analysis,
            conversationId: message.id
          }
        );
        
        return {
          success: true,
          response: 'Character evolution analysis: Modification recommended'
        };
      }
      
      return {
        success: true,
        response: `Character evolution analysis: ${decision}`
      };
      
    } catch (error) {
      logger.error('Error in character evolution evaluator:', error);
      return { success: false };
    }
  },
  
  examples: []
};