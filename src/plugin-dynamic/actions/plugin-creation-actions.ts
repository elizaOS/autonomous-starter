import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback
} from "@elizaos/core";
import {
  PluginCreationService,
  type PluginSpecification,
} from "../services/plugin-creation-service";
import { z } from "zod";
import { validatePrompt } from "../utils/validation";

export const createPluginAction: Action = {
  name: "createPlugin",
  description: "Create a new plugin from a specification using AI assistance",
  similes: [
    "generate plugin",
    "build plugin",
    "make plugin",
    "develop plugin",
    "create extension",
    "build extension"
  ],
  examples: [
    [
      {
        name: "user",
        content: {
          text: "Create a plugin for managing user preferences"
        }
      },
      {
        name: "agent",
        content: {
          text: "I'll create a user preferences management plugin for you. Let me start by generating the necessary components..."
        }
      }
    ],
    [
      {
        name: "user",
        content: {
          text: "Build a plugin that adds weather information capabilities"
        }
      },
      {
        name: "agent",
        content: {
          text: "I'll create a weather information plugin with actions for fetching current weather, forecasts, and weather alerts."
        }
      }
    ]
  ],
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<boolean> => {
    const service = runtime.services.get("plugin-creation") as PluginCreationService;
    if (!service) {
      return false;
    }

    // Check if there's already an active job
    const jobs = service.getAllJobs();
    const activeJob = jobs.find(job => job.status === "running" || job.status === "pending");
    if (activeJob) {
      return false;
    }

    return validatePrompt(message);
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<string> => {
    try {
      const service = runtime.services.get("plugin-creation") as PluginCreationService;
      if (!service) {
        throw new Error("Plugin creation service not available");
      }

      const specification = JSON.parse(message.content.text);
      const apiKey = runtime.getSetting("ANTHROPIC_API_KEY") || "";
      const jobId = await service.createPlugin(specification, apiKey);

      return `Plugin creation job started with ID: ${jobId}. Use checkPluginCreationStatus to monitor progress.`;
    } catch (error) {
      return `Failed to create plugin: ${error.message}`;
    }
  }
};

export const checkPluginCreationStatusAction: Action = {
  name: "checkPluginCreationStatus",
  description: "Check the status of a plugin creation job",
  similes: [
    "plugin status",
    "check plugin progress",
    "plugin creation status",
    "get plugin status"
  ],
  examples: [
    [
      {
        name: "user",
        content: {
          text: "What's the status of my plugin creation?"
        }
      },
      {
        name: "agent",
        content: {
          text: "Let me check the status of your plugin creation job..."
        }
      }
    ]
  ],
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<boolean> => {
    const service = runtime.services.get("plugin-creation") as PluginCreationService;
    if (!service) {
      return false;
    }
    
    const jobs = service.getAllJobs();
    return jobs.length > 0;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<string> => {
    try {
      const service = runtime.services.get("plugin-creation") as PluginCreationService;
      if (!service) {
        throw new Error("Plugin creation service not available");
      }

      const jobs = service.getAllJobs();
      const activeJob = jobs.find(job => job.status === "running" || job.status === "pending");
      
      if (!activeJob) {
        return "No active plugin creation job found.";
      }

      const status = service.getJobStatus(activeJob.id);
      if (!status) {
        return "Job not found.";
      }

      let response = `Plugin Creation Status: ${status.status}\n`;
      response += `Current Phase: ${status.currentPhase}\n`;
      response += `Progress: ${Math.round(status.progress * 100)}%\n`;
      
      if (status.logs.length > 0) {
        response += "\nRecent logs:\n";
        status.logs.slice(-5).forEach(log => {
          response += `- ${log}\n`;
        });
      }

      if (status.status === "completed") {
        response += `\nPlugin created successfully at: ${status.result}`;
      } else if (status.status === "failed") {
        response += `\nPlugin creation failed: ${status.error}`;
      }

      return response;
    } catch (error) {
      return `Failed to check status: ${error.message}`;
    }
  }
};

export const cancelPluginCreationAction: Action = {
  name: "cancelPluginCreation",
  description: "Cancel the current plugin creation job",
  similes: [
    "stop plugin creation",
    "abort plugin creation",
    "cancel plugin"
  ],
  examples: [
    [
      {
        name: "user",
        content: {
          text: "Cancel the plugin creation"
        }
      },
      {
        name: "agent",
        content: {
          text: "I'll cancel the current plugin creation job."
        }
      }
    ]
  ],
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<boolean> => {
    const service = runtime.services.get("plugin-creation") as PluginCreationService;
    if (!service) {
      return false;
    }
    
    const jobs = service.getAllJobs();
    const activeJob = jobs.find(job => job.status === "running" || job.status === "pending");
    return !!activeJob;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<string> => {
    try {
      const service = runtime.services.get("plugin-creation") as PluginCreationService;
      if (!service) {
        throw new Error("Plugin creation service not available");
      }

      const jobs = service.getAllJobs();
      const activeJob = jobs.find(job => job.status === "running" || job.status === "pending");
      
      if (!activeJob) {
        return "No active plugin creation job to cancel.";
      }

      service.cancelJob(activeJob.id);
      return "Plugin creation job has been cancelled.";
    } catch (error) {
      return `Failed to cancel job: ${error.message}`;
    }
  }
};

export const createPluginFromDescriptionAction: Action = {
  name: "createPluginFromDescription",
  description: "Create a plugin from a natural language description",
  similes: [
    "describe plugin",
    "plugin from description",
    "explain plugin"
  ],
  examples: [
    [
      {
        name: "user",
        content: {
          text: "I need a plugin that helps manage todo lists with add, remove, and list functionality"
        }
      },
      {
        name: "agent",
        content: {
          text: "I'll create a todo list management plugin based on your description. This will include actions for adding, removing, and listing todos."
        }
      }
    ]
  ],
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<boolean> => {
    const service = runtime.services.get("plugin-creation") as PluginCreationService;
    if (!service) {
      return false;
    }

    const jobs = service.getAllJobs();
    const activeJob = jobs.find(job => job.status === "running" || job.status === "pending");
    if (activeJob) {
      return false;
    }

    return message.content.text && message.content.text.length > 10;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<string> => {
    try {
      const service = runtime.services.get("plugin-creation") as PluginCreationService;
      if (!service) {
        throw new Error("Plugin creation service not available");
      }

      // Convert natural language to specification
      const specification = {
        name: "custom-plugin",
        description: message.content.text,
        actions: [],
        providers: [],
        evaluators: []
      };

      const apiKey = runtime.getSetting("ANTHROPIC_API_KEY") || "";
      const jobId = await service.createPlugin(specification, apiKey);

      return `I'm creating a plugin based on your description. Job ID: ${jobId}. Use checkPluginCreationStatus to monitor progress.`;
    } catch (error) {
      return `Failed to create plugin: ${error.message}`;
    }
  }
};

// Helper function to parse natural language description
async function parsePluginDescription(
  description: string,
  runtime: IAgentRuntime,
): Promise<PluginSpecification> {
  // This is a simplified parser - in production, could use AI to parse
  const words = description.toLowerCase().split(" ");

  // Extract potential plugin name
  let name = "@elizaos/plugin-custom";
  if (words.includes("weather")) name = "@elizaos/plugin-weather";
  else if (words.includes("database")) name = "@elizaos/plugin-database";
  else if (words.includes("api")) name = "@elizaos/plugin-api";

  // Detect components needed
  const specification: PluginSpecification = {
    name,
    description: description,
    version: "1.0.0",
  };

  // Detect if actions are needed
  if (
    description.includes("action") ||
    description.includes("command") ||
    description.includes("do")
  ) {
    specification.actions = [
      {
        name: "executeTask",
        description: "Execute the main task of this plugin",
      },
    ];
  }

  // Detect if providers are needed
  if (
    description.includes("provide") ||
    description.includes("information") ||
    description.includes("data")
  ) {
    specification.providers = [
      {
        name: "dataProvider",
        description: "Provide data for the plugin functionality",
      },
    ];
  }

  // Detect if services are needed
  if (
    description.includes("service") ||
    description.includes("background") ||
    description.includes("monitor")
  ) {
    specification.services = [
      {
        name: "backgroundService",
        description: "Background service for plugin operations",
      },
    ];
  }

  return specification;
}
