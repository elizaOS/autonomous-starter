import { type IAgentRuntime, type Action, type Provider, type Service, type Evaluator, type TaskWorker } from './types'; // Assuming Task is TaskWorker from new types

// Extend the AgentRuntime interface
declare module '@elizaos/core' {
  // Module augmentation must be in a module, so we export something dummy.
  export const _runtimeExtensionsAugmentation: never;

  interface IAgentRuntime {
    registerAction(action: Action): Promise<void>;
    unregisterAction(actionName: string): Promise<void>;
    
    registerService(serviceClass: typeof Service): Promise<void>; // Takes class, runtime instantiates
    unregisterService(serviceName: string): Promise<void>;
    
    registerProvider(provider: Provider): Promise<void>;
    unregisterProvider(providerName: string): Promise<void>;
    
    registerEvaluator(evaluator: Evaluator): Promise<void>;
    unregisterEvaluator(evaluatorName: string): Promise<void>;
    
    registerTaskWorker(taskWorker: TaskWorker): Promise<void>; // Changed from Task to TaskWorker
    unregisterTaskWorker(taskName: string): Promise<void>; // Changed from Task to TaskWorker
    
    getDataDir(): string;
    setSecureConfig(key: string, value: any): Promise<void>;
    getSecureConfig(key: string): Promise<any>;

    // Adding 'on' method for event handling as it was missing and caused linter error in PluginManagementService
    on(event: string, listener: (...args: any[]) => void): this;
    // Add other event emitter methods if necessary, like 'emit', 'off' etc.
  }
}

// Implementation helpers for AgentRuntime (Conceptual)
// Actual implementations will be part of the AgentRuntime class itself or its managers.
// This file primarily serves for module augmentation and type definitions.

export class RuntimeRegistrationExtensions {
  // Note: The static methods below were in the original plan but are more tightly coupled
  // with AgentRuntime's internal structure (e.g., actionManager, serviceManager).
  // True dynamic registration/unregistration logic will live within AgentRuntime itself.
  // These are more like type declarations for what AgentRuntime will support.

  static async ejemploRegisterAction(runtime: IAgentRuntime, action: Action): Promise<void> {
    // This is a placeholder. Actual logic is in AgentRuntime.
    // Example: (runtime as any).actionManager.registerAction(action);
    // if (typeof action.init === 'function') { await action.init(runtime); }
    console.log('RuntimeExtensions.registerAction called for', action.name, runtime);
  }

  static async ejemploUnregisterAction(runtime: IAgentRuntime, actionName: string): Promise<void> {
    // Placeholder
    // Example: (runtime as any).actionManager.removeAction(actionName);
    console.log('RuntimeExtensions.unregisterAction called for', actionName, runtime);
  }

  // Similar static placeholder methods for services, providers, evaluators, tasks can be added
  // if there's a desire to keep this structure, but it might be redundant if AgentRuntime handles it.
} 