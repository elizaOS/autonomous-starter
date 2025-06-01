import { describe, it, expect, beforeEach, vi } from "vitest";
import { performScreenAction } from "../action";
import { type ScreenActionStep } from "../types";
import { RobotService } from "../service.js";
import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";

// Mock the RobotService
const mockRobotService = {
  moveMouse: vi.fn(),
  click: vi.fn(),
  typeText: vi.fn(),
  getContext: vi.fn(),
  updateContext: vi.fn(),
  stop: vi.fn(),
  capabilityDescription:
    "Controls the screen and provides recent screen context.",
} as unknown as RobotService;

// Mock the runtime
const mockRuntime = {
  agentId: "12345678-1234-1234-1234-123456789abc" as const,
  getService: vi.fn(() => mockRobotService),
  useModel: vi.fn(),
  emitEvent: vi.fn(),
} as unknown as IAgentRuntime;

// Mock message and state
const createMockMessage = (text: string): Memory => ({
  id: "12345678-1234-1234-1234-123456789abc",
  agentId: "agent-12345678-1234-1234-1234-123456789abc",
  entityId: "entity-12345678-1234-1234-1234-123456789def",
  roomId: "room-12345678-1234-1234-1234-123456789ghi",
  content: { text },
  createdAt: Date.now(),
});

const createMockState = (additionalData: Record<string, any> = {}): State => ({
  values: {},
  data: {},
  text: "",
  ...additionalData,
});

