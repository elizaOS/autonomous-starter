# autonomous-starter: An ElizaOS Autonomous Agent Example

### 1. Introduction

**1.1. Overview**
"autonomous-starter" is an example project for the ElizaOS ecosystem, designed to demonstrate and facilitate the development of autonomous agents. It showcases core capabilities essential for autonomy, including robust shell command execution via `plugin-shell` and a foundational autonomous loop service provided by `plugin-auto`. This starter kit serves as a launchpad for building sophisticated agents capable of independent operation, decision-making, and interaction with their environment.

**1.2. Vision**
To provide a comprehensive and extensible starting point for creating highly autonomous agents within ElizaOS. These agents will be capable of complex task execution, self-management, learning from interactions, and adapting to dynamic situations, ultimately empowering developers and researchers to explore the frontiers of artificial autonomy.

**1.3. Goals (Overall Product)**

- Offer a clear, well-documented framework for autonomous agent development on ElizaOS.
- Demonstrate seamless integration and utilization of essential services like Shell access (`plugin-shell`) and autonomous operational loops (`plugin-auto`).
- Serve as a practical testbed for experimenting with and implementing new autonomy features, decision-making algorithms, and agent skills.
- Foster a community of developers and researchers by providing an accessible platform for building and sharing autonomous agent technologies.
- Enable agents to achieve goals by intelligently leveraging available tools and information.

**1.4. Target Audience**

- **Primary:** Developers seeking to build, customize, or understand the mechanics of autonomous agents using the ElizaOS platform.
- **Secondary:** Researchers in AI and autonomous systems looking for a flexible environment to test theories and algorithms related to agent behavior, planning, and learning.
- **Tertiary:** Hobbyists and AI enthusiasts interested in exploring and experimenting with cutting-edge autonomous agent capabilities.

### 2. Goals (MVP - `autonomous-starter` Core)

- Integrate and showcase the `plugin-shell` for reliable and secure shell command execution, allowing the agent to interact with the host system.
- Implement and demonstrate the `plugin-auto` (or a similar autonomous loop service), enabling the agent to operate independently based on predefined goals, triggers, or reflective processes (e.g., using the `REFLECT` action).
- Establish basic mechanisms for the agent to report its status, manage its operational state (e.g., starting/stopping its autonomous loop), and log its decisions and actions.
- Provide clear, practical examples within the starter code that illustrate how to extend the agent with new autonomous skills, custom decision-making logic, and additional tool integrations.
- Ensure that core actions like `RUN_SHELL_COMMAND` and `REFLECT` are well-documented and serve as clear patterns for future development.
- Create a foundational structure for memory management, allowing the agent to persist and recall information relevant to its tasks and interactions (e.g., results of shell commands).

### 3. User Personas (MVP)

- **Deva (The Aspiring Agent Developer):** A software developer aiming to quickly bootstrap an autonomous agent on ElizaOS. Deva wants to leverage pre-built plugins like `plugin-shell` for system interaction and `plugin-auto` for managing the agent's lifecycle, and then extend it with custom logic and skills for a specific application (e.g., automated server maintenance, intelligent personal assistant).
- **Resa (The AI Researcher):** An AI researcher needing a stable and extensible platform to experiment with novel autonomous agent behaviors, such as dynamic planning, learning from interaction, or ethical decision-making. Resa values the ability to easily integrate custom algorithms and observe the agent's performance within the controlled ElizaOS environment.

### 4. MVP Definition (Current State - `autonomous-starter` Implementation)

The MVP of `autonomous-starter` consists of integrated ElizaOS plugins and example code demonstrating foundational autonomous capabilities.

**4.1. Core Functionality: Autonomous Operation & Shell Access**

- The agent can execute shell commands through `plugin-shell`, enabling direct interaction with the underlying operating system in a controlled manner.
- The agent can operate autonomously using `plugin-auto`, which facilitates a loop for goal-oriented behavior, reflection, and decision-making.
- These plugins interact: the autonomous loop might decide to execute specific shell commands to gather information, perform actions, or manage system resources as part of achieving its goals.
- All significant outcomes, including shell command results and errors, are saved as message memories, providing a traceable log of operations (as seen in `plugin-shell/action.ts`).

**4.2. Key Plugins & Services**

- **`plugin-shell` (`packages/auto/src/plugin-shell`):**
  - Provides actions like `RUN_SHELL_COMMAND` to execute arbitrary shell commands.
  - Manages the current working directory (CWD) for the session.
  - Includes `CLEAR_SHELL_HISTORY` for managing command history within a session.
  - Extracts commands from natural language and logs execution details (output, error, exit code) to the message feed.
- **`plugin-auto` (`packages/auto/src/plugin-auto`):**
  - Facilitates the agent's autonomous operation.
  - Includes actions like `REFLECT` (`plugin-auto/reflect.ts`), allowing the agent to process its current state, thoughts, and formulate responses or subsequent actions.
  - Designed to be extensible with more sophisticated goal management and planning capabilities.

**4.3. Example Actions Implemented**

- **`RUN_SHELL_COMMAND` (from `plugin-shell`):** Allows the agent to execute system-level commands.
- **`CLEAR_SHELL_HISTORY` (from `plugin-shell`):** Allows the agent to clear its shell command history.
- **`REFLECT` (from `plugin-auto`):** Enables the agent to perform self-assessment, generate thoughtful responses, and decide on next steps as part of its autonomous loop.

**4.4. Data Display/Providers**

- (Potential for MVP+) A provider could display the agent's current primary goal, the status of its autonomous loop (active, idle, error), a list of recently executed autonomous actions, or key memories influencing its decisions.

**4.5. Technical Implementation**

