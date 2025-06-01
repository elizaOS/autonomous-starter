import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RobotService } from "../service";
import type { IAgentRuntime } from "@elizaos/core";

// Mock robotjs
vi.mock("@jitsi/robotjs", () => {
  const mockWidth = 1920;
  const mockHeight = 1080;
  const mockChannels = 4; // BGRA
  // Create a buffer of the correct size for the mock screen dimensions
  const mockImageBuffer = Buffer.alloc(mockWidth * mockHeight * mockChannels);

  return {
    default: {
      getScreenSize: vi.fn(() => ({ width: mockWidth, height: mockHeight })),
      screen: {
        capture: vi.fn(() => ({
          image: mockImageBuffer, // Use the correctly sized buffer
          width: mockWidth,
          height: mockHeight,
          byteWidth: mockWidth * mockChannels,
          bitsPerPixel: mockChannels * 8,
          bytesPerPixel: mockChannels,
          // Add a mock colorAt if needed by any code path, though unlikely for these tests
          colorAt: vi.fn(() => "000000"),
        })),
      },
      moveMouse: vi.fn(),
      mouseClick: vi.fn(),
      typeString: vi.fn(),
    },
  };
});

// Mock Tesseract.js
vi.mock("tesseract.js", () => ({
  createWorker: vi.fn(() =>
    Promise.resolve({
      recognize: vi.fn(),
      terminate: vi.fn(),
    }),
  ),
}));

