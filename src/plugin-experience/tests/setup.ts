import { vi } from "vitest";

// Mock UUID generation for consistent testing
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-123"),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Set up test environment
process.env.NODE_ENV = "test";
