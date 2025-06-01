import { Service, ModelType, logger } from "@elizaos/core";
import type { IAgentRuntime, ServiceTypeName } from "@elizaos/core";
import {
  RobotServiceType,
  type ScreenObject,
  type ScreenContext,
  type ScreenDescription,
  type RobotServiceConfig,
  type ChangeDetectionConfig,
} from "./types";
import { createWorker } from "tesseract.js";
import sharp from "sharp";
// @ts-ignore - Mocked module, will be replaced by actual implementation
import robot from "@jitsi/robotjs";

export class RobotService extends Service {
  static serviceType: ServiceTypeName = RobotServiceType.ROBOT;
  capabilityDescription =
    "Controls the screen and provides recent screen context with intelligent change detection and local OCR.";

  private context: ScreenContext | null = null;
  private previousScreenshot: Buffer | null = null;
  private descriptionHistory: ScreenDescription[] = [];
  private tesseractWorker: any = null;
  private isProcessing: boolean = false;
  private processingQueue: Promise<void> = Promise.resolve();

  public readonly config: RobotServiceConfig = {
    cacheTTL: 5000, // 5 seconds
    changeDetection: {
      threshold: 80, // 80% pixel difference threshold
      enabled: true,
    },
    maxHistoryEntries: 3,
  };

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<Service> {
    try {
      logger.info("[RobotService] Initializing Tesseract.js worker...");
      // @ts-ignore TODO: Fix tesseract.js types if possible or use a more specific mock type
      this.tesseractWorker = await createWorker("eng");
      logger.info(
        "[RobotService] Tesseract.js worker initialized successfully",
      );
    } catch (error) {
      logger.error(
        "[RobotService] Failed to initialize Tesseract.js worker:",
        error,
      );
      // Continue without Tesseract - will fall back to AI OCR
    }

    return new RobotService(runtime);
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    const service = runtime.getService<RobotService>("ROBOT" as any);
    if (!service) {
      logger.warn("[RobotService] RobotService not available");
      return;
    }

    await service.stop();
  }
  async stop(): Promise<void> {
    // Clean up resources
    this.context = null;
    this.previousScreenshot = null;
    this.descriptionHistory = [];
    this.isProcessing = false;

    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }

  private async captureScreen(): Promise<Buffer> {
    try {
      const size = robot.getScreenSize();
      const capture = robot.screen.capture(0, 0, size.width, size.height);

      // Convert raw bitmap to PNG format for Tesseract compatibility
      const rawBuffer = Buffer.from(capture.image);

      // Check if it's already a valid image format
      if (this.isValidImageBuffer(rawBuffer)) {
        return rawBuffer;
      }

      // Convert raw bitmap data to PNG using sharp
      try {
        logger.debug(
          `[RobotService] Converting raw bitmap (${size.width}x${size.height}) to PNG format`,
        );

        // RobotJS returns BGRA format (4 bytes per pixel)
        const pngBuffer = await sharp(rawBuffer, {
          raw: {
            width: size.width,
            height: size.height,
            channels: 4, // BGRA
          },
        })
          .png()
          .toBuffer();

        logger.debug(
          `[RobotService] Successfully converted to PNG (${pngBuffer.length} bytes)`,
        );
        return pngBuffer;
      } catch (conversionError) {
        logger.error(
          "[RobotService] Failed to convert bitmap to PNG:",
          conversionError,
        );
        // Fall back to mock PNG for testing
        return this.createMockPNG(size.width, size.height);
      }
    } catch (error) {
      logger.error("[RobotService] Screen capture failed:", error);
      // Return a small mock PNG for testing
      return this.createMockPNG(800, 600);
    }
  }

