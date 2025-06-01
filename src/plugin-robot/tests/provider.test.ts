import { describe, it, expect, beforeEach, vi } from "vitest";
import { screenProvider } from "../provider";
import { RobotService } from "../service";
import type { IAgentRuntime, Memory, State, ModelType } from "@elizaos/core";
import type { ScreenContext, ScreenObject } from "../types";

// Mock the RobotService
const mockRobotService = {
  moveMouse: vi.fn(),
  click: vi.fn(),
  typeText: vi.fn(),
  getContext: vi.fn(),
  updateContext: vi.fn(),
  stop: vi.fn(),
  capabilityDescription:
    "Controls the screen and provides recent screen context with intelligent change detection and local OCR.",
};

// Mock the runtime
const mockRuntime = {
  getService: vi.fn(() => mockRobotService as unknown as RobotService),
  useModel: vi.fn(),
  emitEvent: vi.fn(),
} as unknown as IAgentRuntime;

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

const createMockScreenContext = (
  overrides: Partial<ScreenContext> = {},
): ScreenContext => ({
  screenshot: Buffer.from("mock-screenshot-data"),
  currentDescription: "A desktop with various windows and applications",
  descriptionHistory: [], // Added descriptionHistory
  ocr: "Sample text from screen",
  objects: [
    { label: "button", bbox: { x: 100, y: 200, width: 50, height: 20 } },
    { label: "text_field", bbox: { x: 50, y: 100, width: 150, height: 25 } },
  ],
  timestamp: Date.now(),
  changeDetected: true,
  pixelDifferencePercentage: 15.5,
  ...overrides,
});

