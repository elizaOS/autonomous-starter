// Basic Types
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

// Database Adapter Types
export interface IDatabaseAdapter {
  init(): Promise<void>;
  close(): Promise<void>;
  getAgent(agentId: UUID): Promise<Entity | null>;
  ensureAgentExists(agent: Entity): Promise<Entity>;
  createEntity(entity: Entity): Promise<boolean>;
  getEntityById(entityId: UUID): Promise<Entity | null>;
  getRoom(roomId: UUID): Promise<Room | null>;
  createRoom(room: Room): Promise<UUID>;
  addParticipant(entityId: UUID, roomId: UUID): Promise<boolean>;
  getParticipantsForRoom(roomId: UUID): Promise<Entity[]>;
  ensureEmbeddingDimension(dimension: number): Promise<void>;
}

// Service Types
export type ServiceTypeName = string;

export abstract class Service {
  static serviceType: string;
  runtime: IAgentRuntime;
  capabilityDescription: string = ""; // Add the missing abstract member

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  abstract initialize(): Promise<void>;
  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
}

// Character and Entity Types
export interface Character {
  id: UUID;
  name: string;
  username: string;
  bio: string;
  plugins?: string[];
  settings?: Record<string, any>;
}

export interface Entity {
  id: UUID;
  name: string;
  userId?: UUID;
  bio?: string;
  settings?: Record<string, any>;
}

// Memory and State Types
export interface Memory {
  id?: UUID;
  userId: UUID;
  agentId: UUID;
  roomId: UUID;
  content: Content;
  createdAt?: number;
  embedding?: number[];
  unique?: boolean;
}

export interface Content {
  text: string;
  action?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface State {
  agentId: UUID;
  bio: string;
  lore: string;
  messageDirections: string;
  postDirections: string;
  roomId: UUID;
  userId?: UUID;
  actors: string;
  actorsData?: Actor[];
  goals?: Goal[];
  recentMessages: string;
  recentMessagesData: Memory[];
  providers?: any;
}

export interface Actor {
  name: string;
  details: string;
}

export interface Goal {
  id?: UUID;
  roomId: UUID;
  userId: UUID;
  name: string;
  status: GoalStatus;
  description?: string;
  objectives?: Objective[];
}

export enum GoalStatus {
  DONE = "DONE",
  FAILED = "FAILED",
  IN_PROGRESS = "IN_PROGRESS",
}

export interface Objective {
  completed: boolean;
  description: string;
  id: string;
}

// Handler Types
export type HandlerCallback = (response: Content) => Promise<Content[]>;

// Room and World Types
export interface Room {
  id: UUID;
  name?: string;
  source?: string;
  type: ChannelType;
  channelId?: string;
  serverId?: string;
  worldId: UUID;
}

export interface World {
  id: UUID;
  name: string;
  description?: string;
}

export enum ChannelType {
  DISCORD = "discord",
  TELEGRAM = "telegram",
  TWITTER = "twitter",
  DIRECT = "direct",
}

// Database Connection Types (using pg as imports will be handled elsewhere)
export interface PGlite {
  query: (text: string, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
}

export interface Pool {
  query: (text: string, params?: any[]) => Promise<any>;
  end: () => Promise<void>;
}

// Provider Types
export interface Provider {
  name: string;
  description: string;
  get(runtime: IAgentRuntime, message?: Memory, state?: State): Promise<ProviderResult>;
}

export interface ProviderResult {
  text?: string;
  data?: Record<string, any>;
  values?: Record<string, any>;
}

// Action Types
export interface Action {
  name: string;
  description: string;
  similes?: string[];
  examples?: Array<Array<Record<string, any>>>;
  handler(runtime: IAgentRuntime, message: Memory, state?: State): Promise<string>;
  validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean>;
}

// Evaluator Types
export interface Evaluator {
  name: string;
  description: string;
  similes?: string[];
  examples?: Array<Array<Record<string, any>>>;
  handler(runtime: IAgentRuntime, message: Memory, state?: State): Promise<string>;
  validate(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean>;
  alwaysRun?: boolean;
}

// Task Types
export interface TaskWorker {
  name: string;
  description: string;
  handler(runtime: IAgentRuntime, data: any): Promise<void>;
}

// Model Types
export type ModelTypeName = "text" | "embedding" | "image" | "speech" | string;

export interface ModelResultMap {
  text: string;
  embedding: number[];
  image: string;
  speech: ArrayBuffer;
}

export interface ModelParamsMap {
  text: {
    runtime: IAgentRuntime;
    prompt: string;
    context?: string;
    temperature?: number;
    maxTokens?: number;
  };
  embedding: {
    runtime: IAgentRuntime;
    text: string;
  };
  image: {
    runtime: IAgentRuntime;
    prompt: string;
    width?: number;
    height?: number;
  };
  speech: {
    runtime: IAgentRuntime;
    text: string;
    voice?: string;
  };
}

// Plugin Event Types
export interface PluginEvents {
  [eventName: string]: (params: any) => Promise<void>;
}

// Route Types
export interface Route {
  name: string;
  path: string;
  handler: (req: any, res: any) => Promise<void>;
}

// Test Types
export interface TestSuite {
  name: string;
  tests: Test[];
}

export interface Test {
  name: string;
  description: string;
  handler: () => Promise<boolean>;
}

// Send Handler Types
export interface TargetInfo {
  platform: string;
  channelId?: string;
  userId?: string;
  serverId?: string;
}

export type SendHandlerFunction = (content: Content, target: TargetInfo) => Promise<void>;

export interface IAgentRuntime extends IDatabaseAdapter {
  // Properties
  agentId: UUID;
  character: Character;
  providers: Provider[];
  actions: Action[];
  evaluators: Evaluator[];
  plugins: Plugin[];
  services: Map<ServiceTypeName, Service>;
  events: Map<string, ((params: any) => Promise<void>)[]>;
  fetch?: typeof fetch | null;
  routes: Route[];

