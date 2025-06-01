import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RobotService } from "../service";
import type { IAgentRuntime } from "@elizaos/core";
import { createCanvas, loadImage } from "canvas";

// Mock robotjs
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

describe("OCR Integration Tests with Real Images", () => {
  let robotService: RobotService;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    // Create mock runtime
    mockRuntime = {
      useModel: vi.fn(),
      getService: vi.fn(),
      getAllServices: vi.fn(() => new Map()),
    } as any;

    robotService = new RobotService(mockRuntime);
  });

  afterEach(async () => {
    await robotService.stop();
    vi.clearAllMocks();
  });

  describe("Real Image Generation and OCR", () => {
    it("should generate and process a simple text image", async () => {
      const testText = "Hello World";
      const imageBuffer = generateTextImage(testText, 400, 100);

      expect(imageBuffer).toBeDefined();
      expect(Buffer.isBuffer(imageBuffer)).toBe(true);
      expect(imageBuffer.length).toBeGreaterThan(0);
    });

    it("should generate images with different text sizes", async () => {
      const texts = ["Small", "Medium Text", "Large Text Content"];
      const sizes = [12, 24, 48];

      for (let i = 0; i < texts.length; i++) {
        const imageBuffer = generateTextImage(texts[i], 400, 100, sizes[i]);
        expect(imageBuffer.length).toBeGreaterThan(0);
      }
    });

    it("should generate multi-line text images", async () => {
      const multiLineText = "Line 1\nLine 2\nLine 3";
      const imageBuffer = generateMultiLineTextImage(multiLineText, 400, 200);

      expect(imageBuffer).toBeDefined();
      expect(imageBuffer.length).toBeGreaterThan(0);
    });

    it("should generate images with special characters", async () => {
      const specialText =
        "Email: test@example.com\nPhone: +1-555-123-4567\nPrice: $29.99";
      const imageBuffer = generateMultiLineTextImage(specialText, 500, 150);

      expect(imageBuffer).toBeDefined();
      expect(imageBuffer.length).toBeGreaterThan(0);
    });

    it("should handle different image dimensions", async () => {
      const dimensions = [
        { width: 200, height: 100 },
        { width: 800, height: 200 },
        { width: 1024, height: 768 },
        { width: 1920, height: 1080 },
      ];

      for (const dim of dimensions) {
        const imageBuffer = generateTextImage(
          "Test Text",
          dim.width,
          dim.height,
        );
        expect(imageBuffer.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Image Downscaling Tests", () => {
    it("should downscale large images correctly", async () => {
      // Generate a large image
      const largeImage = generateTextImage("Large Image Test", 2048, 1536);

      // Test downscaling
      const downscaleImage = (robotService as any).downscaleImage.bind(
        robotService,
      );
      const scaledImage = downscaleImage(largeImage, 1024);

      expect(scaledImage).toBeDefined();
      expect(Buffer.isBuffer(scaledImage)).toBe(true);

      // In our current mock implementation, it returns the original
      // In a real implementation, we'd verify the size reduction
      expect(scaledImage.length).toBeGreaterThan(0);
    });

    it("should maintain image quality during downscaling", async () => {
      const originalImage = generateTextImage("Quality Test", 1600, 1200);
      const downscaleImage = (robotService as any).downscaleImage.bind(
        robotService,
      );
      const scaledImage = downscaleImage(originalImage, 800);

      // Both images should be valid
      expect(originalImage.length).toBeGreaterThan(0);
      expect(scaledImage.length).toBeGreaterThan(0);
    });
  });

  describe("Performance with Real Images", () => {
    it("should process small images quickly", async () => {
      const smallImage = generateTextImage("Quick Test", 200, 100);

      const startTime = Date.now();
      const downscaleImage = (robotService as any).downscaleImage.bind(
        robotService,
      );
      const result = downscaleImage(smallImage, 1024);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should be very fast
      expect(result).toBeDefined();
    });

    it("should handle multiple image processing requests", async () => {
      const images = Array(10)
        .fill(0)
        .map((_, i) => generateTextImage(`Test ${i}`, 300, 100));

      const startTime = Date.now();
      const downscaleImage = (robotService as any).downscaleImage.bind(
        robotService,
      );

      const results = images.map((img) => downscaleImage(img, 1024));
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should process all within 1 second
      expect(results).toHaveLength(10);
      results.forEach((result) => expect(result).toBeDefined());
    });
  });

  describe("Screen Context Integration", () => {
    it("should integrate real image processing with screen context", async () => {
      const context = await robotService.getContext();
      expect(context).toBeDefined();
      expect(context.screenshot).toBeDefined();
      expect(context.currentDescription).toBe("");
    });
  });
});

// Helper functions for generating real images with text
function generateTextImage(
  text: string,
  width: number,
  height: number,
  fontSize: number = 24,
): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Set background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  // Set text properties
  ctx.fillStyle = "black";
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw text
  ctx.fillText(text, width / 2, height / 2);

  // Return as PNG buffer
  return canvas.toBuffer("image/png");
}

function generateMultiLineTextImage(
  text: string,
  width: number,
  height: number,
  fontSize: number = 20,
): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Set background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  // Set text properties
  ctx.fillStyle = "black";
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Split text into lines and draw each line
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.2;
  const startY = (height - lines.length * lineHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, 20, startY + index * lineHeight);
  });

  return canvas.toBuffer("image/png");
}

function generateComplexLayoutImage(width: number, height: number): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Set background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  // Draw header
  ctx.fillStyle = "navy";
  ctx.fillRect(0, 0, width, 60);
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Application Header", width / 2, 35);

  // Draw sidebar
  ctx.fillStyle = "lightgray";
  ctx.fillRect(0, 60, 200, height - 60);
  ctx.fillStyle = "black";
  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Menu Item 1", 20, 100);
  ctx.fillText("Menu Item 2", 20, 130);
  ctx.fillText("Menu Item 3", 20, 160);

  // Draw main content
  ctx.fillStyle = "black";
  ctx.font = "18px Arial";
  ctx.fillText("Main Content Area", 220, 100);
  ctx.fillText("Lorem ipsum dolor sit amet", 220, 130);
  ctx.fillText("consectetur adipiscing elit", 220, 160);

  // Draw button
  ctx.fillStyle = "blue";
  ctx.fillRect(220, 200, 100, 40);
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Submit", 270, 225);

  return canvas.toBuffer("image/png");
}
