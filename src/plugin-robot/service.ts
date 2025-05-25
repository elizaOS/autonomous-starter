import robot from '@jitsi/robotjs';
import {
  Service,
  ServiceType,
  type IAgentRuntime,
  type ServiceTypeName,
  ModelType,
  logger,
} from '@elizaos/core';
import { RobotServiceType } from './types';

export interface ScreenObject {
  label: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface ScreenContext {
  screenshot: Buffer;
  description: string;
  ocr: string;
  objects: ScreenObject[];
  timestamp: number;
}

export class RobotService extends Service {
  static serviceType: ServiceTypeName = RobotServiceType.ROBOT;
  capabilityDescription = 'Controls the screen and provides recent screen context.';

  private context: ScreenContext | null = null;
  private readonly CACHE_TTL = 5000; // 5 seconds

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  async stop(): Promise<void> {
    // Clean up any resources
    this.context = null;
  }

  private async captureScreen(): Promise<Buffer> {
    const size = robot.getScreenSize();
    const capture = robot.screen.capture(0, 0, size.width, size.height);
    return Buffer.from(capture.image);
  }

  private async describeImage(image: Buffer): Promise<string> {
    try {
      const description = await this.runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: 'Describe this screenshot in detail.',
        image,
      });
      return description || '';
    } catch (e) {
      logger.error('[RobotService] describeImage error', e);
      return '';
    }
  }

  private async detectObjects(image: Buffer): Promise<ScreenObject[]> {
    try {
      const objects = (await this.runtime.useModel(ModelType.OBJECT_SMALL, {
        prompt: 'Detect objects with bounding boxes in this screenshot',
        image,
      })) as unknown as ScreenObject[];
      return objects || [];
    } catch (e) {
      logger.error('[RobotService] detectObjects error', e);
      return [];
    }
  }

  private async performOCR(image: Buffer): Promise<string> {
    try {
      const text = await this.runtime.useModel(ModelType.TRANSCRIPTION, image);
      return text || '';
    } catch (e) {
      logger.error('[RobotService] OCR error', e);
      return '';
    }
  }

  async updateContext(): Promise<void> {
    const screenshot = await this.captureScreen();
    const [description, objects, ocr] = await Promise.all([
      this.describeImage(screenshot),
      this.detectObjects(screenshot),
      this.performOCR(screenshot),
    ]);

    this.context = {
      screenshot,
      description,
      ocr,
      objects,
      timestamp: Date.now(),
    };
  }

  async getContext(): Promise<ScreenContext> {
    if (!this.context || Date.now() - this.context.timestamp > this.CACHE_TTL) {
      await this.updateContext();
    }
    return this.context!;
  }

  moveMouse(x: number, y: number) {
    robot.moveMouse(x, y);
  }

  click(button: 'left' | 'right' | 'middle' = 'left') {
    robot.mouseClick(button);
  }

  typeText(text: string) {
    robot.typeString(text);
  }
}
