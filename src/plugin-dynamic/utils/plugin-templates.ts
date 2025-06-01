export const actionTemplate = (name: string, description: string): string => `
import { type Action, type IAgentRuntime, type ActionInput, logger } from '@elizaos/core';
import { z } from 'zod';

export const ${name}Action: Action = {
  name: '${name}',
  description: '${description}',
  
  similes: [
    // Add similar phrases that might trigger this action
  ],
  
  inputSchema: z.object({
    // Define input parameters
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    try {
      // Implement action logic here
      
      return 'Action completed successfully';
    } catch (error) {
      logger.error('Action failed:', error);
      throw error;
    }
  }
};
`;

export const providerTemplate = (name: string, description: string): string => `
import { type IProvider, type IAgentRuntime } from '@elizaos/core';

export const ${name}Provider: IProvider = {
  name: '${name}',
  description: '${description}',
  
  async getContext(runtime: IAgentRuntime): Promise<string> {
    try {
      // Implement provider logic here
      const data = {
        // Collect relevant data
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return 'Provider data unavailable';
    }
  }
};
`;

export const serviceTemplate = (name: string, description: string): string => `
import { Service, type IAgentRuntime, logger } from '@elizaos/core';

export class ${name}Service extends Service {
  static serviceName = '${name}';
  
  async initialize(): Promise<void> {
    logger.info('Initializing ${name}Service');
    // Initialize service resources
  }
  
  async start(): Promise<void> {
    logger.info('Starting ${name}Service');
    // Start service operations
  }
  
  async stop(): Promise<void> {
    logger.info('Stopping ${name}Service');
    // Clean up resources
  }
  
  // Add custom service methods here
}
`;

export const evaluatorTemplate = (
  name: string,
  description: string,
): string => `
import { type Evaluator, type IAgentRuntime, type Memory, logger } from '@elizaos/core';

export const ${name}Evaluator: Evaluator = {
  name: '${name}',
  description: '${description}',
  
  async evaluate(runtime: IAgentRuntime, memory: Memory): Promise<void> {
    try {
      // Analyze the memory/conversation
      const content = memory.content.text;
      
      // Perform evaluation logic
      
      // Create new memories or trigger actions if needed
      
    } catch (error) {
      logger.error('Evaluator error:', error);
    }
  }
};
`;

export const pluginIndexTemplate = (
  pluginName: string,
  components: any,
): string => `
import { type Plugin } from '@elizaos/core';
${components.actions?.map((a) => `import { ${a.name}Action } from './actions/${a.name}';`).join("\n")}
${components.providers?.map((p) => `import { ${p.name}Provider } from './providers/${p.name}';`).join("\n")}
${components.services?.map((s) => `import { ${s.name}Service } from './services/${s.name}';`).join("\n")}
${components.evaluators?.map((e) => `import { ${e.name}Evaluator } from './evaluators/${e.name}';`).join("\n")}

export const ${pluginName.replace("@elizaos/", "").replace(/-/g, "")}Plugin: Plugin = {
  name: '${pluginName}',
  description: '${components.description}',
  
  ${components.actions ? `actions: [${components.actions.map((a) => `${a.name}Action`).join(", ")}],` : ""}
  ${components.providers ? `providers: [${components.providers.map((p) => `${p.name}Provider`).join(", ")}],` : ""}
  ${components.services ? `services: [${components.services.map((s) => `${s.name}Service`).join(", ")}],` : ""}
  ${components.evaluators ? `evaluators: [${components.evaluators.map((e) => `${e.name}Evaluator`).join(", ")}],` : ""}
};

export default ${pluginName.replace("@elizaos/", "").replace(/-/g, "")}Plugin;
`;

export const testTemplate = (
  componentName: string,
  componentType: string,
): string => `
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${componentName}${componentType} } from '../${componentType.toLowerCase()}s/${componentName}';
import { createMockRuntime } from '@elizaos/test-utils';

describe('${componentName}${componentType}', () => {
  let mockRuntime;
  
  beforeEach(() => {
    mockRuntime = createMockRuntime();
  });
  
  it('should be properly defined', () => {
    expect(${componentName}${componentType}).toBeDefined();
    expect(${componentName}${componentType}.name).toBe('${componentName}');
  });
  
  // Add more specific tests here
});
`;
