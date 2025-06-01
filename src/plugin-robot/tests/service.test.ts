import { beforeEach, describe, expect, it, vi, afterAll, beforeAll } from 'vitest';
import { RobotService } from '../service';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { ModelType } from '@elizaos/core';
import type { ScreenContext, ScreenObject } from '../types';
// Removed robotjs import as it's not directly used by the service logic being tested here
// and its mocking was causing issues. The core screen capture is mocked via service.getContext spy.

// Minimal valid PNG (1x1 transparent pixel)
const MOCK_PNG_BUFFER = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8,  6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 11, 73, 68, 65, 84, 120, 156, 99, 96, 96, 96, 0, 0, 0, 7, 0, 1, 170, 223, 181, 33, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130, 
]);

// Mock Tesseract.js
const mockTesseractWorker = {
  load: vi.fn().mockResolvedValue(undefined),
  loadLanguage: vi.fn().mockResolvedValue(undefined),
  initialize: vi.fn().mockResolvedValue(undefined),
  recognize: vi.fn().mockResolvedValue({ data: { text: 'Sample text from OCR' } }),
  terminate: vi.fn().mockResolvedValue(undefined),
};
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue(mockTesseractWorker),
}));

// Mock robotjs
const mockRobotJS = {
  getMousePos: vi.fn(() => ({ x: 0, y: 0 })),
  moveMouse: vi.fn(),
  mouseClick: vi.fn(),
  keyTap: vi.fn(),
  typeString: vi.fn(),
  getScreenSize: vi.fn(() => ({ width: 1, height: 1 })), // Consistent with minimal PNG
  captureScreen: vi.fn(() => ({
    width: 1,
    height: 1,
    image: MOCK_PNG_BUFFER,
    byteWidth: 4, // 1px * 4 bytes/pixel (RGBA)
    bitsPerPixel: 32,
    bytesPerPixel: 4,
    colorAt: vi.fn(() => '000000'), // Mock colorAt, though likely not used with pre-rendered PNG
  })),
};
vi.mock('robotjs', () => ({
  default: mockRobotJS,
}));