describe("performScreenAction", () => {
  let mockCallback: HandlerCallback;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallback = vi.fn();
  });

  describe("action properties", () => {
    it("should have correct action properties", () => {
      expect(performScreenAction.name).toBe("PERFORM_SCREEN_ACTION");
      expect(performScreenAction.similes).toEqual([
        "SCREEN_ACTION",
        "CONTROL_SCREEN",
        "INTERACT_SCREEN",
      ]);
      expect(performScreenAction.description).toContain(
        "Perform mouse and keyboard actions",
      );
    });

    it("should have examples", () => {
      expect(performScreenAction.examples).toBeDefined();
      expect(performScreenAction.examples).toHaveLength(2);
      expect(performScreenAction.examples[0]).toHaveLength(2);
      expect(performScreenAction.examples[1]).toHaveLength(2);
    });
  });

  describe("validate", () => {
    it("should validate successfully when RobotService is available", async () => {
      const message = createMockMessage("test");
      const isValid = await performScreenAction.validate(mockRuntime, message);
      expect(isValid).toBe(true);
      expect(mockRuntime.getService).toHaveBeenCalledWith("ROBOT");
    });

    it("should fail validation when RobotService is not available", async () => {
      const runtimeWithoutService = {
        ...mockRuntime,
        getService: vi.fn(() => null),
      } as unknown as IAgentRuntime;
      const message = createMockMessage("test");
      const isValid = await performScreenAction.validate(
        runtimeWithoutService,
        message,
      );
      expect(isValid).toBe(false);
    });
  });

  describe("handler", () => {
    const message = createMockMessage("click submit button");
    const state = createMockState();

    it("should handle mouse move action", async () => {
      const options = {
        steps: [{ action: "move", x: 100, y: 200 } as ScreenActionStep],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.moveMouse).toHaveBeenCalledWith(100, 200);
      expect(mockCallback).toHaveBeenCalledWith({
        thought: "Executed 1 screen actions successfully",
        text: "Screen actions completed: moved mouse to (100, 200).",
      });
    });

    it("should handle click action with default button", async () => {
      const options = {
        steps: [{ action: "click" } as ScreenActionStep],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.click).toHaveBeenCalledWith("left", false);
      expect(mockCallback).toHaveBeenCalledWith({
        thought: "Executed 1 screen actions successfully",
        text: "Screen actions completed: clicked left mouse button.",
      });
    });

    it("should handle click action with specified button", async () => {
      const options = {
        steps: [{ action: "click", button: "right" } as ScreenActionStep],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.click).toHaveBeenCalledWith("right", false);
    });

    it("should handle type action", async () => {
      const options = {
        steps: [{ action: "type", text: "Hello, World!" } as ScreenActionStep],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.typeText).toHaveBeenCalledWith("Hello, World!");
    });

    it("should handle multiple actions in sequence", async () => {
      const options = {
        steps: [
          { action: "move", x: 100, y: 200 } as ScreenActionStep,
          { action: "click", button: "left" } as ScreenActionStep,
          { action: "type", text: "test input" } as ScreenActionStep,
        ],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.moveMouse).toHaveBeenCalledWith(100, 200);
      expect(mockRobotService.click).toHaveBeenCalledWith("left", false);
      expect(mockRobotService.typeText).toHaveBeenCalledWith("test input");
    });

    it("should skip invalid move actions (missing coordinates)", async () => {
      const options = {
        steps: [
          { action: "move", x: 100 } as ScreenActionStep, // Missing y
          { action: "move", y: 200 } as ScreenActionStep, // Missing x
          { action: "move", x: 50, y: 75 } as ScreenActionStep, // Valid
        ],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.moveMouse).toHaveBeenCalledTimes(1);
      expect(mockRobotService.moveMouse).toHaveBeenCalledWith(50, 75);
    });

    it("should skip type actions without text", async () => {
      const options = {
        steps: [
          { action: "type" } as ScreenActionStep, // Missing text
          { action: "type", text: "" } as ScreenActionStep, // Empty text
          { action: "type", text: "valid text" } as ScreenActionStep, // Valid
        ],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.typeText).toHaveBeenCalledTimes(1);
      expect(mockRobotService.typeText).toHaveBeenCalledWith("valid text");
    });

    it("should handle empty steps array", async () => {
      const options = { steps: [] };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.moveMouse).not.toHaveBeenCalled();
      expect(mockRobotService.click).not.toHaveBeenCalled();
      expect(mockRobotService.typeText).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith({
        thought: "No valid steps provided",
        text: "Unable to perform screen action - no valid steps were provided.",
      });
    });

    it("should handle missing steps property", async () => {
      const options = {};

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.moveMouse).not.toHaveBeenCalled();
      expect(mockRobotService.click).not.toHaveBeenCalled();
      expect(mockRobotService.typeText).not.toHaveBeenCalled();
      expect(mockCallback).toHaveBeenCalledWith({
        thought: "No valid steps provided",
        text: "Unable to perform screen action - no valid steps were provided.",
      });
    });

    it("should handle service unavailable gracefully", async () => {
      const runtimeWithoutService = {
        ...mockRuntime,
        getService: vi.fn(() => null),
      } as unknown as IAgentRuntime;

      const options = {
        steps: [{ action: "click" } as ScreenActionStep],
      };

      await performScreenAction.handler(
        runtimeWithoutService,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        thought: "RobotService not available",
        text: "Unable to perform screen action - robot service is not available.",
      });
    });

    it("should handle unknown action types gracefully", async () => {
      const options = {
        steps: [
          { action: "unknown_action" } as any,
          { action: "click" } as ScreenActionStep,
        ],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      // Should skip unknown action and process the click
      expect(mockRobotService.click).toHaveBeenCalledWith("left", false);
      expect(mockCallback).toHaveBeenCalledWith({
        thought: "Executed 1 screen actions successfully",
        text: 'Screen actions completed: skipped invalid step: {"action":"unknown_action"}, clicked left mouse button.',
      });
    });

    it("should handle special characters in type action", async () => {
      const options = {
        steps: [
          {
            action: "type",
            text: "Special chars: @#$%^&*()_+-=[]{}|;:,.<>?",
          } as ScreenActionStep,
        ],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.typeText).toHaveBeenCalledWith(
        "Special chars: @#$%^&*()_+-=[]{}|;:,.<>?",
      );
    });

    it("should handle unicode characters in type action", async () => {
      const options = {
        steps: [
          {
            action: "type",
            text: "Unicode: 你好 🌟 café naïve",
          } as ScreenActionStep,
        ],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.typeText).toHaveBeenCalledWith(
        "Unicode: 你好 🌟 café naïve",
      );
    });

    it("should handle negative coordinates in move action", async () => {
      const options = {
        steps: [{ action: "move", x: -10, y: -20 } as ScreenActionStep],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.moveMouse).toHaveBeenCalledWith(-10, -20);
    });

    it("should handle large coordinates in move action", async () => {
      const options = {
        steps: [{ action: "move", x: 9999, y: 9999 } as ScreenActionStep],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.moveMouse).toHaveBeenCalledWith(9999, 9999);
    });

    it("should handle all mouse button types", async () => {
      const options = {
        steps: [
          { action: "click", button: "left" } as ScreenActionStep,
          { action: "click", button: "right" } as ScreenActionStep,
          { action: "click", button: "middle" } as ScreenActionStep,
        ],
      };

      await performScreenAction.handler(
        mockRuntime,
        message,
        state,
        options,
        mockCallback,
      );

      expect(mockRobotService.click).toHaveBeenCalledWith("left", false);
      expect(mockRobotService.click).toHaveBeenCalledWith("right", false);
      expect(mockRobotService.click).toHaveBeenCalledWith("middle", false);
      expect(mockRobotService.click).toHaveBeenCalledTimes(3);
    });
  });
});
