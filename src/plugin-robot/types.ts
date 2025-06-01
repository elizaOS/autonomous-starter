// Extend the core service types with robot service
declare module "@elizaos/core" {
  interface ServiceTypeRegistry {
    ROBOT: "ROBOT";
  }
}

// Export service type constant
export const RobotServiceType = {
  ROBOT: "ROBOT" as const,
} satisfies Partial<import("@elizaos/core").ServiceTypeRegistry>;

export interface ScreenObject {
  label: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface ScreenActionStep {
  action: "move" | "click" | "type";
  x?: number;
  y?: number;
  text?: string;
  button?: "left" | "right" | "middle";
}

export interface ScreenDescription {
  description: string;
  timestamp: number;
  relativeTime: string;
}

export interface ScreenContext {
  screenshot: Buffer;
  currentDescription: string;
  descriptionHistory: ScreenDescription[];
  ocr: string;
  objects: ScreenObject[];
  timestamp: number;
  changeDetected: boolean;
  pixelDifferencePercentage?: number;
}

export interface ChangeDetectionConfig {
  threshold: number; // Percentage of pixels that must change to trigger AI processing
  enabled: boolean;
}

export interface RobotServiceConfig {
  cacheTTL: number;
  changeDetection: ChangeDetectionConfig;
  maxHistoryEntries: number;
}
