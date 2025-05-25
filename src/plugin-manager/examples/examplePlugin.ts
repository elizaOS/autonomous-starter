import type {
  Plugin,
  Action,
  Provider,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ProviderResult,
} from '@elizaos/core';

// Example action
const exampleAction: Action = {
  name: 'EXAMPLE_ACTION',
  similes: ['example action', 'test action', 'demo action'],
  description: 'A simple example action that demonstrates dynamic plugin loading',

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Run the example action',
          actions: ['EXAMPLE_ACTION'],
        },
      },
      {
        name: 'Assistant',
        content: {
          text: "I'll run the example action for you.",
          actions: ['EXAMPLE_ACTION'],
        },
      },
    ],
  ],

  async validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
    // This action is always valid
    return true;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void> {
    const timestamp = new Date().toLocaleString();

    if (callback) {
      await callback({
        text: `Example action executed successfully at ${timestamp}! This action was loaded from a dynamic plugin.`,
        actions: ['EXAMPLE_ACTION'],
      });
    }
  },
};

// Example provider
const exampleProvider: Provider = {
  name: 'exampleProvider',
  description: 'Provides example data from a dynamically loaded plugin',

  async get(runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    return {
      text: `Example plugin is active. System uptime: ${Math.round(uptime)}s, Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      values: {
        pluginActive: true,
        systemUptime: uptime,
        memoryUsageMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
      data: {
        loadedAt: new Date().toISOString(),
        version: '1.0.0',
      },
    };
  },
};

// The example plugin
export const examplePlugin: Plugin = {
  name: 'example-plugin',
  description: 'An example plugin that demonstrates dynamic loading and unloading',

  actions: [exampleAction],
  providers: [exampleProvider],

  init: async (config: Record<string, any>, runtime: IAgentRuntime) => {
    console.log('[ExamplePlugin] Initializing with config:', config);

    // Example: Check for required environment variables
    const requiredVars = ['EXAMPLE_API_KEY'];
    const missingVars = requiredVars.filter((v) => !process.env[v] && !runtime.getSetting(v));

    if (missingVars.length > 0) {
      console.warn(`[ExamplePlugin] Missing environment variables: ${missingVars.join(', ')}`);
      // In a real plugin, you might throw an error or handle this differently
    }

    console.log('[ExamplePlugin] Initialization complete');
  },
};
