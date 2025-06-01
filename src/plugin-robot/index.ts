import { type Plugin } from "@elizaos/core";
import { RobotService } from "./service.ts";
import { performScreenAction } from "./action.ts";
import { screenProvider } from "./provider.ts";
import "./types"; // Ensure module augmentation is loaded

export const robotPlugin: Plugin = {
  name: "plugin-robot",
  description: "Control screen using robotjs and provide screen context",
  actions: [performScreenAction],
  providers: [screenProvider],
  services: [RobotService],
};

export default robotPlugin;
