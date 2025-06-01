import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import { type RobotService } from "./service.ts";
import { type ScreenActionStep } from "./types.ts";

export const performScreenAction: Action = {
  name: "PERFORM_SCREEN_ACTION",
  similes: ["SCREEN_ACTION", "CONTROL_SCREEN", "INTERACT_SCREEN"],
  description:
    "Perform mouse and keyboard actions on the host screen. Options should include a list of steps with actions like move, click, and type.",
  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ): Promise<boolean> => {
    const service = runtime.getService<RobotService>("ROBOT" as any);
    return !!service;
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    options: { steps: ScreenActionStep[] },
    callback: HandlerCallback,
  ): Promise<void> => {
    const service = runtime.getService<RobotService>("ROBOT" as any);
    if (!service) {
      logger.warn("[performScreenAction] RobotService not available");
      await callback({
        thought: "RobotService not available",
        text: "Unable to perform screen action - robot service is not available.",
      });
      return;
    }

    if (
      !options.steps ||
      !Array.isArray(options.steps) ||
      options.steps.length === 0
    ) {
      logger.warn("[performScreenAction] No valid steps provided");
      await callback({
        thought: "No valid steps provided",
        text: "Unable to perform screen action - no valid steps were provided.",
      });
      return;
    }

    let executedActions = 0;
    const actionSummary: string[] = [];

    try {
      for (const step of options.steps) {
        if (
          step.action === "move" &&
          step.x !== undefined &&
          step.y !== undefined
        ) {
          service.moveMouse(step.x, step.y);
          actionSummary.push(`moved mouse to (${step.x}, ${step.y})`);
          executedActions++;
        } else if (step.action === "click") {
          const button = step.button || "left";
          service.click(button, false);
          actionSummary.push(`clicked ${button} mouse button`);
          executedActions++;
        } else if (step.action === "type" && step.text) {
          service.typeText(step.text);
          actionSummary.push(`typed "${step.text}"`);
          executedActions++;
        } else {
          logger.warn("[performScreenAction] Invalid step:", step);
          actionSummary.push(`skipped invalid step: ${JSON.stringify(step)}`);
        }
      }

      logger.info(
        `[performScreenAction] Executed ${executedActions} actions: ${actionSummary.join(", ")}`,
      );

      await callback({
        thought: `Executed ${executedActions} screen actions successfully`,
        text: `Screen actions completed: ${actionSummary.join(", ")}.`,
      });
    } catch (error) {
      logger.error(
        "[performScreenAction] Error executing screen actions:",
        error,
      );
      await callback({
        thought: "Error occurred while executing screen actions",
        text: `Failed to complete screen actions. Executed ${executedActions} actions before error occurred.`,
      });
    }
  },
  examples: [
    [
      { name: "user", content: { text: "click the submit button" } },
      { name: "agent", content: { actions: ["PERFORM_SCREEN_ACTION"] } },
    ],
    [
      {
        name: "user",
        content: { text: "fill in the email field with test@example.com" },
      },
      { name: "agent", content: { actions: ["PERFORM_SCREEN_ACTION"] } },
    ],
  ],
};

export default performScreenAction;