- Built upon the ElizaOS `Plugin` architecture for modularity and extensibility.
- Leverages `@elizaos/core` for runtime functionalities, action definitions, state management, and inter-plugin communication.
- Demonstrates best practices for creating new actions, services, and providers within ElizaOS.

### 5. Future Roadmap

**5.1. MVP+1 (Near-Term Enhancements)**

- **Enhanced Goal Management:**
  - Actions to allow users/other systems to set, update, and query the agent's high-level goals.
  - Agent ability to persist and track progress towards these goals.
- **Basic Dynamic Planning:**
  - Agent can break down simple, high-level goals into a sequence of known actions (e.g., using `REFLECT` to reason and then `RUN_SHELL_COMMAND`).
- **Skill/Tool Discovery & Usage:**
  - Mechanism for the agent to become aware of available actions/plugins (beyond its core set) and decide when to use them.
- **Improved Self-Monitoring & Reporting:**
  - More detailed status updates from the agent regarding its autonomous operations, decision-making rationale, and confidence levels.
- **Contextual Memory Enrichment:**
  - Automatically enriching memories with more contextual information (e.g., why a shell command was run in relation to a goal).

**5.2. Phase 2 (Medium-Term Features)**

- **Advanced Planning & Task Decomposition:**
  - Integration of more sophisticated planning algorithms (e.g., HTN, PDDL-like) for complex, multi-step tasks.
- **Learning from Interaction & Feedback:**
  - Agent adapts its strategies based on the success/failure of its actions and explicit user feedback.
  - Example: Learning which shell command sequences are most effective for certain tasks.
- **Extended Environment Interaction:**
  - Plugins for web browsing (information gathering, form submission).
  - Plugins for advanced file system manipulation and data processing.
- **Sophisticated Error Handling & Autonomous Recovery:**
  - Agent can diagnose common errors in its operations (e.g., failed shell commands) and attempt recovery strategies.
- **Resource Management:**
  - Agent awareness and management of its own computational resources, API rate limits, or other operational constraints.

**5.3. Phase 3 (Long-Term Vision)**

- **Proactive Assistance & Initiative:**
  - Agent anticipates user needs or identifies opportunities for autonomous action based on patterns and context.
- **Multi-Agent Collaboration:**
  - (If supported by ElizaOS) Agents can coordinate and collaborate on complex goals.
- **Ethical Decision-Making Frameworks:**
  - Implementation of configurable ethical guidelines and safety protocols for more complex autonomous choices.
- **User-Configurable Autonomy Levels:**
  - Allow users to define the degree of freedom and types of actions the agent can take autonomously.
- **Self-Improvement & Skill Acquisition:**
  - Agent can identify gaps in its capabilities and suggest or even attempt to acquire new skills (e.g., learning to use new software via shell interactions).

### 6. Technical Considerations

- **Architecture:** ElizaOS plugin architecture supports modular development. Complex autonomy may require careful design of inter-plugin communication, shared state, and event handling.
- **State Management:** Robust and efficient state management is crucial for an autonomous agent to maintain its understanding of the world, its goals, its capabilities, and its history. This includes both short-term operational memory and long-term learned knowledge.
- **Decision Making Engine:** The core of autonomy. This could range from rule-based systems and state machines in early stages to sophisticated LLM-driven reasoning, classical planners, or reinforcement learning agents.
- **Security & Safety:** Paramount for agents with capabilities like shell access. This includes:
  - Granular permissions and sandboxing for risky actions.
  - User confirmation for sensitive operations.
  - Clear audit trails of autonomous decisions and actions.
  - Mechanisms for human override and emergency shutdown.
- **Observability & Debugging:** Tools and techniques to monitor the agent's internal state, decision processes, and to debug unexpected behaviors.
- **Performance & Scalability:** Autonomous agents, especially those with learning capabilities or long-running tasks, need to be efficient in resource usage.

### 7. Open Questions & Risks

- **Safety & Reliability:** How to ensure autonomous agents with powerful tools (like shell access) operate safely and reliably, avoiding unintended consequences?
- **Defining Boundaries:** What are the appropriate boundaries and limitations for agent autonomy in various contexts? How are these enforced?
- **Explainability & Trust:** How can the agent's decision-making processes be made transparent and understandable to users to build trust?
- **Debugging Complexity:** Debugging autonomous behavior can be challenging due to emergent properties and complex interactions.
- **Ethical Implications:** As agents become more autonomous, addressing ethical considerations regarding their actions, biases, and societal impact is critical.
- **Managing Complexity:** The internal complexity of an agent can grow rapidly with increasing autonomy and capabilities. How can this be managed to ensure maintainability and robustness?

### 8. Success Metrics (MVP)

- The agent can reliably execute shell commands provided via natural language or as part of an autonomous decision by `plugin-auto`, with results correctly logged.
- The `plugin-auto` successfully drives basic autonomous behavior, such as a reflect-and-act loop, according to predefined logic.
- The agent demonstrates basic self-status reporting (e.g., logging its current action or thought process).
- The provided examples and documentation are clear enough for a developer to understand the core mechanics and begin extending the `autonomous-starter` project.
- Key actions like `RUN_SHELL_COMMAND` and `REFLECT` are functional and demonstrate the intended patterns for interaction and data logging.

### 9. Release Criteria (MVP)

- Core `plugin-shell` and `plugin-auto` are integrated and functional within the `autonomous-starter` project.
- At least one clear example of an autonomous loop leveraging both reflection (`REFLECT`) and shell execution (`RUN_SHELL_COMMAND`) is implemented and working.
- This `README.md` is updated to accurately describe the MVP's features, architecture, and usage.
- Basic setup instructions are provided to allow a developer to run the `autonomous-starter` agent.
- All critical linter errors and bugs in the core MVP functionality are resolved.