  private createMockPNG(width: number, height: number): Buffer {
    // Create a minimal PNG header for testing
    // In production, you'd use a proper image library like sharp or canvas
    const mockPNG = Buffer.from([
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
      0x0d, // IHDR chunk length
      0x49,
      0x48,
      0x44,
      0x52, // IHDR
      0x00,
      0x00,
      0x03,
      0x20, // Width (800)
      0x00,
      0x00,
      0x02,
      0x58, // Height (600)
      0x08,
      0x02,
      0x00,
      0x00,
      0x00, // Bit depth, color type, compression, filter, interlace
      0x8e,
      0x6a,
      0xde,
      0x35, // CRC
      0x00,
      0x00,
      0x00,
      0x00, // IEND chunk length
      0x49,
      0x45,
      0x4e,
      0x44, // IEND
      0xae,
      0x42,
      0x60,
      0x82, // CRC
    ]);

    return mockPNG;
  }

  private downscaleImage(imageBuffer: Buffer, maxSize: number = 1024): Buffer {
    try {
      // For now, return the original buffer
      // In a real implementation, you'd use a library like sharp or jimp
      // to resize the image while maintaining aspect ratio
      return imageBuffer;
    } catch (error) {
      logger.warn(
        "[RobotService] Image downscaling failed, using original:",
        error,
      );
      return imageBuffer;
    }
  }

  private calculatePixelDifference(buffer1: Buffer, buffer2: Buffer): number {
    if (buffer1.length !== buffer2.length) {
      return 100; // Assume complete change if sizes differ
    }

    let differentPixels = 0;
    const totalPixels = buffer1.length;
    const sampleRate = Math.max(1, Math.floor(totalPixels / 10000)); // Sample for performance

    for (let i = 0; i < totalPixels; i += sampleRate) {
      if (buffer1[i] !== buffer2[i]) {
        differentPixels++;
      }
    }

    return (differentPixels / (totalPixels / sampleRate)) * 100;
  }

  private shouldTriggerAIProcessing(currentScreenshot: Buffer): {
    shouldTrigger: boolean;
    pixelDifference?: number;
  } {
    if (!this.config.changeDetection.enabled || !this.previousScreenshot) {
      return { shouldTrigger: true };
    }

    const pixelDifference = this.calculatePixelDifference(
      currentScreenshot,
      this.previousScreenshot,
    );
    const shouldTrigger =
      pixelDifference >= this.config.changeDetection.threshold;

    logger.debug(
      `[RobotService] Pixel difference: ${pixelDifference.toFixed(2)}%, Threshold: ${this.config.changeDetection.threshold}%, Trigger AI: ${shouldTrigger}`,
    );

    return { shouldTrigger, pixelDifference };
  }

  private async performLocalOCR(image: Buffer): Promise<string> {
    if (!this.tesseractWorker) {
      logger.debug(
        "[RobotService] Tesseract worker not available, falling back to AI OCR",
      );
      return this.performAIOCR(image);
    }

    try {
      if (!image || image.length === 0) {
        logger.warn("[RobotService] Empty image buffer provided to OCR");
        return "";
      }

      logger.debug(
        `[RobotService] Performing local OCR with Tesseract.js on ${image.length} byte image`,
      );
      const startTime = Date.now();

      // Downscale image for faster OCR processing
      const processedImage = this.downscaleImage(image, 1024);

      // Validate image format before passing to Tesseract
      if (!this.isValidImageBuffer(processedImage)) {
        logger.warn(
          "[RobotService] Invalid image format, falling back to AI OCR",
        );
        return this.performAIOCR(image);
      }

      const {
        data: { text },
      } = await this.tesseractWorker.recognize(processedImage);
      const duration = Date.now() - startTime;

      logger.debug(
        `[RobotService] Local OCR completed in ${duration}ms, extracted ${text.length} characters`,
      );
      return text.trim();
    } catch (error) {
      logger.error(
        "[RobotService] Local OCR failed, falling back to AI OCR:",
        error,
      );
      return this.performAIOCR(image);
    }
  }

