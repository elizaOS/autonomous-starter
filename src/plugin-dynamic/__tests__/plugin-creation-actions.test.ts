import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    createPluginAction,
    checkPluginCreationStatusAction,
    cancelPluginCreationAction,
    createPluginFromDescriptionAction
} from "../actions/plugin-creation-actions";
import { IAgentRuntime, Memory, State } from "@elizaos/core";
import { PluginCreationService } from "../services/plugin-creation-service";

// Mock Memory
const createMockMemory = (text: string): Memory => ({
    id: "test-id",
    content: { text },
    userId: "user-id",
    roomId: "room-id",
    entityId: "entity-id",
    createdAt: Date.now()
} as Memory);

// Mock Runtime
const createMockRuntime = (): IAgentRuntime => {
    const service = {
        getAllJobs: vi.fn().mockReturnValue([]),
        createPlugin: vi.fn().mockReturnValue("job-123"),
        getJobStatus: vi.fn(),
        cancelJob: vi.fn()
    } as unknown as PluginCreationService;

    return {
        services: {
            get: vi.fn().mockReturnValue(service)
        },
        getSetting: vi.fn()
    } as any;
};

describe("Plugin Creation Actions", () => {
    let runtime: IAgentRuntime;
    let state: State;

    beforeEach(() => {
        runtime = createMockRuntime();
        state = { values: {}, data: {}, text: "" };
    });

    describe("createPluginAction", () => {
        it("should validate when no active jobs", async () => {
            const message = createMockMemory('{"name": "test-plugin", "description": "Test"}');
            const result = await createPluginAction.validate(runtime, message, state);
            expect(result).toBe(true);
        });

        it("should not validate when active job exists", async () => {
            const service = runtime.services.get("plugin_creation") as PluginCreationService;
            (service.getAllJobs as any).mockReturnValue([{ status: "running" }]);
            
            const message = createMockMemory('{"name": "test-plugin"}');
            const result = await createPluginAction.validate(runtime, message, state);
            expect(result).toBe(false);
        });

        it("should handle plugin creation", async () => {
            const message = createMockMemory('{"name": "test-plugin", "description": "Test plugin"}');
            const result = await createPluginAction.handler(runtime, message, state);
            
            expect(result).toContain("Plugin creation job started with ID: job-123");
            const service = runtime.services.get("plugin_creation") as PluginCreationService;
            expect(service.createPlugin).toHaveBeenCalled();
        });

        it("should handle invalid JSON", async () => {
            const message = createMockMemory("invalid json");
            const result = await createPluginAction.handler(runtime, message, state);
            
            expect(result).toContain("Failed to create plugin");
        });
    });

    describe("checkPluginCreationStatusAction", () => {
        it("should validate when jobs exist", async () => {
            const service = runtime.services.get("plugin_creation") as PluginCreationService;
            (service.getAllJobs as any).mockReturnValue([{ id: "job-123" }]);
            
            const message = createMockMemory("check status");
            const result = await checkPluginCreationStatusAction.validate(runtime, message, state);
            expect(result).toBe(true);
        });

        it("should show job status", async () => {
            const service = runtime.services.get("plugin_creation") as PluginCreationService;
            (service.getAllJobs as any).mockReturnValue([
                { id: "job-123", status: "running" }
            ]);
            (service.getJobStatus as any).mockReturnValue({
                status: "running",
                currentPhase: "building",
                progress: 0.5,
                logs: ["Log 1", "Log 2"]
            });

            const message = createMockMemory("check status");
            const result = await checkPluginCreationStatusAction.handler(runtime, message, state);
            
            expect(result).toContain("Plugin Creation Status: running");
            expect(result).toContain("Current Phase: building");
            expect(result).toContain("Progress: 50%");
        });
    });

    describe("cancelPluginCreationAction", () => {
        it("should validate when active job exists", async () => {
            const service = runtime.services.get("plugin_creation") as PluginCreationService;
            (service.getAllJobs as any).mockReturnValue([
                { id: "job-123", status: "running" }
            ]);
            
            const message = createMockMemory("cancel");
            const result = await cancelPluginCreationAction.validate(runtime, message, state);
            expect(result).toBe(true);
        });

        it("should cancel active job", async () => {
            const service = runtime.services.get("plugin_creation") as PluginCreationService;
            (service.getAllJobs as any).mockReturnValue([
                { id: "job-123", status: "running" }
            ]);

            const message = createMockMemory("cancel");
            const result = await cancelPluginCreationAction.handler(runtime, message, state);
            
            expect(result).toBe("Plugin creation job has been cancelled.");
            expect(service.cancelJob).toHaveBeenCalledWith("job-123");
        });
    });

    describe("createPluginFromDescriptionAction", () => {
        it("should validate with description", async () => {
            const message = createMockMemory("I need a plugin that manages user preferences");
            const result = await createPluginFromDescriptionAction.validate(runtime, message, state);
            expect(result).toBe(true);
        });

        it("should not validate with short description", async () => {
            const message = createMockMemory("plugin");
            const result = await createPluginFromDescriptionAction.validate(runtime, message, state);
            expect(result).toBe(false);
        });

        it("should create plugin from description", async () => {
            (runtime.getSetting as any).mockReturnValue("test-api-key");
            
            const message = createMockMemory("I need a plugin that manages todo lists");
            const result = await createPluginFromDescriptionAction.handler(runtime, message, state);
            
            expect(result).toContain("I'm creating a plugin based on your description");
            expect(result).toContain("Job ID: job-123");
            
            const service = runtime.services.get("plugin_creation") as PluginCreationService;
            expect(service.createPlugin).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "custom-plugin",
                    description: "I need a plugin that manages todo lists"
                }),
                "test-api-key"
            );
        });
    });
});