import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  afterAll,
  beforeAll,
} from "vitest";

// Mock robotjs before any imports
vi.mock("@jitsi/robotjs", () => ({
  default: {
    getScreenSize: vi.fn(() => ({ width: 1, height: 1 })),
    screen: {
      capture: vi.fn(() => ({
        image: MOCK_PNG_BUFFER, // Use the defined MOCK_PNG_BUFFER
        width: 1,
        height: 1,
        byteWidth: 4,
        bitsPerPixel: 32,
        bytesPerPixel: 4,
        colorAt: vi.fn(() => "000000"),
      })),
    },
    moveMouse: vi.fn(),
    mouseClick: vi.fn(),
    typeString: vi.fn(),
  },
}));

import { robotPlugin } from "../index.js";
import { RobotService } from "../service.js";
import { performScreenAction } from "../action.js";
import { screenProvider } from "../provider.js";
import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  Service,
  Agent,
  Action,
  Provider,
  Evaluator,
  Plugin,
  ServiceTypeName,
  UUID,
  Room,
  Entity,
} from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import {
  type ScreenActionStep,
  type ScreenContext,
  RobotServiceType,
} from "../types";
// @ts-ignore - mocked module
import robot from "@jitsi/robotjs";

// Minimal valid PNG (1x1 transparent pixel)
const MOCK_PNG_BUFFER = Buffer.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 11, 73, 68, 65, 84, 120,
  156, 99, 96, 96, 96, 0, 0, 0, 7, 0, 1, 170, 223, 181, 33, 0, 0, 0, 0, 73, 69,
  78, 68, 174, 66, 96, 130,
]);

// Get the mocked functions
const mockRobotJs = robot as any;

// Mock the runtime
const createMockRuntime = (): {
  runtime: IAgentRuntime;
  servicesMap: Map<ServiceTypeName, Service>;
} => {
  const services = new Map<ServiceTypeName, Service>();
  let runtimeInstance: IAgentRuntime;
  runtimeInstance = {
    agentId: "12345678-1234-1234-1234-123456789abc" as const,
    character: {
      id: "char-id" as UUID,
      name: "TestAgent",
      bio: "",
      settings: { secrets: {} },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Agent,
    providers: [] as Provider[],
    actions: [] as Action[],
    evaluators: [] as Evaluator[],
    plugins: [] as Plugin[],
    services: services,
    events: new Map(),
    fetch: vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
      ) as any,
    registerPlugin: vi.fn(),
    initialize: vi.fn(),
    getConnection: vi.fn(),
    getService: vi.fn((serviceName: ServiceTypeName) =>
      services.get(serviceName),
    ) as <T extends Service>(serviceType: ServiceTypeName) => T | undefined,
    getAllServices: vi.fn(() => services),
    registerService: vi.fn(async (ServiceClass: any) => {
      const serviceInstance = new ServiceClass(runtimeInstance);
      services.set(ServiceClass.serviceType, serviceInstance);
      if (serviceInstance.start) {
        await serviceInstance.start();
      }
    }),
    registerDatabaseAdapter: vi.fn(),
    setSetting: vi.fn(),
    getSetting: vi.fn((key: string) => {
      if (key === "WORLD_ID") return "test-world-id" as UUID;
      if (key === "ENABLE_LOCAL_OCR") return true;
      return null;
    }),
    getConversationLength: vi.fn().mockResolvedValue(0),
    processActions: vi.fn(),
    evaluate: vi.fn(),
    registerProvider: vi.fn(),
    registerAction: vi.fn(),
    registerEvaluator: vi.fn(),
    ensureConnection: vi.fn(),
    ensureParticipantInRoom: vi.fn(),
    ensureWorldExists: vi.fn().mockResolvedValue(undefined),
    ensureRoomExists: vi.fn().mockResolvedValue(undefined),
    composeState: vi.fn().mockResolvedValue({ values: {}, data: {}, text: "" }),
    useModel: vi.fn(),
    registerModel: vi.fn(),
    getModel: vi.fn(),
    registerEvent: vi.fn(),
    getEvent: vi.fn(),
    emitEvent: vi.fn(),
    registerTaskWorker: vi.fn(),
    getTaskWorker: vi.fn(),
    stop: vi.fn(),
    addEmbeddingToMemory: vi.fn(),
    getEntityById: vi.fn().mockResolvedValue(null as Entity | null),
    getRoom: vi.fn().mockResolvedValue(null as Room | null),
    createEntity: vi.fn().mockResolvedValue({} as Entity),
    createRoom: vi.fn().mockResolvedValue({} as Room),
    addParticipant: vi.fn(),
    getRooms: vi.fn().mockResolvedValue([]),
    registerSendHandler: vi.fn(),
    sendMessageToTarget: vi.fn(),
    db: {
      getMemoriesByWorldId: vi.fn().mockResolvedValue([]),
    } as any,
  } as unknown as IAgentRuntime;

  return { runtime: runtimeInstance, servicesMap: services };
};

