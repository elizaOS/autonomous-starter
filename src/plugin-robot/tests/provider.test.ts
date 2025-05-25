import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screenProvider } from '../provider.js';
import { RobotService, type ScreenContext, type ScreenObject } from '../service.js';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

// Mock the RobotService
const mockRobotService = {
  getContext: vi.fn(),
  updateContext: vi.fn(),
  moveMouse: vi.fn(),
  click: vi.fn(),
  typeText: vi.fn(),
  stop: vi.fn(),
  capabilityDescription: 'Controls the screen and provides recent screen context.',
} as unknown as RobotService;

// Mock the runtime
const mockRuntime = {
  agentId: '12345678-1234-1234-1234-123456789abc' as const,
  getService: vi.fn(() => mockRobotService),
  useModel: vi.fn(),
  emitEvent: vi.fn(),
} as unknown as IAgentRuntime;

// Mock message and state
const createMockMessage = (text: string): Memory => ({
  id: '12345678-1234-1234-1234-123456789abc',
  agentId: '12345678-1234-1234-1234-123456789abc',
  entityId: '12345678-1234-1234-1234-123456789def',
  roomId: '12345678-1234-1234-1234-123456789ghi',
  content: { text },
  createdAt: Date.now(),
});

const createMockState = (additionalData: Record<string, any> = {}): State => ({
  values: {},
  data: {},
  text: '',
  ...additionalData,
});

const createMockScreenContext = (overrides: Partial<ScreenContext> = {}): ScreenContext => ({
  screenshot: Buffer.from('mock-screenshot-data'),
  description: 'A desktop with various windows and applications',
  ocr: 'Sample text from screen',
  objects: [
    {
      label: 'button',
      bbox: { x: 100, y: 200, width: 80, height: 30 },
    },
    {
      label: 'text_field',
      bbox: { x: 50, y: 100, width: 200, height: 25 },
    },
  ],
  timestamp: Date.now(),
  ...overrides,
});

