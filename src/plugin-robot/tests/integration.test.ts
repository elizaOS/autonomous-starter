import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock robotjs before any imports
vi.mock('@jitsi/robotjs', () => ({
  default: {
    getScreenSize: vi.fn(() => ({ width: 1920, height: 1080 })),
    screen: {
      capture: vi.fn(() => ({
        image: Buffer.from('mock-screenshot-data'),
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

import { robotPlugin } from '../index.js';
import { RobotService } from '../service.js';
import { performScreenAction } from '../action.js';
import { screenProvider } from '../provider.js';
import type { IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { ModelType } from '@elizaos/core';
// @ts-ignore - mocked module
import robot from '@jitsi/robotjs';

// Get the mocked functions
const mockRobotJs = robot as any;

// Mock the runtime
const createMockRuntime = (): IAgentRuntime => {
  const services = new Map();
  const runtime = {
    agentId: '12345678-1234-1234-1234-123456789abc' as const,
    getService: vi.fn((serviceName: string) => services.get(serviceName)),
    useModel: vi.fn(),
    emitEvent: vi.fn(),
    registerService: vi.fn(async (ServiceClass: any) => {
      // Directly instantiate the service instead of calling start()
      const serviceInstance = new ServiceClass(runtime);
      services.set(ServiceClass.serviceType, serviceInstance);
    }),
    services,
  } as unknown as IAgentRuntime;

  return runtime;
};

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

let mockRuntime: IAgentRuntime;

describe('Robot Plugin Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRuntime = createMockRuntime();

    // Setup default mock responses for AI models
    mockRuntime.useModel = vi
      .fn()
      .mockImplementation((modelType: (typeof ModelType)[keyof typeof ModelType], input: any) => {
        switch (modelType) {
          case ModelType.TEXT_SMALL:
            return Promise.resolve(
              'A screenshot showing a desktop with various windows and applications'
            );
          case ModelType.OBJECT_SMALL:
            return Promise.resolve([
              {
                label: 'button',
                bbox: { x: 100, y: 200, width: 80, height: 30 },
              },
              {
                label: 'text_field',
                bbox: { x: 50, y: 100, width: 200, height: 25 },
              },
            ]);
          case ModelType.IMAGE_DESCRIPTION:
            return Promise.resolve('Sample text from OCR');
          default:
            return Promise.resolve('');
        }
      });
  });

  describe('plugin structure', () => {
    it('should have correct plugin properties', () => {
      expect(robotPlugin.name).toBe('plugin-robot');
      expect(robotPlugin.description).toBe(
        'Control screen using robotjs and provide screen context'
      );
      expect(robotPlugin.actions).toHaveLength(1);
      expect(robotPlugin.providers).toHaveLength(1);
      expect(robotPlugin.services).toHaveLength(1);
    });

    it('should export correct components', () => {
      expect(robotPlugin.actions[0]).toBe(performScreenAction);
      expect(robotPlugin.providers[0]).toBe(screenProvider);
      expect(robotPlugin.services[0]).toBe(RobotService);
    });
  });

  describe('service registration and initialization', () => {
    it('should register and start the RobotService', async () => {
      await mockRuntime.registerService(RobotService);

      expect(mockRuntime.registerService).toHaveBeenCalledWith(RobotService);

      const service = mockRuntime.getService('ROBOT');
      expect(service).toBeInstanceOf(RobotService);
      expect(service.capabilityDescription).toBe(
        'Controls the screen and provides recent screen context.'
      );
    });

    it('should validate action when service is registered', async () => {
      await mockRuntime.registerService(RobotService);

      const message = createMockMessage('test');
      const state = createMockState();
      const isValid = await performScreenAction.validate(mockRuntime, message, state);
      expect(isValid).toBe(true);
    });

    it('should fail action validation when service is not registered', async () => {
      const message = createMockMessage('test');
      const state = createMockState();
      const isValid = await performScreenAction.validate(mockRuntime, message, state);
      expect(isValid).toBe(false);
    });
  });

  describe('end-to-end screen control workflow', () => {
    beforeEach(async () => {
      await mockRuntime.registerService(RobotService);
    });

    it('should capture screen context and perform actions', async () => {
      const service = mockRuntime.getService('ROBOT') as RobotService;
      const message = createMockMessage('click on the submit button');
      const state = createMockState();
      const mockCallback = vi.fn();

      // First, get screen context via provider
      const providerResult = await screenProvider.get(mockRuntime, message, state);

      expect(providerResult.text).toContain('# Screen Description');
      expect(providerResult.text).toContain(
        'A screenshot showing a desktop with various windows and applications'
      );
      expect(providerResult.text).toContain('# OCR');
      expect(providerResult.text).toContain('Sample text from OCR');
      expect(providerResult.text).toContain('# Objects');
      expect(providerResult.text).toContain('button at (100,200)');

      // Then perform screen action
      const actionOptions = {
        steps: [
          { action: 'move', x: 100, y: 200 },
          { action: 'click', button: 'left' },
        ],
      };

      await performScreenAction.handler(mockRuntime, message, state, actionOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        thought: 'Executed screen actions',
        text: 'Screen actions executed.',
      });
    });

    it('should handle complex multi-step workflow', async () => {
      const service = mockRuntime.getService('ROBOT') as RobotService;
      const message = createMockMessage('fill out the form');
      const state = createMockState();
      const mockCallback = vi.fn();

      // Get initial screen context
      const initialContext = await screenProvider.get(mockRuntime, message, state);
      expect(initialContext.data.objects).toHaveLength(2);

      // Perform complex action sequence
      const actionOptions = {
        steps: [
          { action: 'move', x: 50, y: 100 }, // Move to text field
          { action: 'click', button: 'left' }, // Click text field
          { action: 'type', text: 'test@example.com' }, // Type email
          { action: 'move', x: 100, y: 200 }, // Move to button
          { action: 'click', button: 'left' }, // Click submit
        ],
      };

      await performScreenAction.handler(mockRuntime, message, state, actionOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        thought: 'Executed screen actions',
        text: 'Screen actions executed.',
      });

      // Verify all actions were called in sequence
      expect(mockRobotJs.moveMouse).toHaveBeenCalledWith(50, 100);
      expect(mockRobotJs.mouseClick).toHaveBeenCalledWith('left');
      expect(mockRobotJs.typeString).toHaveBeenCalledWith('test@example.com');
      expect(mockRobotJs.moveMouse).toHaveBeenCalledWith(100, 200);
      expect(mockRobotJs.mouseClick).toHaveBeenCalledWith('left');
    });

    it('should handle screen context caching', async () => {
      const service = mockRuntime.getService('ROBOT') as RobotService;
      const message = createMockMessage('test message');
      const state = createMockState();

      // Get context multiple times quickly
      const context1 = await screenProvider.get(mockRuntime, message, state);
      const context2 = await screenProvider.get(mockRuntime, message, state);

      // Should be the same cached context
      expect(context1.data).toBe(context2.data);

      // Verify screen capture was only called once due to caching
      expect(mockRobotJs.screen.capture).toHaveBeenCalledTimes(1);
    });

    it('should handle AI model failures gracefully', async () => {
      // Mock AI model failures
      mockRuntime.useModel = vi.fn().mockRejectedValue(new Error('AI model failed'));

      const message = createMockMessage('test message');
      const state = createMockState();

      const result = await screenProvider.get(mockRuntime, message, state);

      // Should still provide basic context even with AI failures
      expect(result.values.description).toBe('');
      expect(result.values.ocr).toBe('');
      expect(result.data.objects).toEqual([]);
      expect(result.data.screenshot).toBeInstanceOf(Buffer);
    });

    it('should handle service cleanup', async () => {
      const service = mockRuntime.getService('ROBOT') as RobotService;

      // Service should be available
      expect(service).toBeDefined();

      // Stop the service
      await service.stop();

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    beforeEach(async () => {
      await mockRuntime.registerService(RobotService);
    });

    it('should handle invalid action parameters', async () => {
      const message = createMockMessage('invalid action');
      const state = createMockState();
      const mockCallback = vi.fn();

      const actionOptions = {
        steps: [
          { action: 'move', x: 100 }, // Missing y coordinate
          { action: 'type' }, // Missing text
          { action: 'unknown_action' }, // Unknown action
          { action: 'click', button: 'right' }, // Valid action
        ],
      };

      await performScreenAction.handler(mockRuntime, message, state, actionOptions, mockCallback);

      // Should still complete successfully, skipping invalid actions
      expect(mockCallback).toHaveBeenCalledWith({
        thought: 'Executed screen actions',
        text: 'Screen actions executed.',
      });

      // Only the valid click action should have been executed
      expect(mockRobotJs.moveMouse).not.toHaveBeenCalled();
      expect(mockRobotJs.typeString).not.toHaveBeenCalled();
      expect(mockRobotJs.mouseClick).toHaveBeenCalledWith('right');
    });

    it('should handle empty action steps', async () => {
      const message = createMockMessage('empty action');
      const state = createMockState();
      const mockCallback = vi.fn();

      const actionOptions = { steps: [] };

      await performScreenAction.handler(mockRuntime, message, state, actionOptions, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        thought: 'Executed screen actions',
        text: 'Screen actions executed.',
      });
    });

    it('should handle missing action options', async () => {
      const message = createMockMessage('missing options');
      const state = createMockState();
      const mockCallback = vi.fn();

      await performScreenAction.handler(mockRuntime, message, state, {}, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        thought: 'Executed screen actions',
        text: 'Screen actions executed.',
      });
    });

    it('should handle provider errors when service is unavailable', async () => {
      // Create runtime without the service
      const emptyRuntime = createMockRuntime();
      const message = createMockMessage('test message');
      const state = createMockState();

      const result = await screenProvider.get(emptyRuntime, message, state);

      expect(result.values).toEqual({});
      expect(result.text).toBe('RobotService unavailable');
      expect(result.data).toEqual({});
    });
  });

  describe('performance and resource management', () => {
    beforeEach(async () => {
      await mockRuntime.registerService(RobotService);
    });

    it('should handle rapid successive calls efficiently', async () => {
      const message = createMockMessage('rapid calls');
      const state = createMockState();

      const startTime = Date.now();

      // Make multiple rapid calls
      const promises = Array.from({ length: 5 }, () =>
        screenProvider.get(mockRuntime, message, state)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All should succeed
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.data.screenshot).toBeInstanceOf(Buffer);
      });

      // Should be reasonably fast (under 1 second for mocked operations)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle memory cleanup properly', async () => {
      const service = mockRuntime.getService('ROBOT') as RobotService;

      // Generate some screen contexts
      for (let i = 0; i < 3; i++) {
        await service.updateContext();
      }

      // Stop service should clean up resources
      await service.stop();

      // Should not throw errors
      expect(true).toBe(true);
    });
  });
});
