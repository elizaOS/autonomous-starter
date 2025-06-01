// Extend the core service types with shell service
declare module "@elizaos/core" {
  interface ServiceTypeRegistry {
    SHELL: "SHELL";
  }
}

// Export service type constant
export const ShellServiceType = {
  SHELL: "SHELL" as const,
} satisfies Partial<import("@elizaos/core").ServiceTypeRegistry>;
