import { vi } from "vitest";

// Mock screen capture data
const mockScreenCapture = {
  image: Buffer.from("mock-screenshot-data"),
  width: 1920,
  height: 1080,
  byteWidth: 7680,
  bitsPerPixel: 32,
  bytesPerPixel: 4,
};

// Mock robotjs module
export default {
  getScreenSize: vi.fn(() => ({ width: 1920, height: 1080 })),
  screen: {
    capture: vi.fn(() => mockScreenCapture),
  },
  moveMouse: vi.fn(),
  mouseClick: vi.fn(),
  typeString: vi.fn(),
  keyTap: vi.fn(),
  keyToggle: vi.fn(),
  getMousePos: vi.fn(() => ({ x: 100, y: 100 })),
  getPixelColor: vi.fn(() => "ffffff"),
  setMouseDelay: vi.fn(),
  setKeyboardDelay: vi.fn(),
};

// Export named functions for compatibility
export const getScreenSize = vi.fn(() => ({ width: 1920, height: 1080 }));
export const screen = {
  capture: vi.fn(() => mockScreenCapture),
};
export const moveMouse = vi.fn();
export const mouseClick = vi.fn();
export const typeString = vi.fn();
export const keyTap = vi.fn();
export const keyToggle = vi.fn();
export const getMousePos = vi.fn(() => ({ x: 100, y: 100 }));
export const getPixelColor = vi.fn(() => "ffffff");
export const setMouseDelay = vi.fn();
export const setKeyboardDelay = vi.fn();
