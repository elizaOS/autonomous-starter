// Shell plugin -- give an agent shell access
import { type Plugin } from '@elizaos/core';
import { runShellCommandAction, clearShellHistoryAction } from './action';
import { shellProvider } from './provider';
import { ShellService } from './service';

export const shellPlugin: Plugin = {
  name: 'plugin-shell',
  description: 'Provides shell access to the agent, allowing it to run commands and view history.',
  actions: [runShellCommandAction, clearShellHistoryAction],
  providers: [shellProvider],
  services: [ShellService],
  init: async (config, runtime) => {
    // You could add specific initialization logic here if needed
    // For example, checking for required system dependencies for the shell
    // or setting up initial CWD based on config.
    // Ensure the ShellService is registered if not done automatically by core.
    // However, with `services: [ShellService]`, the runtime should handle registration.
  },
};

export default shellPlugin;
