import { describe, it, expect, beforeEach, vi } from "vitest";
import { PluginCreationService } from "../services/plugin-creation-service";
import { IAgentRuntime } from "@elizaos/core";

// Mock IAgentRuntime
const createMockRuntime = (): IAgentRuntime => {
    const runtime = {
        getSetting: vi.fn(),
        services: new Map(),
    } as any;
    
    return runtime;
};

describe("PluginCreationService", () => {
    let service: PluginCreationService;
    let runtime: IAgentRuntime;

    beforeEach(() => {
        runtime = createMockRuntime();
        service = new PluginCreationService(runtime);
    });

    describe("initialization", () => {
        it("should initialize without API key", async () => {
            await service.initialize(runtime);
            expect(runtime.getSetting).toHaveBeenCalledWith("ANTHROPIC_API_KEY");
        });

        it("should initialize with API key", async () => {
            (runtime.getSetting as any).mockReturnValue("test-api-key");
            await service.initialize(runtime);
            expect(runtime.getSetting).toHaveBeenCalledWith("ANTHROPIC_API_KEY");
        });
    });

    describe("createPlugin", () => {
        it("should create a new plugin job", async () => {
            const specification = {
                name: "test-plugin",
                description: "Test plugin for unit tests",
                version: "1.0.0",
                actions: [{
                    name: "testAction",
                    description: "A test action"
                }]
            };

            const jobId = await service.createPlugin(specification);
            expect(jobId).toBeDefined();
            expect(typeof jobId).toBe("string");

            const job = service.getJobStatus(jobId);
            expect(job).toBeDefined();
            expect(job?.specification).toEqual(specification);
            expect(job?.status).toBe("pending");
        });

        it("should handle missing API key gracefully", async () => {
            const specification = {
                name: "test-plugin",
                description: "Test plugin"
            };

            const jobId = await service.createPlugin(specification);
            const job = service.getJobStatus(jobId);
            
            // Job should still be created but will fail during generation
            expect(job).toBeDefined();
            expect(job?.status).toBe("pending");
        });
    });

    describe("job management", () => {
        it("should get all jobs", async () => {
            const spec1 = { name: "plugin1", description: "Plugin 1" };
            const spec2 = { name: "plugin2", description: "Plugin 2" };

            const jobId1 = await service.createPlugin(spec1);
            const jobId2 = await service.createPlugin(spec2);

            const jobs = service.getAllJobs();
            expect(jobs).toHaveLength(2);
            expect(jobs.map(j => j.id)).toContain(jobId1);
            expect(jobs.map(j => j.id)).toContain(jobId2);
        });

        it("should cancel a job", async () => {
            const specification = {
                name: "test-plugin",
                description: "Test plugin"
            };

            const jobId = await service.createPlugin(specification);
            service.cancelJob(jobId);

            const job = service.getJobStatus(jobId);
            expect(job?.status).toBe("cancelled");
            expect(job?.completedAt).toBeDefined();
        });

        it("should handle cancelling non-existent job", () => {
            service.cancelJob("non-existent-id");
            // Should not throw
        });
    });

    describe("service lifecycle", () => {
        it("should stop service and cancel running jobs", async () => {
            const specification = {
                name: "test-plugin",
                description: "Test plugin"
            };

            const jobId = await service.createPlugin(specification);
            
            // Manually set job to running
            const job = service.getJobStatus(jobId);
            if (job) {
                job.status = "running";
            }

            await service.stop();

            const stoppedJob = service.getJobStatus(jobId);
            expect(stoppedJob?.status).toBe("cancelled");
        });
    });

    describe("static start method", () => {
        it("should create and initialize service", async () => {
            const newService = await PluginCreationService.start(runtime);
            expect(newService).toBeInstanceOf(PluginCreationService);
        });
    });
});