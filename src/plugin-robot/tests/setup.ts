import { vi } from "vitest";

// Mock UUID generation for consistent testing
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-123"),
}));

// Mock console methods to reduce noise in tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "info").mockImplementation(() => {});
vi.spyOn(console, "debug").mockImplementation(() => {});

// Set up test environment
process.env.NODE_ENV = "test";