  // Methods
  registerPlugin(plugin: Plugin): Promise<void>;

  initialize(): Promise<void>;

  getConnection(): Promise<PGlite | Pool>;

  getService<T extends Service = Service>(service: ServiceTypeName | string): T | null;

  getAllServices(): Map<ServiceTypeName, Service>;

  registerService(serviceClass: typeof Service): Promise<void>;
  unregisterService(serviceName: string): Promise<void>;

  // Keep these methods for backward compatibility
  registerDatabaseAdapter(adapter: IDatabaseAdapter): void;

  setSetting(key: string, value: string | boolean | null | any, secret?: boolean): void;

  getSetting(key: string): string | boolean | null | any;

  getConversationLength(): number;

  processActions(
    message: Memory,
    responses: Memory[],
    state?: State,
    callback?: HandlerCallback
  ): Promise<void>;

  evaluate(
    message: Memory,
    state?: State,
    didRespond?: boolean,
    callback?: HandlerCallback,
    responses?: Memory[]
  ): Promise<Evaluator[] | null>;

  registerProvider(provider: Provider): Promise<void>;
  unregisterProvider(providerName: string): Promise<void>;
  
  registerAction(action: Action): Promise<void>;
  unregisterAction(actionName: string): Promise<void>;

  registerEvaluator(evaluator: Evaluator): Promise<void>;
  unregisterEvaluator(evaluatorName: string): Promise<void>;

  ensureConnection({
    entityId,
    roomId,
    metadata,
    userName,
    worldName,
    name,
    source,
    channelId,
    serverId,
    type,
    worldId,
    userId,
  }: {
    entityId: UUID;
    roomId: UUID;
    userName?: string;
    name?: string;
    worldName?: string;
    source?: string;
    channelId?: string;
    serverId?: string;
    type: ChannelType;
    worldId: UUID;
    userId?: UUID;
    metadata?: Record<string, any>;
  }): Promise<void>;

  ensureParticipantInRoom(entityId: UUID, roomId: UUID): Promise<void>;