  private isValidImageBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 8) {
      return false;
    }

    // Check for common image format signatures
    const header = buffer.subarray(0, 8);

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47
    ) {
      return true;
    }

    // JPEG signature: FF D8 FF
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
      return true;
    }

    // GIF signature: 47 49 46 38
    if (
      header[0] === 0x47 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x38
    ) {
      return true;
    }

    // BMP signature: 42 4D
    if (header[0] === 0x42 && header[1] === 0x4d) {
      return true;
    }

    return false;
  }

  private async performAIOCR(image: Buffer): Promise<string> {
    try {
      if (!image || image.length === 0) {
        logger.warn(
          "[RobotService] performAIOCR received an empty image buffer.",
        );
        return "";
      }

      const processedImage = this.downscaleImage(image, 1024);
      const imageUrl = `data:image/png;base64,${processedImage.toString("base64")}`;
      const ocrPrompt =
        "Transcribe any text visible in this image. If no text is visible, respond with an empty string.";

      const result: any = await this.runtime.useModel(
        ModelType.IMAGE_DESCRIPTION,
        {
          imageUrl: imageUrl,
          prompt: ocrPrompt,
        },
      );

      if (typeof result === "string") {
        return result;
      } else if (result && typeof result === "object") {
        return (
          result.description ||
          result.text ||
          result.title ||
          JSON.stringify(result)
        );
      }
      return "";
    } catch (error) {
      logger.error("[RobotService] AI OCR failed:", error);
      return "";
    }
  }

  private async describeImage(image: Buffer): Promise<string> {
    try {
      const processedImage = this.downscaleImage(image, 1024);
      const description = await this.runtime.useModel(ModelType.TEXT_SMALL, {
        prompt:
          "Describe this screenshot in detail, focusing on the main elements, layout, and any significant changes.",
        image: processedImage,
      });
      return description || "";
    } catch (e) {
      logger.error("[RobotService] describeImage error", e);
      return "";
    }
  }

  private async detectObjects(image: Buffer): Promise<ScreenObject[]> {
    try {
      const processedImage = this.downscaleImage(image, 1024);
      const result = await this.runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt:
          "Detect interactive objects with bounding boxes in this screenshot",
        image: processedImage,
      });

      // Handle different possible structures for object detection results
      if (Array.isArray(result)) {
        return result as ScreenObject[];
      } else if (
        result &&
        typeof result === "object" &&
        Array.isArray((result as any).objects)
      ) {
        logger.debug(
          "[RobotService] detectObjects received wrapped objects array, unwrapping.",
        );
        return (result as any).objects as ScreenObject[];
      } else if (
        result &&
        typeof result === "object" &&
        Object.keys(result).length === 0
      ) {
        logger.debug(
          "[RobotService] detectObjects received empty object, defaulting to empty array.",
        );
        return []; // Handle empty object case
      } else {
        logger.warn(
          "[RobotService] detectObjects received unexpected result type or structure, defaulting to empty array. Result:",
          result,
        );
        return [];
      }
    } catch (e) {
      logger.error(
        "[RobotService] detectObjects error, defaulting to empty array:",
        e,
      );
      return [];
    }
  }

  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours} hours ago`;
    }
  }

  private updateDescriptionHistory(
    description: string,
    timestamp: number,
  ): void {
    const relativeTime = this.formatRelativeTime(timestamp);

    this.descriptionHistory.unshift({
      description,
      timestamp,
      relativeTime,
    });

    // Keep only the last N entries
    if (this.descriptionHistory.length > this.config.maxHistoryEntries) {
      this.descriptionHistory = this.descriptionHistory.slice(
        0,
        this.config.maxHistoryEntries,
      );
    }

    // Update relative times for all entries
    this.descriptionHistory = this.descriptionHistory.map((entry) => ({
      ...entry,
      relativeTime: this.formatRelativeTime(entry.timestamp),
    }));
  }

  private async updateContextInBackground(): Promise<void> {
    // Queue the processing to avoid blocking
    this.processingQueue = this.processingQueue.then(async () => {
      if (this.isProcessing) {
        logger.debug("[RobotService] Already processing, skipping update");
        return;
      }

      this.isProcessing = true;
      try {
        await this.performUpdate();
      } finally {
        this.isProcessing = false;
      }
    });

    return this.processingQueue;
  }

  private async performUpdate(): Promise<void> {
    try {
      const screenshot = await this.captureScreen();
      const { shouldTrigger, pixelDifference } =
        this.shouldTriggerAIProcessing(screenshot);

      // Always perform OCR (fast with Tesseract.js)
      const ocrPromise = this.performLocalOCR(screenshot);

      let description = "";
      let objects: ScreenObject[] = []; // Initialize as empty array

      if (shouldTrigger) {
        logger.debug(
          "[RobotService] Significant change detected, running AI analysis...",
        );
        // Run expensive AI operations only when significant change detected
        const [aiDescription, aiObjects] = await Promise.all([
          this.describeImage(screenshot),
          this.detectObjects(screenshot), // This now guarantees an array
        ]);

        description = aiDescription;
        objects = aiObjects; // aiObjects is guaranteed to be an array

        // Update description history
        if (description) {
          this.updateDescriptionHistory(description, Date.now());
        }
      } else {
        logger.debug(
          "[RobotService] No significant change detected, skipping AI analysis",
        );
        // Use the most recent description from history
        description =
          this.descriptionHistory[0]?.description ||
          "No recent description available";
        objects = this.context?.objects || []; // Ensure fallback is an array
      }

      // Wait for OCR to complete
      const ocr = await ocrPromise;

      this.context = {
        screenshot,
        currentDescription: description,
        descriptionHistory: [...this.descriptionHistory],
        ocr,
        objects, // Guaranteed to be an array
        timestamp: Date.now(),
        changeDetected: shouldTrigger,
        pixelDifferencePercentage: pixelDifference,
      };

      // Store current screenshot for next comparison
      this.previousScreenshot = screenshot;
    } catch (error) {
      logger.error("[RobotService] Error updating context:", error);
      // Ensure context is at least minimally valid on error
      if (!this.context) {
        this.context = {
          screenshot: Buffer.from(""),
          currentDescription: "Error updating context",
          descriptionHistory: [],
          ocr: "",
          objects: [], // Default to empty array
          timestamp: Date.now(),
          changeDetected: false,
        };
      }
    }
  }

  async updateContext(): Promise<void> {
    // Non-blocking update - starts background processing
    this.updateContextInBackground();
  }

  async getContext(): Promise<ScreenContext> {
    // If no context exists or it's stale, trigger an update but don't block
    if (
      !this.context ||
      Date.now() - this.context.timestamp > this.config.cacheTTL
    ) {
      // Start background update
      this.updateContextInBackground();

      // If we have stale context, return it immediately rather than blocking
      if (this.context) {
        logger.debug(
          "[RobotService] Returning stale context while update runs in background",
        );
        return this.context;
      }

      // Only block if we have no context at all (first run)
      logger.debug(
        "[RobotService] No context available, waiting for initial update",
      );
      await this.processingQueue;
    }

    return this.context!;
  }

  moveMouse(x: number, y: number) {
    robot.moveMouse(x, y);
  }

  click(
    button: "left" | "right" | "middle" = "left",
    dblclick: boolean = false,
  ) {
    robot.mouseClick(button, dblclick);
  }

  typeText(text: string) {
    robot.typeString(text);
  }

  // Configuration methods
  setChangeDetectionThreshold(threshold: number): void {
    this.config.changeDetection.threshold = Math.max(
      0,
      Math.min(100, threshold),
    );
    logger.info(
      `[RobotService] Change detection threshold set to ${this.config.changeDetection.threshold}%`,
    );
  }

  enableChangeDetection(enabled: boolean): void {
    this.config.changeDetection.enabled = enabled;
    logger.info(
      `[RobotService] Change detection ${enabled ? "enabled" : "disabled"}`,
    );
  }
}