describe("screenProvider", () => {
  let message: Memory;
  let state: State;
  let mockContext: ScreenContext;

  beforeEach(() => {
    vi.clearAllMocks();
    message = createMockMessage("get screen context");
    state = createMockState();
    mockContext = createMockScreenContext();
    mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
  });

  describe("provider properties", () => {
    it("should have correct provider properties", () => {
      expect(screenProvider.name).toBe("SCREEN_CONTEXT");
      expect(screenProvider.description).toBe(
        "Current screen context with OCR, description history, and change detection information.",
      );
      expect(screenProvider.position).toBe(50);
      expect(typeof screenProvider.get).toBe("function");
    });
  });

  describe("get method", () => {
    it("should return screen context when service is available", async () => {
      const result = await screenProvider.get(mockRuntime, message, state);

      expect(mockRobotService.getContext).toHaveBeenCalled();
      expect(result.values).toEqual({
        currentDescription: mockContext.currentDescription,
        ocr: mockContext.ocr,
        objects: mockContext.objects,
        changeDetected: mockContext.changeDetected,
        pixelDifferencePercentage: mockContext.pixelDifferencePercentage,
        historyCount: mockContext.descriptionHistory.length,
        serviceStatus: "active",
        dataAge: expect.any(String),
        isStale: false,
      });
      expect(result.text).toContain("# Current Screen Description");
      expect(result.text).toContain(mockContext.currentDescription);
      expect(result.text).toContain("# Text on Screen (OCR)");
      expect(result.text).toContain(mockContext.ocr);
      expect(result.text).toContain("# Interactive Objects");
      expect(result.text).toContain("button at (100,200)");
      expect(result.text).toContain("text_field at (50,100)");
      expect(result.data).toEqual(mockContext);
    });

    it("should handle service not available", async () => {
      const runtimeWithoutService = {
        ...mockRuntime,
        getService: vi.fn(() => null),
      } as unknown as IAgentRuntime;
      const result = await screenProvider.get(
        runtimeWithoutService,
        message,
        state,
      );

      expect(result.values).toEqual({
        serviceStatus: "initializing",
        dataAge: "unavailable",
        currentDescription: "",
        ocr: "",
        objects: [],
        changeDetected: false,
        pixelDifferencePercentage: undefined,
        historyCount: 0,
        isStale: false,
      });
      expect(result.text).toContain("Robot Service Initializing");
      expect(result.data).toEqual({ serviceStatus: "initializing" });
    });

    it("should handle empty objects list", async () => {
      mockContext.objects = [];
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain("# Interactive Objects");
      expect(result.text).toContain("No object data available");
      expect(result.values.objects).toEqual([]);
    });

    it("should handle multiple objects", async () => {
      mockContext.objects = [
        { label: "button", bbox: { x: 100, y: 200, width: 50, height: 20 } },
        {
          label: "text_field",
          bbox: { x: 50, y: 100, width: 150, height: 25 },
        },
        { label: "image", bbox: { x: 300, y: 150, width: 100, height: 100 } },
      ];
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain("button at (100,200)");
      expect(result.text).toContain("text_field at (50,100)");
      expect(result.text).toContain("image at (300,150)");
      expect(result.values.objects).toEqual(mockContext.objects);
    });

    it("should handle empty description", async () => {
      mockContext.currentDescription = "";
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.values.currentDescription).toBe("");
      expect(result.text).toContain("# Current Screen Description");
      expect(result.text).toContain("No description available");
    });

    it("should handle empty OCR", async () => {
      mockContext.ocr = "";
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.values.ocr).toBe("");
      expect(result.text).toContain("# Text on Screen (OCR)");
      expect(result.text).toContain("No text detected");
    });

    it("should handle service errors gracefully", async () => {
      mockRobotService.getContext = vi
        .fn()
        .mockRejectedValue(new Error("Service error"));
      const result = await screenProvider.get(mockRuntime, message, state);
      expect(result.values).toEqual({
        serviceStatus: "processing", // This is the fallback when getContext rejects
        dataAge: "processing",
        currentDescription: "",
        ocr: "",
        objects: [],
        changeDetected: false,
        pixelDifferencePercentage: undefined,
        historyCount: 0,
        isStale: false,
      });
      expect(result.text).toContain("Processing Screen Data"); // This is the fallback text
      expect(result.data).toEqual({ serviceStatus: "processing" });
    });

    it("should format text with proper headers", async () => {
      mockContext.descriptionHistory = [
        {
          description: "Old screen",
          relativeTime: "5 minutes ago",
          timestamp: Date.now() - 300000,
        },
      ];
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
      const result = await screenProvider.get(mockRuntime, message, state);
      const lines = result.text.split("\n\n");

      expect(lines[0]).toContain("# Current Screen Description");
      expect(lines[0]).toContain(mockContext.currentDescription);
      expect(lines[1]).toContain("# Recent Screen History");
      expect(lines[1]).toContain("1. 5 minutes ago: Old screen");
      expect(lines[2]).toContain("# Text on Screen (OCR)");
      expect(lines[2]).toContain(mockContext.ocr);
      expect(lines[3]).toContain("# Interactive Objects");
      expect(lines[3]).toContain("button at (100,200)");
      expect(lines[4]).toContain("# Processing Status");
      expect(lines[5]).toContain("# Data Freshness");
    });

    it("should handle objects with special characters in labels", async () => {
      mockContext.objects = [
        {
          label: "button-submit",
          bbox: { x: 100, y: 200, width: 50, height: 20 },
        },
        {
          label: "text_field_email",
          bbox: { x: 50, y: 100, width: 150, height: 25 },
        },
        { label: "icon@2x", bbox: { x: 300, y: 150, width: 100, height: 100 } },
      ];
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain("button-submit at (100,200)");
      expect(result.text).toContain("text_field_email at (50,100)");
      expect(result.text).toContain("icon@2x at (300,150)");
      expect(result.values.objects).toEqual(mockContext.objects);
    });

    it("should handle negative coordinates", async () => {
      mockContext.objects = [
        {
          label: "off_screen_element",
          bbox: { x: -10, y: -20, width: 50, height: 20 },
        },
      ];
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain("off_screen_element at (-10,-20)");
      expect(result.values.objects).toEqual(mockContext.objects);
    });

    it("should handle large coordinates", async () => {
      mockContext.objects = [
        {
          label: "large_screen_element",
          bbox: { x: 9999, y: 8888, width: 50, height: 20 },
        },
      ];
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain("large_screen_element at (9999,8888)");
      expect(result.values.objects).toEqual(mockContext.objects);
    });

    it("should preserve all context data in result.data", async () => {
      const result = await screenProvider.get(mockRuntime, message, state);
      expect(result.data).toEqual(mockContext); // This should be the full context object
      if (result.data && "screenshot" in result.data) {
        // Type guard for screenshot
        expect((result.data as ScreenContext).screenshot).toBeInstanceOf(
          Buffer,
        );
      }
      if (result.data && "timestamp" in result.data) {
        // Type guard for timestamp
        expect((result.data as ScreenContext).timestamp).toBe(
          mockContext.timestamp,
        );
      }
    });

    it("should handle unicode characters in description and OCR", async () => {
      mockContext.currentDescription =
        "Desktop with 中文 characters and émojis 🌟";
      mockContext.ocr = "Text with ñoñó and café";
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);
      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.values.currentDescription).toBe(
        "Desktop with 中文 characters and émojis 🌟",
      );
      expect(result.values.ocr).toBe("Text with ñoñó and café");
      expect(result.text).toContain(
        "Desktop with 中文 characters and émojis 🌟",
      );
      expect(result.text).toContain("Text with ñoñó and café");
    });
  });
});