// Mock message and state
const createMockMessage = (text: string): Memory => ({
  id: "12345678-1234-1234-1234-123456789abc" as const,
  agentId: "agent-12345678-1234-1234-1234-123456789abc" as const,
  entityId: "entity-12345678-1234-1234-1234-123456789def" as const,
  roomId: "room-12345678-1234-1234-1234-123456789ghi" as const,
  content: { text },
  createdAt: Date.now(),
});

const createMockState = (additionalData: Record<string, any> = {}): State => ({
  values: {},
  data: {},
  text: "",
  ...additionalData,
});

let mockRuntimeInstance: IAgentRuntime;
let servicesMap: Map<ServiceTypeName, Service>;

describe("Robot Plugin Integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { runtime, servicesMap: sm } = createMockRuntime();
    mockRuntimeInstance = runtime;
    servicesMap = sm;

    (
      mockRuntimeInstance.useModel as ReturnType<typeof vi.fn>
    ).mockImplementation(async (modelType: string, input: any) => {
      switch (modelType) {
        case ModelType.IMAGE_DESCRIPTION:
          return "A screenshot showing a desktop with various windows and applications";
        case ModelType.TEXT_SMALL:
          return "Sample text from OCR";
        case ModelType.OBJECT_SMALL:
          return [
            {
              label: "button",
              bbox: { x: 100, y: 200, width: 80, height: 30 },
            },
            {
              label: "text_field",
              bbox: { x: 50, y: 100, width: 200, height: 25 },
            },
          ];
        default:
          return "";
      }
    });
    await (mockRuntimeInstance.registerService as Function)(RobotService);
  });

  afterAll(async () => {
    const service = mockRuntimeInstance.getService(
      RobotServiceType.ROBOT,
    ) as RobotService;
    if (service && typeof service.stop === "function") {
      await service.stop();
    }
  });

  describe("plugin structure", () => {
    it("should have correct plugin properties", () => {
      expect(robotPlugin.name).toBe("plugin-robot");
      expect(robotPlugin.description).toBe(
        "Control screen using robotjs and provide screen context",
      );
      expect(robotPlugin.actions).toHaveLength(1);
      expect(robotPlugin.providers).toHaveLength(1);
      expect(robotPlugin.services).toHaveLength(1);
    });

    it("should export correct components", () => {
      expect(robotPlugin.actions[0]).toBe(performScreenAction);
      expect(robotPlugin.providers[0]).toBe(screenProvider);
      expect(robotPlugin.services[0]).toBe(RobotService);
    });
  });

  describe("service registration and initialization", () => {
    it("should register and start the RobotService", async () => {
      const service = mockRuntimeInstance.getService(RobotServiceType.ROBOT);
      expect(service).toBeInstanceOf(RobotService);
      expect(service!.capabilityDescription).toBe(
        "Controls the screen and provides recent screen context with intelligent change detection and local OCR.",
      );
    });

    it("should validate action when service is registered", async () => {
      const message = createMockMessage("test");
      const state = createMockState();
      const isValid = await performScreenAction.validate(
        mockRuntimeInstance,
        message,
        state,
      );
      expect(isValid).toBe(true);
    });

    it("should fail action validation when service is not registered", async () => {
      const { runtime: emptyRuntime } = createMockRuntime();
      const message = createMockMessage("test");
      const state = createMockState();
      const isValid = await performScreenAction.validate(
        emptyRuntime,
        message,
        state,
      );
      expect(isValid).toBe(false);
    });
  });

  describe("end-to-end screen control workflow", () => {
    it("should capture screen context and perform actions", async () => {
      const message = createMockMessage("click on the submit button");
      const state = createMockState();
      const mockCallback = vi.fn();

      const providerResult = await screenProvider.get(
        mockRuntimeInstance,
        message,
        state,
      );

      expect(providerResult.text).toContain("# Current Screen Description");
      expect(providerResult.text).toContain(
        "A screenshot showing a desktop with various windows and applications",
      );
      expect(providerResult.text).toContain("# Text on Screen (OCR)");
      expect(providerResult.text).toContain("Sample text from OCR");
      expect(providerResult.text).toContain("# Interactive Objects");
      expect(providerResult.text).toContain("button at (100,200)");

      const actionOptions = {
        steps: [
          { action: "move", x: 100, y: 200 } as ScreenActionStep,
          { action: "click", button: "left" } as ScreenActionStep,
        ],
      };

      await performScreenAction.handler(
        mockRuntimeInstance,
        message,
        state,
        actionOptions,
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        thought: "Executed 2 screen actions successfully",
        text: "Screen actions completed: moved mouse to (100, 200), clicked left mouse button.",
      });
    });

    it("should handle complex multi-step workflow", async () => {
      const message = createMockMessage("fill out the form");
      const state = createMockState();
      const mockCallback = vi.fn();

      const initialContext = await screenProvider.get(
        mockRuntimeInstance,
        message,
        state,
      );
      expect((initialContext.data as ScreenContext).objects).toHaveLength(2);

      const actionOptions = {
        steps: [
          { action: "move", x: 50, y: 100 } as ScreenActionStep,
          { action: "click", button: "left" } as ScreenActionStep,
          { action: "type", text: "test@example.com" } as ScreenActionStep,
          { action: "move", x: 100, y: 200 } as ScreenActionStep,
          { action: "click", button: "left" } as ScreenActionStep,
        ],
      };

      await performScreenAction.handler(
        mockRuntimeInstance,
        message,
        state,
        actionOptions,
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        thought: "Executed 5 screen actions successfully",
        text: 'Screen actions completed: moved mouse to (50, 100), clicked left mouse button, typed "test@example.com", moved mouse to (100, 200), clicked left mouse button.',
      });

      expect(mockRobotJs.moveMouse).toHaveBeenCalledWith(50, 100);
      expect(mockRobotJs.mouseClick).toHaveBeenCalledWith("left", false);
      expect(mockRobotJs.typeString).toHaveBeenCalledWith("test@example.com");
      expect(mockRobotJs.moveMouse).toHaveBeenCalledWith(100, 200);
      expect(mockRobotJs.mouseClick).toHaveBeenCalledWith("left", false);
    });

    it("should handle screen context caching", async () => {
      const message = createMockMessage("test message");
      const state = createMockState();

      const context1 = await screenProvider.get(
        mockRuntimeInstance,
        message,
        state,
      );
      const service = mockRuntimeInstance.getService(
        RobotServiceType.ROBOT,
      ) as RobotService;
      const performUpdateSpy = vi.spyOn(service as any, "performUpdate");

      const context2 = await screenProvider.get(
        mockRuntimeInstance,
        message,
        state,
      );

      expect(context1.data).toEqual(context2.data);
      expect(mockRobotJs.screen.capture).toHaveBeenCalledTimes(1);
      expect(performUpdateSpy).not.toHaveBeenCalled();
    });

    it("should handle AI model failures gracefully", async () => {
      (
        mockRuntimeInstance.useModel as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("AI model failed"));

      const message = createMockMessage("test message");
      const state = createMockState();

      const result = await screenProvider.get(
        mockRuntimeInstance,
        message,
        state,
      );

      // When AI models fail but context is still successfully created (with empty values),
      // the service returns 'active' status, not 'processing'
      expect(result.values.serviceStatus).toBe("active");
      expect(result.values.currentDescription).toBe("");
      expect(result.values.ocr).toBe("");
      expect(result.values.objects).toEqual([]);
      // The data contains the actual context object, not just {serviceStatus: 'processing'}
      expect(result.data).toHaveProperty("timestamp");
      expect(result.data).toHaveProperty("screenshot");
    });

    it("should handle service cleanup", async () => {
      const service = mockRuntimeInstance.getService(
        RobotServiceType.ROBOT,
      ) as RobotService;
      expect(service).toBeDefined();

      const originalUseModel = mockRuntimeInstance.useModel;
      (
        mockRuntimeInstance.useModel as ReturnType<typeof vi.fn>
      ).mockImplementation(async (modelType: string, input: any) => {
        switch (modelType) {
          case ModelType.IMAGE_DESCRIPTION:
            return "Description";
          case ModelType.TEXT_SMALL:
            return "OCR";
          case ModelType.OBJECT_SMALL:
            return [];
          default:
            return "";
        }
      });
      await service.getContext();
      mockRuntimeInstance.useModel = originalUseModel;

      await service.stop();
      if ((service as any).tesseractWorker) {
        expect((service as any).tesseractWorker.terminate).toHaveBeenCalled();
      }
      vi.spyOn(service, "stop").mockResolvedValue(undefined);
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle invalid action parameters", async () => {
      const message = createMockMessage("invalid action");
      const state = createMockState();
      const mockCallback = vi.fn();

      const actionOptions = {
        steps: [
          { action: "move", x: 100 } as ScreenActionStep,
          { action: "type" } as ScreenActionStep,
          { action: "unknown_action" } as any,
          { action: "click", button: "right" } as ScreenActionStep,
        ],
      };

      await performScreenAction.handler(
        mockRuntimeInstance,
        message,
        state,
        actionOptions,
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        thought: "Executed 1 screen actions successfully",
        text: 'Screen actions completed: skipped invalid step: {"action":"move","x":100}, skipped invalid step: {"action":"type"}, skipped invalid step: {"action":"unknown_action"}, clicked right mouse button.',
      });

      expect(mockRobotJs.moveMouse).not.toHaveBeenCalled();
      expect(mockRobotJs.typeString).not.toHaveBeenCalled();
      expect(mockRobotJs.mouseClick).toHaveBeenCalledWith("right", false);
    });

    it("should handle empty action steps", async () => {
      const message = createMockMessage("empty action");
      const state = createMockState();
      const mockCallback = vi.fn();

      const actionOptions = { steps: [] };

      await performScreenAction.handler(
        mockRuntimeInstance,
        message,
        state,
        actionOptions,
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        thought: "No valid steps provided",
        text: "Unable to perform screen action - no valid steps were provided.",
      });
    });

    it("should handle missing action options", async () => {
      const message = createMockMessage("missing options");
      const state = createMockState();
      const mockCallback = vi.fn();

      await performScreenAction.handler(
        mockRuntimeInstance,
        message,
        state,
        {},
        mockCallback,
      );

      expect(mockCallback).toHaveBeenCalledWith({
        thought: "No valid steps provided",
        text: "Unable to perform screen action - no valid steps were provided.",
      });
    });

    it("should handle provider errors when service is unavailable", async () => {
      const { runtime: emptyRuntime, servicesMap: localServicesMap } =
        createMockRuntime();
      localServicesMap.delete(RobotServiceType.ROBOT as ServiceTypeName);
      vi.mocked(emptyRuntime.getService).mockImplementation(
        (serviceName: string) =>
          localServicesMap.get(serviceName as ServiceTypeName),
      );
      (emptyRuntime.useModel as ReturnType<typeof vi.fn>) = vi.fn();

      const message = createMockMessage("test message");
      const state = createMockState();

      const result = await screenProvider.get(emptyRuntime, message, state);

      expect(result.values).toEqual({
        serviceStatus: "initializing",
        dataAge: "unavailable",
        currentDescription: "",
        ocr: "",
        objects: [],
        changeDetected: false,
        pixelDifferencePercentage: undefined,
        historyCount: 0,
        isStale: false,
      });
      expect(result.text).toBe(
        "# Screen Context\n\n🔄 **Robot Service Initializing**\n\nThe robot service is still starting up. Screen context will be available once initialization is complete.\n\n**Status**: Service not yet available\n**Expected**: Available after service initialization",
      );
      expect(result.data).toEqual({ serviceStatus: "initializing" });
    });
  });

  describe("performance and resource management", () => {
    it("should handle rapid successive calls efficiently", async () => {
      const message = createMockMessage("rapid calls");
      const state = createMockState();

      const startTime = Date.now();

      const promises = Array.from({ length: 5 }, () =>
        screenProvider.get(mockRuntimeInstance, message, state),
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.data).toBeInstanceOf(Object);
        if (
          result.data &&
          typeof result.data === "object" &&
          "screenshot" in result.data
        ) {
          expect((result.data as ScreenContext).screenshot).toBeInstanceOf(
            Buffer,
          );
        } else {
          expect(result.data).toHaveProperty("screenshot");
        }
      });

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it("should handle memory cleanup properly", async () => {
      const service = mockRuntimeInstance.getService(
        RobotServiceType.ROBOT,
      ) as RobotService;
      if (!service)
        throw new Error("RobotService not found during cleanup test setup");

      for (let i = 0; i < 3; i++) {
        await service.updateContext();
      }

      await service.stop();
      if ((service as any).tesseractWorker) {
        expect((service as any).tesseractWorker.terminate).toHaveBeenCalled();
      }
      vi.spyOn(service, "stop").mockResolvedValue(undefined);
    });
  });
});
