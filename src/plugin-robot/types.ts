// Extend the core service types with robot service
declare module '@elizaos/core' {
    interface ServiceTypeRegistry {
        ROBOT: 'ROBOT';
    }
}

// Export service type constant
export const RobotServiceType = {
    ROBOT: 'ROBOT' as const,
} satisfies Partial<import('@elizaos/core').ServiceTypeRegistry>; 