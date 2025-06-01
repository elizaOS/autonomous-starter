import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEnvVar, validationStrategies } from "./validation";
import type { ValidationResult } from "./types";
import { logger } from "@elizaos/core";

// Mock fetch for API validation tests
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("validateEnvVar", () => {
    it("should return invalid for empty value", async () => {
      const result = await validateEnvVar("TEST_VAR", "", "api_key");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Environment variable value is empty");
    });

    it("should return invalid for whitespace-only value", async () => {
      const result = await validateEnvVar("TEST_VAR", "   ", "api_key");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Environment variable value is empty");
    });

    it("should use basic validation for unknown types", async () => {
      const loggerSpy = vi.spyOn(logger, "warn");
      const result = await validateEnvVar(
        "TEST_VAR",
        "test-value",
        "unknown_type",
      );
      expect(result.isValid).toBe(true);
      expect(result.details).toBe("Basic validation passed - value is present");
      expect(loggerSpy).toHaveBeenCalledWith(
        "No specific validation strategy found for TEST_VAR, using basic validation",
      );
      loggerSpy.mockRestore();
    });

    it("should handle validation errors gracefully", async () => {
      // Mock a validation strategy to throw an error
      const originalStrategy = validationStrategies.api_key.openai;
      validationStrategies.api_key.openai = vi
        .fn()
        .mockRejectedValue(new Error("Test error"));
      const loggerSpy = vi.spyOn(logger, "error");

      const result = await validateEnvVar(
        "TEST_VAR",
        "test-value",
        "api_key",
        "api_key:openai",
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Validation failed due to unexpected error");
      expect(result.details).toBe("Test error");
      expect(loggerSpy).toHaveBeenCalledWith(
        "Error validating environment variable TEST_VAR:",
        new Error("Test error"),
      );

      // Restore original strategy
      validationStrategies.api_key.openai = originalStrategy;
      loggerSpy.mockRestore();
    });

    it("should use specific validation strategy when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });
      const result = await validateEnvVar(
        "OPENAI_API_KEY",
        "sk-test123",
        "api_key",
        "api_key:openai",
      );
      expect(result.isValid).toBe(true);
      expect(result.details).toBe("OpenAI API key validated successfully");
    });
  });

  describe("validationStrategies", () => {
    describe("api_key", () => {
      describe("openai", () => {
        it("should return valid for successful API response", async () => {
          mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
          });
          const result = await validationStrategies.api_key.openai("test-key");
          expect(result.isValid).toBe(true);
          expect(result.details).toBe("OpenAI API key validated successfully");
          expect(mockFetch).toHaveBeenCalledWith(
            "https://api.openai.com/v1/models",
            {
              headers: {
                Authorization: "Bearer test-key",
                "Content-Type": "application/json",
              },
            },
          );
        });

        it("should return invalid for failed API response", async () => {
          mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            text: vi.fn().mockResolvedValue("Unauthorized"),
          });
          const result =
            await validationStrategies.api_key.openai("invalid-key");
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("OpenAI API validation failed: 401");
          expect(result.details).toBe("Unauthorized");
        });

        it("should handle network errors", async () => {
          mockFetch.mockRejectedValue(new Error("Network error"));
          const result = await validationStrategies.api_key.openai("test-key");
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("Failed to validate OpenAI API key");
          expect(result.details).toBe("Network error");
        });
      });

      describe("groq", () => {
        it("should return valid for successful API response", async () => {
          mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
          });
          const result = await validationStrategies.api_key.groq("test-key");
          expect(result.isValid).toBe(true);
          expect(result.details).toBe("Groq API key validated successfully");
          expect(mockFetch).toHaveBeenCalledWith(
            "https://api.groq.com/openai/v1/models",
            {
              headers: {
                Authorization: "Bearer test-key",
                "Content-Type": "application/json",
              },
            },
          );
        });

        it("should return invalid for failed API response", async () => {
          mockFetch.mockResolvedValue({
            ok: false,
            status: 403,
          });
          const result = await validationStrategies.api_key.groq("invalid-key");
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("Groq API validation failed: 403");
        });

        it("should handle network errors", async () => {
          mockFetch.mockRejectedValue(new Error("Connection timeout"));
          const result = await validationStrategies.api_key.groq("test-key");
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("Failed to validate Groq API key");
          expect(result.details).toBe("Connection timeout");
        });
      });

      describe("anthropic", () => {
        it("should return valid for successful API response", async () => {
          mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
          });
          const result =
            await validationStrategies.api_key.anthropic("test-key");
          expect(result.isValid).toBe(true);
          expect(result.details).toBe(
            "Anthropic API key validated successfully",
          );
          expect(mockFetch).toHaveBeenCalledWith(
            "https://api.anthropic.com/v1/messages",
            {
              method: "POST",
              headers: {
                "x-api-key": "test-key",
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-3-haiku-20240307",
                max_tokens: 1,
                messages: [{ role: "user", content: "test" }],
              }),
            },
          );
        });

        it("should return valid for 400 status (expected for minimal test)", async () => {
          mockFetch.mockResolvedValue({
            ok: false,
            status: 400,
          });
          const result =
            await validationStrategies.api_key.anthropic("test-key");
          expect(result.isValid).toBe(true);
          expect(result.details).toBe(
            "Anthropic API key validated successfully",
          );
        });

        it("should return invalid for unauthorized response", async () => {
          mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
          });
          const result =
            await validationStrategies.api_key.anthropic("invalid-key");
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("Anthropic API validation failed: 401");
        });

        it("should handle network errors", async () => {
          mockFetch.mockRejectedValue(new Error("DNS resolution failed"));
          const result =
            await validationStrategies.api_key.anthropic("test-key");
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("Failed to validate Anthropic API key");
          expect(result.details).toBe("DNS resolution failed");
        });
      });
    });

    describe("url", () => {
      describe("webhook", () => {
        it("should return valid for successful webhook response", async () => {
          mockFetch.mockResolvedValue({
            status: 200,
          });
          const result = await validationStrategies.url.webhook(
            "https://example.com/webhook",
          );
          expect(result.isValid).toBe(true);
          expect(result.details).toBe("Webhook URL is reachable");
          expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/webhook",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ test: true }),
            },
          );
        });

        it("should return valid for client error responses (< 500)", async () => {
          mockFetch.mockResolvedValue({
            status: 404,
          });
          const result = await validationStrategies.url.webhook(
            "https://example.com/webhook",
          );
          expect(result.isValid).toBe(true);
          expect(result.details).toBe("Webhook URL is reachable");
        });

        it("should return invalid for server error responses (>= 500)", async () => {
          mockFetch.mockResolvedValue({
            status: 500,
          });
          const result = await validationStrategies.url.webhook(
            "https://example.com/webhook",
          );
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("Webhook URL returned server error: 500");
        });

        it("should handle network errors", async () => {
          mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
          const result = await validationStrategies.url.webhook(
            "https://example.com/webhook",
          );
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("Webhook URL is not reachable");
          expect(result.details).toBe("ECONNREFUSED");
        });
      });

      describe("api_endpoint", () => {
        it("should return valid for successful API response", async () => {
          mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
          });
          const result = await validationStrategies.url.api_endpoint(
            "https://api.example.com",
          );
          expect(result.isValid).toBe(true);
          expect(result.details).toBe("API endpoint is reachable");
          expect(mockFetch).toHaveBeenCalledWith("https://api.example.com");
        });

        it("should return invalid for failed API response", async () => {
          mockFetch.mockResolvedValue({
            ok: false,
            status: 404,
          });
          const result = await validationStrategies.url.api_endpoint(
            "https://api.example.com",
          );
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("API endpoint returned error: 404");
        });

        it("should handle network errors", async () => {
          mockFetch.mockRejectedValue(new Error("Timeout"));
          const result = await validationStrategies.url.api_endpoint(
            "https://api.example.com",
          );
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("API endpoint is not reachable");
          expect(result.details).toBe("Timeout");
        });
      });
    });

    describe("credential", () => {
      describe("database_url", () => {
        it("should return valid for proper database URL", async () => {
          const result = await validationStrategies.credential.database_url(
            "postgresql://user:pass@localhost:5432/db",
          );
          expect(result.isValid).toBe(true);
          expect(result.details).toBe("Database URL format is valid");
        });

        it("should return valid for MongoDB URL", async () => {
          const result = await validationStrategies.credential.database_url(
            "mongodb://user:pass@localhost:27017/db",
          );
          expect(result.isValid).toBe(true);
          expect(result.details).toBe("Database URL format is valid");
        });

        it("should return invalid for malformed URL", async () => {
          const result =
            await validationStrategies.credential.database_url("not-a-url");
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("Invalid database URL format");
        });

        it("should return invalid for URL without hostname", async () => {
          const result =
            await validationStrategies.credential.database_url("postgresql://");
          expect(result.isValid).toBe(false);
          expect(result.error).toBe("Invalid database URL format");
        });
      });
    });

    describe("private_key", () => {
      it("should have rsa validation strategy", () => {
        expect(validationStrategies.private_key.rsa).toBeDefined();
        expect(typeof validationStrategies.private_key.rsa).toBe("function");
      });

      it("should have ed25519 validation strategy", () => {
        expect(validationStrategies.private_key.ed25519).toBeDefined();
        expect(typeof validationStrategies.private_key.ed25519).toBe(
          "function",
        );
      });
    });
  });
});
