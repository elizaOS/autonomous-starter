# autonomous-starter: An ElizaOS Autonomous Agent Example

### Introduction

"autonomous-starter" is an example project for the ElizaOS ecosystem, designed to demonstrate and facilitate the development of autonomous agents. It showcases core capabilities essential for autonomy, including robust shell command execution via `plugin-shell` and a foundational autonomous loop service provided by `plugin-auto`. This starter kit serves as a launchpad for building sophisticated agents capable of independent operation, decision-making, and interaction with their environment.

### Core Functionality: Autonomous Operation & Shell Access

- The agent can execute shell commands through `plugin-shell`, enabling direct interaction with the underlying operating system in a controlled manner.
- The agent can operate autonomously using `plugin-auto`, which facilitates a loop for goal-oriented behavior, reflection, and decision-making.
- These plugins interact: the autonomous loop might decide to execute specific shell commands to gather information, perform actions, or manage system resources as part of achieving its goals.
- All significant outcomes, including shell command results and errors, are saved as message memories, providing a traceable log of operations (as seen in `plugin-shell/action.ts`).

### Key Plugins & Services

- **`plugin-shell` (`packages/auto/src/plugin-shell`):**
  - Provides actions like `RUN_SHELL_COMMAND` to execute arbitrary shell commands.
  - Manages the current working directory (CWD) for the session.
  - Includes `CLEAR_SHELL_HISTORY` for managing command history within a session.
  - Extracts commands from natural language and logs execution details (output, error, exit code) to the message feed.
- **`plugin-auto` (`packages/auto/src/plugin-auto`):**
  - Facilitates the agent's autonomous operation.
  - Includes actions like `REFLECT` (`plugin-auto/reflect.ts`), allowing the agent to process its current state, thoughts, and formulate responses or subsequent actions.
  - Designed to be extensible with more sophisticated goal management and planning capabilities.