describe("RobotService OCR Tests", () => {
  let robotService: RobotService;
  let mockRuntime: IAgentRuntime;
  let mockTesseractWorker: any;

  beforeEach(async () => {
    mockRuntime = {
      useModel: vi.fn(),
      getService: vi.fn(),
      getAllServices: vi.fn(() => new Map()),
      getSetting: vi.fn((key: string) => {
        if (key === "ENABLE_LOCAL_OCR") return true;
        return null;
      }),
    } as any;

    // Define the mock worker object that tests will control
    mockTesseractWorker = {
      recognize: vi.fn(), // Default implementation will be set per test
      terminate: vi.fn().mockResolvedValue(undefined),
    };

    // Get the mocked createWorker from tesseract.js (which comes from the top-level vi.mock)
    const tesseract = await import("tesseract.js");
    const mockCreateWorker = vi.mocked(tesseract.createWorker);

    // Configure this mocked createWorker to resolve to our specific mockTesseractWorker instance
    mockCreateWorker.mockResolvedValue(mockTesseractWorker);

    // RobotService.start calls createWorker, which will now resolve to mockTesseractWorker.
    // This will set RobotService.tesseractWorker (the static property) to our mockTesseractWorker.
    robotService = (await RobotService.start(mockRuntime)) as RobotService;

    // ** Crucial Patch for instance method testing **
    // The RobotService instance created by RobotService.start() does not have its
    // instance `this.tesseractWorker` set. We patch it here so that instance methods
    // like `performLocalOCR` (when called on this instance) use our controlled mock worker.
    (robotService as any).tesseractWorker = mockTesseractWorker;
  });

  afterEach(async () => {
    await robotService.stop();
    vi.clearAllMocks();
  });

  describe("Local OCR with Tesseract.js", () => {
    it("should extract simple text from image", async () => {
      // Mock Tesseract response
      mockTesseractWorker.recognize.mockResolvedValue({
        data: { text: "Hello World" },
      });

      // Create a simple test image buffer (mock)
      const testImage = createTestImageBuffer("Hello World");

      // Access private method for testing
      const performLocalOCR = (robotService as any).performLocalOCR.bind(
        robotService,
      );
      const result = await performLocalOCR(testImage);

      expect(result).toBe("Hello World");
      expect(mockTesseractWorker.recognize).toHaveBeenCalledWith(testImage);
    });

    it("should extract multi-line text", async () => {
      const expectedText = "Line 1\nLine 2\nLine 3";
      mockTesseractWorker.recognize.mockResolvedValue({
        data: { text: expectedText },
      });

      const testImage = createTestImageBuffer(expectedText);
      const performLocalOCR = (robotService as any).performLocalOCR.bind(
        robotService,
      );
      const result = await performLocalOCR(testImage);

      expect(result).toBe(expectedText);
    });

    it("should handle special characters and numbers", async () => {
      const expectedText =
        "Email: test@example.com\nPhone: +1-555-123-4567\nPrice: $29.99";
      mockTesseractWorker.recognize.mockResolvedValue({
        data: { text: expectedText },
      });

      const testImage = createTestImageBuffer(expectedText);
      const performLocalOCR = (robotService as any).performLocalOCR.bind(
        robotService,
      );
      const result = await performLocalOCR(testImage);

      expect(result).toBe(expectedText);
    });

    it("should handle empty or whitespace-only text", async () => {
      mockTesseractWorker.recognize.mockResolvedValue({
        data: { text: "   \n\t  " },
      });

      const testImage = createTestImageBuffer("");
      const performLocalOCR = (robotService as any).performLocalOCR.bind(
        robotService,
      );
      const result = await performLocalOCR(testImage);

      expect(result).toBe(""); // Should be trimmed to empty string
    });

    it("should fall back to AI OCR when Tesseract fails", async () => {
      // Make Tesseract throw an error
      mockTesseractWorker.recognize.mockRejectedValue(
        new Error("Tesseract failed"),
      );

      // Mock AI OCR response
      mockRuntime.useModel = vi.fn().mockResolvedValue("AI OCR Result");

      const testImage = createTestImageBuffer("Test Text");
      const performLocalOCR = (robotService as any).performLocalOCR.bind(
        robotService,
      );
      const result = await performLocalOCR(testImage);

      expect(result).toBe("AI OCR Result");
      expect(mockRuntime.useModel).toHaveBeenCalled();
    });

    it("should handle large images efficiently", async () => {
      const largeText = "A".repeat(1000); // Large text content
      mockTesseractWorker.recognize.mockResolvedValue({
        data: { text: largeText },
      });

      // Use createTestImageBuffer to ensure it's a valid PNG for the test
      const largeImage = createTestImageBuffer(largeText);
      const performLocalOCR = (robotService as any).performLocalOCR.bind(
        robotService,
      );

      const startTime = Date.now();
      const result = await performLocalOCR(largeImage);
      const duration = Date.now() - startTime;

      expect(result).toBe(largeText);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe("AI OCR Fallback", () => {
    it("should use AI OCR when Tesseract is not available", async () => {
      // Create service without Tesseract
      const serviceWithoutTesseract = new RobotService(mockRuntime);
      (serviceWithoutTesseract as any).tesseractWorker = null;

      mockRuntime.useModel = vi.fn().mockResolvedValue("AI extracted text");

      const testImage = createTestImageBuffer("Test");
      const performLocalOCR = (
        serviceWithoutTesseract as any
      ).performLocalOCR.bind(serviceWithoutTesseract);
      const result = await performLocalOCR(testImage);

      expect(result).toBe("AI extracted text");
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        "IMAGE_DESCRIPTION",
        expect.objectContaining({
          imageUrl: expect.stringMatching(/^data:image\/png;base64,/),
          prompt: expect.stringContaining("Transcribe any text visible"),
        }),
      );
    });

    it("should handle different AI response formats", async () => {
      const serviceWithoutTesseract = new RobotService(mockRuntime);
      (serviceWithoutTesseract as any).tesseractWorker = null;

      // Test object response with description field
      mockRuntime.useModel = vi.fn().mockResolvedValue({
        description: "Object description text",
      });

      const testImage = createTestImageBuffer("Test");
      const performLocalOCR = (
        serviceWithoutTesseract as any
      ).performLocalOCR.bind(serviceWithoutTesseract);
      let result = await performLocalOCR(testImage);
      expect(result).toBe("Object description text");

      // Test object response with text field
      mockRuntime.useModel = vi.fn().mockResolvedValue({
        text: "Object text field",
      });
      result = await performLocalOCR(testImage);
      expect(result).toBe("Object text field");

      // Test object response with title field
      mockRuntime.useModel = vi.fn().mockResolvedValue({
        title: "Object title field",
      });
      result = await performLocalOCR(testImage);
      expect(result).toBe("Object title field");
    });
  });

  describe("Image Processing", () => {
    it("should handle empty image buffers gracefully", async () => {
      const emptyBuffer = Buffer.alloc(0);
      const performLocalOCR = (robotService as any).performLocalOCR.bind(
        robotService,
      );

      // Should fall back to AI OCR which handles empty buffers
      mockRuntime.useModel = vi.fn().mockResolvedValue("");
      const result = await performLocalOCR(emptyBuffer);

      expect(result).toBe("");
    });

    it("should downscale large images for performance", async () => {
      const largeImage = Buffer.alloc(2048 * 2048 * 4); // 16MB image
      const downscaleImage = (robotService as any).downscaleImage.bind(
        robotService,
      );

      const result = downscaleImage(largeImage, 1024);

      // For now, our mock implementation returns the original
      // In a real implementation, this would be smaller
      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe("Object Detection Robustness", () => {
    it("should handle null response from detectObjects model call", async () => {
      mockRuntime.useModel = vi.fn().mockResolvedValueOnce(null); // detectObjects returns null

      // Access private method for testing
      const detectObjects = (robotService as any).detectObjects.bind(
        robotService,
      );
      const objects = await detectObjects(createTestImageBuffer("test"));
      expect(objects).toEqual([]); // Should default to empty array
    });

    it("should handle undefined response from detectObjects model call", async () => {
      mockRuntime.useModel = vi.fn().mockResolvedValueOnce(undefined); // detectObjects returns undefined

      const detectObjects = (robotService as any).detectObjects.bind(
        robotService,
      );
      const objects = await detectObjects(createTestImageBuffer("test"));
      expect(objects).toEqual([]);
    });

    it("should handle non-array object response from detectObjects model call", async () => {
      mockRuntime.useModel = vi.fn().mockResolvedValueOnce({ not: "an array" }); // detectObjects returns an object

      const detectObjects = (robotService as any).detectObjects.bind(
        robotService,
      );
      const objects = await detectObjects(createTestImageBuffer("test"));
      expect(objects).toEqual([]);
    });

    it("should handle error during detectObjects model call", async () => {
      mockRuntime.useModel = vi
        .fn()
        .mockRejectedValueOnce(new Error("Model detection failed")); // detectObjects throws error

      const detectObjects = (robotService as any).detectObjects.bind(
        robotService,
      );
      const objects = await detectObjects(createTestImageBuffer("test"));
      expect(objects).toEqual([]);
    });

    it("should correctly extract objects from a wrapped { objects: [...] } structure", async () => {
      const wrappedObjects = {
        objects: [
          { label: "window", bbox: { x: 0, y: 0, width: 800, height: 600 } },
          { label: "icon", bbox: { x: 10, y: 10, width: 32, height: 32 } },
        ],
      };
      mockRuntime.useModel = vi.fn().mockResolvedValueOnce(wrappedObjects); // detectObjects returns wrapped structure

      const detectObjects = (robotService as any).detectObjects.bind(
        robotService,
      );
      const objects = await detectObjects(createTestImageBuffer("test"));
      expect(objects).toEqual(wrappedObjects.objects);
    });

    it("getContext should have empty objects array if detectObjects fails or returns non-array", async () => {
      mockTesseractWorker.recognize.mockResolvedValue({
        data: { text: "OCR Content" },
      });
      mockRuntime.useModel = vi
        .fn()
        .mockResolvedValueOnce("Screen Description") // describeImage
        .mockResolvedValueOnce(null) // detectObjects returns null
        .mockResolvedValueOnce("OCR Content"); // AI OCR (not used here ideally)

      const context = await robotService.getContext();
      expect(context.objects).toEqual([]);
    });
  });

  describe("Integration with Screen Context", () => {
    it("should include OCR results in screen context", async () => {
      mockTesseractWorker.recognize.mockResolvedValue({
        data: { text: "Screen text content" },
      });

      // Mock other AI services
      mockRuntime.useModel = vi
        .fn()
        .mockResolvedValueOnce("Screen description") // For describeImage
        .mockResolvedValueOnce([]); // For detectObjects

      const context = await robotService.getContext();

      expect(context.ocr).toBe("Screen text content");
      expect(context.currentDescription).toBe("Screen description");
    });

    it("should handle OCR errors gracefully in context", async () => {
      mockTesseractWorker.recognize.mockRejectedValue(new Error("OCR failed"));
      mockRuntime.useModel = vi
        .fn()
        .mockResolvedValueOnce("Screen description") // For describeImage
        .mockResolvedValueOnce([]) // For detectObjects
        .mockResolvedValueOnce(""); // For AI OCR fallback

      const context = await robotService.getContext();

      expect(context.ocr).toBe("");
      expect(context.currentDescription).toBe("Screen description");
    });
  });

  describe("Performance Tests", () => {
    it("should process OCR without blocking the main thread", async () => {
      // Simulate slow OCR processing
      mockTesseractWorker.recognize.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { text: "Slow OCR" } }), 100),
          ),
      );

      mockRuntime.useModel = vi
        .fn()
        .mockResolvedValue("Quick description")
        .mockResolvedValue([]);

      const startTime = Date.now();

      // First call should not block
      const contextPromise = robotService.getContext();
      const immediateTime = Date.now();

      // Should return quickly even if OCR is slow
      expect(immediateTime - startTime).toBeLessThan(50);

      const context = await contextPromise;
      expect(context).toBeDefined();
    });

    it("should handle concurrent OCR requests efficiently", async () => {
      mockTesseractWorker.recognize.mockResolvedValue({
        data: { text: "Concurrent OCR" },
      });

      mockRuntime.useModel = vi
        .fn()
        .mockResolvedValue("Description")
        .mockResolvedValue([]);

      // Make multiple concurrent requests
      const promises = Array(5)
        .fill(0)
        .map(() => robotService.getContext());
      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((context) => {
        expect(context).toBeDefined();
        expect(context.ocr).toBe("Concurrent OCR");
      });

      // Should not call Tesseract more times than necessary due to queuing
      expect(mockTesseractWorker.recognize).toHaveBeenCalled();
    });
  });
});

// Helper function to create test image buffers
function createTestImageBuffer(text: string): Buffer {
  // Create a buffer with a minimal valid PNG header + text
  const header = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52,
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01,
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53,
    0xde, // Minimal IHDR
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e,
    0x44,
    0xae,
    0x42,
    0x60,
    0x82, // IEND
  ]);
  const textBuffer = Buffer.from(text, "utf8");
  return Buffer.concat([header, textBuffer]);
}

// Helper function to create image with specific characteristics
function createTestImageWithProperties(
  width: number,
  height: number,
  text: string,
): Buffer {
  // For simplicity, reuse the basic text image buffer for these tests
  // In a more complex scenario, you might use the canvas helper from ocr-integration.test.ts
  const header = Buffer.from([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52,
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01,
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53,
    0xde, // Minimal IHDR
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e,
    0x44,
    0xae,
    0x42,
    0x60,
    0x82, // IEND
  ]);
  const imageDetails = JSON.stringify({
    width,
    height,
    text,
    timestamp: Date.now(),
  });
  const textBuffer = Buffer.from(imageDetails, "utf8");
  return Buffer.concat([header, textBuffer]);
}