  ensureWorldExists(world: World): Promise<void>;

  ensureRoomExists(room: Room): Promise<void>;

  composeState(
    message: Memory,
    includeList?: string[],
    onlyInclude?: boolean,
    skipCache?: boolean
  ): Promise<State>;

  /**
   * Use a model with strongly typed parameters and return values based on model type
   * @template T - The model type to use
   * @template R - The expected return type, defaults to the type defined in ModelResultMap[T]
   * @param {T} modelType - The type of model to use
   * @param {ModelParamsMap[T] | any} params - The parameters for the model, typed based on model type
   * @returns {Promise<R>} - The model result, typed based on the provided generic type parameter
   */
  useModel<T extends keyof ModelResultMap, R = ModelResultMap[T]>(
    modelType: T,
    params: Omit<ModelParamsMap[T], 'runtime'> | any,
    provider?: string
  ): Promise<R>;

  registerModel(
    modelType: ModelTypeName | string,
    handler: (runtime: IAgentRuntime, params: any) => Promise<any>,
    provider: string,
    priority?: number
  ): void;

  getModel(
    modelType: ModelTypeName | string,
    provider?: string
  ): ((runtime: IAgentRuntime, params: any) => Promise<any>) | undefined;

  registerEvent(event: string, handler: (params: any) => Promise<void>): void;

  getEvent(event: string): ((params: any) => Promise<void>)[] | undefined;

  emitEvent(event: string | string[], params: any): Promise<void>;

  // In-memory task definition methods
  registerTaskWorker(taskWorker: TaskWorker): Promise<void>;
  unregisterTaskWorker(taskName: string): Promise<void>;

  stop(): Promise<void>;

  addEmbeddingToMemory(memory: Memory): Promise<Memory>;

  // easy/compat wrappers
  getEntityById(entityId: UUID): Promise<Entity | null>;
  getRoom(roomId: UUID): Promise<Room | null>;
  createEntity(entity: Entity): Promise<boolean>;
  createRoom({ id, name, source, type, channelId, serverId, worldId }: Room): Promise<UUID>;
  addParticipant(entityId: UUID, roomId: UUID): Promise<boolean>;
  getRooms(worldId: UUID): Promise<Room[]>;

  /**
   * Registers a handler function responsible for sending messages to a specific source/platform.
   * @param source - The unique identifier string for the source (e.g., 'discord', 'telegram').
   * @param handler - The SendHandlerFunction to be called for this source.
   */
  registerSendHandler(source: string, handler: SendHandlerFunction): void;

  /**
   * Sends a message to a specified target using the appropriate registered handler.
   * @param target - Information describing the target recipient and platform.
   * @param content - The message content to send.
   * @returns Promise resolving when the message sending process is initiated or completed.
   */
  sendMessageToTarget(target: TargetInfo, content: Content): Promise<void>;

  // Added for PluginManagementService and runtime-extensions.ts
  getDataDir(): string;
  setSecureConfig(key: string, value: any): Promise<void>;
  getSecureConfig(key: string): Promise<any>;
  on(event: string, listener: (...args: any[]) => void): this; 
}

export interface Plugin {
  name: string;
  description: string;

  // Initialize plugin with runtime services
  init?: (config: Record<string, string>, runtime: IAgentRuntime) => Promise<void>;

  // Configuration
  config?: { [key: string]: any };

  services?: (typeof Service)[];

  // Entity component definitions
  componentTypes?: {
    name: string;
    schema: Record<string, unknown>;
    validator?: (data: any) => boolean;
  }[];

  // Optional plugin features
  actions?: Action[];
  providers?: Provider[];
  evaluators?: Evaluator[];
  adapter?: IDatabaseAdapter;
  models?: {
    [key: string]: (runtime: IAgentRuntime, params: any) => Promise<any>; 
  };
  events?: PluginEvents;
  routes?: Route[];
  tests?: TestSuite[];
  tasks?: TaskWorker[];

  priority?: number;
} 