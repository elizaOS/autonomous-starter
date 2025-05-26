import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RobotService } from '../service';
import { ModelType } from '@elizaos/core';
import type { IAgentRuntime, Service, ScreenContext as CoreScreenContext } from '@elizaos/core';

// Mock @jitsi/robotjs
vi.mock('@jitsi/robotjs', () => {
  const mockWidth = 1920;
  const mockHeight = 1080;
  const mockChannels = 4; // BGRA
  const mockImageBuffer = Buffer.alloc(mockWidth * mockHeight * mockChannels);
  return {
    default: {
      getScreenSize: vi.fn(() => ({ width: mockWidth, height: mockHeight })),
      screen: {
        capture: vi.fn(() => ({
          image: mockImageBuffer,
          width: mockWidth,
          height: mockHeight,
          byteWidth: mockWidth * mockChannels,
          bitsPerPixel: mockChannels * 8,
          bytesPerPixel: mockChannels,
          colorAt: vi.fn(() => '000000')
        }))
      },
      moveMouse: vi.fn(),
      mouseClick: vi.fn(),
      typeString: vi.fn(),
    }
  };
});

// Mock Tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({ data: { text: 'Sample text from OCR' } }),
    terminate: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Define a more complete mock context type matching RobotService's ScreenContext
interface TestScreenContext extends CoreScreenContext {
  currentDescription: string;
  descriptionHistory: any[];
  ocr: string;
  objects: any[];
  changeDetected: boolean;
  pixelDifferencePercentage?: number;
}

