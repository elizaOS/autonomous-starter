import { describe, it, expect, vi } from "vitest";

// Mock robotjs before any imports
vi.mock("@jitsi/robotjs", () => ({
  default: {
    getScreenSize: vi.fn(() => ({ width: 1920, height: 1080 })),
    screen: {
      capture: vi.fn(() => ({
        image: Buffer.from("mock-screenshot-data"),
        width: 1920,
        height: 1080,
        byteWidth: 7680,
        bitsPerPixel: 32,
        bytesPerPixel: 4,
      })),
    },
    moveMouse: vi.fn(),
    mouseClick: vi.fn(),
    typeString: vi.fn(),
  },
}));

import { robotPlugin } from "../index.js";
import { RobotService } from "../service.js";
import { performScreenAction } from "../action.js";
import { screenProvider } from "../provider.js";

describe("Robot Plugin", () => {
  describe("plugin structure", () => {
    it("should have correct plugin properties", () => {
      expect(robotPlugin.name).toBe("plugin-robot");
      expect(robotPlugin.description).toBe(
        "Control screen using robotjs and provide screen context",
      );
    });

    it("should export correct components", () => {
      expect(robotPlugin.actions).toHaveLength(1);
      expect(robotPlugin.providers).toHaveLength(1);
      expect(robotPlugin.services).toHaveLength(1);

      expect(robotPlugin.actions[0]).toBe(performScreenAction);
      expect(robotPlugin.providers[0]).toBe(screenProvider);
      expect(robotPlugin.services[0]).toBe(RobotService);
    });

    it("should have valid action structure", () => {
      expect(robotPlugin.actions).toBeInstanceOf(Array);
      expect(robotPlugin.actions.length).toBeGreaterThan(0);
      const action = robotPlugin.actions[0];
      expect(action.name).toBe("PERFORM_SCREEN_ACTION");
      expect(action.similes).toEqual([
        "SCREEN_ACTION",
        "CONTROL_SCREEN",
        "INTERACT_SCREEN",
      ]);
      expect(action.description).toContain(
        "Perform mouse and keyboard actions",
      );
      expect(typeof action.validate).toBe("function");
      expect(typeof action.handler).toBe("function");
      expect(action.examples).toBeDefined();
    });

    it("should have valid provider structure", () => {
      expect(robotPlugin.providers).toBeInstanceOf(Array);
      expect(robotPlugin.providers.length).toBeGreaterThan(0);
      const provider = robotPlugin.providers[0];
      expect(provider.name).toBe("SCREEN_CONTEXT");
      expect(provider.description).toBe(
        "Current screen context with OCR, description history, and change detection information.",
      );
      expect(provider.position).toBe(50);
      expect(typeof provider.get).toBe("function");
    });

    it("should have valid service structure", () => {
      const service = robotPlugin.services[0];
      expect(service.serviceType).toBe("ROBOT");
      expect(typeof service.start).toBe("function");
    });
  });
});