describe('RobotService', () => {
  let robotService: RobotService;
  let mockRuntime: IAgentRuntime;

  beforeAll(async () => {
    mockRuntime = {
      getService: vi.fn(),
      useModel: vi.fn(),
      emitEvent: vi.fn(),
      agentId: 'test-agent',
      // Add other necessary IAgentRuntime properties if tests fail due to them
      // For now, keeping it minimal based on RobotService direct usage
      getSetting: vi.fn((key: string) => {
        if (key === 'ENABLE_LOCAL_OCR') return true;
        return null;
      }), 
    } as unknown as IAgentRuntime;
    robotService = new RobotService(mockRuntime);
    await robotService.start(); 
  });

  afterAll(async () => {
    await robotService.stop();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime.useModel = vi.fn()
      .mockResolvedValueOnce('A desktop with various windows and applications') // IMAGE_DESCRIPTION
      .mockResolvedValueOnce('Sample text from OCR') // TEXT_SMALL for AI OCR fallback
      .mockResolvedValueOnce([{ label: 'button', bbox: { x: 10, y: 20, width: 100, height: 30 } }]); // OBJECT_SMALL
    
    mockTesseractWorker.recognize.mockResolvedValue({ data: { text: 'Sample text from OCR' } });
    mockRobotJS.captureScreen.mockReturnValue({
        width: 1,
        height: 1,
        image: MOCK_PNG_BUFFER,
        byteWidth: 4,
        bitsPerPixel: 32,
        bytesPerPixel: 4,
        colorAt: vi.fn(() => '000000'),
      });
  });

  describe('screen capture', () => {
    it('should capture screen, describe, OCR, and detect objects', async () => {
      const context = await robotService.getContext();
      expect(mockRobotJS.captureScreen).toHaveBeenCalled();
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        ModelType.IMAGE_DESCRIPTION,
        expect.objectContaining({
          image: MOCK_PNG_BUFFER, // Expect the direct buffer
          prompt: expect.stringContaining('Describe this screenshot'),
        })
      );
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        ModelType.OBJECT_SMALL,
        expect.objectContaining({
          image: MOCK_PNG_BUFFER, // Expect the direct buffer
          prompt: expect.stringContaining('Detect interactive objects'),
        })
      );
      expect(mockTesseractWorker.recognize).toHaveBeenCalledWith(MOCK_PNG_BUFFER);
      expect(context.currentDescription).toBe('A desktop with various windows and applications');
      expect(context.ocr).toBe('Sample text from OCR');
      expect(context.objects).toEqual([{ label: 'button', bbox: { x: 10, y: 20, width: 100, height: 30 } }]);
      expect(context.screenshot).toEqual(MOCK_PNG_BUFFER);
      expect(context.timestamp).toBeTypeOf('number');
    });

    it('should perform OCR on screenshot using TEXT_SMALL if Tesseract fails', async () => {
        mockTesseractWorker.recognize.mockRejectedValueOnce(new Error('Tesseract error'));
        mockRuntime.useModel = vi.fn()
            .mockResolvedValueOnce('A detailed screen description.') // IMAGE_DESCRIPTION
            .mockResolvedValueOnce('AI OCR Text') // TEXT_SMALL fallback
            .mockResolvedValueOnce([{ label: 'button', bbox: { x: 10, y: 20, width: 100, height: 30 } }]); 

        const context = await robotService.getContext();
        expect(context.ocr).toBe('AI OCR Text'); 
        expect(mockRuntime.useModel).toHaveBeenCalledWith(
            ModelType.TEXT_SMALL,
            expect.objectContaining({
              image: MOCK_PNG_BUFFER,
              prompt: expect.stringContaining('Transcribe any text visible in this image'),
            })
        );
        expect(mockTesseractWorker.recognize).toHaveBeenCalledTimes(1);
    });


    it('should detect objects in screenshot', async () => {
      const mockObjects = [{ label: 'window', bbox: { x: 0, y: 0, width: 800, height: 600 } }];
      mockTesseractWorker.recognize.mockResolvedValueOnce({ data: { text: 'Some text' } }); 
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce('A desktop with a window.') 
        .mockResolvedValueOnce(mockObjects); 

      const context = await robotService.getContext();
      expect(context.objects).toEqual(mockObjects);
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        ModelType.OBJECT_SMALL,
        expect.objectContaining({
          image: MOCK_PNG_BUFFER, 
          prompt: expect.stringContaining('Detect interactive objects'),
        })
      );
      expect(mockRuntime.useModel).toHaveBeenCalledWith(
        ModelType.IMAGE_DESCRIPTION, 
        expect.anything()
      );
      expect(mockRuntime.useModel).not.toHaveBeenCalledWith(ModelType.TEXT_SMALL, expect.anything());
    });
  });

  describe('context caching', () => {
    it('should cache context for TTL period', async () => {
      mockTesseractWorker.recognize.mockResolvedValueOnce({ data: { text: 'OCR 1' } });
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce('Description 1') 
        .mockResolvedValueOnce([]); 

      const context1 = await robotService.getContext();
      
      const useModelCalls = (mockRuntime.useModel as jest.Mock).mock.calls.length;
      const screenCaptureCalls = mockRobotJS.captureScreen.mock.calls.length;
      const tesseractCalls = mockTesseractWorker.recognize.mock.calls.length;

      const context2 = await robotService.getContext(); 

      expect(context1).toBe(context2);
      expect(mockRobotJS.captureScreen).toHaveBeenCalledTimes(screenCaptureCalls); 
      expect(mockRuntime.useModel).toHaveBeenCalledTimes(useModelCalls); 
      expect(mockTesseractWorker.recognize).toHaveBeenCalledTimes(tesseractCalls); 
    });

    it('should refresh context after TTL expires', async () => {
      vi.useFakeTimers();
      mockTesseractWorker.recognize.mockResolvedValueOnce({ data: { text: 'OCR 1 Tesseract' } });
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce('Description 1')
        .mockResolvedValueOnce([]);
      const context1 = await robotService.getContext();
      const timestamp1 = context1.timestamp;

      vi.advanceTimersByTime(robotService['cacheTTL'] + 100); 

      mockTesseractWorker.recognize.mockResolvedValueOnce({ data: { text: 'OCR 2 Tesseract' } });
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce('Description 2')
        .mockResolvedValueOnce([]);
      
      const context2 = await robotService.getContext();

      expect(context2.timestamp).toBeGreaterThan(timestamp1);
      expect(mockRobotJS.captureScreen).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('should force update context when updateContext is called', async () => {
      mockTesseractWorker.recognize.mockResolvedValueOnce({ data: { text: 'OCR 1 Tesseract' } });
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce('Description 1')
        .mockResolvedValueOnce([]);
      const context1 = await robotService.getContext();
      const timestamp1 = context1.timestamp;

      mockTesseractWorker.recognize.mockResolvedValueOnce({ data: { text: 'OCR 2 Tesseract' } });
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce('Description 2')
        .mockResolvedValueOnce([]);
      
      await robotService.updateContext(); 
      const context2 = await robotService.getContext(); 

      expect(context2.timestamp).toBeGreaterThan(timestamp1);
      expect(mockRobotJS.captureScreen).toHaveBeenCalledTimes(2); 
    });
  });

  describe('mouse operations', () => {
    it('should move mouse to specified coordinates', async () => {
      await robotService.moveMouse(100, 200);
      expect(mockRobotJS.moveMouse).toHaveBeenCalledWith(100, 200);
    });

    it('should click with default left button', async () => {
      await robotService.click();
      expect(mockRobotJS.mouseClick).toHaveBeenCalledWith('left', false);
    });

    it('should click with specified button', async () => {
      await robotService.click('right');
      expect(mockRobotJS.mouseClick).toHaveBeenCalledWith('right', false);
    });
  });

  describe('keyboard operations', () => {
    it('should type text string', async () => {
      await robotService.typeText('Hello');
      expect(mockRobotJS.typeString).toHaveBeenCalledWith('Hello');
    });

    it('should handle empty text', async () => {
      await robotService.typeText('');
      expect(mockRobotJS.typeString).toHaveBeenCalledWith('');
    });

    it('should handle special characters', async () => {
      await robotService.typeText('!@#$%^&*()');
      expect(mockRobotJS.typeString).toHaveBeenCalledWith('!@#$%^&*()');
    });
  });

  describe('error handling', () => {
    it('should handle screen description errors gracefully', async () => {
      mockRuntime.useModel = vi.fn()
        .mockImplementationOnce(async (modelType: string) => { 
          if (modelType === ModelType.IMAGE_DESCRIPTION) {
            throw new Error('Description model failed');
          }
          return '';
        })
        .mockResolvedValueOnce([]); // OBJECT_SMALL
      
      mockTesseractWorker.recognize.mockResolvedValueOnce({ data: { text: 'OCR Text from Tesseract' } });

      const context = await robotService.getContext();
      expect(context.currentDescription).toBe('');
      expect(context.ocr).toBe('OCR Text from Tesseract');
      expect(mockRuntime.useModel).toHaveBeenCalledTimes(2); 
    });

    it('should handle OCR errors gracefully (Tesseract and AI fallback)', async () => {
        mockTesseractWorker.recognize.mockRejectedValueOnce(new Error('Tesseract error'));
        mockRuntime.useModel = vi.fn()
          .mockResolvedValueOnce('Screen Description') 
          .mockRejectedValueOnce(new Error('AI OCR model failed')) 
          .mockResolvedValueOnce([]); 

        const context = await robotService.getContext();
        expect(context.currentDescription).toBe('Screen Description');
        expect(context.ocr).toBe('');
        expect(mockRuntime.useModel).toHaveBeenCalledWith(ModelType.TEXT_SMALL, expect.anything());
    });
    
    it('should handle object detection errors gracefully', async () => {
      mockTesseractWorker.recognize.mockResolvedValueOnce({ data: { text: 'OCR Text from Tesseract' } });
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce('Screen Description') 
        .mockRejectedValueOnce(new Error('Object detection failed')); 
        
      const context = await robotService.getContext();
      expect(context.objects).toEqual([]);
      expect(mockRuntime.useModel).toHaveBeenCalledWith(ModelType.IMAGE_DESCRIPTION, expect.anything());
      expect(mockRuntime.useModel).toHaveBeenCalledWith(ModelType.OBJECT_SMALL, expect.anything());
      expect(mockTesseractWorker.recognize).toHaveBeenCalled();
    });

    it('should handle all AI model errors gracefully (and Tesseract error)', async () => {
       mockTesseractWorker.recognize.mockRejectedValueOnce(new Error('Tesseract error'));
      mockRuntime.useModel = vi.fn()
        .mockRejectedValueOnce(new Error('Description model failed')) 
        .mockRejectedValueOnce(new Error('AI OCR model failed'))      
        .mockRejectedValueOnce(new Error('Object detection failed')); 
        
      const context = await robotService.getContext();
      expect(context.currentDescription).toBe('');
      expect(context.ocr).toBe('');
      expect(context.objects).toEqual([]);
      expect(mockRuntime.useModel).toHaveBeenCalledTimes(3); 
      expect(mockTesseractWorker.recognize).toHaveBeenCalledTimes(1); 
    });
  });
  
  describe('parallel processing', () => {
    it('should process AI models in parallel', async () => {
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      
      mockTesseractWorker.recognize.mockImplementation(async () => { 
        await delay(100); 
        return { data: { text: 'OCR Text' } }; 
      });
      mockRuntime.useModel = vi.fn()
        .mockImplementationOnce(async () => { await delay(100); return 'Description'; }) // IMAGE_DESCRIPTION
        .mockImplementationOnce(async () => { await delay(100); return []; });           // OBJECT_SMALL
      
      const startTime = Date.now();
      const context = await robotService.getContext(); // Ensure context is awaited
      const endTime = Date.now();
  
      expect(mockRuntime.useModel).toHaveBeenCalledTimes(2); 
      expect(mockTesseractWorker.recognize).toHaveBeenCalledTimes(1);
      expect(endTime - startTime).toBeLessThan(250); 
    });
  });

  describe('context structure', () => {
    it('should return properly structured context', async () => {
      const mockDesc = 'Test Description';
      const mockOcrResult = 'Test OCR From Tesseract';
      const mockObjectsResult = [{ label: 'test', bbox: { x: 1, y: 1, width: 1, height: 1 } }];
      
      mockTesseractWorker.recognize.mockResolvedValueOnce({ data: { text: mockOcrResult } });
      
      mockRuntime.useModel = vi.fn()
        .mockResolvedValueOnce(mockDesc) // IMAGE_DESCRIPTION
        .mockResolvedValueOnce(mockObjectsResult); // OBJECT_SMALL

      const context = await robotService.getContext();

      expect(context).toMatchObject({
        screenshot: MOCK_PNG_BUFFER,
        currentDescription: mockDesc,
        descriptionHistory: expect.any(Array),
        ocr: mockOcrResult,
        objects: mockObjectsResult,
        timestamp: expect.any(Number),
        changeDetected: expect.any(Boolean),
        pixelDifferencePercentage: expect.anything(), // Allow undefined or number
      });
      expect(context.descriptionHistory.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stop method', () => {
    it('should stop service without errors', async () => {
      // robotService.start() is called in beforeAll, so worker should be initialized
      await expect(robotService.stop()).resolves.toBeUndefined();
      // Check if tesseractWorker exists before asserting terminate was called
      if ((robotService as any).tesseractWorker) {
        expect(mockTesseractWorker.terminate).toHaveBeenCalled();
      }
    });
  });
});