describe('RobotService', () => {
  let robotService: RobotService;
  let mockRuntime: IAgentRuntime;
  let mockRobot: any; // To access the vi.mocked robotjs

  beforeEach(async () => {
    const robotJs = await import('@jitsi/robotjs');
    mockRobot = robotJs.default;

    mockRuntime = {
      useModel: vi.fn().mockImplementation((type: ModelType, params: any) => {
        if (type === ModelType.IMAGE_DESCRIPTION) {
          return Promise.resolve('A screenshot showing a desktop with various windows and applications');
        } else if (type === ModelType.OBJECT_SMALL) {
          return Promise.resolve([{ label: 'button', bbox: { x:100, y:200, width:50, height:30 } }]);
        }
        return Promise.resolve('');
      }),
      getService: vi.fn(),
      getAllServices: vi.fn(() => new Map()),
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
    } as unknown as IAgentRuntime;

    robotService = await RobotService.start(mockRuntime) as RobotService;
    // Ensure Tesseract worker is mocked for the instance
    const { createWorker } = await import('tesseract.js');
    const mockTesseractWorker = {
        recognize: vi.fn().mockResolvedValue({ data: { text: 'Sample text from OCR' } }),
        terminate: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(createWorker).mockResolvedValue(mockTesseractWorker);
    (robotService as any).tesseractWorker = mockTesseractWorker; 
  });

  afterEach(async () => {
    await robotService.stop();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with runtime', () => {
      expect(robotService).toBeDefined();
      expect(robotService.capabilityDescription).toBe(
        'Controls the screen and provides recent screen context with intelligent change detection and local OCR.'
      );
    });

    it('should have correct service type', () => {
      expect(RobotService.serviceType).toBe('ROBOT');
    });
  });

  describe('screen capture', () => {
    it('should capture screen successfully', async () => {
      const context = await robotService.getContext();

      expect(context).toBeDefined();
      expect(context.screenshot).toBeInstanceOf(Buffer);
      expect(context.timestamp).toBeGreaterThan(0);
      expect(mockRobot.getScreenSize).toHaveBeenCalled();
      expect(mockRobot.screen.capture).toHaveBeenCalledWith(0, 0, 1920, 1080);
    });

    it('should generate screen description', async () => {
      const context = await robotService.getContext();

      expect(context.description).toBe(
        'A screenshot showing a desktop with various windows and applications'
      );
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        ModelType.TEXT_SMALL,
        expect.objectContaining({
          prompt: 'Describe this screenshot in detail.',
          image: expect.any(Buffer),
        })
      );
    });

    it('should perform OCR on screenshot', async () => {
      const context = await robotService.getContext();

      expect(context.ocr).toBe('Sample text from OCR');
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        ModelType.IMAGE_DESCRIPTION,
        expect.objectContaining({
          imageUrl: expect.stringMatching(/^data:image\/png;base64,/),
          prompt: expect.stringContaining('Transcribe any text visible in this image')
        })
      );
    });

    it('should detect objects in screenshot', async () => {
      const context = await robotService.getContext();

      expect(context.objects).toHaveLength(2);
      expect(context.objects[0]).toEqual({
        label: 'button',
        bbox: { x: 100, y: 200, width: 80, height: 30 },
      });
      expect(context.objects[1]).toEqual({
        label: 'text_field',
        bbox: { x: 50, y: 100, width: 200, height: 25 },
      });
    });
  });

  describe('context caching', () => {
    it('should cache context for TTL period', async () => {
      const context1 = await robotService.getContext();
      const context2 = await robotService.getContext();

      expect(context1).toBe(context2);
      expect(mockRobot.screen.capture).toHaveBeenCalledTimes(1);
    });

    it('should refresh context after TTL expires', async () => {
      const context1 = await robotService.getContext();

      // Mock time passage beyond TTL
      const originalTimestamp = context1.timestamp;
      vi.spyOn(Date, 'now').mockReturnValue(originalTimestamp + 6000); // 6 seconds later

      const context2 = await robotService.getContext();

      expect(context1).not.toBe(context2);
      expect(context2.timestamp).toBeGreaterThan(context1.timestamp);
      expect(mockRobot.screen.capture).toHaveBeenCalledTimes(2);

      vi.restoreAllMocks();
    });

    it('should force update context when updateContext is called', async () => {
      const context1 = await robotService.getContext();
      await robotService.updateContext();
      const context2 = await robotService.getContext();

      expect(context1).not.toBe(context2);
      expect(mockRobot.screen.capture).toHaveBeenCalledTimes(2);
    });
  });

  describe('mouse operations', () => {
    it('should move mouse to specified coordinates', () => {
      robotService.moveMouse(100, 200);
      expect(mockRobot.moveMouse).toHaveBeenCalledWith(100, 200);
    });

    it('should click with default left button', () => {
      robotService.click();
      expect(mockRobot.mouseClick).toHaveBeenCalledWith('left');
    });

    it('should click with specified button', () => {
      robotService.click('right');
      expect(mockRobot.mouseClick).toHaveBeenCalledWith('right');

      robotService.click('middle');
      expect(mockRobot.mouseClick).toHaveBeenCalledWith('middle');
    });
  });

  describe('keyboard operations', () => {
    it('should type text string', () => {
      const testText = 'Hello, World!';
      robotService.typeText(testText);
      expect(mockRobot.typeString).toHaveBeenCalledWith(testText);
    });

    it('should handle empty text', () => {
      robotService.typeText('');
      expect(mockRobot.typeString).toHaveBeenCalledWith('');
    });

    it('should handle special characters', () => {
      const specialText = 'Test@123!#$%^&*()';
      robotService.typeText(specialText);
      expect(mockRobot.typeString).toHaveBeenCalledWith(specialText);
    });
  });

  describe('error handling', () => {
    it('should handle screen description errors gracefully', async () => {
      mockRuntime.useModel = vi
        .fn()
        .mockImplementation((modelType: (typeof ModelType)[keyof typeof ModelType]) => {
          if (modelType === ModelType.TEXT_SMALL) {
            return Promise.reject(new Error('Model error'));
          }
          return Promise.resolve('');
        });

      const context = await robotService.getContext();
      expect(context.description).toBe('');
    });

    it('should handle OCR errors gracefully', async () => {
      mockRuntime.useModel = vi
        .fn()
        .mockImplementation((modelType: (typeof ModelType)[keyof typeof ModelType]) => {
          if (modelType === ModelType.IMAGE_DESCRIPTION) {
            return Promise.reject(new Error('OCR error'));
          }
          return Promise.resolve('');
        });

      const context = await robotService.getContext();
      expect(context.ocr).toBe('');
    });

    it('should handle object detection errors gracefully', async () => {
      mockRuntime.useModel = vi
        .fn()
        .mockImplementation((modelType: (typeof ModelType)[keyof typeof ModelType]) => {
          if (modelType === ModelType.OBJECT_SMALL) {
            return Promise.reject(new Error('Object detection error'));
          }
          return Promise.resolve('');
        });

      const context = await robotService.getContext();
      expect(context.objects).toEqual([]);
    });

    it('should handle all AI model errors gracefully', async () => {
      mockRuntime.useModel = vi.fn().mockRejectedValue(new Error('All models failed'));

      const context = await robotService.getContext();
      expect(context.description).toBe('');
      expect(context.ocr).toBe('');
      expect(context.objects).toEqual([]);
      expect(context.screenshot).toBeInstanceOf(Buffer);
    });
  });

  describe('stop method', () => {
    it('should stop service without errors', async () => {
      await expect(robotService.stop()).resolves.not.toThrow();
    });
  });

  describe('parallel processing', () => {
    it('should process AI models in parallel', async () => {
      const startTime = Date.now();
      await robotService.getContext();
      const endTime = Date.now();

      // Verify that useModel was called for all three AI operations
      expect(mockRuntime.useModel).toHaveBeenCalledTimes(3);

      // Since they run in parallel, the total time should be less than
      // the sum of individual operations (this is a basic check)
      expect(endTime - startTime).toBeLessThan(1000); // Should be very fast with mocks
    });
  });

  describe('context structure', () => {
    it('should return properly structured context', async () => {
      const context = await robotService.getContext();

      expect(context).toMatchObject({
        screenshot: expect.any(Buffer),
        description: expect.any(String),
        ocr: expect.any(String),
        objects: expect.any(Array),
        timestamp: expect.any(Number),
      });

      expect(context.timestamp).toBeGreaterThan(0);
      expect(
        context.objects.every(
          (obj) =>
            typeof obj.label === 'string' &&
            typeof obj.bbox === 'object' &&
            typeof obj.bbox.x === 'number' &&
            typeof obj.bbox.y === 'number' &&
            typeof obj.bbox.width === 'number' &&
            typeof obj.bbox.height === 'number'
        )
      ).toBe(true);
    });
  });
});
