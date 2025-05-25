import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
  addHeader,
  logger,
} from '@elizaos/core';
import { type RobotService } from './service';

export const screenProvider: Provider = {
  name: 'SCREEN_CONTEXT',
  description: 'Latest screen description, OCR results and detected objects.',
  position: 50,
  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    const service = runtime.getService<RobotService>('ROBOT' as any);
    if (!service) {
      logger.warn('[screenProvider] RobotService not found');
      return {
        values: {},
        text: 'RobotService unavailable',
        data: {},
      };
    }
    const context = await service.getContext();
    const objectsText = context.objects
      .map((o) => `${o.label} at (${o.bbox.x},${o.bbox.y})`)
      .join('\n');

    // Format text sections, ensuring headers are always included
    const descriptionSection = context.description
      ? `# Screen Description\n${context.description}`
      : '# Screen Description\n';

    const ocrSection = context.ocr ? `# OCR\n${context.ocr}` : '# OCR\n';

    const objectsSection = objectsText ? `# Objects\n${objectsText}` : '# Objects\nNone';

    const text = [descriptionSection, ocrSection, objectsSection].join('\n\n');

    return {
      values: {
        description: context.description,
        ocr: context.ocr,
      },
      text,
      data: context,
    };
  },
};
