// Extend the core service types with autonomous service
declare module "@elizaos/core" {
  interface ServiceTypeRegistry {
    AUTONOMOUS: "autonomous";
  }
}

// Export service type constant
export const AutonomousServiceType = {
  AUTONOMOUS: "autonomous" as const,
} satisfies Partial<import("@elizaos/core").ServiceTypeRegistry>;

export enum EventType {
  AUTO_MESSAGE_RECEIVED = "auto_message_received",
}