describe('screenProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('provider properties', () => {
    it('should have correct provider properties', () => {
      expect(screenProvider.name).toBe('SCREEN_CONTEXT');
      expect(screenProvider.description).toBe(
        'Latest screen description, OCR results and detected objects.'
      );
      expect(screenProvider.position).toBe(50);
    });
  });

  describe('get method', () => {
    const message = createMockMessage('test message');
    const state = createMockState();

    it('should return screen context when service is available', async () => {
      const mockContext = createMockScreenContext();
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(mockRuntime.getService).toHaveBeenCalledWith('ROBOT');
      expect(mockRobotService.getContext).toHaveBeenCalled();

      expect(result.values).toEqual({
        description: mockContext.description,
        ocr: mockContext.ocr,
      });

      expect(result.text).toContain('# Screen Description');
      expect(result.text).toContain(mockContext.description);
      expect(result.text).toContain('# OCR');
      expect(result.text).toContain(mockContext.ocr);
      expect(result.text).toContain('# Objects');
      expect(result.text).toContain('button at (100,200)');
      expect(result.text).toContain('text_field at (50,100)');

      expect(result.data).toBe(mockContext);
    });

    it('should handle service not available', async () => {
      const runtimeWithoutService = {
        ...mockRuntime,
        getService: vi.fn(() => null),
      } as unknown as IAgentRuntime;

      const result = await screenProvider.get(runtimeWithoutService, message, state);

      expect(result.values).toEqual({});
      expect(result.text).toBe('RobotService unavailable');
      expect(result.data).toEqual({});
    });

    it('should handle empty objects list', async () => {
      const mockContext = createMockScreenContext({
        objects: [],
      });
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain('# Objects');
      expect(result.text).toContain('None');
    });

    it('should handle multiple objects', async () => {
      const mockContext = createMockScreenContext({
        objects: [
          {
            label: 'button',
            bbox: { x: 100, y: 200, width: 80, height: 30 },
          },
          {
            label: 'text_field',
            bbox: { x: 50, y: 100, width: 200, height: 25 },
          },
          {
            label: 'image',
            bbox: { x: 300, y: 150, width: 150, height: 100 },
          },
        ],
      });
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain('button at (100,200)');
      expect(result.text).toContain('text_field at (50,100)');
      expect(result.text).toContain('image at (300,150)');
    });

    it('should handle empty description', async () => {
      const mockContext = createMockScreenContext({
        description: '',
      });
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.values.description).toBe('');
      expect(result.text).toContain('# Screen Description');
      expect(result.text).toContain('\n\n');
    });

    it('should handle empty OCR', async () => {
      const mockContext = createMockScreenContext({
        ocr: '',
      });
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.values.ocr).toBe('');
      expect(result.text).toContain('# OCR');
      expect(result.text).toContain('\n\n');
    });

    it('should handle service errors gracefully', async () => {
      mockRobotService.getContext = vi.fn().mockRejectedValue(new Error('Service error'));

      await expect(screenProvider.get(mockRuntime, message, state)).rejects.toThrow(
        'Service error'
      );
    });

    it('should format text with proper headers', async () => {
      const mockContext = createMockScreenContext({
        description: 'Test description',
        ocr: 'Test OCR text',
        objects: [
          {
            label: 'test_object',
            bbox: { x: 10, y: 20, width: 30, height: 40 },
          },
        ],
      });
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      const lines = result.text.split('\n\n');
      expect(lines[0]).toContain('# Screen Description');
      expect(lines[0]).toContain('Test description');
      expect(lines[1]).toContain('# OCR');
      expect(lines[1]).toContain('Test OCR text');
      expect(lines[2]).toContain('# Objects');
      expect(lines[2]).toContain('test_object at (10,20)');
    });

    it('should handle objects with special characters in labels', async () => {
      const mockContext = createMockScreenContext({
        objects: [
          {
            label: 'button-submit',
            bbox: { x: 100, y: 200, width: 80, height: 30 },
          },
          {
            label: 'text_field_email',
            bbox: { x: 50, y: 100, width: 200, height: 25 },
          },
          {
            label: 'icon@2x',
            bbox: { x: 300, y: 150, width: 24, height: 24 },
          },
        ],
      });
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain('button-submit at (100,200)');
      expect(result.text).toContain('text_field_email at (50,100)');
      expect(result.text).toContain('icon@2x at (300,150)');
    });

    it('should handle negative coordinates', async () => {
      const mockContext = createMockScreenContext({
        objects: [
          {
            label: 'off_screen_element',
            bbox: { x: -10, y: -20, width: 50, height: 30 },
          },
        ],
      });
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain('off_screen_element at (-10,-20)');
    });

    it('should handle large coordinates', async () => {
      const mockContext = createMockScreenContext({
        objects: [
          {
            label: 'large_screen_element',
            bbox: { x: 9999, y: 8888, width: 100, height: 50 },
          },
        ],
      });
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.text).toContain('large_screen_element at (9999,8888)');
    });

    it('should preserve all context data in result.data', async () => {
      const mockContext = createMockScreenContext();
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.data).toEqual(mockContext);
      expect(result.data.screenshot).toBeInstanceOf(Buffer);
      expect(result.data.timestamp).toBe(mockContext.timestamp);
    });

    it('should handle unicode characters in description and OCR', async () => {
      const mockContext = createMockScreenContext({
        description: 'Desktop with 中文 characters and émojis 🌟',
        ocr: 'Text with ñoñó and café',
      });
      mockRobotService.getContext = vi.fn().mockResolvedValue(mockContext);

      const result = await screenProvider.get(mockRuntime, message, state);

      expect(result.values.description).toBe('Desktop with 中文 characters and émojis 🌟');
      expect(result.values.ocr).toBe('Text with ñoñó and café');
      expect(result.text).toContain('Desktop with 中文 characters and émojis 🌟');
      expect(result.text).toContain('Text with ñoñó and café');
    });
  });
});
