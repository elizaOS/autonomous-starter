import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
} from "@elizaos/core";
import { type RobotService } from "./service";

export interface ScreenActionStep {
  action: "move" | "click" | "type";
  x?: number;
  y?: number;
  text?: string;
  button?: "left" | "right" | "middle";
}

export const performScreenAction: Action = {
  name: "PERFORM_SCREEN_ACTION",
  similes: ["SCREEN_ACTION", "CONTROL_SCREEN"],
  description:
    "Perform mouse and keyboard actions on the host screen. Options should include a list of steps.",
  validate: async (runtime: IAgentRuntime) => {
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
      await callback({
        thought: "RobotService not available",
        text: "Unable to perform screen action.",
      });
      return;
    }
    for (const step of options.steps || []) {
      if (
        step.action === "move" &&
        step.x !== undefined &&
        step.y !== undefined
      ) {
        service.moveMouse(step.x, step.y);
      } else if (step.action === "click") {
        service.click(step.button);
      } else if (step.action === "type" && step.text) {
        service.typeText(step.text);
      }
    }
    await callback({
      thought: "Executed screen actions",
      text: "Screen actions executed.",
    });
  },
  examples: [
    [
      { name: "user", content: { text: "click submit" } },
      { name: "agent", content: { actions: ["PERFORM_SCREEN_ACTION"] } },
    ],
  ],
};
