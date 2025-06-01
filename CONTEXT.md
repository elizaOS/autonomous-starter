Old types.ts

import type { Readable } from "stream";

/**
 * Represents a UUID string in the format "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 */
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Represents the content of a message or communication
 */
export interface Content {
    /** The main text content */
    text: string;

    /** Optional action associated with the message */
    action?: string;

    /** Optional source/origin of the content */
    source?: string;

    /** URL of the original message/post (e.g. tweet URL, Discord message link) */
    url?: string;

    /** UUID of parent message if this is a reply/thread */
    inReplyTo?: UUID;

    /** Array of media attachments */
    attachments?: Media[];

    /** Additional dynamic properties */
    [key: string]: unknown;
}

/**
 * Example content with associated user for demonstration purposes
 */
export interface ActionExample {
    /** User associated with the example */
    user: string;

    /** Content of the example */
    content: Content;
}

/**
 * Example conversation content with user ID
 */
export interface ConversationExample {
    /** UUID of user in conversation */
    userId: UUID;

    /** Content of the conversation */
    content: Content;
}

/**
 * Represents an actor/participant in a conversation
 */
export interface Actor {
    /** Display name */
    name: string;

    /** Username/handle */
    username: string;

    /** Additional profile details */
    details: {
        /** Short profile tagline */
        tagline: string;

        /** Longer profile summary */
        summary: string;

        /** Favorite quote */
        quote: string;
    };

    /** Unique identifier */
    id: UUID;
}

/**
 * Represents a single objective within a goal
 */
export interface Objective {
    /** Optional unique identifier */
    id?: string;

    /** Description of what needs to be achieved */
    description: string;

    /** Whether objective is completed */
    completed: boolean;
}

/**
 * Status enum for goals
 */
export enum GoalStatus {
    DONE = "DONE",
    FAILED = "FAILED",
    IN_PROGRESS = "IN_PROGRESS",
}

/**
 * Represents a high-level goal composed of objectives
 */
export interface Goal {
    /** Optional unique identifier */
    id?: UUID;

    /** Room ID where goal exists */
    roomId: UUID;

    /** User ID of goal owner */
    userId: UUID;

    /** Name/title of the goal */
    name: string;

    /** Current status */
    status: GoalStatus;

    /** Component objectives */
    objectives: Objective[];
}

/**
 * Model size/type classification
 */
export enum ModelClass {
    SMALL = "small",
    MEDIUM = "medium",
    LARGE = "large",
    EMBEDDING = "embedding",
    IMAGE = "image",
}

/**
 * Model settings
 */
export type ModelSettings = {
    /** Model name */
    name: string;

    /** Maximum input tokens */
    maxInputTokens: number;

    /** Maximum output tokens */
    maxOutputTokens: number;

    /** Optional frequency penalty */
    frequency_penalty?: number;

    /** Optional presence penalty */
    presence_penalty?: number;

    /** Optional repetition penalty */
    repetition_penalty?: number;

    /** Stop sequences */
    stop: string[];

    /** Temperature setting */
    temperature: number;

    /** Optional telemetry configuration (experimental) */
    experimental_telemetry?: TelemetrySettings;
};

/** Image model settings */
export type ImageModelSettings = {
    name: string;
    steps?: number;
};

/** Embedding model settings */
export type EmbeddingModelSettings = {
    name: string;
    dimensions?: number;
};

/**
 * Configuration for an AI model
 */
export type Model = {
    /** Optional API endpoint */
    endpoint?: string;

    /** Model names by size class */
    model: {
        [ModelClass.SMALL]?: ModelSettings;
        [ModelClass.MEDIUM]?: ModelSettings;
        [ModelClass.LARGE]?: ModelSettings;
        [ModelClass.EMBEDDING]?: EmbeddingModelSettings;
        [ModelClass.IMAGE]?: ImageModelSettings;
    };
};

/**
 * Model configurations by provider
 */
export type Models = {
    [ModelProviderName.OPENAI]: Model;
};

/**
 * Available model providers
 */
export enum ModelProviderName {
    OPENAI = "openai",
}

/**
 * Represents the current state/context of a conversation
 */
export interface State {
    /** ID of user who sent current message */
    userId?: UUID;

    /** ID of agent in conversation */
    agentId?: UUID;

    /** Agent's biography */
    bio: string;

    /** Agent's background lore */
    lore: string;

    /** Message handling directions */
    messageDirections: string;

    /** Post handling directions */
    postDirections: string;

    /** Current room/conversation ID */
    roomId: UUID;

    /** Optional agent name */
    agentName?: string;

    /** Optional message sender name */
    senderName?: string;

    /** String representation of conversation actors */
    actors: string;

    /** Optional array of actor objects */
    actorsData?: Actor[];

    /** Optional string representation of goals */
    goals?: string;

    /** Optional array of goal objects */
    goalsData?: Goal[];

    /** Recent message history as string */
    recentMessages: string;

    /** Recent message objects */
    recentMessagesData: Memory[];

    /** Optional valid action names */
    actionNames?: string;

    /** Optional action descriptions */
    actions?: string;

    /** Optional action objects */
    actionsData?: Action[];

    /** Optional action examples */
    actionExamples?: string;

    /** Optional provider descriptions */
    providers?: string;

    /** Optional response content */
    responseData?: Content;

    /** Optional recent interaction objects */
    recentInteractionsData?: Memory[];

    /** Optional recent interactions string */
    recentInteractions?: string;

    /** Optional formatted conversation */
    formattedConversation?: string;

    /** Optional formatted knowledge */
    knowledge?: string;
    /** Optional knowledge data */
    knowledgeData?: KnowledgeItem[];
    /** Optional knowledge data */
    ragKnowledgeData?: RAGKnowledgeItem[];

    /** Additional dynamic properties */
    [key: string]: unknown;
}

/**
 * Represents a stored memory/message
 */
export interface Memory {
    /** Optional unique identifier */
    id?: UUID;

    /** Associated user ID */
    userId: UUID;

    /** Associated agent ID */
    agentId: UUID;

    /** Optional creation timestamp */
    createdAt?: number;

    /** Memory content */
    content: Content;

    /** Optional embedding vector */
    embedding?: number[];

    /** Associated room ID */
    roomId: UUID;

    /** Whether memory is unique */
    unique?: boolean;

    /** Embedding similarity score */
    similarity?: number;
}

/**
 * Example message for demonstration
 */
export interface MessageExample {
    /** Associated user */
    user: string;

    /** Message content */
    content: Content;
}

/**
 * Handler function type for processing messages
 */
export type Handler = (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
) => Promise<unknown>;

/**
 * Callback function type for handlers
 */
export type HandlerCallback = (
    response: Content,
    files?: any,
) => Promise<Memory[]>;

/**
 * Validator function type for actions/evaluators
 */
export type Validator = (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
) => Promise<boolean>;

/**
 * Represents an action the agent can perform
 */
export interface Action {
    /** Similar action descriptions */
    similes: string[];

    /** Detailed description */
    description: string;

    /** Example usages */
    examples: ActionExample[][];

    /** Handler function */
    handler: Handler;

    /** Action name */
    name: string;

    /** Validation function */
    validate: Validator;

    /** Whether to suppress the initial message when this action is used */
    suppressInitialMessage?: boolean;
}

/**
 * Example for evaluating agent behavior
 */
export interface EvaluationExample {
    /** Evaluation context */
    context: string;

    /** Example messages */
    messages: Array<ActionExample>;

    /** Expected outcome */
    outcome: string;
}

/**
 * Evaluator for assessing agent responses
 */
export interface Evaluator {
    /** Whether to always run */
    alwaysRun?: boolean;

    /** Detailed description */
    description: string;

    /** Similar evaluator descriptions */
    similes: string[];

    /** Example evaluations */
    examples: EvaluationExample[];

    /** Handler function */
    handler: Handler;

    /** Evaluator name */
    name: string;

    /** Validation function */
    validate: Validator;
}

/**
 * Provider for external data/services
 */
export interface Provider {
    /** Data retrieval function */
    get: (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
    ) => Promise<any>;
}

/**
 * Represents a relationship between users
 */
export interface Relationship {
    /** Unique identifier */
    id: UUID;

    /** First user ID */
    userA: UUID;

    /** Second user ID */
    userB: UUID;

    /** Primary user ID */
    userId: UUID;

    /** Associated room ID */
    roomId: UUID;

    /** Relationship status */
    status: string;

    /** Optional creation timestamp */
    createdAt?: string;
}

/**
 * Represents a user account
 */
export interface Account {
    /** Unique identifier */
    id: UUID;

    /** Display name */
    name: string;

    /** Username */
    username: string;

    /** Optional additional details */
    details?: { [key: string]: any };

    /** Optional email */
    email?: string;

    /** Optional avatar URL */
    avatarUrl?: string;
}

/**
 * Room participant with account details
 */
export interface Participant {
    /** Unique identifier */
    id: UUID;

    /** Associated account */
    account: Account;
}

/**
 * Represents a conversation room
 */
export interface Room {
    /** Unique identifier */
    id: UUID;

    /** Room participants */
    participants: Participant[];
}

/**
 * Represents a media attachment
 */
export type Media = {
    /** Unique identifier */
    id: string;

    /** Media URL */
    url: string;

    /** Media title */
    title: string;

    /** Media source */
    source: string;

    /** Media description */
    description: string;

    /** Text content */
    text: string;

    /** Content type */
    contentType?: string;
};

/**
 * Client instance
 */
export type ClientInstance = {
    /** Client name */
    // name: string;

    /** Stop client connection */
    stop: (runtime: IAgentRuntime) => Promise<unknown>;
};

/**
 * Client interface for platform connections
 */
export type Client = {
    /** Client name */
    name: string;

    /** Client configuration */
    config?: { [key: string]: any };

    /** Start client connection */
    start: (runtime: IAgentRuntime) => Promise<ClientInstance>;
};

/**
 * Database adapter initialization
 */
export type Adapter = {
    /** Initialize the adapter */
    init: (runtime: IAgentRuntime) => IDatabaseAdapter & IDatabaseCacheAdapter;
};

/**
 * Plugin for extending agent functionality
 */
export type Plugin = {
    /** Plugin name */
    name: string;

    /** Plugin npm name */
    npmName?: string;

    /** Plugin configuration */
    config?: { [key: string]: any };

    /** Plugin description */
    description: string;

    /** Optional actions */
    actions?: Action[];

    /** Optional providers */
    providers?: Provider[];

    /** Optional evaluators */
    evaluators?: Evaluator[];

    /** Optional services */
    services?: Service[];

    /** Optional clients */
    clients?: Client[];

    /** Optional adapters */
    adapters?: Adapter[];

    /** Optional post charactor processor handler */
    handlePostCharacterLoaded?: (char: Character) => Promise<Character>;
};

export interface IAgentConfig {
    [key: string]: string;
}

export type TelemetrySettings = {
    /**
     * Enable or disable telemetry. Disabled by default while experimental.
     */
    isEnabled?: boolean;
    /**
     * Enable or disable input recording. Enabled by default.
     *
     * You might want to disable input recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordInputs?: boolean;
    /**
     * Enable or disable output recording. Enabled by default.
     *
     * You might want to disable output recording to avoid recording sensitive
     * information, to reduce data transfers, or to increase performance.
     */
    recordOutputs?: boolean;
    /**
     * Identifier for this function. Used to group telemetry data by function.
     */
    functionId?: string;
};

export interface ModelConfiguration {
    temperature?: number;
    maxOutputTokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    maxInputTokens?: number;
    experimental_telemetry?: TelemetrySettings;
}

export type TemplateType = string | ((options: { state: State }) => string);

/**
 * Configuration for an agent character
 */
export type Character = {
    /** Optional unique identifier */
    id?: UUID;

    /** Character name */
    name: string;

    /** Optional username */
    username?: string;

    /** Optional email */
    email?: string;

    /** Optional system prompt */
    system?: string;

    /** Model provider to use */
    modelProvider: ModelProviderName;

    /** Image model provider to use, if different from modelProvider */
    imageModelProvider?: ModelProviderName;

    /** Image Vision model provider to use, if different from modelProvider */
    imageVisionModelProvider?: ModelProviderName;

    /** Optional model endpoint override */
    modelEndpointOverride?: string;

    /** Optional prompt templates */
    templates?: {
        goalsTemplate?: TemplateType;
        factsTemplate?: TemplateType;
        messageHandlerTemplate?: TemplateType;
        shouldRespondTemplate?: TemplateType;
        continueMessageHandlerTemplate?: TemplateType;
        evaluationTemplate?: TemplateType;
        twitterSearchTemplate?: TemplateType;
        twitterActionTemplate?: TemplateType;
        twitterPostTemplate?: TemplateType;
        twitterMessageHandlerTemplate?: TemplateType;
        twitterShouldRespondTemplate?: TemplateType;
        twitterVoiceHandlerTemplate?: TemplateType;
        instagramPostTemplate?: TemplateType;
        instagramMessageHandlerTemplate?: TemplateType;
        instagramShouldRespondTemplate?: TemplateType;
        farcasterPostTemplate?: TemplateType;
        lensPostTemplate?: TemplateType;
        farcasterMessageHandlerTemplate?: TemplateType;
        lensMessageHandlerTemplate?: TemplateType;
        farcasterShouldRespondTemplate?: TemplateType;
        lensShouldRespondTemplate?: TemplateType;
        telegramMessageHandlerTemplate?: TemplateType;
        telegramShouldRespondTemplate?: TemplateType;
        telegramAutoPostTemplate?: string;
        telegramPinnedMessageTemplate?: string;
        discordAutoPostTemplate?: string;
        discordAnnouncementHypeTemplate?: string;
        discordVoiceHandlerTemplate?: TemplateType;
        discordShouldRespondTemplate?: TemplateType;
        discordMessageHandlerTemplate?: TemplateType;
        slackMessageHandlerTemplate?: TemplateType;
        slackShouldRespondTemplate?: TemplateType;
        jeeterPostTemplate?: string;
        jeeterSearchTemplate?: string;
        jeeterInteractionTemplate?: string;
        jeeterMessageHandlerTemplate?: string;
        jeeterShouldRespondTemplate?: string;
        devaPostTemplate?: string;
    };

    /** Character biography */
    bio: string | string[];

    /** Character background lore */
    lore: string[];

    /** Example messages */
    messageExamples: MessageExample[][];

    /** Example posts */
    postExamples: string[];

    /** Known topics */
    topics: string[];

    /** Character traits */
    adjectives: string[];

    /** Optional knowledge base */
    knowledge?: (string | { path: string; shared?: boolean } | { directory: string; shared?: boolean })[];

    /** Available plugins */
    plugins: Plugin[];

    /** Character Processor Plugins */
    postProcessors?: Pick<Plugin, 'name' | 'description' | 'handlePostCharacterLoaded'>[];

    /** Optional configuration */
    settings?: {
        secrets?: { [key: string]: string };
        intiface?: boolean;
        imageSettings?: {
            steps?: number;
            width?: number;
            height?: number;
            cfgScale?: number;
            negativePrompt?: string;
            numIterations?: number;
            guidanceScale?: number;
            seed?: number;
            modelId?: string;
            jobId?: string;
            count?: number;
            stylePreset?: string;
            hideWatermark?: boolean;
            safeMode?: boolean;
        };
        voice?: {
            model?: string; // For VITS
            url?: string; // Legacy VITS support
            elevenlabs?: {
                // New structured ElevenLabs config
                voiceId: string;
                model?: string;
                stability?: string;
                similarityBoost?: string;
                style?: string;
                useSpeakerBoost?: string;
            };
        };
        model?: string;
        modelConfig?: ModelConfiguration;
        embeddingModel?: string;
        chains?: {
            evm?: any[];
            solana?: any[];
            [key: string]: any[];
        };
        transcription?: TranscriptionProvider;
        ragKnowledge?: boolean;
    };

    /** Optional client-specific config */
    clientConfig?: {
        discord?: {
            shouldIgnoreBotMessages?: boolean;
            shouldIgnoreDirectMessages?: boolean;
            shouldRespondOnlyToMentions?: boolean;
            messageSimilarityThreshold?: number;
            isPartOfTeam?: boolean;
            teamAgentIds?: string[];
            teamLeaderId?: string;
            teamMemberInterestKeywords?: string[];
            allowedChannelIds?: string[];
            autoPost?: {
                enabled?: boolean;
                monitorTime?: number;
                inactivityThreshold?: number;
                mainChannelId?: string;
                announcementChannelIds?: string[];
                minTimeBetweenPosts?: number;
            };
        };
        telegram?: {
            shouldIgnoreBotMessages?: boolean;
            shouldIgnoreDirectMessages?: boolean;
            shouldRespondOnlyToMentions?: boolean;
            shouldOnlyJoinInAllowedGroups?: boolean;
            allowedGroupIds?: string[];
            messageSimilarityThreshold?: number;
            isPartOfTeam?: boolean;
            teamAgentIds?: string[];
            teamLeaderId?: string;
            teamMemberInterestKeywords?: string[];
            autoPost?: {
                enabled?: boolean;
                monitorTime?: number;
                inactivityThreshold?: number;
                mainChannelId?: string;
                pinnedMessagesGroups?: string[];
                minTimeBetweenPosts?: number;
            };
        };
        slack?: {
            shouldIgnoreBotMessages?: boolean;
            shouldIgnoreDirectMessages?: boolean;
        };
        gitbook?: {
            keywords?: {
                projectTerms?: string[];
                generalQueries?: string[];
            };
            documentTriggers?: string[];
        };
    };

    /** Writing style guides */
    style: {
        all: string[];
        chat: string[];
        post: string[];
    };

    /** Optional Twitter profile */
    twitterProfile?: {
        id: string;
        username: string;
        screenName: string;
        bio: string;
        nicknames?: string[];
    };

    /** Optional Instagram profile */
    instagramProfile?: {
        id: string;
        username: string;
        bio: string;
        nicknames?: string[];
    };

    /** Optional SimsAI profile */
    simsaiProfile?: {
        id: string;
        username: string;
        screenName: string;
        bio: string;
    };

    /** Optional NFT prompt */
    nft?: {
        prompt: string;
    };

    /**Optinal Parent characters to inherit information from */
    extends?: string[];

    twitterSpaces?: TwitterSpaceDecisionOptions;
};

export interface TwitterSpaceDecisionOptions {
    maxSpeakers?: number;
    topics?: string[];
    typicalDurationMinutes?: number;
    idleKickTimeoutMs?: number;
    minIntervalBetweenSpacesMinutes?: number;
    businessHoursOnly?: boolean;
    randomChance?: number;
    enableIdleMonitor?: boolean;
    enableSttTts?: boolean;
    enableRecording?: boolean;
    voiceId?: string;
    sttLanguage?: string;
    speakerMaxDurationMs?: number;
}

/**
 * Interface for database operations
 */
export interface IDatabaseAdapter {
    /** Database instance */
    db: any;

    /** Optional initialization */
    init(): Promise<void>;

    /** Close database connection */
    close(): Promise<void>;

    /** Get account by ID */
    getAccountById(userId: UUID): Promise<Account | null>;

    /** Create new account */
    createAccount(account: Account): Promise<boolean>;

    /** Get memories matching criteria */
    getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]>;

    getMemoryById(id: UUID): Promise<Memory | null>;

    getMemoriesByIds(ids: UUID[], tableName?: string): Promise<Memory[]>;

    getMemoriesByRoomIds(params: {
        tableName: string;
        agentId: UUID;
        roomIds: UUID[];
        limit?: number;
    }): Promise<Memory[]>;

    getCachedEmbeddings(params: {
        query_table_name: string;
        query_threshold: number;
        query_input: string;
        query_field_name: string;
        query_field_sub_name: string;
        query_match_count: number;
    }): Promise<{ embedding: number[]; levenshtein_score: number }[]>;

    log(params: {
        body: { [key: string]: unknown };
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void>;

    getActorDetails(params: { roomId: UUID }): Promise<Actor[]>;

    searchMemories(params: {
        tableName: string;
        agentId: UUID;
        roomId: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Memory[]>;

    updateGoalStatus(params: {
        goalId: UUID;
        status: GoalStatus;
    }): Promise<void>;

    searchMemoriesByEmbedding(
        embedding: number[],
        params: {
            match_threshold?: number;
            count?: number;
            roomId?: UUID;
            agentId?: UUID;
            unique?: boolean;
            tableName: string;
        },
    ): Promise<Memory[]>;

    createMemory(
        memory: Memory,
        tableName: string,
        unique?: boolean,
    ): Promise<void>;

    removeMemory(memoryId: UUID, tableName: string): Promise<void>;

    removeAllMemories(roomId: UUID, tableName: string): Promise<void>;

    countMemories(
        roomId: UUID,
        unique?: boolean,
        tableName?: string,
    ): Promise<number>;

    getGoals(params: {
        agentId: UUID;
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number;
    }): Promise<Goal[]>;

    updateGoal(goal: Goal): Promise<void>;

    createGoal(goal: Goal): Promise<void>;

    removeGoal(goalId: UUID): Promise<void>;

    removeAllGoals(roomId: UUID): Promise<void>;

    getRoom(roomId: UUID): Promise<UUID | null>;

    createRoom(roomId?: UUID): Promise<UUID>;

    removeRoom(roomId: UUID): Promise<void>;

    getRoomsForParticipant(userId: UUID): Promise<UUID[]>;

    getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]>;

    addParticipant(userId: UUID, roomId: UUID): Promise<boolean>;

    removeParticipant(userId: UUID, roomId: UUID): Promise<boolean>;

    getParticipantsForAccount(userId: UUID): Promise<Participant[]>;

    getParticipantsForRoom(roomId: UUID): Promise<UUID[]>;

    getParticipantUserState(
        roomId: UUID,
        userId: UUID,
    ): Promise<"FOLLOWED" | "MUTED" | null>;

    setParticipantUserState(
        roomId: UUID,
        userId: UUID,
        state: "FOLLOWED" | "MUTED" | null,
    ): Promise<void>;

    createRelationship(params: { userA: UUID; userB: UUID }): Promise<boolean>;

    getRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<Relationship | null>;

    getRelationships(params: { userId: UUID }): Promise<Relationship[]>;

    getKnowledge(params: {
        id?: UUID;
        agentId: UUID;
        limit?: number;
        query?: string;
        conversationContext?: string;
    }): Promise<RAGKnowledgeItem[]>;

    searchKnowledge(params: {
        agentId: UUID;
        embedding: Float32Array;
        match_threshold: number;
        match_count: number;
        searchText?: string;
    }): Promise<RAGKnowledgeItem[]>;

    createKnowledge(knowledge: RAGKnowledgeItem): Promise<void>;
    removeKnowledge(id: UUID): Promise<void>;
    clearKnowledge(agentId: UUID, shared?: boolean): Promise<void>;
}

export interface IDatabaseCacheAdapter {
    getCache(params: {
        agentId: UUID;
        key: string;
    }): Promise<string | undefined>;

    setCache(params: {
        agentId: UUID;
        key: string;
        value: string;
    }): Promise<boolean>;

    deleteCache(params: { agentId: UUID; key: string }): Promise<boolean>;
}

export interface IMemoryManager {
    runtime: IAgentRuntime;
    tableName: string;
    constructor: Function;

    addEmbeddingToMemory(memory: Memory): Promise<Memory>;

    getMemories(opts: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        start?: number;
        end?: number;
    }): Promise<Memory[]>;

    getCachedEmbeddings(
        content: string,
    ): Promise<{ embedding: number[]; levenshtein_score: number }[]>;

    getMemoriesByIds(ids: UUID[]): Promise<Memory[]>;
    getMemoryById(id: UUID): Promise<Memory | null>;
    getMemoriesByRoomIds(params: {
        roomIds: UUID[];
        limit?: number;
    }): Promise<Memory[]>;
    searchMemoriesByEmbedding(
        embedding: number[],
        opts: {
            match_threshold?: number;
            count?: number;
            roomId: UUID;
            unique?: boolean;
        },
    ): Promise<Memory[]>;

    createMemory(memory: Memory, unique?: boolean): Promise<void>;

    removeMemory(memoryId: UUID): Promise<void>;

    removeAllMemories(roomId: UUID): Promise<void>;

    countMemories(roomId: UUID, unique?: boolean): Promise<number>;
}

export interface IRAGKnowledgeManager {
    runtime: IAgentRuntime;
    tableName: string;

    getKnowledge(params: {
        query?: string;
        id?: UUID;
        limit?: number;
        conversationContext?: string;
        agentId?: UUID;
    }): Promise<RAGKnowledgeItem[]>;
    createKnowledge(item: RAGKnowledgeItem): Promise<void>;
    removeKnowledge(id: UUID): Promise<void>;
    searchKnowledge(params: {
        agentId: UUID;
        embedding: Float32Array | number[];
        match_threshold?: number;
        match_count?: number;
        searchText?: string;
    }): Promise<RAGKnowledgeItem[]>;
    clearKnowledge(shared?: boolean): Promise<void>;
    processFile(file: {
        path: string;
        content: string;
        type: "pdf" | "md" | "txt";
        isShared: boolean;
    }): Promise<void>;
    cleanupDeletedKnowledgeFiles(): Promise<void>;
    generateScopedId(path: string, isShared: boolean): UUID;
}

export type CacheOptions = {
    expires?: number;
};

export enum CacheStore {
    REDIS = "redis",
    DATABASE = "database",
    FILESYSTEM = "filesystem",
}

export interface ICacheManager {
    get<T = unknown>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    delete(key: string): Promise<void>;
}

export abstract class Service {
    private static instance: Service | null = null;

    static get serviceType(): ServiceType {
        throw new Error("Service must implement static serviceType getter");
    }

    public static getInstance<T extends Service>(): T {
        if (!Service.instance) {
            Service.instance = new (this as any)();
        }
        return Service.instance as T;
    }

    get serviceType(): ServiceType {
        return (this.constructor as typeof Service).serviceType;
    }

    // Add abstract initialize method that must be implemented by derived classes
    abstract initialize(runtime: IAgentRuntime): Promise<void>;
}

export interface IAgentRuntime {
    // Properties
    agentId: UUID;
    serverUrl: string;
    databaseAdapter: IDatabaseAdapter;
    token: string | null;
    modelProvider: ModelProviderName;
    imageModelProvider: ModelProviderName;
    imageVisionModelProvider: ModelProviderName;
    character: Character;
    providers: Provider[];
    actions: Action[];
    evaluators: Evaluator[];
    plugins: Plugin[];

    fetch?: typeof fetch | null;

    messageManager: IMemoryManager;
    descriptionManager: IMemoryManager;
    documentsManager: IMemoryManager;
    knowledgeManager: IMemoryManager;
    ragKnowledgeManager: IRAGKnowledgeManager;
    loreManager: IMemoryManager;

    cacheManager: ICacheManager;

    services: Map<ServiceType, Service>;
    clients: ClientInstance[];

    // verifiableInferenceAdapter?: IVerifiableInferenceAdapter | null;

    initialize(): Promise<void>;

    registerMemoryManager(manager: IMemoryManager): void;

    getMemoryManager(name: string): IMemoryManager | null;

    getService<T extends Service>(service: ServiceType): T | null;

    registerService(service: Service): void;

    getSetting(key: string): string | null;

    // Methods
    getConversationLength(): number;

    processActions(
        message: Memory,
        responses: Memory[],
        state?: State,
        callback?: HandlerCallback,
    ): Promise<void>;

    evaluate(
        message: Memory,
        state?: State,
        didRespond?: boolean,
        callback?: HandlerCallback,
    ): Promise<string[] | null>;

    ensureParticipantExists(userId: UUID, roomId: UUID): Promise<void>;

    ensureUserExists(
        userId: UUID,
        userName: string | null,
        name: string | null,
        source: string | null,
    ): Promise<void>;

    registerAction(action: Action): void;

    ensureConnection(
        userId: UUID,
        roomId: UUID,
        userName?: string,
        userScreenName?: string,
        source?: string,
    ): Promise<void>;

    ensureParticipantInRoom(userId: UUID, roomId: UUID): Promise<void>;

    ensureRoomExists(roomId: UUID): Promise<void>;

    composeState(
        message: Memory,
        additionalKeys?: { [key: string]: unknown },
    ): Promise<State>;

    updateRecentMessageState(state: State): Promise<State>;
}

export interface IImageDescriptionService extends Service {
    describeImage(
        imageUrl: string,
    ): Promise<{ title: string; description: string }>;
}

export interface ITranscriptionService extends Service {
    transcribeAttachment(audioBuffer: ArrayBuffer): Promise<string | null>;
    transcribeAttachmentLocally(
        audioBuffer: ArrayBuffer,
    ): Promise<string | null>;
    transcribe(audioBuffer: ArrayBuffer): Promise<string | null>;
    transcribeLocally(audioBuffer: ArrayBuffer): Promise<string | null>;
}

export interface IVideoService extends Service {
    isVideoUrl(url: string): boolean;
    fetchVideoInfo(url: string): Promise<Media>;
    downloadVideo(videoInfo: Media): Promise<string>;
    processVideo(url: string, runtime: IAgentRuntime): Promise<Media>;
}

export interface ITextGenerationService extends Service {
    initializeModel(): Promise<void>;
    queueMessageCompletion(
        context: string,
        temperature: number,
        stop: string[],
        frequency_penalty: number,
        presence_penalty: number,
        max_tokens: number,
    ): Promise<any>;
    queueTextCompletion(
        context: string,
        temperature: number,
        stop: string[],
        frequency_penalty: number,
        presence_penalty: number,
        max_tokens: number,
    ): Promise<string>;
    getEmbeddingResponse(input: string): Promise<number[] | undefined>;
}

export interface IBrowserService extends Service {
    closeBrowser(): Promise<void>;
    getPageContent(
        url: string,
        runtime: IAgentRuntime,
    ): Promise<{ title: string; description: string; bodyContent: string }>;
}

export interface ISpeechService extends Service {
    getInstance(): ISpeechService;
    generate(runtime: IAgentRuntime, text: string): Promise<Readable>;
}

export interface IPdfService extends Service {
    getInstance(): IPdfService;
    convertPdfToText(pdfBuffer: Buffer): Promise<string>;
}

export interface IAwsS3Service extends Service {
    uploadFile(
        imagePath: string,
        subDirectory: string,
        useSignedUrl: boolean,
        expiresIn: number,
    ): Promise<{
        success: boolean;
        url?: string;
        error?: string;
    }>;
    generateSignedUrl(fileName: string, expiresIn: number): Promise<string>;
}

export interface UploadIrysResult {
    success: boolean;
    url?: string;
    error?: string;
    data?: any;
}

export interface DataIrysFetchedFromGQL {
    success: boolean;
    data: any;
    error?: string;
}

export interface GraphQLTag {
    name: string;
    values: any[];
}

export enum IrysMessageType {
    REQUEST = "REQUEST",
    DATA_STORAGE = "DATA_STORAGE",
    REQUEST_RESPONSE = "REQUEST_RESPONSE",
}

export enum IrysDataType {
    FILE = "FILE",
    IMAGE = "IMAGE",
    OTHER = "OTHER",
}

export interface IrysTimestamp {
    from: number;
    to: number;
}

export interface IIrysService extends Service {
    getDataFromAnAgent(
        agentsWalletPublicKeys: string[],
        tags: GraphQLTag[],
        timestamp: IrysTimestamp,
    ): Promise<DataIrysFetchedFromGQL>;
    workerUploadDataOnIrys(
        data: any,
        dataType: IrysDataType,
        messageType: IrysMessageType,
        serviceCategory: string[],
        protocol: string[],
        validationThreshold: number[],
        minimumProviders: number[],
        testProvider: boolean[],
        reputation: number[],
    ): Promise<UploadIrysResult>;
    providerUploadDataOnIrys(
        data: any,
        dataType: IrysDataType,
        serviceCategory: string[],
        protocol: string[],
    ): Promise<UploadIrysResult>;
}

export interface ITeeLogService extends Service {
    getInstance(): ITeeLogService;
    log(
        agentId: string,
        roomId: string,
        userId: string,
        type: string,
        content: string,
    ): Promise<boolean>;
}

export enum ServiceType {
    IMAGE_DESCRIPTION = "image_description",
    TRANSCRIPTION = "transcription",
    VIDEO = "video",
    TEXT_GENERATION = "text_generation",
    BROWSER = "browser",
    SPEECH_GENERATION = "speech_generation",
    PDF = "pdf",
    INTIFACE = "intiface",
    AWS_S3 = "aws_s3",
    BUTTPLUG = "buttplug",
    SLACK = "slack",
    VERIFIABLE_LOGGING = "verifiable_logging",
    IRYS = "irys",
    TEE_LOG = "tee_log",
    GOPLUS_SECURITY = "goplus_security",
    WEB_SEARCH = "web_search",
    EMAIL_AUTOMATION = "email_automation",
    NKN_CLIENT_SERVICE = "nkn_client_service",
}

export enum LoggingLevel {
    DEBUG = "debug",
    VERBOSE = "verbose",
    NONE = "none",
}

export type KnowledgeItem = {
    id: UUID;
    content: Content;
};

export interface RAGKnowledgeItem {
    id: UUID;
    agentId: UUID;
    content: {
        text: string;
        metadata?: {
            isMain?: boolean;
            isChunk?: boolean;
            originalId?: UUID;
            chunkIndex?: number;
            source?: string;
            type?: string;
            isShared?: boolean;
            [key: string]: unknown;
        };
    };
    embedding?: Float32Array;
    createdAt?: number;
    similarity?: number;
    score?: number;
}

export interface ActionResponse {
    like: boolean;
    retweet: boolean;
    quote?: boolean;
    reply?: boolean;
}

export interface ISlackService extends Service {
    client: any;
}

export enum TokenizerType {
    Auto = "auto",
    TikToken = "tiktoken",
}

export enum TranscriptionProvider {
    OpenAI = "openai",
    Deepgram = "deepgram",
    Local = "local",
}

export enum ActionTimelineType {
    ForYou = "foryou",
    Following = "following",
}
export enum KnowledgeScope {
    SHARED = "shared",
    PRIVATE = "private",
}

export enum CacheKeyPrefix {
    KNOWLEDGE = "knowledge",
}

export interface DirectoryItem {
    directory: string;
    shared?: boolean;
}

export interface ChunkRow {
    id: string;
    // Add other properties if needed
}

New types.ts

import { type Pool as PgPool } from 'pg';
import { PGlite } from '@electric-sql/pglite';

/**
 * Type definition for a Universally Unique Identifier (UUID) using a specific format.
 * @typedef {`${string}-${string}-${string}-${string}-${string}`} UUID
 */
/**
 * Defines a custom type UUID representing a universally unique identifier
 */
export type UUID = `${string}-${string}-${string}-${string}-${string}`;

/**
 * Helper function to safely cast a string to strongly typed UUID
 * @param id The string UUID to validate and cast
 * @returns The same UUID with branded type information
 */
export function asUUID(id: string): UUID {
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`Invalid UUID format: ${id}`);
  }
  return id as UUID;
}

/**
 * Represents the content of a memory, message, or other information
 */
export interface Content {
  /** The agent's internal thought process */
  thought?: string;

  /** The main text content visible to users */
  text?: string;

  /** Optional actions to be performed */
  actions?: string[];

  /** Optional providers to use for context generation */
  providers?: string[];

  /** Optional source/origin of the content */
  source?: string;

  /** URL of the original message/post (e.g. tweet URL, Discord message link) */
  url?: string;

  /** UUID of parent message if this is a reply/thread */
  inReplyTo?: UUID;

  /** Array of media attachments */
  attachments?: Media[];

  /**
   * Additional dynamic properties
   * Use specific properties above instead of this when possible
   */
  [key: string]: unknown;
}

/**
 * Example content with associated user for demonstration purposes
 */
export interface ActionExample {
  /** User associated with the example */
  name: string;

  /** Content of the example */
  content: Content;
}

export type ModelTypeName = (typeof ModelType)[keyof typeof ModelType] | string;

/**
 * Defines the recognized types of models that the agent runtime can use.
 * These include models for text generation (small, large, reasoning, completion),
 * text embedding, tokenization (encode/decode), image generation and description,
 * audio transcription, text-to-speech, and generic object generation.
 * This constant is used throughout the system, particularly in `AgentRuntime.useModel`,
 * `AgentRuntime.registerModel`, and in `ModelParamsMap` / `ModelResultMap` to ensure
 * type safety and clarity when working with different AI models.
 * String values are used for extensibility with custom model types.
 */
export const ModelType = {
  SMALL: 'TEXT_SMALL', // kept for backwards compatibility
  MEDIUM: 'TEXT_LARGE', // kept for backwards compatibility
  LARGE: 'TEXT_LARGE', // kept for backwards compatibility
  TEXT_SMALL: 'TEXT_SMALL',
  TEXT_LARGE: 'TEXT_LARGE',
  TEXT_EMBEDDING: 'TEXT_EMBEDDING',
  TEXT_TOKENIZER_ENCODE: 'TEXT_TOKENIZER_ENCODE',
  TEXT_TOKENIZER_DECODE: 'TEXT_TOKENIZER_DECODE',
  TEXT_REASONING_SMALL: 'REASONING_SMALL',
  TEXT_REASONING_LARGE: 'REASONING_LARGE',
  TEXT_COMPLETION: 'TEXT_COMPLETION',
  IMAGE: 'IMAGE',
  IMAGE_DESCRIPTION: 'IMAGE_DESCRIPTION',
  TRANSCRIPTION: 'TRANSCRIPTION',
  TEXT_TO_SPEECH: 'TEXT_TO_SPEECH',
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  OBJECT_SMALL: 'OBJECT_SMALL',
  OBJECT_LARGE: 'OBJECT_LARGE',
} as const;

/**
 * Core service type registry that can be extended by plugins via module augmentation.
 * Plugins can extend this interface to add their own service types:
 *
 * @example
 * ```typescript
 * declare module '@elizaos/core' {
 *   interface ServiceTypeRegistry {
 *     MY_CUSTOM_SERVICE: 'my_custom_service';
 *   }
 * }
 * ```
 */
export interface ServiceTypeRegistry {
  TRANSCRIPTION: 'transcription';
  VIDEO: 'video';
  BROWSER: 'browser';
  PDF: 'pdf';
  REMOTE_FILES: 'aws_s3';
  WEB_SEARCH: 'web_search';
  EMAIL: 'email';
  TEE: 'tee';
  TASK: 'task';
  INSTRUMENTATION: 'instrumentation';
}

/**
 * Type for service names that includes both core services and any plugin-registered services
 */
export type ServiceTypeName = ServiceTypeRegistry[keyof ServiceTypeRegistry];

/**
 * Helper type to extract service type values from the registry
 */
export type ServiceTypeValue<K extends keyof ServiceTypeRegistry> = ServiceTypeRegistry[K];

/**
 * Helper type to check if a service type exists in the registry
 */
export type IsValidServiceType<T extends string> = T extends ServiceTypeName ? true : false;

/**
 * Type-safe service class definition
 */
export type TypedServiceClass<T extends ServiceTypeName> = {
  new (runtime?: IAgentRuntime): Service;
  serviceType: T;
  start(runtime: IAgentRuntime): Promise<Service>;
};

/**
 * Map of service type names to their implementation classes
 */
export interface ServiceClassMap {
  // Core services will be added here, plugins extend via module augmentation
}

/**
 * Helper to infer service instance type from service type name
 */
export type ServiceInstance<T extends ServiceTypeName> = T extends keyof ServiceClassMap
  ? InstanceType<ServiceClassMap[T]>
  : Service;

/**
 * Runtime service registry type
 */
export type ServiceRegistry<T extends ServiceTypeName = ServiceTypeName> = Map<T, Service>;

/**
 * Enumerates the recognized types of services that can be registered and used by the agent runtime.
 * Services provide specialized functionalities like audio transcription, video processing,
 * web browsing, PDF handling, file storage (e.g., AWS S3), web search, email integration,
 * secure execution via TEE (Trusted Execution Environment), task management, and instrumentation.
 * This constant is used in `AgentRuntime` for service registration and retrieval (e.g., `getService`).
 * Each service typically implements the `Service` abstract class or a more specific interface like `IVideoService`.
 */
export const ServiceType = {
  TRANSCRIPTION: 'transcription',
  VIDEO: 'video',
  BROWSER: 'browser',
  PDF: 'pdf',
  REMOTE_FILES: 'aws_s3',
  WEB_SEARCH: 'web_search',
  EMAIL: 'email',
  TEE: 'tee',
  TASK: 'task',
  INSTRUMENTATION: 'instrumentation',
} as const satisfies ServiceTypeRegistry;

/**
 * Represents the current state or context of a conversation or agent interaction.
 * This interface is a flexible container for various pieces of information that define the agent's
 * understanding at a point in time. It includes:
 * - `values`: A key-value store for general state variables, often populated by providers.
 * - `data`: Another key-value store, potentially for more structured or internal data.
 * - `text`: A string representation of the current context, often a summary or concatenated history.
 * The `[key: string]: any;` allows for dynamic properties, though `EnhancedState` offers better typing.
 * This state object is passed to handlers for actions, evaluators, and providers.
 */
export interface State {
  /** Additional dynamic properties */
  [key: string]: any;
  values: {
    [key: string]: any;
  };
  data: {
    [key: string]: any;
  };
  text: string;
}

/**
 * Memory type enumeration for built-in memory types
 */
export type MemoryTypeAlias = string;

/**
 * Enumerates the built-in types of memories that can be stored and retrieved.
 * - `DOCUMENT`: Represents a whole document or a large piece of text.
 * - `FRAGMENT`: A chunk or segment of a `DOCUMENT`, often created for embedding and search.
 * - `MESSAGE`: A conversational message, typically from a user or the agent.
 * - `DESCRIPTION`: A descriptive piece of information, perhaps about an entity or concept.
 * - `CUSTOM`: For any other type of memory not covered by the built-in types.
 * This enum is used in `MemoryMetadata` to categorize memories and influences how they are processed or queried.
 */
export enum MemoryType {
  DOCUMENT = 'document',
  FRAGMENT = 'fragment',
  MESSAGE = 'message',
  DESCRIPTION = 'description',
  CUSTOM = 'custom',
}
/**
 * Defines the scope of a memory, indicating its visibility and accessibility.
 * - `shared`: The memory is accessible to multiple entities or across different contexts (e.g., a public fact).
 * - `private`: The memory is specific to a single entity or a private context (e.g., a user's personal preference).
 * - `room`: The memory is scoped to a specific room or channel.
 * This is used in `MemoryMetadata` to control how memories are stored and retrieved based on context.
 */
export type MemoryScope = 'shared' | 'private' | 'room';

/**
 * Base interface for all memory metadata types.
 * It includes common properties for all memories, such as:
 * - `type`: The kind of memory (e.g., `MemoryType.MESSAGE`, `MemoryType.DOCUMENT`).
 * - `source`: An optional string indicating the origin of the memory (e.g., 'discord', 'user_input').
 * - `sourceId`: An optional UUID linking to a source entity or object.
 * - `scope`: The visibility scope of the memory (`shared`, `private`, or `room`).
 * - `timestamp`: An optional numerical timestamp (e.g., milliseconds since epoch) of when the memory was created or relevant.
 * - `tags`: Optional array of strings for categorizing or filtering memories.
 * Specific metadata types like `DocumentMetadata` or `MessageMetadata` extend this base.
 */
export interface BaseMetadata {
  type: MemoryTypeAlias;
  source?: string;
  sourceId?: UUID;
  scope?: MemoryScope;
  timestamp?: number;
  tags?: string[];
}

export interface DocumentMetadata extends BaseMetadata {
  type: MemoryType.DOCUMENT;
}

export interface FragmentMetadata extends BaseMetadata {
  type: MemoryType.FRAGMENT;
  documentId: UUID;
  position: number;
}

export interface MessageMetadata extends BaseMetadata {
  type: MemoryType.MESSAGE;
}

export interface DescriptionMetadata extends BaseMetadata {
  type: MemoryType.DESCRIPTION;
}

export interface CustomMetadata extends BaseMetadata {
  [key: string]: unknown;
}

export type MemoryMetadata =
  | DocumentMetadata
  | FragmentMetadata
  | MessageMetadata
  | DescriptionMetadata
  | CustomMetadata;

/**
 * Represents a stored memory/message
 */
export interface Memory {
  /** Optional unique identifier */
  id?: UUID;

  /** Associated user ID */
  entityId: UUID;

  /** Associated agent ID */
  agentId?: UUID;

  /** Optional creation timestamp in milliseconds since epoch */
  createdAt?: number;

  /** Memory content */
  content: Content;

  /** Optional embedding vector for semantic search */
  embedding?: number[];

  /** Associated room ID */
  roomId: UUID;

  /** Associated world ID (optional) */
  worldId?: UUID;

  /** Whether memory is unique (used to prevent duplicates) */
  unique?: boolean;

  /** Embedding similarity score (set when retrieved via search) */
  similarity?: number;

  /** Metadata for the memory */
  metadata?: MemoryMetadata;
}

/**
 * Represents a log entry
 */
export interface Log {
  /** Optional unique identifier */
  id?: UUID;

  /** Associated entity ID */
  entityId: UUID;

  /** Associated room ID */
  roomId?: UUID;

  /** Log body */
  body: { [key: string]: unknown };

  /** Log type */
  type: string;

  /** Log creation timestamp */
  createdAt: Date;
}

/**
 * Example message for demonstration
 */
export interface MessageExample {
  /** Associated user */
  name: string;

  /** Message content */
  content: Content;
}

/**
 * Handler function type for processing messages
 */
export type Handler = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State,
  options?: { [key: string]: unknown },
  callback?: HandlerCallback,
  responses?: Memory[]
) => Promise<unknown>;

/**
 * Callback function type for handlers
 */
export type HandlerCallback = (response: Content, files?: any) => Promise<Memory[]>;

/**
 * Validator function type for actions/evaluators
 */
export type Validator = (
  runtime: IAgentRuntime,
  message: Memory,
  state?: State
) => Promise<boolean>;

/**
 * Represents an action the agent can perform
 */
export interface Action {
  /** Similar action descriptions */
  similes?: string[];

  /** Detailed description */
  description: string;

  /** Example usages */
  examples?: ActionExample[][];

  /** Handler function */
  handler: Handler;

  /** Action name */
  name: string;

  /** Validation function */
  validate: Validator;
}

/**
 * Example for evaluating agent behavior
 */
export interface EvaluationExample {
  /** Evaluation context */
  prompt: string;

  /** Example messages */
  messages: Array<ActionExample>;

  /** Expected outcome */
  outcome: string;
}

/**
 * Evaluator for assessing agent responses
 */
export interface Evaluator {
  /** Whether to always run */
  alwaysRun?: boolean;

  /** Detailed description */
  description: string;

  /** Similar evaluator descriptions */
  similes?: string[];

  /** Example evaluations */
  examples: EvaluationExample[];

  /** Handler function */
  handler: Handler;

  /** Evaluator name */
  name: string;

  /** Validation function */
  validate: Validator;
}

export interface ProviderResult {
  values?: {
    [key: string]: any;
  };
  data?: {
    [key: string]: any;
  };
  text?: string;
}

/**
 * Provider for external data/services
 */
export interface Provider {
  /** Provider name */
  name: string;

  /** Description of the provider */
  description?: string;

  /** Whether the provider is dynamic */
  dynamic?: boolean;

  /** Position of the provider in the provider list, positive or negative */
  position?: number;

  /**
   * Whether the provider is private
   *
   * Private providers are not displayed in the regular provider list, they have to be called explicitly
   */
  private?: boolean;

  /** Data retrieval function */
  get: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<ProviderResult>;
}

/**
 * Represents a relationship between users
 */
export interface Relationship {
  /** Unique identifier */
  id: UUID;

  /** First user ID */
  sourceEntityId: UUID;

  /** Second user ID */
  targetEntityId: UUID;

  /** Agent ID */
  agentId: UUID;

  /** Tags for filtering/categorizing relationships */
  tags: string[];

  /** Additional metadata about the relationship */
  metadata: {
    [key: string]: any;
  };

  /** Optional creation timestamp */
  createdAt?: string;
}

export interface Component {
  id: UUID;
  entityId: UUID;
  agentId: UUID;
  roomId: UUID;
  worldId: UUID;
  sourceEntityId: UUID;
  type: string;
  createdAt: number;
  data: {
    [key: string]: any;
  };
}

/**
 * Represents a user account
 */
export interface Entity {
  /** Unique identifier, optional on creation */
  id?: UUID;

  /** Names of the entity */
  names: string[];

  /** Optional additional metadata */
  metadata?: { [key: string]: any };

  /** Agent ID this account is related to, for agents should be themselves */
  agentId: UUID;

  /** Optional array of components */
  components?: Component[];
}

export type World = {
  id: UUID;
  name?: string;
  agentId: UUID;
  serverId: string;
  metadata?: {
    ownership?: {
      ownerId: string;
    };
    roles?: {
      [entityId: UUID]: Role;
    };
    [key: string]: unknown;
  };
};

export type RoomMetadata = Record<string, unknown>;

export type Room = {
  id: UUID;
  name?: string;
  agentId?: UUID;
  source: string;
  type: ChannelType;
  channelId?: string;
  serverId?: string;
  worldId?: UUID;
  metadata?: RoomMetadata;
};

/**
 * Room participant with account details
 */
export interface Participant {
  /** Unique identifier */
  id: UUID;

  /** Associated account */
  entity: Entity;
}

/**
 * Represents a media attachment
 */
export type Media = {
  /** Unique identifier */
  id: string;

  /** Media URL */
  url: string;

  /** Media title */
  title: string;

  /** Media source */
  source: string;

  /** Media description */
  description: string;

  /** Text content */
  text: string;

  /** Content type */
  contentType?: string;
};

export enum ChannelType {
  SELF = 'SELF', // Messages to self
  DM = 'dm', // Direct messages between two participants
  GROUP = 'group', // Group messages with multiple participants
  VOICE_DM = 'VOICE_DM', // Voice direct messages
  VOICE_GROUP = 'VOICE_GROUP', // Voice channels with multiple participants
  FEED = 'FEED', // Social media feed
  THREAD = 'THREAD', // Threaded conversation
  WORLD = 'WORLD', // World channel
  FORUM = 'FORUM', // Forum discussion
  // Legacy types - kept for backward compatibility but should be replaced
  API = 'API', // @deprecated - Use DM or GROUP instead
}

/**
 * Client instance
 */
export abstract class Service {
  /** Runtime instance */
  protected runtime!: IAgentRuntime;

  constructor(runtime?: IAgentRuntime) {
    if (runtime) {
      this.runtime = runtime;
    }
  }

  abstract stop(): Promise<void>;

  /** Service type */
  static serviceType: string;

  /** Service name */
  abstract capabilityDescription: string;

  /** Service configuration */
  config?: { [key: string]: any };

  /** Start service connection */
  static async start(_runtime: IAgentRuntime): Promise<Service> {
    throw new Error('Not implemented');
  }

  /** Stop service connection */
  static async stop(_runtime: IAgentRuntime): Promise<unknown> {
    throw new Error('Not implemented');
  }
}

export type Route = {
  type: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'STATIC';
  path: string;
  filePath?: string;
  public?: boolean;
  name?: string extends { public: true } ? string : string | undefined;
  handler?: (req: any, res: any, runtime: IAgentRuntime) => Promise<void>;
};

/**
 * Plugin for extending agent functionality
 */

export type PluginEvents = {
  [K in keyof EventPayloadMap]?: EventHandler<K>[];
} & {
  [key: string]: ((params: EventPayload) => Promise<any>)[];
};

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
    [key: string]: (...args: any[]) => Promise<any>;
  };
  events?: PluginEvents;
  routes?: Route[];
  tests?: TestSuite[];

  priority?: number;
}

export interface ProjectAgent {
  character: Character;
  init?: (runtime: IAgentRuntime) => Promise<void>;
  plugins?: Plugin[];
  tests?: TestSuite | TestSuite[];
}

export interface Project {
  agents: ProjectAgent[];
}

export type TemplateType =
  | string
  | ((options: { state: State | { [key: string]: string } }) => string);

/**
 * Configuration for an agent's character, defining its personality, knowledge, and capabilities.
 * This is a central piece of an agent's definition, used by the `AgentRuntime` to initialize and operate the agent.
 * It includes:
 * - `id`: Optional unique identifier for the character.
 * - `name`, `username`: Identifying names for the character.
 * - `system`: A system prompt that guides the agent's overall behavior.
 * - `templates`: A map of prompt templates for various situations (e.g., message generation, summarization).
 * - `bio`: A textual biography or description of the character.
 * - `messageExamples`, `postExamples`: Examples of how the character communicates.
 * - `topics`, `adjectives`: Keywords describing the character's knowledge areas and traits.
 * - `knowledge`: Paths to knowledge files or directories to be loaded into the agent's memory.
 * - `plugins`: A list of plugin names to be loaded for this character.
 * - `settings`, `secrets`: Configuration key-value pairs, with secrets being handled more securely.
 * - `style`: Guidelines for the character's writing style in different contexts (chat, post).
 */
export interface Character {
  /** Optional unique identifier */
  id?: UUID;

  /** Character name */
  name: string;

  /** Optional username */
  username?: string;

  /** Optional system prompt */
  system?: string;

  /** Optional prompt templates */
  templates?: {
    [key: string]: TemplateType;
  };

  /** Character biography */
  bio: string | string[];

  /** Example messages */
  messageExamples?: MessageExample[][];

  /** Example posts */
  postExamples?: string[];

  /** Known topics */
  topics?: string[];

  /** Character traits */
  adjectives?: string[];

  /** Optional knowledge base */
  knowledge?: (
    | string
    | { path: string; shared?: boolean }
    | { directory: string; shared?: boolean }
  )[];

  /** Available plugins */
  plugins?: string[];

  /** Optional configuration */
  settings?: {
    [key: string]: any | string | boolean | number;
  };

  /** Optional secrets */
  secrets?: {
    [key: string]: string | boolean | number;
  };

  /** Writing style guides */
  style?: {
    all?: string[];
    chat?: string[];
    post?: string[];
  };
}

export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/**
 * Represents an operational agent, extending the `Character` definition with runtime status and timestamps.
 * While `Character` defines the blueprint, `Agent` represents an instantiated and potentially running version.
 * It includes:
 * - `enabled`: A boolean indicating if the agent is currently active or disabled.
 * - `status`: The current operational status, typically `AgentStatus.ACTIVE` or `AgentStatus.INACTIVE`.
 * - `createdAt`, `updatedAt`: Timestamps for when the agent record was created and last updated in the database.
 * This interface is primarily used by the `IDatabaseAdapter` for agent management.
 */
export interface Agent extends Character {
  enabled?: boolean;
  status?: AgentStatus;
  createdAt: number;
  updatedAt: number;
}

/**
 * Interface for database operations
 */
export interface IDatabaseAdapter {
  /** Database instance */
  db: any;

  /** Initialize database connection */
  init(): Promise<void>;

  /** Close database connection */
  close(): Promise<void>;

  getConnection(): Promise<PGlite | PgPool>;

  getAgent(agentId: UUID): Promise<Agent | null>;

  /** Get all agents */
  getAgents(): Promise<Partial<Agent>[]>;

  createAgent(agent: Partial<Agent>): Promise<boolean>;

  updateAgent(agentId: UUID, agent: Partial<Agent>): Promise<boolean>;

  deleteAgent(agentId: UUID): Promise<boolean>;

  ensureAgentExists(agent: Partial<Agent>): Promise<Agent>;

  ensureEmbeddingDimension(dimension: number): Promise<void>;

  /** Get entity by IDs */
  getEntityByIds(entityIds: UUID[]): Promise<Entity[] | null>;

  /** Get entities for room */
  getEntitiesForRoom(roomId: UUID, includeComponents?: boolean): Promise<Entity[]>;

  /** Create new entities */
  createEntities(entities: Entity[]): Promise<boolean>;

  /** Update entity */
  updateEntity(entity: Entity): Promise<void>;

  /** Get component by ID */
  getComponent(
    entityId: UUID,
    type: string,
    worldId?: UUID,
    sourceEntityId?: UUID
  ): Promise<Component | null>;

  /** Get all components for an entity */
  getComponents(entityId: UUID, worldId?: UUID, sourceEntityId?: UUID): Promise<Component[]>;

  /** Create component */
  createComponent(component: Component): Promise<boolean>;

  /** Update component */
  updateComponent(component: Component): Promise<void>;

  /** Delete component */
  deleteComponent(componentId: UUID): Promise<void>;

  /** Get memories matching criteria */
  getMemories(params: {
    entityId?: UUID;
    agentId?: UUID;
    count?: number;
    unique?: boolean;
    tableName: string;
    start?: number;
    end?: number;
    roomId?: UUID;
    worldId?: UUID;
  }): Promise<Memory[]>;

  getMemoryById(id: UUID): Promise<Memory | null>;

  getMemoriesByIds(ids: UUID[], tableName?: string): Promise<Memory[]>;

  getMemoriesByRoomIds(params: {
    tableName: string;
    roomIds: UUID[];
    limit?: number;
  }): Promise<Memory[]>;

  getMemoriesByServerId(params: { serverId: UUID; count?: number }): Promise<Memory[]>;

  getCachedEmbeddings(params: {
    query_table_name: string;
    query_threshold: number;
    query_input: string;
    query_field_name: string;
    query_field_sub_name: string;
    query_match_count: number;
  }): Promise<{ embedding: number[]; levenshtein_score: number }[]>;

  log(params: {
    body: { [key: string]: unknown };
    entityId: UUID;
    roomId: UUID;
    type: string;
  }): Promise<void>;

  getLogs(params: {
    entityId: UUID;
    roomId?: UUID;
    type?: string;
    count?: number;
    offset?: number;
  }): Promise<Log[]>;

  deleteLog(logId: UUID): Promise<void>;

  searchMemories(params: {
    embedding: number[];
    match_threshold?: number;
    count?: number;
    unique?: boolean;
    tableName: string;
    query?: string;
    roomId?: UUID;
    worldId?: UUID;
    entityId?: UUID;
  }): Promise<Memory[]>;

  createMemory(memory: Memory, tableName: string, unique?: boolean): Promise<UUID>;

  updateMemory(memory: Partial<Memory> & { id: UUID; metadata?: MemoryMetadata }): Promise<boolean>;

  deleteMemory(memoryId: UUID): Promise<void>;

  deleteAllMemories(roomId: UUID, tableName: string): Promise<void>;

  countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number>;

  createWorld(world: World): Promise<UUID>;

  getWorld(id: UUID): Promise<World | null>;

  removeWorld(id: UUID): Promise<void>;

  getAllWorlds(): Promise<World[]>;

  updateWorld(world: World): Promise<void>;

  getRoomsByIds(roomIds: UUID[]): Promise<Room[] | null>;

  createRooms(rooms: Room[]): Promise<UUID[]>;

  deleteRoom(roomId: UUID): Promise<void>;

  deleteRoomsByWorldId(worldId: UUID): Promise<void>;

  updateRoom(room: Room): Promise<void>;

  getRoomsForParticipant(entityId: UUID): Promise<UUID[]>;

  getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]>;

  getRoomsByWorld(worldId: UUID): Promise<Room[]>;

  removeParticipant(entityId: UUID, roomId: UUID): Promise<boolean>;

  getParticipantsForEntity(entityId: UUID): Promise<Participant[]>;

  getParticipantsForRoom(roomId: UUID): Promise<UUID[]>;

  addParticipantsRoom(entityIds: UUID[], roomId: UUID): Promise<boolean>;

  getParticipantUserState(roomId: UUID, entityId: UUID): Promise<'FOLLOWED' | 'MUTED' | null>;

  setParticipantUserState(
    roomId: UUID,
    entityId: UUID,
    state: 'FOLLOWED' | 'MUTED' | null
  ): Promise<void>;

  /**
   * Creates a new relationship between two entities.
   * @param params Object containing the relationship details
   * @returns Promise resolving to boolean indicating success
   */
  createRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
    tags?: string[];
    metadata?: { [key: string]: any };
  }): Promise<boolean>;

  /**
   * Updates an existing relationship between two entities.
   * @param relationship The relationship object with updated data
   * @returns Promise resolving to void
   */
  updateRelationship(relationship: Relationship): Promise<void>;

  /**
   * Retrieves a relationship between two entities if it exists.
   * @param params Object containing the entity IDs and agent ID
   * @returns Promise resolving to the Relationship object or null if not found
   */
  getRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
  }): Promise<Relationship | null>;

  /**
   * Retrieves all relationships for a specific entity.
   * @param params Object containing the user ID, agent ID and optional tags to filter by
   * @returns Promise resolving to an array of Relationship objects
   */
  getRelationships(params: { entityId: UUID; tags?: string[] }): Promise<Relationship[]>;

  ensureEmbeddingDimension(dimension: number): Promise<void>;

  getCache<T>(key: string): Promise<T | undefined>;
  setCache<T>(key: string, value: T): Promise<boolean>;
  deleteCache(key: string): Promise<boolean>;

  // Only task instance methods - definitions are in-memory
  createTask(task: Task): Promise<UUID>;
  getTasks(params: { roomId?: UUID; tags?: string[]; entityId?: UUID }): Promise<Task[]>;
  getTask(id: UUID): Promise<Task | null>;
  getTasksByName(name: string): Promise<Task[]>;
  updateTask(id: UUID, task: Partial<Task>): Promise<void>;
  deleteTask(id: UUID): Promise<void>;

  getMemoriesByWorldId(params: {
    worldId: UUID;
    count?: number;
    tableName?: string;
  }): Promise<Memory[]>;
}

/**
 * Result interface for embedding similarity searches
 */
export interface EmbeddingSearchResult {
  embedding: number[];
  levenshtein_score: number;
}

/**
 * Options for memory retrieval operations
 */
export interface MemoryRetrievalOptions {
  roomId: UUID;
  count?: number;
  unique?: boolean;
  start?: number;
  end?: number;
  agentId?: UUID;
}

/**
 * Options for memory search operations
 */
export interface MemorySearchOptions {
  embedding: number[];
  match_threshold?: number;
  count?: number;
  roomId: UUID;
  agentId?: UUID;
  unique?: boolean;
  metadata?: Partial<MemoryMetadata>;
}

/**
 * Options for multi-room memory retrieval
 */
export interface MultiRoomMemoryOptions {
  roomIds: UUID[];
  limit?: number;
  agentId?: UUID;
}

/**
 * Unified options pattern for memory operations
 * Provides a simpler, more consistent interface
 */
export interface UnifiedMemoryOptions {
  roomId: UUID;
  limit?: number; // Unified naming (replacing 'count')
  agentId?: UUID; // Common optional parameter
  unique?: boolean; // Common flag for duplication control
  start?: number; // Pagination start
  end?: number; // Pagination end
}

/**
 * Specialized memory search options
 */
export interface UnifiedSearchOptions extends UnifiedMemoryOptions {
  embedding: number[];
  similarity?: number; // Clearer name than 'match_threshold'
}

/**
 * Information describing the target of a message.
 */
export interface TargetInfo {
  source: string; // Platform identifier (e.g., 'discord', 'telegram', 'websocket-api')
  roomId?: UUID; // Target room ID (platform-specific or runtime-specific)
  channelId?: string; // Platform-specific channel/chat ID
  serverId?: string; // Platform-specific server/guild ID
  entityId?: UUID; // Target user ID (for DMs)
  threadId?: string; // Platform-specific thread ID (e.g., Telegram topics)
  // Add other relevant platform-specific identifiers as needed
}

/**
 * Function signature for handlers responsible for sending messages to specific platforms.
 */
export type SendHandlerFunction = (
  runtime: IAgentRuntime,
  target: TargetInfo,
  content: Content
) => Promise<void>;

/**
 * Represents the core runtime environment for an agent.
 * Defines methods for database interaction, plugin management, event handling,
 * state composition, model usage, and task management.
 */
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

  getConnection(): Promise<PGlite | PgPool>;

  getService<T extends Service>(service: ServiceTypeName | string): T | null;

  getAllServices(): Map<ServiceTypeName, Service>;

  registerService(service: typeof Service): Promise<void>;

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

  registerProvider(provider: Provider): void;

  registerAction(action: Action): void;

  registerEvaluator(evaluator: Evaluator): void;

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
  useModel<T extends ModelTypeName, R = ModelResultMap[T]>(
    modelType: T,
    params: Omit<ModelParamsMap[T], 'runtime'> | any
  ): Promise<R>;

  registerModel(
    modelType: ModelTypeName | string,
    handler: (params: any) => Promise<any>,
    provider: string,
    priority?: number
  ): void;

  getModel(
    modelType: ModelTypeName | string
  ): ((runtime: IAgentRuntime, params: any) => Promise<any>) | undefined;

  registerEvent(event: string, handler: (params: any) => Promise<void>): void;

  getEvent(event: string): ((params: any) => Promise<void>)[] | undefined;

  emitEvent(event: string | string[], params: any): Promise<void>;

  // In-memory task definition methods
  registerTaskWorker(taskHandler: TaskWorker): void;
  getTaskWorker(name: string): TaskWorker | undefined;

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
}

/**
 * Interface for settings object with key-value pairs.
 */
/**
 * Interface representing settings with string key-value pairs.
 */
export interface RuntimeSettings {
  [key: string]: string | undefined;
}

/**
 * Represents a single item of knowledge that can be processed and stored by the agent.
 * Knowledge items consist of content (text and optional structured data) and metadata.
 * These items are typically added to the agent's knowledge base via `AgentRuntime.addKnowledge`
 * and retrieved using `AgentRuntime.getKnowledge`.
 * The `id` is a unique identifier for the knowledge item, often derived from its source or content.
 */
export type KnowledgeItem = {
  /** A Universally Unique Identifier for this specific knowledge item. */
  id: UUID;
  /** The actual content of the knowledge item, which must include text and can have other fields. */
  content: Content;
  /** Optional metadata associated with this knowledge item, conforming to `MemoryMetadata`. */
  metadata?: MemoryMetadata;
};

/**
 * Defines the scope or visibility of knowledge items within the agent's system.
 * - `SHARED`: Indicates knowledge that is broadly accessible, potentially across different agents or users if the system architecture permits.
 * - `PRIVATE`: Indicates knowledge that is restricted, typically to the specific agent or user context it belongs to.
 * This enum is used to manage access and retrieval of knowledge items, often in conjunction with `AgentRuntime.addKnowledge` or `AgentRuntime.getKnowledge` scopes.
 */
export enum KnowledgeScope {
  SHARED = 'shared',
  PRIVATE = 'private',
}

/**
 * Specifies prefixes for keys used in caching mechanisms, helping to namespace cached data.
 * For example, `KNOWLEDGE` might be used to prefix keys for cached knowledge embeddings or processed documents.
 * This helps in organizing the cache and avoiding key collisions.
 * Used internally by caching strategies, potentially within `IDatabaseAdapter` cache methods or runtime caching layers.
 */
export enum CacheKeyPrefix {
  KNOWLEDGE = 'knowledge',
}

/**
 * Represents an item within a directory listing, specifically for knowledge loading.
 * When an agent's `Character.knowledge` configuration includes a directory, this type
 * is used to specify the path to that directory and whether its contents should be treated as shared.
 * - `directory`: The path to the directory containing knowledge files.
 * - `shared`: An optional boolean (defaults to false) indicating if the knowledge from this directory is considered shared or private.
 */
export interface DirectoryItem {
  /** The path to the directory containing knowledge files. */
  directory: string;
  /** If true, knowledge from this directory is considered shared; otherwise, it's private. Defaults to false. */
  shared?: boolean;
}

/**
 * Represents a row structure, typically from a database query related to text chunking or processing.
 * This interface is quite minimal and seems to be a placeholder or a base for more specific chunk-related types.
 * The `id` would be the unique identifier for the chunk.
 * It might be used when splitting large documents into smaller, manageable pieces for embedding or analysis.
 */
export interface ChunkRow {
  /** The unique identifier for this chunk of text. */
  id: string;
  // Add other properties if needed
}

/**
 * Parameters for generating text using a language model.
 * This structure is typically passed to `AgentRuntime.useModel` when the `modelType` is one of
 * `ModelType.TEXT_SMALL`, `ModelType.TEXT_LARGE`, `ModelType.TEXT_REASONING_SMALL`,
 * `ModelType.TEXT_REASONING_LARGE`, or `ModelType.TEXT_COMPLETION`.
 * It includes essential information like the prompt, model type, and various generation controls.
 */
export type GenerateTextParams = {
  /** The `AgentRuntime` instance, providing access to models and other services. */
  runtime: IAgentRuntime;
  /** The input string or prompt that the language model will use to generate text. */
  prompt: string;
  /** Specifies the type of text generation model to use (e.g., TEXT_LARGE, REASONING_SMALL). */
  modelType: ModelTypeName;
  /** Optional. The maximum number of tokens to generate in the response. */
  maxTokens?: number;
  /** Optional. Controls randomness (0.0-1.0). Lower values are more deterministic, higher are more creative. */
  temperature?: number;
  /** Optional. Penalizes new tokens based on their existing frequency in the text so far. */
  frequencyPenalty?: number;
  /** Optional. Penalizes new tokens based on whether they appear in the text so far. */
  presencePenalty?: number;
  /** Optional. A list of sequences at which the model will stop generating further tokens. */
  stopSequences?: string[];
};

/**
 * Parameters for tokenizing text, i.e., converting a string into a sequence of numerical tokens.
 * This is a common preprocessing step for many language models.
 * This structure is used with `AgentRuntime.useModel` when the `modelType` is `ModelType.TEXT_TOKENIZER_ENCODE`.
 */
export interface TokenizeTextParams {
  /** The input string to be tokenized. */
  prompt: string;
  /** The model type to use for tokenization, which determines the tokenizer algorithm and vocabulary. */
  modelType: ModelTypeName;
}

/**
 * Parameters for detokenizing text, i.e., converting a sequence of numerical tokens back into a string.
 * This is the reverse operation of tokenization.
 * This structure is used with `AgentRuntime.useModel` when the `modelType` is `ModelType.TEXT_TOKENIZER_DECODE`.
 */
export interface DetokenizeTextParams {
  /** An array of numerical tokens to be converted back into text. */
  tokens: number[];
  /** The model type used for detokenization, ensuring consistency with the original tokenization. */
  modelType: ModelTypeName;
}

/**
 * Represents a test case for evaluating agent or plugin functionality.
 * Each test case has a name and a function that contains the test logic.
 * The test function receives the `IAgentRuntime` instance, allowing it to interact with the agent's capabilities.
 * Test cases are typically grouped into `TestSuite`s.
 */
export interface TestCase {
  /** A descriptive name for the test case, e.g., "should respond to greetings". */
  name: string;
  /**
   * The function that executes the test logic. It can be synchronous or asynchronous.
   * It receives the `IAgentRuntime` to interact with the agent and its services.
   * The function should typically contain assertions to verify expected outcomes.
   */
  fn: (runtime: IAgentRuntime) => Promise<void> | void;
}

/**
 * Represents a suite of related test cases for an agent or plugin.
 * This helps in organizing tests and running them collectively.
 * A `ProjectAgent` can define one or more `TestSuite`s.
 */
export interface TestSuite {
  /** A descriptive name for the test suite, e.g., "Core Functionality Tests". */
  name: string;
  /** An array of `TestCase` objects that belong to this suite. */
  tests: TestCase[];
}

// Represents an agent in the TeeAgent table, containing details about the agent.
/**
 * Represents an agent's registration details within a Trusted Execution Environment (TEE) context.
 * This is typically stored in a database table (e.g., `TeeAgent`) to manage agents operating in a TEE.
 * It allows for multiple registrations of the same `agentId` to support scenarios where an agent might restart,
 * generating a new keypair and attestation each time.
 */
export interface TeeAgent {
  /** Primary key for the TEE agent registration record (e.g., a UUID or auto-incrementing ID). */
  id: string; // Primary key
  // Allow duplicate agentId.
  // This is to support the case where the same agentId is registered multiple times.
  // Each time the agent restarts, we will generate a new keypair and attestation.
  /** The core identifier of the agent, which can be duplicated across multiple TEE registrations. */
  agentId: string;
  /** The human-readable name of the agent. */
  agentName: string;
  /** Timestamp (e.g., Unix epoch in milliseconds) when this TEE registration was created. */
  createdAt: number;
  /** The public key associated with this specific TEE agent instance/session. */
  publicKey: string;
  /** The attestation document proving the authenticity and integrity of the TEE instance. */
  attestation: string;
}

/**
 * Defines the operational modes for a Trusted Execution Environment (TEE).
 * This enum is used to configure how TEE functionalities are engaged, allowing for
 * different setups for local development, Docker-based development, and production.
 */
export enum TEEMode {
  /** TEE functionality is completely disabled. */
  OFF = 'OFF',
  /** For local development, potentially using a TEE simulator. */
  LOCAL = 'LOCAL', // For local development with simulator
  /** For Docker-based development environments, possibly with a TEE simulator. */
  DOCKER = 'DOCKER', // For docker development with simulator
  /** For production deployments, using actual TEE hardware without a simulator. */
  PRODUCTION = 'PRODUCTION', // For production without simulator
}

/**
 * Represents a quote obtained during remote attestation for a Trusted Execution Environment (TEE).
 * This quote is a piece of evidence provided by the TEE, cryptographically signed, which can be
 * verified by a relying party to ensure the TEE's integrity and authenticity.
 */
export interface RemoteAttestationQuote {
  /** The attestation quote data, typically a base64 encoded string or similar format. */
  quote: string;
  /** Timestamp (e.g., Unix epoch in milliseconds) when the quote was generated or received. */
  timestamp: number;
}

/**
 * Data structure used in the attestation process for deriving a key within a Trusted Execution Environment (TEE).
 * This information helps establish a secure channel or verify the identity of the agent instance
 * requesting key derivation.
 */
export interface DeriveKeyAttestationData {
  /** The unique identifier of the agent for which the key derivation is being attested. */
  agentId: string;
  /** The public key of the agent instance involved in the key derivation process. */
  publicKey: string;
  /** Optional subject or context information related to the key derivation. */
  subject?: string;
}

/**
 * Represents a message that has been attested by a Trusted Execution Environment (TEE).
 * This structure binds a message to an agent's identity and a timestamp, all within the
 * context of a remote attestation process, ensuring the message originated from a trusted TEE instance.
 */
export interface RemoteAttestationMessage {
  /** The unique identifier of the agent sending the attested message. */
  agentId: string;
  /** Timestamp (e.g., Unix epoch in milliseconds) when the message was attested or sent. */
  timestamp: number;
  /** The actual message content, including details about the entity, room, and the content itself. */
  message: {
    entityId: string;
    roomId: string;
    content: string;
  };
}

/**
 * Enumerates different types or vendors of Trusted Execution Environments (TEEs).
 * This allows the system to adapt to specific TEE technologies, like Intel TDX on DSTACK.
 */
export enum TeeType {
  /** Represents Intel Trusted Domain Extensions (TDX) running on DSTACK infrastructure. */
  TDX_DSTACK = 'tdx_dstack',
}

/**
 * Configuration options specific to a particular Trusted Execution Environment (TEE) vendor.
 * This allows for vendor-specific settings to be passed to the TEE plugin or service.
 * The structure is a generic key-value map, as configurations can vary widely between vendors.
 */
export interface TeeVendorConfig {
  // Add vendor-specific configuration options here
  [key: string]: unknown;
}

/**
 * Configuration for a TEE (Trusted Execution Environment) plugin.
 * This allows specifying the TEE vendor and any vendor-specific configurations.
 * It's used to initialize and configure TEE-related functionalities within the agent system.
 */
export interface TeePluginConfig {
  /** Optional. The name or identifier of the TEE vendor (e.g., 'tdx_dstack' from `TeeType`). */
  vendor?: string;
  /** Optional. Vendor-specific configuration options, conforming to `TeeVendorConfig`. */
  vendorConfig?: TeeVendorConfig;
}

/**
 * Defines the contract for a Task Worker, which is responsible for executing a specific type of task.
 * Task workers are registered with the `AgentRuntime` and are invoked when a `Task` of their designated `name` needs processing.
 * This pattern allows for modular and extensible background task processing.
 */
export interface TaskWorker {
  /** The unique name of the task type this worker handles. This name links `Task` instances to this worker. */
  name: string;
  /**
   * The core execution logic for the task. This function is called by the runtime when a task needs to be processed.
   * It receives the `AgentRuntime`, task-specific `options`, and the `Task` object itself.
   */
  execute: (
    runtime: IAgentRuntime,
    options: { [key: string]: unknown },
    task: Task
  ) => Promise<void>;
  /**
   * Optional validation function that can be used to determine if a task is valid or should be executed,
   * often based on the current message and state. This might be used by an action or evaluator
   * before creating or queueing a task.
   */
  validate?: (runtime: IAgentRuntime, message: Memory, state: State) => Promise<boolean>;
}

/**
 * Defines metadata associated with a `Task`.
 * This can include scheduling information like `updateInterval` or UI-related details
 * for presenting task options to a user.
 * The `[key: string]: unknown;` allows for additional, unspecified metadata fields.
 */
export type TaskMetadata = {
  /** Optional. If the task is recurring, this specifies the interval in milliseconds between updates or executions. */
  updateInterval?: number;
  /** Optional. Describes options or parameters that can be configured for this task, often for UI presentation. */
  options?: {
    name: string;
    description: string;
  }[];
  /** Allows for other dynamic metadata properties related to the task. */
  [key: string]: unknown;
};

/**
 * Represents a task to be performed, often in the background or at a later time.
 * Tasks are managed by the `AgentRuntime` and processed by registered `TaskWorker`s.
 * They can be associated with a room, world, and tagged for categorization and retrieval.
 * The `IDatabaseAdapter` handles persistence of task data.
 */
export interface Task {
  /** Optional. A Universally Unique Identifier for the task. Generated if not provided. */
  id?: UUID;
  /** The name of the task, which should correspond to a registered `TaskWorker.name`. */
  name: string;
  /** Optional. Timestamp of the last update to this task. */
  updatedAt?: number;
  /** Optional. Metadata associated with the task, conforming to `TaskMetadata`. */
  metadata?: TaskMetadata;
  /** A human-readable description of what the task does or its purpose. */
  description: string;
  /** Optional. The UUID of the room this task is associated with. */
  roomId?: UUID;
  /** Optional. The UUID of the world this task is associated with. */
  worldId?: UUID;
  entityId?: UUID;
  tags: string[];
}

/**
 * Defines roles within a system, typically for access control or permissions, often within a `World`.
 * - `OWNER`: Represents the highest level of control, typically the creator or primary administrator.
 * - `ADMIN`: Represents administrative privileges, usually a subset of owner capabilities.
 * - `NONE`: Indicates no specific role or default, minimal permissions.
 * These roles are often used in `World.metadata.roles` to assign roles to entities.
 */
export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  NONE = 'NONE',
}

export interface Setting {
  name: string;
  description: string; // Used in chat context when discussing the setting
  usageDescription: string; // Used during settings to guide users
  value: string | boolean | null;
  required: boolean;
  public?: boolean; // If true, shown in public channels
  secret?: boolean; // If true, value is masked and only shown during settings
  validation?: (value: any) => boolean;
  dependsOn?: string[];
  onSetAction?: (value: any) => string;
  visibleIf?: (settings: { [key: string]: Setting }) => boolean;
}

export interface WorldSettings {
  [key: string]: Setting;
}

export interface OnboardingConfig {
  settings: {
    [key: string]: Omit<Setting, 'value'>;
  };
}

/**
 * Base parameters common to all model types
 */
export interface BaseModelParams {
  /** The agent runtime for accessing services and utilities */
  runtime: IAgentRuntime;
}

/**
 * Parameters for text generation models
 */
export interface TextGenerationParams extends BaseModelParams {
  /** The prompt to generate text from */
  prompt: string;
  /** Model temperature (0.0 to 1.0, lower is more deterministic) */
  temperature?: number;
  /** Maximum number of tokens to generate */
  maxTokens?: number;
  /** Sequences that should stop generation when encountered */
  stopSequences?: string[];
  /** Frequency penalty to apply */
  frequencyPenalty?: number;
  /** Presence penalty to apply */
  presencePenalty?: number;
}

/**
 * Parameters for text embedding models
 */
export interface TextEmbeddingParams extends BaseModelParams {
  /** The text to create embeddings for */
  text: string;
}

/**
 * Parameters for text tokenization models
 */
export interface TokenizeTextParams extends BaseModelParams {
  /** The text to tokenize */
  prompt: string;
  /** The model type to use for tokenization */
  modelType: ModelTypeName;
}

/**
 * Parameters for text detokenization models
 */
export interface DetokenizeTextParams extends BaseModelParams {
  /** The tokens to convert back to text */
  tokens: number[];
  /** The model type to use for detokenization */
  modelType: ModelTypeName;
}

/**
 * Parameters for image generation models
 */
export interface ImageGenerationParams extends BaseModelParams {
  /** The prompt describing the image to generate */
  prompt: string;
  /** The dimensions of the image to generate */
  size?: string;
  /** Number of images to generate */
  count?: number;
}

/**
 * Parameters for image description models
 */
export interface ImageDescriptionParams extends BaseModelParams {
  /** The URL or path of the image to describe */
  imageUrl: string;
  /** Optional prompt to guide the description */
  prompt?: string;
}

/**
 * Parameters for transcription models
 */
export interface TranscriptionParams extends BaseModelParams {
  /** The URL or path of the audio file to transcribe */
  audioUrl: string;
  /** Optional prompt to guide transcription */
  prompt?: string;
}

/**
 * Parameters for text-to-speech models
 */
export interface TextToSpeechParams extends BaseModelParams {
  /** The text to convert to speech */
  text: string;
  /** The voice to use */
  voice?: string;
  /** The speaking speed */
  speed?: number;
}

/**
 * Parameters for audio processing models
 */
export interface AudioProcessingParams extends BaseModelParams {
  /** The URL or path of the audio file to process */
  audioUrl: string;
  /** The type of audio processing to perform */
  processingType: string;
}

/**
 * Parameters for video processing models
 */
export interface VideoProcessingParams extends BaseModelParams {
  /** The URL or path of the video file to process */
  videoUrl: string;
  /** The type of video processing to perform */
  processingType: string;
}

/**
 * Optional JSON schema for validating generated objects
 */
export type JSONSchema = {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: JSONSchema;
  [key: string]: any;
};

/**
 * Parameters for object generation models
 * @template T - The expected return type, inferred from schema if provided
 */
export interface ObjectGenerationParams<T = any> extends BaseModelParams {
  /** The prompt describing the object to generate */
  prompt: string;
  /** Optional JSON schema for validation */
  schema?: JSONSchema;
  /** Type of object to generate */
  output?: 'object' | 'array' | 'enum';
  /** For enum type, the allowed values */
  enumValues?: string[];
  /** Model type to use */
  modelType?: ModelTypeName;
  /** Model temperature (0.0 to 1.0) */
  temperature?: number;
  /** Sequences that should stop generation */
  stopSequences?: string[];
}

/**
 * Map of model types to their parameter types
 */
export interface ModelParamsMap {
  [ModelType.TEXT_SMALL]: TextGenerationParams;
  [ModelType.TEXT_LARGE]: TextGenerationParams;
  [ModelType.TEXT_EMBEDDING]: TextEmbeddingParams | string | null;
  [ModelType.TEXT_TOKENIZER_ENCODE]: TokenizeTextParams;
  [ModelType.TEXT_TOKENIZER_DECODE]: DetokenizeTextParams;
  [ModelType.TEXT_REASONING_SMALL]: TextGenerationParams;
  [ModelType.TEXT_REASONING_LARGE]: TextGenerationParams;
  [ModelType.IMAGE]: ImageGenerationParams;
  [ModelType.IMAGE_DESCRIPTION]: ImageDescriptionParams | string;
  [ModelType.TRANSCRIPTION]: TranscriptionParams | Buffer | string;
  [ModelType.TEXT_TO_SPEECH]: TextToSpeechParams | string;
  [ModelType.AUDIO]: AudioProcessingParams;
  [ModelType.VIDEO]: VideoProcessingParams;
  [ModelType.OBJECT_SMALL]: ObjectGenerationParams<any>;
  [ModelType.OBJECT_LARGE]: ObjectGenerationParams<any>;
  // Allow string index for custom model types
  [key: string]: BaseModelParams | any;
}

/**
 * Map of model types to their return value types
 */
export interface ModelResultMap {
  [ModelType.TEXT_SMALL]: string;
  [ModelType.TEXT_LARGE]: string;
  [ModelType.TEXT_EMBEDDING]: number[];
  [ModelType.TEXT_TOKENIZER_ENCODE]: number[];
  [ModelType.TEXT_TOKENIZER_DECODE]: string;
  [ModelType.TEXT_REASONING_SMALL]: string;
  [ModelType.TEXT_REASONING_LARGE]: string;
  [ModelType.IMAGE]: { url: string }[];
  [ModelType.IMAGE_DESCRIPTION]: { title: string; description: string };
  [ModelType.TRANSCRIPTION]: string;
  [ModelType.TEXT_TO_SPEECH]: any | Buffer;
  [ModelType.AUDIO]: any; // Specific return type depends on processing type
  [ModelType.VIDEO]: any; // Specific return type depends on processing type
  [ModelType.OBJECT_SMALL]: any;
  [ModelType.OBJECT_LARGE]: any;
  // Allow string index for custom model types
  [key: string]: any;
}

/**
 * Standard event types across all platforms
 */
export enum EventType {
  // World events
  WORLD_JOINED = 'WORLD_JOINED',
  WORLD_CONNECTED = 'WORLD_CONNECTED',
  WORLD_LEFT = 'WORLD_LEFT',

  // Entity events
  ENTITY_JOINED = 'ENTITY_JOINED',
  ENTITY_LEFT = 'ENTITY_LEFT',
  ENTITY_UPDATED = 'ENTITY_UPDATED',

  // Room events
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_LEFT = 'ROOM_LEFT',

  // Message events
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  MESSAGE_SENT = 'MESSAGE_SENT',

  // Voice events
  VOICE_MESSAGE_RECEIVED = 'VOICE_MESSAGE_RECEIVED',
  VOICE_MESSAGE_SENT = 'VOICE_MESSAGE_SENT',

  // Interaction events
  REACTION_RECEIVED = 'REACTION_RECEIVED',
  POST_GENERATED = 'POST_GENERATED',
  INTERACTION_RECEIVED = 'INTERACTION_RECEIVED',

  // Run events
  RUN_STARTED = 'RUN_STARTED',
  RUN_ENDED = 'RUN_ENDED',
  RUN_TIMEOUT = 'RUN_TIMEOUT',

  // Action events
  ACTION_STARTED = 'ACTION_STARTED',
  ACTION_COMPLETED = 'ACTION_COMPLETED',

  // Evaluator events
  EVALUATOR_STARTED = 'EVALUATOR_STARTED',
  EVALUATOR_COMPLETED = 'EVALUATOR_COMPLETED',

  // Model events
  MODEL_USED = 'MODEL_USED',
}

/**
 * Platform-specific event type prefix
 */
export enum PlatformPrefix {
  DISCORD = 'DISCORD',
  TELEGRAM = 'TELEGRAM',
  TWITTER = 'TWITTER',
}

/**
 * Base payload interface for all events
 */
export interface EventPayload {
  runtime: IAgentRuntime;
  source: string;
  onComplete?: () => void;
}

/**
 * Payload for world-related events
 */
export interface WorldPayload extends EventPayload {
  world: World;
  rooms: Room[];
  entities: Entity[];
}

/**
 * Payload for entity-related events
 */
export interface EntityPayload extends EventPayload {
  entityId: UUID;
  worldId?: UUID;
  roomId?: UUID;
  metadata?: {
    orginalId: string;
    username: string;
    displayName?: string;
    [key: string]: any;
  };
}

/**
 * Payload for reaction-related events
 */
export interface MessagePayload extends EventPayload {
  message: Memory;
  callback?: HandlerCallback;
  onComplete?: () => void;
}

/**
 * Payload for events that are invoked without a message
 */
export interface InvokePayload extends EventPayload {
  worldId: UUID;
  userId: string;
  roomId: UUID;
  callback?: HandlerCallback;
  source: string;
}

/**
 * Run event payload type
 */
export interface RunEventPayload extends EventPayload {
  runId: UUID;
  messageId: UUID;
  roomId: UUID;
  entityId: UUID;
  startTime: number;
  status: 'started' | 'completed' | 'timeout';
  endTime?: number;
  duration?: number;
  error?: string;
}

/**
 * Action event payload type
 */
export interface ActionEventPayload extends EventPayload {
  actionId: UUID;
  actionName: string;
  startTime?: number;
  completed?: boolean;
  error?: Error;
}

/**
 * Evaluator event payload type
 */
export interface EvaluatorEventPayload extends EventPayload {
  evaluatorId: UUID;
  evaluatorName: string;
  startTime?: number;
  completed?: boolean;
  error?: Error;
}

/**
 * Model event payload type
 */
export interface ModelEventPayload extends EventPayload {
  provider: string;
  type: ModelTypeName;
  prompt: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

/**
 * Represents the parameters for a message received handler.
 * @typedef {Object} MessageReceivedHandlerParams
 * @property {IAgentRuntime} runtime - The agent runtime associated with the message.
 * @property {Memory} message - The message received.
 * @property {HandlerCallback} callback - The callback function to be executed after handling the message.
 */
export type MessageReceivedHandlerParams = {
  runtime: IAgentRuntime;
  message: Memory;
  callback: HandlerCallback;
  onComplete?: () => void;
};

/**
 * Maps event types to their corresponding payload types
 */
export interface EventPayloadMap {
  [EventType.WORLD_JOINED]: WorldPayload;
  [EventType.WORLD_CONNECTED]: WorldPayload;
  [EventType.WORLD_LEFT]: WorldPayload;
  [EventType.ENTITY_JOINED]: EntityPayload;
  [EventType.ENTITY_LEFT]: EntityPayload;
  [EventType.ENTITY_UPDATED]: EntityPayload;
  [EventType.MESSAGE_RECEIVED]: MessagePayload;
  [EventType.MESSAGE_SENT]: MessagePayload;
  [EventType.REACTION_RECEIVED]: MessagePayload;
  [EventType.POST_GENERATED]: InvokePayload;
  [EventType.INTERACTION_RECEIVED]: MessagePayload;
  [EventType.RUN_STARTED]: RunEventPayload;
  [EventType.RUN_ENDED]: RunEventPayload;
  [EventType.RUN_TIMEOUT]: RunEventPayload;
  [EventType.ACTION_STARTED]: ActionEventPayload;
  [EventType.ACTION_COMPLETED]: ActionEventPayload;
  [EventType.EVALUATOR_STARTED]: EvaluatorEventPayload;
  [EventType.EVALUATOR_COMPLETED]: EvaluatorEventPayload;
  [EventType.MODEL_USED]: ModelEventPayload;
}

/**
 * Event handler function type
 */
export type EventHandler<T extends keyof EventPayloadMap> = (
  payload: EventPayloadMap[T]
) => Promise<void>;

/**
 * Update the Plugin interface with typed events
 */

export enum SOCKET_MESSAGE_TYPE {
  ROOM_JOINING = 1,
  SEND_MESSAGE = 2,
  MESSAGE = 3,
  ACK = 4,
  THINKING = 5,
  CONTROL = 6,
}

/**
 * Specialized memory type for messages with enhanced type checking
 */
export interface MessageMemory extends Memory {
  metadata: MessageMetadata;
  content: Content & {
    text: string; // Message memories must have text content
  };
}

/**
 * Factory function to create a new message memory with proper defaults
 */
export function createMessageMemory(params: {
  id?: UUID;
  entityId: UUID;
  agentId?: UUID;
  roomId: UUID;
  content: Content & { text: string };
  embedding?: number[];
}): MessageMemory {
  return {
    ...params,
    createdAt: Date.now(),
    metadata: {
      type: MemoryType.MESSAGE,
      timestamp: Date.now(),
      scope: params.agentId ? 'private' : 'shared',
    },
  };
}

/**
 * Generic service interface that provides better type checking for services
 * @template ConfigType The configuration type for this service
 * @template ResultType The result type returned by the service operations
 */
export interface TypedService<ConfigType = unknown, ResultType = unknown> extends Service {
  /**
   * The configuration for this service instance
   */
  config: ConfigType;

  /**
   * Process an input with this service
   * @param input The input to process
   * @returns A promise resolving to the result
   */
  process(input: unknown): Promise<ResultType>;
}

/**
 * Generic factory function to create a typed service instance
 * @param runtime The agent runtime
 * @param serviceType The type of service to get
 * @returns The service instance or null if not available
 */
export function getTypedService<T extends TypedService<any, any>>(
  runtime: IAgentRuntime,
  serviceType: ServiceTypeName
): T | null {
  return runtime.getService<T>(serviceType);
}

/**
 * Type guard to check if a memory metadata is a DocumentMetadata
 * @param metadata The metadata to check
 * @returns True if the metadata is a DocumentMetadata
 */
export function isDocumentMetadata(metadata: MemoryMetadata): metadata is DocumentMetadata {
  return metadata.type === MemoryType.DOCUMENT;
}

/**
 * Type guard to check if a memory metadata is a FragmentMetadata
 * @param metadata The metadata to check
 * @returns True if the metadata is a FragmentMetadata
 */
export function isFragmentMetadata(metadata: MemoryMetadata): metadata is FragmentMetadata {
  return metadata.type === MemoryType.FRAGMENT;
}

/**
 * Type guard to check if a memory metadata is a MessageMetadata
 * @param metadata The metadata to check
 * @returns True if the metadata is a MessageMetadata
 */
export function isMessageMetadata(metadata: MemoryMetadata): metadata is MessageMetadata {
  return metadata.type === MemoryType.MESSAGE;
}

/**
 * Type guard to check if a memory metadata is a DescriptionMetadata
 * @param metadata The metadata to check
 * @returns True if the metadata is a DescriptionMetadata
 */
export function isDescriptionMetadata(metadata: MemoryMetadata): metadata is DescriptionMetadata {
  return metadata.type === MemoryType.DESCRIPTION;
}

/**
 * Type guard to check if a memory metadata is a CustomMetadata
 * @param metadata The metadata to check
 * @returns True if the metadata is a CustomMetadata
 */
export function isCustomMetadata(metadata: MemoryMetadata): metadata is CustomMetadata {
  return (
    metadata.type !== MemoryType.DOCUMENT &&
    metadata.type !== MemoryType.FRAGMENT &&
    metadata.type !== MemoryType.MESSAGE &&
    metadata.type !== MemoryType.DESCRIPTION
  );
}

/**
 * Standardized service error type for consistent error handling
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
  cause?: Error;
}

/**
 * Memory type guard for document memories
 */
export function isDocumentMemory(
  memory: Memory
): memory is Memory & { metadata: DocumentMetadata } {
  return memory.metadata?.type === MemoryType.DOCUMENT;
}

/**
 * Memory type guard for fragment memories
 */
export function isFragmentMemory(
  memory: Memory
): memory is Memory & { metadata: FragmentMetadata } {
  return memory.metadata?.type === MemoryType.FRAGMENT;
}

/**
 * Safely access the text content of a memory
 * @param memory The memory to extract text from
 * @param defaultValue Optional default value if no text is found
 * @returns The text content or default value
 */
export function getMemoryText(memory: Memory, defaultValue = ''): string {
  return memory.content.text ?? defaultValue;
}

/**
 * Safely create a ServiceError from any caught error
 */
export function createServiceError(error: unknown, code = 'UNKNOWN_ERROR'): ServiceError {
  if (error instanceof Error) {
    return {
      code,
      message: error.message,
      cause: error,
    };
  }

  return {
    code,
    message: String(error),
  };
}

/**
 * Replace 'any' types with more specific types
 */

// Replace 'any' in State interface components
/**
 * Defines the possible primitive types or structured types for a value within the agent's state.
 * This type is used to provide more specific typing for properties within `StateObject` and `StateArray`,
 * moving away from a generic 'any' type for better type safety and clarity in state management.
 */
export type StateValue = string | number | boolean | null | StateObject | StateArray;
/**
 * Represents a generic object structure within the agent's state, where keys are strings
 * and values can be any `StateValue`. This allows for nested objects within the state.
 * It's a fundamental part of the `EnhancedState` interface.
 */
export interface StateObject {
  [key: string]: StateValue;
}
/**
 * Represents an array of `StateValue` types within the agent's state.
 * This allows for lists of mixed or uniform types to be stored in the state,
 * contributing to the structured definition of `EnhancedState`.
 */
export type StateArray = StateValue[];

/**
 * Enhanced State interface with more specific types for its core properties.
 * This interface provides a more structured representation of an agent's conversational state,
 * building upon the base `State` by typing `values` and `data` as `StateObject`.
 * The `text` property typically holds a textual summary or context derived from the state.
 * Additional dynamic properties are still allowed via the index signature `[key: string]: StateValue;`.
 */
export interface EnhancedState {
  /** Holds directly accessible state values, often used for template rendering or quick lookups. */
  values: StateObject;
  /** Stores more complex or structured data, potentially namespaced by providers or internal systems. */
  data: StateObject;
  /** A textual representation or summary of the current state, often used as context for models. */
  text: string;
  /** Allows for additional dynamic properties to be added to the state object. */
  [key: string]: StateValue;
}

// Replace 'any' in component data
/**
 * A generic type for the `data` field within a `Component`.
 * While `Record<string, unknown>` allows for flexibility, developers are encouraged
 * to define more specific types for component data where possible to improve type safety
 * and code maintainability. This type serves as a base for various component implementations.
 */
export type ComponentData = Record<string, unknown>;

// Replace 'any' in event handlers
/**
 * Represents a generic data object that can be passed as a payload in an event.
 * This type is often used in `TypedEventHandler` to provide a flexible yet somewhat
 * structured way to handle event data. Specific event handlers might cast this to a
 * more concrete type based on the event being processed.
 */
export type EventDataObject = Record<string, unknown>;

/**
 * Defines a more specific type for event handlers, expecting an `EventDataObject`.
 * This aims to improve upon generic 'any' type handlers, providing a clearer contract
 * for functions that respond to events emitted within the agent runtime (see `emitEvent` in `AgentRuntime`).
 * Handlers can be synchronous or asynchronous.
 */
export type TypedEventHandler = (data: EventDataObject) => Promise<void> | void;

// Replace 'any' in database adapter
/**
 * Represents a generic database connection object.
 * The actual type of this connection will depend on the specific database adapter implementation
 * (e.g., a connection pool object for PostgreSQL, a client instance for a NoSQL database).
 * This `unknown` type serves as a placeholder in the abstract `IDatabaseAdapter`.
 */
export type DbConnection = unknown;

/**
 * A generic type for metadata objects, often used in various parts of the system like
 * `Relationship` metadata or other extensible data structures.
 * It allows for arbitrary key-value pairs where values are of `unknown` type,
 * encouraging consumers to perform type checking or casting.
 */
export type MetadataObject = Record<string, unknown>;

// Replace 'any' in model handlers
/**
 * Defines the structure for a model handler registration within the `AgentRuntime`.
 * Each model (e.g., for text generation, embedding) is associated with a handler function,
 * the name of the provider (plugin or system) that registered it, and an optional priority.
 * The `priority` (higher is more preferred) helps in selecting which handler to use if multiple
 * handlers are registered for the same model type. The `registrationOrder` (not in type, but used in runtime)
 * serves as a tie-breaker. See `AgentRuntime.registerModel` and `AgentRuntime.getModel`.
 */
export interface ModelHandler {
  /** The function that executes the model, taking runtime and parameters, and returning a Promise. */
  handler: (runtime: IAgentRuntime, params: Record<string, unknown>) => Promise<unknown>;
  /** The name of the provider (e.g., plugin name) that registered this model handler. */
  provider: string;
  /**
   * Optional priority for this model handler. Higher numbers indicate higher priority.
   * This is used by `AgentRuntime.getModel` to select the most appropriate handler
   * when multiple are available for a given model type. Defaults to 0 if not specified.
   */
  priority?: number; // Optional priority for selection order

  registrationOrder?: number;
}

// Replace 'any' for service configurationa
/**
 * A generic type for service configurations.
 * Services (like `IVideoService`, `IBrowserService`) can have their own specific configuration
 * structures. This type allows for a flexible way to pass configuration objects,
 * typically used during service initialization within a plugin or the `AgentRuntime`.
 */
export type ServiceConfig = Record<string, unknown>;

// Allowable vector dimensions
export const VECTOR_DIMS = {
  SMALL: 384,
  MEDIUM: 512,
  LARGE: 768,
  XL: 1024,
  XXL: 1536,
  XXXL: 3072,
} as const;

/**
 * Interface for control messages sent from the backend to the frontend
 * to manage UI state and interaction capabilities
 */
export interface ControlMessage {
  /** Message type identifier */
  type: 'control';

  /** Control message payload */
  payload: {
    /** Action to perform */
    action: 'disable_input' | 'enable_input';

    /** Optional target element identifier */
    target?: string;

    /** Additional optional parameters */
    [key: string]: unknown;
  };

  /** Room ID to ensure signal is directed to the correct chat window */
  roomId: UUID;
}

Old packages/core/src/runtime.ts

import { readFile } from "fs/promises";
import { join } from "path";
import { names, uniqueNamesGenerator } from "unique-names-generator";
import { v4 as uuidv4 } from "uuid";
import {
    composeActionExamples,
    formatActionNames,
    formatActions,
} from "./actions.ts";
import { addHeader, composeContext } from "./context.ts";
import {
    evaluationTemplate,
    formatEvaluatorExamples,
    formatEvaluatorNames,
    formatEvaluators,
} from "./evaluators.ts";
import { generateText } from "./generation.ts";
import { formatGoalsAsString, getGoals } from "./goals.ts";
import { elizaLogger } from "./index.ts";
import knowledge from "./knowledge.ts";
import { MemoryManager } from "./memory.ts";
import { formatActors, formatMessages, getActorDetails } from "./messages.ts";
import { parseJsonArrayFromText } from "./parsing.ts";
import { formatPosts } from "./posts.ts";
import { getProviders } from "./providers.ts";
import { RAGKnowledgeManager } from "./ragknowledge.ts";
import settings from "./settings.ts";
import {
    type Character,
    type Goal,
    type HandlerCallback,
    type IAgentRuntime,
    type ICacheManager,
    type IDatabaseAdapter,
    type IMemoryManager,
    type IRAGKnowledgeManager,
    // type IVerifiableInferenceAdapter,
    type KnowledgeItem,
    // RAGKnowledgeItem,
    //Media,
    ModelClass,
    ModelProviderName,
    type Plugin,
    type Provider,
    type Adapter,
    type Service,
    type ServiceType,
    type State,
    type UUID,
    type Action,
    type Actor,
    type Evaluator,
    type Memory,
    type DirectoryItem,
    type ClientInstance,
} from "./types.ts";
import { stringToUuid } from "./uuid.ts";
import { glob } from "glob";
import { existsSync } from "fs";
/**
 * Represents the runtime environment for an agent, handling message processing,
 * action registration, and interaction with external services like OpenAI and Supabase.
 */

function isDirectoryItem(item: any): item is DirectoryItem {
    return (
        typeof item === "object" &&
        item !== null &&
        "directory" in item &&
        typeof item.directory === "string"
    );
}

export class AgentRuntime implements IAgentRuntime {
    /**
     * Default count for recent messages to be kept in memory.
     * @private
     */
    readonly #conversationLength = 32 as number;
    /**
     * The ID of the agent
     */
    agentId: UUID;
    /**
     * The base URL of the server where the agent's requests are processed.
     */
    serverUrl = "http://localhost:7998";

    /**
     * The database adapter used for interacting with the database.
     */
    databaseAdapter: IDatabaseAdapter;

    /**
     * Authentication token used for securing requests.
     */
    token: string | null;

    /**
     * Custom actions that the agent can perform.
     */
    actions: Action[] = [];

    /**
     * Evaluators used to assess and guide the agent's responses.
     */
    evaluators: Evaluator[] = [];

    /**
     * Context providers used to provide context for message generation.
     */
    providers: Provider[] = [];

    /**
     * Database adapters used to interact with the database.
     */
    adapters: Adapter[] = [];

    plugins: Plugin[] = [];

    /**
     * The model to use for generateText.
     */
    modelProvider: ModelProviderName;

    /**
     * The model to use for generateImage.
     */
    imageModelProvider: ModelProviderName;

    /**
     * The model to use for describing images.
     */
    imageVisionModelProvider: ModelProviderName;

    /**
     * Fetch function to use
     * Some environments may not have access to the global fetch function and need a custom fetch override.
     */
    fetch = fetch;

    /**
     * The character to use for the agent
     */
    character: Character;

    /**
     * Store messages that are sent and received by the agent.
     */
    messageManager: IMemoryManager;

    /**
     * Store and recall descriptions of users based on conversations.
     */
    descriptionManager: IMemoryManager;

    /**
     * Manage the creation and recall of static information (documents, historical game lore, etc)
     */
    loreManager: IMemoryManager;

    /**
     * Hold large documents that can be referenced
     */
    documentsManager: IMemoryManager;

    /**
     * Searchable document fragments
     */
    knowledgeManager: IMemoryManager;

    ragKnowledgeManager: IRAGKnowledgeManager;

    private readonly knowledgeRoot: string;

    services: Map<ServiceType, Service> = new Map();
    memoryManagers: Map<string, IMemoryManager> = new Map();
    cacheManager: ICacheManager;
    clients: ClientInstance[] = [];

    // verifiableInferenceAdapter?: IVerifiableInferenceAdapter;

    registerMemoryManager(manager: IMemoryManager): void {
        if (!manager.tableName) {
            throw new Error("Memory manager must have a tableName");
        }

        if (this.memoryManagers.has(manager.tableName)) {
            elizaLogger.warn(
                `Memory manager ${manager.tableName} is already registered. Skipping registration.`,
            );
            return;
        }

        this.memoryManagers.set(manager.tableName, manager);
    }

    getMemoryManager(tableName: string): IMemoryManager | null {
        return this.memoryManagers.get(tableName) || null;
    }

    getService<T extends Service>(service: ServiceType): T | null {
        const serviceInstance = this.services.get(service);
        if (!serviceInstance) {
            elizaLogger.error(`Service ${service} not found`);
            return null;
        }
        return serviceInstance as T;
    }

    async registerService(service: Service): Promise<void> {
        const serviceType = service.serviceType;
        elizaLogger.log(`${this.character.name}(${this.agentId}) - Registering service:`, serviceType);

        if (this.services.has(serviceType)) {
            elizaLogger.warn(
                `${this.character.name}(${this.agentId}) - Service ${serviceType} is already registered. Skipping registration.`
            );
            return;
        }

        // Add the service to the services map
        this.services.set(serviceType, service);
        elizaLogger.success(`${this.character.name}(${this.agentId}) - Service ${serviceType} registered successfully`);
    }

    /**
     * Creates an instance of AgentRuntime.
     * @param opts - The options for configuring the AgentRuntime.
     * @param opts.conversationLength - The number of messages to hold in the recent message cache.
     * @param opts.token - The JWT token, can be a JWT token if outside worker, or an OpenAI token if inside worker.
     * @param opts.serverUrl - The URL of the worker.
     * @param opts.actions - Optional custom actions.
     * @param opts.evaluators - Optional custom evaluators.
     * @param opts.services - Optional custom services.
     * @param opts.memoryManagers - Optional custom memory managers.
     * @param opts.providers - Optional context providers.
     * @param opts.model - The model to use for generateText.
     * @param opts.embeddingModel - The model to use for embedding.
     * @param opts.agentId - Optional ID of the agent.
     * @param opts.databaseAdapter - The database adapter used for interacting with the database.
     * @param opts.fetch - Custom fetch function to use for making requests.
     */

    constructor(opts: {
        conversationLength?: number; // number of messages to hold in the recent message cache
        agentId?: UUID; // ID of the agent
        character?: Character; // The character to use for the agent
        token: string; // JWT token, can be a JWT token if outside worker, or an OpenAI token if inside worker
        serverUrl?: string; // The URL of the worker
        actions?: Action[]; // Optional custom actions
        evaluators?: Evaluator[]; // Optional custom evaluators
        plugins?: Plugin[];
        providers?: Provider[];
        modelProvider: ModelProviderName;

        services?: Service[]; // Map of service name to service instance
        managers?: IMemoryManager[]; // Map of table name to memory manager
        databaseAdapter?: IDatabaseAdapter; // The database adapter used for interacting with the database
        fetch?: typeof fetch | unknown;
        speechModelPath?: string;
        cacheManager?: ICacheManager;
        logging?: boolean;
        // verifiableInferenceAdapter?: IVerifiableInferenceAdapter;
    }) {
        // use the character id if it exists, otherwise use the agentId if it is passed in, otherwise use the character name
        this.agentId =
            opts.character?.id ??
            opts?.agentId ??
            stringToUuid(opts.character?.name ?? uuidv4());
        this.character = opts.character;

        if(!this.character) {
            throw new Error("Character input is required");
        }

        elizaLogger.info(`${this.character.name}(${this.agentId}) - Initializing AgentRuntime with options:`, {
            character: opts.character?.name,
            modelProvider: opts.modelProvider,
            characterModelProvider: opts.character?.modelProvider,
        });

        elizaLogger.debug(
            `[AgentRuntime] Process working directory: ${process.cwd()}`,
        );

        // Define the root path once
        this.knowledgeRoot = join(
            process.cwd(),
            "..",
            "characters",
            "knowledge",
        );

        elizaLogger.debug(
            `[AgentRuntime] Process knowledgeRoot: ${this.knowledgeRoot}`,
        );

        this.#conversationLength =
            opts.conversationLength ?? this.#conversationLength;

        this.databaseAdapter = opts.databaseAdapter;

        elizaLogger.success(`Agent ID: ${this.agentId}`);

        this.fetch = (opts.fetch as typeof fetch) ?? this.fetch;

        this.cacheManager = opts.cacheManager;

        this.messageManager = new MemoryManager({
            runtime: this,
            tableName: "messages",
        });

        this.descriptionManager = new MemoryManager({
            runtime: this,
            tableName: "descriptions",
        });

        this.loreManager = new MemoryManager({
            runtime: this,
            tableName: "lore",
        });

        this.documentsManager = new MemoryManager({
            runtime: this,
            tableName: "documents",
        });

        this.knowledgeManager = new MemoryManager({
            runtime: this,
            tableName: "fragments",
        });

        this.ragKnowledgeManager = new RAGKnowledgeManager({
            runtime: this,
            tableName: "knowledge",
            knowledgeRoot: this.knowledgeRoot,
        });

        (opts.managers ?? []).forEach((manager: IMemoryManager) => {
            this.registerMemoryManager(manager);
        });

        (opts.services ?? []).forEach((service: Service) => {
            this.registerService(service);
        });

        this.serverUrl = opts.serverUrl ?? this.serverUrl;

        elizaLogger.info(`${this.character.name}(${this.agentId}) - Setting Model Provider:`, {
            characterModelProvider: this.character.modelProvider,
            optsModelProvider: opts.modelProvider,
            currentModelProvider: this.modelProvider,
            finalSelection:
                this.character.modelProvider ??
                opts.modelProvider ??
                this.modelProvider,
        });

        this.modelProvider =
            this.character.modelProvider ??
            opts.modelProvider ??
            this.modelProvider;

        this.imageModelProvider =
            this.character.imageModelProvider ?? this.modelProvider;

        this.imageVisionModelProvider =
            this.character.imageVisionModelProvider ?? this.modelProvider;

        elizaLogger.info(
          `${this.character.name}(${this.agentId}) - Selected model provider:`,
          this.modelProvider
        );

        elizaLogger.info(
          `${this.character.name}(${this.agentId}) - Selected image model provider:`,
          this.imageModelProvider
        );

        elizaLogger.info(
            `${this.character.name}(${this.agentId}) - Selected image vision model provider:`,
            this.imageVisionModelProvider
        );

        // Validate model provider
        if (!Object.values(ModelProviderName).includes(this.modelProvider)) {
            elizaLogger.error("Invalid model provider:", this.modelProvider);
            elizaLogger.error(
                "Available providers:",
                Object.values(ModelProviderName),
            );
            throw new Error(`Invalid model provider: ${this.modelProvider}`);
        }

        if (!this.serverUrl) {
            elizaLogger.warn("No serverUrl provided, defaulting to localhost");
        }

        this.token = opts.token;

        this.plugins = [
            ...(opts.character?.plugins ?? []),
            ...(opts.plugins ?? []),
        ];

        this.plugins.forEach((plugin) => {
            plugin.actions?.forEach((action) => {
                this.registerAction(action);
            });

            plugin.evaluators?.forEach((evaluator) => {
                this.registerEvaluator(evaluator);
            });

            plugin.services?.forEach((service) => {
                this.registerService(service);
            });

            plugin.providers?.forEach((provider) => {
                this.registerContextProvider(provider);
            });

            plugin.adapters?.forEach((adapter) => {
                this.registerAdapter(adapter);
            });
        });

        (opts.actions ?? []).forEach((action) => {
            this.registerAction(action);
        });

        (opts.providers ?? []).forEach((provider) => {
            this.registerContextProvider(provider);
        });

        (opts.evaluators ?? []).forEach((evaluator: Evaluator) => {
            this.registerEvaluator(evaluator);
        });

        // this.verifiableInferenceAdapter = opts.verifiableInferenceAdapter;
    }

    private async initializeDatabase() {
        // By convention, we create a user and room using the agent id.
        // Memories related to it are considered global context for the agent.
        this.ensureRoomExists(this.agentId);
        this.ensureUserExists(
            this.agentId,
            this.character.username || this.character.name,
            this.character.name,
        ).then(() => {
            // postgres needs the user to exist before you can add a participant
            this.ensureParticipantExists(this.agentId, this.agentId);
        });
    }

    async initialize() {
        this.initializeDatabase();

        for (const [serviceType, service] of this.services.entries()) {
            try {
                await service.initialize(this);
                this.services.set(serviceType, service);
                elizaLogger.success(
                    `${this.character.name}(${this.agentId}) - Service ${serviceType} initialized successfully`
                );
            } catch (error) {
                elizaLogger.error(
                    `${this.character.name}(${this.agentId}) - Failed to initialize service ${serviceType}:`,
                    error
                );
                throw error;
            }
        }

        // should already be initiailized
        /*
        for (const plugin of this.plugins) {
            if (plugin.services)
                await Promise.all(
                    plugin.services?.map((service) => service.initialize(this)),
                );
        }
        */

        if (
            this.character &&
            this.character.knowledge &&
            this.character.knowledge.length > 0
        ) {
            elizaLogger.info(
                `[RAG Check] RAG Knowledge enabled: ${this.character.settings.ragKnowledge ? true : false}`,
            );
            elizaLogger.debug(
                `[RAG Check] Knowledge items:`,
                this.character.knowledge,
            );

            if (this.character.settings.ragKnowledge) {
                // Type guards with logging for each knowledge type
                const [directoryKnowledge, pathKnowledge, stringKnowledge] =
                    this.character.knowledge.reduce(
                        (acc, item) => {
                            if (typeof item === "object") {
                                if (isDirectoryItem(item)) {
                                    elizaLogger.debug(
                                        `[RAG Filter] Found directory item: ${JSON.stringify(item)}`,
                                    );
                                    acc[0].push(item);
                                } else if ("path" in item) {
                                    elizaLogger.debug(
                                        `[RAG Filter] Found path item: ${JSON.stringify(item)}`,
                                    );
                                    acc[1].push(item);
                                }
                            } else if (typeof item === "string") {
                                elizaLogger.debug(
                                    `[RAG Filter] Found string item: ${item.slice(0, 100)}...`,
                                );
                                acc[2].push(item);
                            }
                            return acc;
                        },
                        [[], [], []] as [
                            Array<{ directory: string; shared?: boolean }>,
                            Array<{ path: string; shared?: boolean }>,
                            Array<string>,
                        ],
                    );

                elizaLogger.info(
                    `[RAG Summary] Found ${directoryKnowledge.length} directories, ${pathKnowledge.length} paths, and ${stringKnowledge.length} strings`,
                );

                // Process each type of knowledge
                if (directoryKnowledge.length > 0) {
                    elizaLogger.info(
                        `[RAG Process] Processing directory knowledge sources:`,
                    );
                    for (const dir of directoryKnowledge) {
                        elizaLogger.info(
                            `  - Directory: ${dir.directory} (shared: ${!!dir.shared})`,
                        );
                        await this.processCharacterRAGDirectory(dir);
                    }
                }

                if (pathKnowledge.length > 0) {
                    elizaLogger.info(
                        `[RAG Process] Processing individual file knowledge sources`,
                    );
                    await this.processCharacterRAGKnowledge(pathKnowledge);
                }

                if (stringKnowledge.length > 0) {
                    elizaLogger.info(
                        `[RAG Process] Processing direct string knowledge`,
                    );
                    await this.processCharacterRAGKnowledge(stringKnowledge);
                }
            } else {
                // Non-RAG mode: only process string knowledge
                const stringKnowledge = this.character.knowledge.filter(
                    (item): item is string => typeof item === "string",
                );
                await this.processCharacterKnowledge(stringKnowledge);
            }

            // After all new knowledge is processed, clean up any deleted files
            elizaLogger.info(
                `[RAG Cleanup] Starting cleanup of deleted knowledge files`,
            );
            await this.ragKnowledgeManager.cleanupDeletedKnowledgeFiles();
            elizaLogger.info(`[RAG Cleanup] Cleanup complete`);
        }
    }

    async stop() {
        elizaLogger.debug("runtime::stop - character", this.character.name);
        // stop services, they don't have a stop function
        // just initialize

        // plugins
        // have actions, providers, evaluators (no start/stop)
        // services (just initialized), clients

        // client have a start
        for (const c of this.clients) {
            elizaLogger.log(
                "runtime::stop - requesting",
                c,
                "client stop for",
                this.character.name,
            );
            c.stop(this);
        }
        // we don't need to unregister with directClient
        // don't need to worry about knowledge
    }

    /**
     * Processes character knowledge by creating document memories and fragment memories.
     * This function takes an array of knowledge items, creates a document memory for each item if it doesn't exist,
     * then chunks the content into fragments, embeds each fragment, and creates fragment memories.
     * @param knowledge An array of knowledge items containing id, path, and content.
     */
    private async processCharacterKnowledge(items: string[]) {
        const ids = items.map(i => stringToUuid(i));
        const exists = await this.documentsManager.getMemoriesByIds(ids);
        const toAdd = [];
        for(const i in items) {
          const exist = exists[i];
          if (!exist) {
            toAdd.push([items[i], ids[i]]);
          }
        }
        if (!toAdd.length) return;
        elizaLogger.info('discovered ' + toAdd.length + ' new knowledge items')
        const chunkSize = 512;
        const ps = [];
        for (const a of toAdd) {
            const item = a[0];
            const knowledgeId = a[1];

            if (item.length > chunkSize) {
              // these are just slower
              elizaLogger.info(
                  this.character.name,
                  " knowledge item over 512 characters, splitting - ",
                  item.slice(0, 100),
              );
            }

            ps.push(knowledge.set(this, {
                id: knowledgeId,
                content: {
                    text: item,
                },
            }));
        }
        // wait for it all to be added
        await Promise.all(ps);
        elizaLogger.success(this.character.name, 'knowledge is synchronized');
    }

    /**
     * Processes character knowledge by creating document memories and fragment memories.
     * This function takes an array of knowledge items, creates a document knowledge for each item if it doesn't exist,
     * then chunks the content into fragments, embeds each fragment, and creates fragment knowledge.
     * An array of knowledge items or objects containing id, path, and content.
     */
    private async processCharacterRAGKnowledge(
        items: (string | { path: string; shared?: boolean })[],
    ) {
        let hasError = false;

        for (const item of items) {
            if (!item) continue;

            try {
                // Check if item is marked as shared
                let isShared = false;
                let contentItem = item;

                // Only treat as shared if explicitly marked
                if (typeof item === "object" && "path" in item) {
                    isShared = item.shared === true;
                    contentItem = item.path;
                } else {
                    contentItem = item;
                }

                // const knowledgeId = stringToUuid(contentItem);
                const knowledgeId = this.ragKnowledgeManager.generateScopedId(
                    contentItem,
                    isShared,
                );
                const fileExtension = contentItem
                    .split(".")
                    .pop()
                    ?.toLowerCase();

                // Check if it's a file or direct knowledge
                if (
                    fileExtension &&
                    ["md", "txt", "pdf"].includes(fileExtension)
                ) {
                    try {
                        const filePath = join(this.knowledgeRoot, contentItem);
                        // Get existing knowledge first with more detailed logging
                        elizaLogger.debug("[RAG Query]", {
                            knowledgeId,
                            agentId: this.agentId,
                            relativePath: contentItem,
                            fullPath: filePath,
                            isShared,
                            knowledgeRoot: this.knowledgeRoot,
                        });

                        // Get existing knowledge first
                        const existingKnowledge =
                            await this.ragKnowledgeManager.getKnowledge({
                                id: knowledgeId,
                                agentId: this.agentId, // Keep agentId as it's used in OR query
                            });

                        elizaLogger.debug("[RAG Query Result]", {
                            relativePath: contentItem,
                            fullPath: filePath,
                            knowledgeId,
                            isShared,
                            exists: existingKnowledge.length > 0,
                            knowledgeCount: existingKnowledge.length,
                            firstResult: existingKnowledge[0]
                                ? {
                                      id: existingKnowledge[0].id,
                                      agentId: existingKnowledge[0].agentId,
                                      contentLength:
                                          existingKnowledge[0].content.text
                                              .length,
                                  }
                                : null,
                            results: existingKnowledge.map((k) => ({
                                id: k.id,
                                agentId: k.agentId,
                                isBaseKnowledge: !k.id.includes("chunk"),
                            })),
                        });

                        // Read file content
                        const content: string = await readFile(
                            filePath,
                            "utf8",
                        );
                        if (!content) {
                            hasError = true;
                            continue;
                        }

                        if (existingKnowledge.length > 0) {
                            const existingContent =
                                existingKnowledge[0].content.text;

                            elizaLogger.debug("[RAG Compare]", {
                                path: contentItem,
                                knowledgeId,
                                isShared,
                                existingContentLength: existingContent.length,
                                newContentLength: content.length,
                                contentSample: content.slice(0, 100),
                                existingContentSample: existingContent.slice(
                                    0,
                                    100,
                                ),
                                matches: existingContent === content,
                            });

                            if (existingContent === content) {
                                elizaLogger.info(
                                    `${isShared ? "Shared knowledge" : "Knowledge"} ${contentItem} unchanged, skipping`,
                                );
                                continue;
                            }

                            // Content changed, remove old knowledge before adding new
                            elizaLogger.info(
                                `${isShared ? "Shared knowledge" : "Knowledge"} ${contentItem} changed, updating...`,
                            );
                            await this.ragKnowledgeManager.removeKnowledge(
                                knowledgeId,
                            );
                            await this.ragKnowledgeManager.removeKnowledge(
                                `${knowledgeId}-chunk-*` as UUID,
                            );
                        }

                        elizaLogger.info(
                            `Processing ${fileExtension.toUpperCase()} file content for`,
                            this.character.name,
                            "-",
                            contentItem,
                        );

                        await this.ragKnowledgeManager.processFile({
                            path: contentItem,
                            content: content,
                            type: fileExtension as "pdf" | "md" | "txt",
                            isShared: isShared,
                        });
                    } catch (error: any) {
                        hasError = true;
                        elizaLogger.error(
                            `Failed to read knowledge file ${contentItem}. Error details:`,
                            error?.message || error || "Unknown error",
                        );
                        continue;
                    }
                } else {
                    // Handle direct knowledge string
                    elizaLogger.info(
                        "Processing direct knowledge for",
                        this.character.name,
                        "-",
                        contentItem.slice(0, 100),
                    );

                    const existingKnowledge =
                        await this.ragKnowledgeManager.getKnowledge({
                            id: knowledgeId,
                            agentId: this.agentId,
                        });

                    if (existingKnowledge.length > 0) {
                        elizaLogger.info(
                            `Direct knowledge ${knowledgeId} already exists, skipping`,
                        );
                        continue;
                    }

                    await this.ragKnowledgeManager.createKnowledge({
                        id: knowledgeId,
                        agentId: this.agentId,
                        content: {
                            text: contentItem,
                            metadata: {
                                type: "direct",
                            },
                        },
                    });
                }
            } catch (error: any) {
                hasError = true;
                elizaLogger.error(
                    `Error processing knowledge item ${item}:`,
                    error?.message || error || "Unknown error",
                );
                continue;
            }
        }

        if (hasError) {
            elizaLogger.warn(
                "Some knowledge items failed to process, but continuing with available knowledge",
            );
        }
    }

    /**
     * Processes directory-based RAG knowledge by recursively loading and processing files.
     * @param dirConfig The directory configuration containing path and shared flag
     */
    private async processCharacterRAGDirectory(dirConfig: {
        directory: string;
        shared?: boolean;
    }) {
        if (!dirConfig.directory) {
            elizaLogger.error("[RAG Directory] No directory specified");
            return;
        }

        // Sanitize directory path to prevent traversal attacks
        const sanitizedDir = dirConfig.directory.replace(/\.\./g, "");
        const dirPath = join(this.knowledgeRoot, sanitizedDir);

        try {
            // Check if directory exists
            const dirExists = existsSync(dirPath);
            if (!dirExists) {
                elizaLogger.error(
                    `[RAG Directory] Directory does not exist: ${sanitizedDir}`,
                );
                return;
            }

            elizaLogger.debug(`[RAG Directory] Searching in: ${dirPath}`);
            // Use glob to find all matching files in directory
            const files = await glob("**/*.{md,txt,pdf}", {
                cwd: dirPath,
                nodir: true,
                absolute: false,
            });

            if (files.length === 0) {
                elizaLogger.warn(
                    `No matching files found in directory: ${dirConfig.directory}`,
                );
                return;
            }

            elizaLogger.info(
                `[RAG Directory] Found ${files.length} files in ${dirConfig.directory}`,
            );

            // Process files in batches to avoid memory issues
            const BATCH_SIZE = 5;
            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                const batch = files.slice(i, i + BATCH_SIZE);

                await Promise.all(
                    batch.map(async (file) => {
                        try {
                            const relativePath = join(sanitizedDir, file);

                            elizaLogger.debug(
                                `[RAG Directory] Processing file ${i + 1}/${files.length}:`,
                                {
                                    file,
                                    relativePath,
                                    shared: dirConfig.shared,
                                },
                            );

                            await this.processCharacterRAGKnowledge([
                                {
                                    path: relativePath,
                                    shared: dirConfig.shared,
                                },
                            ]);
                        } catch (error) {
                            elizaLogger.error(
                                `[RAG Directory] Failed to process file: ${file}`,
                                error instanceof Error
                                    ? {
                                          name: error.name,
                                          message: error.message,
                                          stack: error.stack,
                                      }
                                    : error,
                            );
                        }
                    }),
                );

                elizaLogger.debug(
                    `[RAG Directory] Completed batch ${Math.min(i + BATCH_SIZE, files.length)}/${files.length} files`,
                );
            }

            elizaLogger.success(
                `[RAG Directory] Successfully processed directory: ${sanitizedDir}`,
            );
        } catch (error) {
            elizaLogger.error(
                `[RAG Directory] Failed to process directory: ${sanitizedDir}`,
                error instanceof Error
                    ? {
                          name: error.name,
                          message: error.message,
                          stack: error.stack,
                      }
                    : error,
            );
            throw error; // Re-throw to let caller handle it
        }
    }

    getSetting(key: string) {
        // check if the key is in the character.settings.secrets object
        if (this.character.settings?.secrets?.[key]) {
            return this.character.settings.secrets[key];
        }
        // if not, check if it's in the settings object
        if (this.character.settings?.[key]) {
            return this.character.settings[key];
        }

        // if not, check if it's in the settings object
        if (settings[key]) {
            return settings[key];
        }

        return null;
    }

    /**
     * Get the number of messages that are kept in the conversation buffer.
     * @returns The number of recent messages to be kept in memory.
     */
    getConversationLength() {
        return this.#conversationLength;
    }

    /**
     * Register an action for the agent to perform.
     * @param action The action to register.
     */
    registerAction(action: Action) {
        elizaLogger.success(`${this.character.name}(${this.agentId}) - Registering action: ${action.name}`);
        this.actions.push(action);
    }

    /**
     * Register an evaluator to assess and guide the agent's responses.
     * @param evaluator The evaluator to register.
     */
    registerEvaluator(evaluator: Evaluator) {
        this.evaluators.push(evaluator);
    }

    /**
     * Register a context provider to provide context for message generation.
     * @param provider The context provider to register.
     */
    registerContextProvider(provider: Provider) {
        this.providers.push(provider);
    }

    /**
     * Register an adapter for the agent to use.
     * @param adapter The adapter to register.
     */
    registerAdapter(adapter: Adapter) {
        this.adapters.push(adapter);
    }

    /**
     * Process the actions of a message.
     * @param message The message to process.
     * @param content The content of the message to process actions from.
     */
    async processActions(
        message: Memory,
        responses: Memory[],
        state?: State,
        callback?: HandlerCallback,
    ): Promise<void> {
        for (const response of responses) {
            if (!response.content?.action) {
                elizaLogger.warn("No action found in the response content.");
                continue;
            }

            const normalizedAction = response.content.action
                .toLowerCase()
                .replace("_", "");

            elizaLogger.success(`Normalized action: ${normalizedAction}`);

            let action = this.actions.find(
                (a: { name: string }) =>
                    a.name
                        .toLowerCase()
                        .replace("_", "")
                        .includes(normalizedAction) ||
                    normalizedAction.includes(
                        a.name.toLowerCase().replace("_", ""),
                    ),
            );

            if (!action) {
                elizaLogger.info("Attempting to find action in similes.");
                for (const _action of this.actions) {
                    const simileAction = _action.similes.find(
                        (simile) =>
                            simile
                                .toLowerCase()
                                .replace("_", "")
                                .includes(normalizedAction) ||
                            normalizedAction.includes(
                                simile.toLowerCase().replace("_", ""),
                            ),
                    );
                    if (simileAction) {
                        action = _action;
                        elizaLogger.success(
                            `Action found in similes: ${action.name}`,
                        );
                        break;
                    }
                }
            }

            if (!action) {
                elizaLogger.error(
                    "No action found for",
                    response.content.action,
                );
                continue;
            }

            if (!action.handler) {
                elizaLogger.error(`Action ${action.name} has no handler.`);
                continue;
            }

            try {
                elizaLogger.info(
                    `Executing handler for action: ${action.name}`,
                );
                await action.handler(this, message, state, {}, callback);
            } catch (error) {
                elizaLogger.error(error);
            }
        }
    }

    /**
     * Evaluate the message and state using the registered evaluators.
     * @param message The message to evaluate.
     * @param state The state of the agent.
     * @param didRespond Whether the agent responded to the message.~
     * @param callback The handler callback
     * @returns The results of the evaluation.
     */
    async evaluate(
        message: Memory,
        state: State,
        didRespond?: boolean,
        callback?: HandlerCallback,
    ) {
        const evaluatorPromises = this.evaluators.map(
            async (evaluator: Evaluator) => {
                elizaLogger.log("Evaluating", evaluator.name);
                if (!evaluator.handler) {
                    return null;
                }
                if (!didRespond && !evaluator.alwaysRun) {
                    return null;
                }
                const result = await evaluator.validate(this, message, state);
                if (result) {
                    return evaluator;
                }
                return null;
            },
        );

        const resolvedEvaluators = await Promise.all(evaluatorPromises);
        const evaluatorsData = resolvedEvaluators.filter(
            (evaluator): evaluator is Evaluator => evaluator !== null,
        );

        // if there are no evaluators this frame, return
        if (!evaluatorsData || evaluatorsData.length === 0) {
            return [];
        }

        const context = composeContext({
            state: {
                ...state,
                evaluators: formatEvaluators(evaluatorsData),
                evaluatorNames: formatEvaluatorNames(evaluatorsData),
            },
            template:
                this.character.templates?.evaluationTemplate ||
                evaluationTemplate,
        });

        const result = await generateText({
            runtime: this,
            context,
            modelClass: ModelClass.SMALL,
            // verifiableInferenceAdapter: this.verifiableInferenceAdapter,
        });

        const evaluators = parseJsonArrayFromText(
            result,
        ) as unknown as string[];

        for (const evaluator of this.evaluators) {
            if (!evaluators?.includes(evaluator.name)) continue;

            if (evaluator.handler)
                await evaluator.handler(this, message, state, {}, callback);
        }

        return evaluators;
    }

    /**
     * Ensure the existence of a participant in the room. If the participant does not exist, they are added to the room.
     * @param userId - The user ID to ensure the existence of.
     * @throws An error if the participant cannot be added.
     */
    async ensureParticipantExists(userId: UUID, roomId: UUID) {
        const participants =
            await this.databaseAdapter.getParticipantsForAccount(userId);

        if (participants?.length === 0) {
            await this.databaseAdapter.addParticipant(userId, roomId);
        }
    }

    /**
     * Ensure the existence of a user in the database. If the user does not exist, they are added to the database.
     * @param userId - The user ID to ensure the existence of.
     * @param userName - The user name to ensure the existence of.
     * @returns
     */

    async ensureUserExists(
        userId: UUID,
        userName: string | null,
        name: string | null,
        email?: string | null,
        source?: string | null,
    ) {
        const account = await this.databaseAdapter.getAccountById(userId);
        if (!account) {
            await this.databaseAdapter.createAccount({
                id: userId,
                name: name || this.character.name || "Unknown User",
                username: userName || this.character.username || "Unknown",
                // TODO: We might not need these account pieces
                email: email || this.character.email || userId,
                // When invoke ensureUserExists and saving account.details
                // Performing a complete JSON.stringify on character will cause a TypeError: Converting circular structure to JSON error in some more complex plugins.
                details: this.character ? Object.assign({}, this.character, {
                    source,
                    plugins: this.character?.plugins?.map((plugin) => plugin.name),
                }) : { summary: "" },
            });
            elizaLogger.success(`User ${userName} created successfully.`);
        }
    }

    async ensureParticipantInRoom(userId: UUID, roomId: UUID) {
        const participants =
            await this.databaseAdapter.getParticipantsForRoom(roomId);
        if (!participants.includes(userId)) {
            await this.databaseAdapter.addParticipant(userId, roomId);
            if (userId === this.agentId) {
                elizaLogger.log(
                    `Agent ${this.character.name} linked to room ${roomId} successfully.`,
                );
            } else {
                elizaLogger.log(
                    `User ${userId} linked to room ${roomId} successfully.`,
                );
            }
        }
    }

    async ensureConnection(
        userId: UUID,
        roomId: UUID,
        userName?: string,
        userScreenName?: string,
        source?: string,
    ) {
        await Promise.all([
            this.ensureUserExists(
                this.agentId,
                this.character.username ?? "Agent",
                this.character.name ?? "Agent",
                source,
            ),
            this.ensureUserExists(
                userId,
                userName ?? "User" + userId,
                userScreenName ?? "User" + userId,
                source,
            ),
            this.ensureRoomExists(roomId),
        ]);

        await Promise.all([
            this.ensureParticipantInRoom(userId, roomId),
            this.ensureParticipantInRoom(this.agentId, roomId),
        ]);
    }

    /**
     * Ensure the existence of a room between the agent and a user. If no room exists, a new room is created and the user
     * and agent are added as participants. The room ID is returned.
     * @param userId - The user ID to create a room with.
     * @returns The room ID of the room between the agent and the user.
     * @throws An error if the room cannot be created.
     */
    async ensureRoomExists(roomId: UUID) {
        const room = await this.databaseAdapter.getRoom(roomId);
        if (!room) {
            await this.databaseAdapter.createRoom(roomId);
            elizaLogger.log(`Room ${roomId} created successfully.`);
        }
    }

    /**
     * Compose the state of the agent into an object that can be passed or used for response generation.
     * @param message The message to compose the state from.
     * @returns The state of the agent.
     */
    async composeState(
        message: Memory,
        additionalKeys: { [key: string]: unknown } = {},
    ) {
        const { userId, roomId } = message;

        const conversationLength = this.getConversationLength();

        const [actorsData, recentMessagesData, goalsData]: [
            Actor[],
            Memory[],
            Goal[],
        ] = await Promise.all([
            getActorDetails({ runtime: this, roomId }),
            this.messageManager.getMemories({
                roomId,
                count: conversationLength,
                unique: false,
            }),
            getGoals({
                runtime: this,
                count: 10,
                onlyInProgress: false,
                roomId,
            }),
        ]);

        const goals = formatGoalsAsString({ goals: goalsData });

        const actors = formatActors({ actors: actorsData ?? [] });

        const recentMessages = formatMessages({
            messages: recentMessagesData,
            actors: actorsData,
        });

        const recentPosts = formatPosts({
            messages: recentMessagesData,
            actors: actorsData,
            conversationHeader: false,
        });

        // const lore = formatLore(loreData);

        const senderName = actorsData?.find(
            (actor: Actor) => actor.id === userId,
        )?.name;

        // TODO: We may wish to consolidate and just accept character.name here instead of the actor name
        const agentName =
            actorsData?.find((actor: Actor) => actor.id === this.agentId)
                ?.name || this.character.name;

        let allAttachments = message.content.attachments || [];

        if (recentMessagesData && Array.isArray(recentMessagesData)) {
            const lastMessageWithAttachment = recentMessagesData.find(
                (msg) =>
                    msg.content.attachments &&
                    msg.content.attachments.length > 0,
            );

            if (lastMessageWithAttachment) {
                const lastMessageTime =
                    lastMessageWithAttachment?.createdAt ?? Date.now();
                const oneHourBeforeLastMessage =
                    lastMessageTime - 60 * 60 * 1000; // 1 hour before last message

                allAttachments = recentMessagesData.reverse().flatMap((msg) => {
                    const msgTime = msg.createdAt ?? Date.now();
                    const isWithinTime = msgTime >= oneHourBeforeLastMessage;
                    const attachments = msg.content.attachments || [];
                    if (!isWithinTime) {
                        attachments.forEach((attachment) => {
                            attachment.text = "[Hidden]";
                        });
                    }
                    return attachments;
                });
            }
        }

        const formattedAttachments = allAttachments
            .map(
                (attachment) =>
                    `ID: ${attachment.id}
Name: ${attachment.title}
URL: ${attachment.url}
Type: ${attachment.source}
Description: ${attachment.description}
Text: ${attachment.text}
  `,
            )
            .join("\n");

        // randomly get 3 bits of lore and join them into a paragraph, divided by \n
        let lore = "";
        // Assuming this.lore is an array of lore bits
        if (this.character.lore && this.character.lore.length > 0) {
            const shuffledLore = [...this.character.lore].sort(
                () => Math.random() - 0.5,
            );
            const selectedLore = shuffledLore.slice(0, 10);
            lore = selectedLore.join("\n");
        }

        const formattedCharacterPostExamples = this.character.postExamples
            .sort(() => 0.5 - Math.random())
            .map((post) => {
                const messageString = `${post}`;
                return messageString;
            })
            .slice(0, 50)
            .join("\n");

        const formattedCharacterMessageExamples = this.character.messageExamples
            .sort(() => 0.5 - Math.random())
            .slice(0, 5)
            .map((example) => {
                const exampleNames = Array.from({ length: 5 }, () =>
                    uniqueNamesGenerator({ dictionaries: [names] }),
                );

                return example
                    .map((message) => {
                        let messageString = `${message.user}: ${message.content.text}`;
                        exampleNames.forEach((name, index) => {
                            const placeholder = `{{user${index + 1}}}`;
                            messageString = messageString.replaceAll(
                                placeholder,
                                name,
                            );
                        });
                        return messageString;
                    })
                    .join("\n");
            })
            .join("\n\n");

        const getRecentInteractions = async (
            userA: UUID,
            userB: UUID,
        ): Promise<Memory[]> => {
            // Find all rooms where userA and userB are participants
            const rooms = await this.databaseAdapter.getRoomsForParticipants([
                userA,
                userB,
            ]);

            // Check the existing memories in the database
            return this.messageManager.getMemoriesByRoomIds({
                // filter out the current room id from rooms
                roomIds: rooms.filter((room) => room !== roomId),
                limit: 20,
            });
        };

        const recentInteractions =
            userId !== this.agentId
                ? await getRecentInteractions(userId, this.agentId)
                : [];

        const getRecentMessageInteractions = async (
            recentInteractionsData: Memory[],
        ): Promise<string> => {
            // Format the recent messages
            const formattedInteractions = await Promise.all(
                recentInteractionsData.map(async (message) => {
                    const isSelf = message.userId === this.agentId;
                    let sender: string;
                    if (isSelf) {
                        sender = this.character.name;
                    } else {
                        const accountId =
                            await this.databaseAdapter.getAccountById(
                                message.userId,
                            );
                        sender = accountId?.username || "unknown";
                    }
                    return `${sender}: ${message.content.text}`;
                }),
            );

            return formattedInteractions.join("\n");
        };

        const formattedMessageInteractions =
            await getRecentMessageInteractions(recentInteractions);

        const getRecentPostInteractions = async (
            recentInteractionsData: Memory[],
            actors: Actor[],
        ): Promise<string> => {
            const formattedInteractions = formatPosts({
                messages: recentInteractionsData,
                actors,
                conversationHeader: true,
            });

            return formattedInteractions;
        };

        const formattedPostInteractions = await getRecentPostInteractions(
            recentInteractions,
            actorsData,
        );

        // if bio is a string, use it. if its an array, pick one at random
        let bio = this.character.bio || "";
        if (Array.isArray(bio)) {
            // get three random bio strings and join them with " "
            bio = bio
                .sort(() => 0.5 - Math.random())
                .slice(0, 3)
                .join(" ");
        }

        let knowledgeData = [];
        let formattedKnowledge = "";

        if (this.character.settings?.ragKnowledge) {
            const recentContext = recentMessagesData
                .sort((a, b) => b.createdAt - a.createdAt) // Sort by timestamp descending (newest first)
                .slice(0, 3) // Get the 3 most recent messages
                .reverse() // Reverse to get chronological order
                .map((msg) => msg.content.text)
                .join(" ");

            knowledgeData = await this.ragKnowledgeManager.getKnowledge({
                query: message.content.text,
                conversationContext: recentContext,
                limit: 8,
            });

            formattedKnowledge = formatKnowledge(knowledgeData);
        } else {
            knowledgeData = await knowledge.get(this, message);

            formattedKnowledge = formatKnowledge(knowledgeData);
        }

        const initialState = {
            agentId: this.agentId,
            agentName,
            bio,
            lore,
            adjective:
                this.character.adjectives &&
                this.character.adjectives.length > 0
                    ? this.character.adjectives[
                          Math.floor(
                              Math.random() * this.character.adjectives.length,
                          )
                      ]
                    : "",
            knowledge: formattedKnowledge,
            knowledgeData: knowledgeData,
            ragKnowledgeData: knowledgeData,
            // Recent interactions between the sender and receiver, formatted as messages
            recentMessageInteractions: formattedMessageInteractions,
            // Recent interactions between the sender and receiver, formatted as posts
            recentPostInteractions: formattedPostInteractions,
            // Raw memory[] array of interactions
            recentInteractionsData: recentInteractions,
            // randomly pick one topic
            topic:
                this.character.topics && this.character.topics.length > 0
                    ? this.character.topics[
                          Math.floor(
                              Math.random() * this.character.topics.length,
                          )
                      ]
                    : null,
            topics:
                this.character.topics && this.character.topics.length > 0
                    ? `${this.character.name} is interested in ` +
                      this.character.topics
                          .sort(() => 0.5 - Math.random())
                          .slice(0, 5)
                          .map((topic, index, array) => {
                              if (index === array.length - 2) {
                                  return topic + " and ";
                              }
                              // if last topic, don't add a comma
                              if (index === array.length - 1) {
                                  return topic;
                              }
                              return topic + ", ";
                          })
                          .join("")
                    : "",
            characterPostExamples:
                formattedCharacterPostExamples &&
                formattedCharacterPostExamples.replaceAll("\n", "").length > 0
                    ? addHeader(
                          `# Example Posts for ${this.character.name}`,
                          formattedCharacterPostExamples,
                      )
                    : "",
            characterMessageExamples:
                formattedCharacterMessageExamples &&
                formattedCharacterMessageExamples.replaceAll("\n", "").length >
                    0
                    ? addHeader(
                          `# Example Conversations for ${this.character.name}`,
                          formattedCharacterMessageExamples,
                      )
                    : "",
            messageDirections:
                this.character?.style?.all?.length > 0 ||
                this.character?.style?.chat.length > 0
                    ? addHeader(
                          "# Message Directions for " + this.character.name,
                          (() => {
                              const all = this.character?.style?.all || [];
                              const chat = this.character?.style?.chat || [];
                              return [...all, ...chat].join("\n");
                          })(),
                      )
                    : "",

            postDirections:
                this.character?.style?.all?.length > 0 ||
                this.character?.style?.post.length > 0
                    ? addHeader(
                          "# Post Directions for " + this.character.name,
                          (() => {
                              const all = this.character?.style?.all || [];
                              const post = this.character?.style?.post || [];
                              return [...all, ...post].join("\n");
                          })(),
                      )
                    : "",

            //old logic left in for reference
            //food for thought. how could we dynamically decide what parts of the character to add to the prompt other than random? rag? prompt the llm to decide?
            /*
            postDirections:
                this.character?.style?.all?.length > 0 ||
                this.character?.style?.post.length > 0
                    ? addHeader(
                            "# Post Directions for " + this.character.name,
                            (() => {
                                const all = this.character?.style?.all || [];
                                const post = this.character?.style?.post || [];
                                const shuffled = [...all, ...post].sort(
                                    () => 0.5 - Math.random()
                                );
                                return shuffled
                                    .slice(0, conversationLength / 2)
                                    .join("\n");
                            })()
                        )
                    : "",*/
            // Agent runtime stuff
            senderName,
            actors:
                actors && actors.length > 0
                    ? addHeader("# Actors", actors)
                    : "",
            actorsData,
            roomId,
            goals:
                goals && goals.length > 0
                    ? addHeader(
                          "# Goals\n{{agentName}} should prioritize accomplishing the objectives that are in progress.",
                          goals,
                      )
                    : "",
            goalsData,
            recentMessages:
                recentMessages && recentMessages.length > 0
                    ? addHeader("# Conversation Messages", recentMessages)
                    : "",
            recentPosts:
                recentPosts && recentPosts.length > 0
                    ? addHeader("# Posts in Thread", recentPosts)
                    : "",
            recentMessagesData,
            attachments:
                formattedAttachments && formattedAttachments.length > 0
                    ? addHeader("# Attachments", formattedAttachments)
                    : "",
            ...additionalKeys,
        } as State;

        const actionPromises = this.actions.map(async (action: Action) => {
            const result = await action.validate(this, message, initialState);
            if (result) {
                return action;
            }
            return null;
        });

        const evaluatorPromises = this.evaluators.map(async (evaluator) => {
            const result = await evaluator.validate(
                this,
                message,
                initialState,
            );
            if (result) {
                return evaluator;
            }
            return null;
        });

        const [resolvedEvaluators, resolvedActions, providers] =
            await Promise.all([
                Promise.all(evaluatorPromises),
                Promise.all(actionPromises),
                getProviders(this, message, initialState),
            ]);

        const evaluatorsData = resolvedEvaluators.filter(
            Boolean,
        ) as Evaluator[];
        const actionsData = resolvedActions.filter(Boolean) as Action[];

        const actionState = {
            actionNames:
                "Possible response actions: " + formatActionNames(actionsData),
            actions:
                actionsData.length > 0
                    ? addHeader(
                          "# Available Actions",
                          formatActions(actionsData),
                      )
                    : "",
            actionExamples:
                actionsData.length > 0
                    ? addHeader(
                          "# Action Examples",
                          composeActionExamples(actionsData, 10),
                      )
                    : "",
            evaluatorsData,
            evaluators:
                evaluatorsData.length > 0
                    ? formatEvaluators(evaluatorsData)
                    : "",
            evaluatorNames:
                evaluatorsData.length > 0
                    ? formatEvaluatorNames(evaluatorsData)
                    : "",
            evaluatorExamples:
                evaluatorsData.length > 0
                    ? formatEvaluatorExamples(evaluatorsData)
                    : "",
            providers: addHeader(
                `# Additional Information About ${this.character.name} and The World`,
                providers,
            ),
        };

        return { ...initialState, ...actionState } as State;
    }

    async updateRecentMessageState(state: State): Promise<State> {
        const conversationLength = this.getConversationLength();
        const recentMessagesData = await this.messageManager.getMemories({
            roomId: state.roomId,
            count: conversationLength,
            unique: false,
        });

        const recentMessages = formatMessages({
            actors: state.actorsData ?? [],
            messages: recentMessagesData.map((memory: Memory) => {
                const newMemory = { ...memory };
                delete newMemory.embedding;
                return newMemory;
            }),
        });

        let allAttachments = [];

        if (recentMessagesData && Array.isArray(recentMessagesData)) {
            const lastMessageWithAttachment = recentMessagesData.find(
                (msg) =>
                    msg.content.attachments &&
                    msg.content.attachments.length > 0,
            );

            if (lastMessageWithAttachment) {
                const lastMessageTime =
                    lastMessageWithAttachment?.createdAt ?? Date.now();
                const oneHourBeforeLastMessage =
                    lastMessageTime - 60 * 60 * 1000; // 1 hour before last message

                allAttachments = recentMessagesData
                    .filter((msg) => {
                        const msgTime = msg.createdAt ?? Date.now();
                        return msgTime >= oneHourBeforeLastMessage;
                    })
                    .flatMap((msg) => msg.content.attachments || []);
            }
        }

        const formattedAttachments = allAttachments
            .map(
                (attachment) =>
                    `ID: ${attachment.id}
Name: ${attachment.title}
URL: ${attachment.url}
Type: ${attachment.source}
Description: ${attachment.description}
Text: ${attachment.text}
    `,
            )
            .join("\n");

        return {
            ...state,
            recentMessages: addHeader(
                "# Conversation Messages",
                recentMessages,
            ),
            recentMessagesData,
            attachments: formattedAttachments,
        } as State;
    }
}

const formatKnowledge = (knowledge: KnowledgeItem[]) => {
    // Group related content in a more natural way
    return knowledge.map(item => {
        // Get the main content text
        const text = item.content.text;

        // Clean up formatting but maintain natural text flow
        const cleanedText = text
            .trim()
            .replace(/\n{3,}/g, '\n\n'); // Replace excessive newlines

        return cleanedText;
    }).join('\n\n'); // Separate distinct pieces with double newlines
};

New packages/core/src/runtime.ts

import { SpanStatusCode, context, trace, type Context, type Span } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import { createUniqueUuid } from './entities';
import { decryptSecret, getSalt, safeReplacer } from './index';
import { InstrumentationService } from './instrumentation/service';
import logger from './logger';
import {
  ChannelType,
  ModelType,
  type Content,
  type KnowledgeItem,
  type MemoryMetadata,
} from './types';

import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import { BM25 } from './search';
import type {
  Action,
  Agent,
  Character,
  Component,
  Entity,
  Evaluator,
  HandlerCallback,
  IAgentRuntime,
  IDatabaseAdapter,
  Log,
  Memory,
  ModelHandler,
  ModelParamsMap,
  ModelResultMap,
  ModelTypeName,
  Participant,
  Plugin,
  Provider,
  Relationship,
  Room,
  Route,
  RuntimeSettings,
  SendHandlerFunction,
  Service,
  ServiceInstance,
  ServiceTypeRegistry,
  ServiceTypeName,
  State,
  TargetInfo,
  Task,
  TaskWorker,
  UUID,
  World,
} from './types';
import { EventType, type MessagePayload } from './types';
import { stringToUuid } from './utils';

// Minimal interface for RagService to ensure type safety for delegation
// This avoids a direct import cycle if RagService imports from core.
interface RagServiceDelegator extends Service {
  getKnowledge(
    message: Memory,
    scope?: { roomId?: UUID; worldId?: UUID; entityId?: UUID }
  ): Promise<KnowledgeItem[]>;
  // Assuming _internalAddKnowledge is the method in RagService that takes these params
  _internalAddKnowledge(item: KnowledgeItem, options?: any, scope?: any): Promise<void>;
}

const environmentSettings: RuntimeSettings = {};

export class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];
  constructor(count: number) {
    this.permits = count;
  }
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits -= 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiting.push(resolve);
    });
  }
  release(): void {
    this.permits += 1;
    const nextResolve = this.waiting.shift();
    if (nextResolve && this.permits > 0) {
      this.permits -= 1;
      nextResolve();
    }
  }
}

export class AgentRuntime implements IAgentRuntime {
  readonly #conversationLength = 32 as number;
  readonly agentId: UUID;
  readonly character: Character;
  public adapter!: IDatabaseAdapter;
  readonly actions: Action[] = [];
  readonly evaluators: Evaluator[] = [];
  readonly providers: Provider[] = [];
  readonly plugins: Plugin[] = [];
  private isInitialized = false;
  events: Map<string, ((params: any) => Promise<void>)[]> = new Map();
  stateCache = new Map<
    UUID,
    {
      values: { [key: string]: any };
      data: { [key: string]: any };
      text: string;
    }
  >();
  readonly fetch = fetch;
  services = new Map<ServiceTypeName, Service>();
  private serviceTypes = new Map<ServiceTypeName, typeof Service>();
  models = new Map<string, ModelHandler[]>();
  routes: Route[] = [];
  private taskWorkers = new Map<string, TaskWorker>();
  private sendHandlers = new Map<string, SendHandlerFunction>();
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();

  public logger;
  private settings: RuntimeSettings;
  private servicesInitQueue = new Set<typeof Service>();
  instrumentationService: InstrumentationService;
  tracer: any;

  constructor(opts: {
    conversationLength?: number;
    agentId?: UUID;
    character?: Character;
    plugins?: Plugin[];
    fetch?: typeof fetch;
    adapter?: IDatabaseAdapter;
    settings?: RuntimeSettings;
    events?: { [key: string]: ((params: any) => void)[] };
  }) {
    this.agentId =
      opts.character?.id ??
      opts?.agentId ??
      stringToUuid(opts.character?.name ?? uuidv4() + opts.character?.username);
    this.character = opts.character;
    const logLevel = process.env.LOG_LEVEL || 'info';

    // Create the logger with appropriate level - only show debug logs when explicitly configured
    this.logger = logger.child({
      agentName: this.character?.name,
      agentId: this.agentId,
      level: logLevel === 'debug' ? 'debug' : 'error',
    });

    this.logger.debug(`[AgentRuntime] Process working directory: ${process.cwd()}`);

    this.#conversationLength = opts.conversationLength ?? this.#conversationLength;
    if (opts.adapter) {
      this.registerDatabaseAdapter(opts.adapter);
    }
    this.fetch = (opts.fetch as typeof fetch) ?? this.fetch;
    this.settings = opts.settings ?? environmentSettings;
    const plugins = opts?.plugins ?? [];
    this.plugins = plugins;
    if (process.env.INSTRUMENTATION_ENABLED === 'true') {
      try {
        this.instrumentationService = new InstrumentationService({
          serviceName: `agent-${this.character?.name || 'unknown'}-${this.agentId}`,
          enabled: true,
        });
        this.tracer = this.instrumentationService.getTracer('agent-runtime');

        this.logger.debug(`Instrumentation service initialized for agent ${this.agentId}`);
      } catch (error) {
        // If instrumentation fails, provide a fallback implementation
        this.logger.warn(`Failed to initialize instrumentation: ${error.message}`);
        // Create a no-op implementation
        this.instrumentationService = {
          getTracer: () => null,
          start: async () => {},
          stop: async () => {},
          isStarted: () => false,
          isEnabled: () => false,
          name: 'INSTRUMENTATION',
          capabilityDescription: 'Disabled instrumentation service (fallback)',
          instrumentationConfig: { enabled: false },
          getMeter: () => null,
          flush: async () => {},
        } as any;
        this.tracer = null;
      }
    }

    this.logger.debug(`Success: Agent ID: ${this.agentId}`);
  }

  async startSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    parentContext?: Context
  ): Promise<T> {
    if (!this.instrumentationService?.isEnabled?.() || !this.tracer) {
      const mockSpan = {
        setStatus: () => {},
        setAttribute: () => {},
        setAttributes: () => {},
        recordException: () => {},
        addEvent: () => {},
        end: () => {},
        isRecording: () => false,
        spanContext: () => ({ traceId: '', spanId: '', traceFlags: 0 }),
        updateName: () => {},
        addLink: () => {},
        addLinks: () => {},
      } as unknown as Span;
      return fn(mockSpan);
    }
    return this.tracer.startActiveSpan(name, parentContext, undefined, async (span: Span) => {
      try {
        span.setAttributes({
          'agent.id': this.agentId,
          'agent.name': this.character?.name || 'unknown',
        });
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (error: any) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        span.end();
        throw error;
      }
    });
  }

  endSpan(ctx: Context | undefined, name: string): void {}

  startActiveSpan(name: string, options: any = {}): Span {
    if (!this.instrumentationService?.isEnabled?.() || !this.tracer) {
      return {
        setStatus: () => {},
        setAttribute: () => {},
        setAttributes: () => {},
        recordException: () => {},
        addEvent: () => {},
        end: () => {},
        isRecording: () => false,
        spanContext: () => ({ traceId: '', spanId: '', traceFlags: 0 }),
        updateName: () => {},
        addLink: () => {},
        addLinks: () => {},
      } as unknown as Span;
    }
    return this.tracer.startSpan(name, options);
  }

  async registerPlugin(plugin: Plugin): Promise<void> {
    return this.startSpan('AgentRuntime.registerPlugin', async (span) => {
      span.setAttributes({
        'plugin.name': plugin?.name || 'unknown',
        'agent.id': this.agentId,
      });
      if (!plugin) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Plugin is undefined' });
        this.logger.error('*** registerPlugin plugin is undefined');
        throw new Error('*** registerPlugin plugin is undefined');
      }
      if (!this.plugins.some((p) => p.name === plugin.name)) {
        (this.plugins as Plugin[]).push(plugin);
        span.addEvent('plugin_added_to_array');
        this.logger.debug(`Success: Plugin ${plugin.name} registered successfully`);
      }
      if (plugin.init) {
        try {
          span.addEvent('initializing_plugin');
          await plugin.init(plugin.config || {}, this);
          span.addEvent('plugin_initialized');
          this.logger.debug(`Success: Plugin ${plugin.name} initialized successfully`);
        } catch (error) {
          // Check if the error is related to missing API keys
          const errorMessage = error instanceof Error ? error.message : String(error);
          span.setAttributes({
            'error.message': errorMessage,
            'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
          });
          if (
            errorMessage.includes('API key') ||
            errorMessage.includes('environment variables') ||
            errorMessage.includes('Invalid plugin configuration')
          ) {
            console.warn(`Plugin ${plugin.name} requires configuration. ${errorMessage}`);
            console.warn(
              'Please check your environment variables and ensure all required API keys are set.'
            );
            console.warn('You can set these in your .env file.');
            span.addEvent('plugin_configuration_warning');
          } else {
            span.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
            throw error;
          }
        }
      }
      if (plugin.adapter) {
        span.addEvent('registering_adapter');
        this.logger.debug(`Registering database adapter for plugin ${plugin.name}`);
        this.registerDatabaseAdapter(plugin.adapter);
      }
      if (plugin.actions) {
        span.addEvent('registering_actions');
        for (const action of plugin.actions) {
          this.registerAction(action);
        }
      }
      if (plugin.evaluators) {
        span.addEvent('registering_evaluators');
        for (const evaluator of plugin.evaluators) {
          this.registerEvaluator(evaluator);
        }
      }
      if (plugin.providers) {
        span.addEvent('registering_providers');
        for (const provider of plugin.providers) {
          this.registerContextProvider(provider);
        }
      }
      if (plugin.models) {
        span.addEvent('registering_models');
        for (const [modelType, handler] of Object.entries(plugin.models)) {
          this.registerModel(
            modelType as ModelTypeName,
            handler as (params: any) => Promise<any>,
            plugin.name,
            plugin?.priority
          );
        }
      }
      if (plugin.routes) {
        span.addEvent('registering_routes');
        for (const route of plugin.routes) {
          this.routes.push(route);
        }
      }
      if (plugin.events) {
        span.addEvent('registering_events');
        for (const [eventName, eventHandlers] of Object.entries(plugin.events)) {
          for (const eventHandler of eventHandlers) {
            this.registerEvent(eventName, eventHandler);
          }
        }
      }
      if (plugin.services) {
        span.addEvent('registering_services');
        for (const service of plugin.services) {
          if (this.isInitialized) {
            await this.registerService(service);
          } else {
            this.servicesInitQueue.add(service);
          }
        }
      }
      span.addEvent('plugin_registration_complete');
    });
  }

  getAllServices(): Map<ServiceTypeName, Service> {
    return this.services;
  }

  async stop() {
    return this.startSpan('AgentRuntime.stop', async (span) => {
      span.setAttributes({
        'agent.id': this.agentId,
        'agent.name': this.character?.name || 'unknown',
      });

      this.logger.debug(`runtime::stop - character ${this.character.name}`);
      span.addEvent('stopping_services');
      for (const [serviceName, service] of this.services) {
        this.logger.debug(`runtime::stop - requesting service stop for ${serviceName}`);
        span.addEvent(`stopping_service_${serviceName}`);
        await service.stop();
      }
      span.addEvent('all_services_stopped');
    });
  }

  async initialize(): Promise<void> {
    return this.startSpan('AgentRuntime.initialize', async (span) => {
      span.setAttributes({
        'agent.id': this.agentId,
        'agent.name': this.character?.name || 'unknown',
        'plugins.count': this.plugins.length,
      });
      if (this.isInitialized) {
        span.addEvent('agent_already_initialized');
        this.logger.warn('Agent already initialized');
        return;
      }
      span.addEvent('initialization_started');
      const registeredPluginNames = new Set<string>();
      const pluginRegistrationPromises = [];
      const initialPlugins = [...this.plugins];
      for (const plugin of initialPlugins) {
        if (plugin && !registeredPluginNames.has(plugin.name)) {
          registeredPluginNames.add(plugin.name);
          pluginRegistrationPromises.push(this.registerPlugin(plugin));
        }
      }
      await Promise.all(pluginRegistrationPromises);
      span.addEvent('plugins_setup');
      span.setAttributes({
        registered_plugins: Array.from(registeredPluginNames).join(','),
      });
      if (!this.adapter) {
        this.logger.error(
          'Database adapter not initialized. Make sure @elizaos/plugin-sql is included in your plugins.'
        );
        throw new Error(
          'Database adapter not initialized. The SQL plugin (@elizaos/plugin-sql) is required for agent initialization. Please ensure it is included in your character configuration.'
        );
      }
      try {
        await this.adapter.init();
        span.addEvent('adapter_initialized');
        const existingAgent = await this.adapter.ensureAgentExists(
          this.character as Partial<Agent>
        );
        span.addEvent('agent_exists_verified');
        if (!existingAgent) {
          const errorMsg = `Agent ${this.character.name} does not exist in database after ensureAgentExists call`;
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
          throw new Error(errorMsg);
        }

        // No need to transform agent's own ID
        let agentEntity = await this.getEntityById(this.agentId);

        if (!agentEntity) {
          span.addEvent('creating_agent_entity');
          const created = await this.createEntity({
            id: this.agentId,
            names: [this.character.name],
            metadata: {},
            agentId: existingAgent.id,
          });
          if (!created) {
            const errorMsg = `Failed to create entity for agent ${this.agentId}`;
            span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
            throw new Error(errorMsg);
          }

          agentEntity = await this.getEntityById(this.agentId);
          if (!agentEntity) throw new Error(`Agent entity not found for ${this.agentId}`);

          this.logger.debug(
            `Success: Agent entity created successfully for ${this.character.name}`
          );
          span.addEvent('agent_entity_created');
        } else {
          span.addEvent('agent_entity_exists');
        }
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        this.logger.error(`Failed to create agent entity: ${errorMsg}`);
        throw error;
      }
      try {
        span.addEvent('creating_group_and_plugins_already_registering');
        span.addEvent('room_created_and_plugins_registered');
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        this.logger.error(`Failed to initialize: ${errorMsg}`);
        throw error;
      }
      try {
        const room = await this.getRoom(this.agentId);
        if (!room) {
          const room = await this.createRoom({
            id: this.agentId,
            name: this.character.name,
            source: 'elizaos',
            type: ChannelType.SELF,
            channelId: this.agentId,
            serverId: this.agentId,
            worldId: this.agentId,
          });
        }
        span.addEvent('adding_agent_as_participant');
        const participants = await this.adapter.getParticipantsForRoom(this.agentId);
        if (!participants.includes(this.agentId)) {
          const added = await this.addParticipant(this.agentId, this.agentId);
          if (!added) {
            const errorMsg = `Failed to add agent ${this.agentId} as participant to its own room`;
            span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
            throw new Error(errorMsg);
          }
          this.logger.debug(`Agent ${this.character.name} linked to its own room successfully`);
          span.addEvent('agent_added_as_participant');
        } else {
          span.addEvent('agent_already_participant');
        }
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        this.logger.error(`Failed to add agent as participant: ${errorMsg}`);
        throw error;
      }
      const embeddingModel = this.getModel(ModelType.TEXT_EMBEDDING);
      if (!embeddingModel) {
        span.addEvent('embedding_model_missing');
        this.logger.warn(
          `[AgentRuntime][${this.character.name}] No TEXT_EMBEDDING model registered. Skipping embedding dimension setup.`
        );
      } else {
        span.addEvent('setting_up_embedding_dimension');
        await this.ensureEmbeddingDimension();
        span.addEvent('embedding_dimension_setup_complete');
      }
      span.addEvent('starting_deferred_services');
      span.setAttributes({
        'deferred_services.count': this.servicesInitQueue.size,
      });
      for (const service of this.servicesInitQueue) {
        await this.registerService(service);
      }
      this.isInitialized = true;
      span.addEvent('initialization_completed');
    });
  }

  async getConnection(): Promise<PGlite | Pool> {
    if (!this.adapter) {
      throw new Error('Database adapter not registered');
    }
    return this.adapter.getConnection();
  }

  setSetting(key: string, value: string | boolean | null | any, secret = false) {
    if (secret) {
      if (!this.character.secrets) {
        this.character.secrets = {};
      }
      this.character.secrets[key] = value;
    } else {
      if (!this.character.settings) {
        this.character.settings = {};
      }
      this.character.settings[key] = value;
    }
  }

  getSetting(key: string): string | boolean | null | any {
    const value =
      this.character.secrets?.[key] ||
      this.character.settings?.[key] ||
      this.character.settings?.secrets?.[key] ||
      this.settings[key];
    const decryptedValue = decryptSecret(value, getSalt());
    if (decryptedValue === 'true') return true;
    if (decryptedValue === 'false') return false;
    return decryptedValue || null;
  }

  getConversationLength() {
    return this.#conversationLength;
  }

  registerDatabaseAdapter(adapter: IDatabaseAdapter) {
    if (this.adapter) {
      this.logger.warn(
        'Database adapter already registered. Additional adapters will be ignored. This may lead to unexpected behavior.'
      );
    } else {
      this.adapter = adapter;
      this.logger.debug('Success: Database adapter registered successfully.');
    }
  }

  registerProvider(provider: Provider) {
    this.providers.push(provider);
    this.logger.debug(`Success: Provider ${provider.name} registered successfully.`);
  }

  registerAction(action: Action) {
    this.logger.debug(
      `${this.character.name}(${this.agentId}) - Registering action: ${action.name}`
    );
    if (this.actions.find((a) => a.name === action.name)) {
      this.logger.warn(
        `${this.character.name}(${this.agentId}) - Action ${action.name} already exists. Skipping registration.`
      );
    } else {
      this.actions.push(action);
      this.logger.debug(
        `${this.character.name}(${this.agentId}) - Action ${action.name} registered successfully.`
      );
    }
  }

  registerEvaluator(evaluator: Evaluator) {
    this.evaluators.push(evaluator);
  }

  registerContextProvider(provider: Provider) {
    this.providers.push(provider);
  }

  async processActions(
    message: Memory,
    responses: Memory[],
    state?: State,
    callback?: HandlerCallback
  ): Promise<void> {
    return this.startSpan('AgentRuntime.processActions', async (span) => {
      span.setAttributes({
        'message.id': message.id,
        'responses.count': responses.length,
        'agent.id': this.agentId,
      });
      for (const response of responses) {
        if (!response.content?.actions || response.content.actions.length === 0) {
          span.addEvent('no_actions_in_response');
          this.logger.warn('No action found in the response content.');
          continue;
        }
        const actions = response.content.actions;
        span.setAttributes({
          'actions.count': actions.length,
          'actions.names': JSON.stringify(actions),
        });
        function normalizeAction(actionString: string) {
          return actionString.toLowerCase().replace('_', '');
        }
        this.logger.debug(`Found actions: ${this.actions.map((a) => normalizeAction(a.name))}`);

        for (const responseAction of actions) {
          span.addEvent(`processing_action_${responseAction}`);
          state = await this.composeState(message, ['RECENT_MESSAGES']);

          this.logger.debug(`Success: Calling action: ${responseAction}`);
          const normalizedResponseAction = normalizeAction(responseAction);
          let action = this.actions.find(
            (a: { name: string }) =>
              normalizeAction(a.name).includes(normalizedResponseAction) ||
              normalizedResponseAction.includes(normalizeAction(a.name))
          );
          if (action) {
            span.addEvent(`found_exact_action_${action.name}`);
            this.logger.debug(`Success: Found action: ${action?.name}`);
          } else {
            span.addEvent('looking_for_similar_action');
            this.logger.debug('Attempting to find action in similes.');
            for (const _action of this.actions) {
              const simileAction = _action.similes?.find(
                (simile) =>
                  simile.toLowerCase().replace('_', '').includes(normalizedResponseAction) ||
                  normalizedResponseAction.includes(simile.toLowerCase().replace('_', ''))
              );
              if (simileAction) {
                action = _action;
                span.addEvent(`found_similar_action_${action.name}`);
                this.logger.debug(`Success: Action found in similes: ${action.name}`);
                break;
              }
            }
          }
          if (!action) {
            const errorMsg = `No action found for: ${responseAction}`;
            span.addEvent('action_not_found');
            span.setAttributes({
              'error.action': responseAction,
            });
            this.logger.error(errorMsg);

            const actionMemory: Memory = {
              id: uuidv4() as UUID,
              entityId: message.entityId,
              roomId: message.roomId,
              worldId: message.worldId,
              content: {
                thought: errorMsg,
                source: 'auto',
              },
            };
            await this.createMemory(actionMemory, 'messages');
            continue;
          }
          if (!action.handler) {
            span.addEvent('action_has_no_handler');
            span.setAttributes({
              'error.action': action.name,
            });
            this.logger.error(`Action ${action.name} has no handler.`);
            continue;
          }
          try {
            span.addEvent(`executing_action_${action.name}`);
            this.logger.debug(`Executing handler for action: ${action.name}`);

            // Wrap individual action handler invocation in its own span
            await this.startSpan(`Action.${action.name}`, async (actionSpan) => {
              actionSpan.setAttributes({
                'action.name': action.name,
                'parent_span.id': span.spanContext().spanId,
              });
              actionSpan.addEvent('action.input', {
                'message.id': message.id,
                'state.keys': state ? JSON.stringify(Object.keys(state.values)) : 'none',
                options: JSON.stringify({}),
                'responses.count': responses?.length ?? 0,
                'responses.ids': JSON.stringify(responses?.map((r) => r.id) ?? []),
              });
              try {
                const result = await action.handler(this, message, state, {}, callback, responses);
                actionSpan.addEvent('action.output', {
                  status: 'success',
                  result: JSON.stringify(result, safeReplacer()),
                });
                actionSpan.setStatus({ code: SpanStatusCode.OK });
              } catch (handlerError: any) {
                const handlerErrorMessage =
                  handlerError instanceof Error ? handlerError.message : String(handlerError);
                actionSpan.recordException(handlerError as Error);
                actionSpan.setStatus({ code: SpanStatusCode.ERROR, message: handlerErrorMessage });
                actionSpan.setAttributes({
                  'error.message': handlerErrorMessage,
                });
                actionSpan.addEvent('action.output', {
                  status: 'error',
                  error: handlerErrorMessage,
                });
                const actionMemory: Memory = {
                  id: uuidv4() as UUID,
                  entityId: message.entityId,
                  roomId: message.roomId,
                  worldId: message.worldId,
                  content: {
                    thought: handlerErrorMessage,
                    source: 'auto',
                  },
                };
                await this.createMemory(actionMemory, 'messages');
                throw handlerError;
              }
            });
            span.addEvent(`action_executed_successfully_${action.name}`);
            this.logger.debug(`Success: Action ${action.name} executed successfully.`);

            // log to database
            this.adapter.log({
              entityId: message.entityId,
              roomId: message.roomId,
              type: 'action',
              body: {
                action: action.name,
                message: message.content.text,
                messageId: message.id,
                state,
                responses,
              },
            });
          } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            span.recordException(error as Error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: errorMessage,
            });
            span.setAttributes({
              'error.action': action.name,
              'error.message': errorMessage,
            });
            this.logger.error(error);

            const actionMemory: Memory = {
              id: uuidv4() as UUID,
              content: {
                thought: errorMessage,
                source: 'auto',
              },
              entityId: message.entityId,
              roomId: message.roomId,
              worldId: message.worldId,
            };
            await this.createMemory(actionMemory, 'messages');
            throw error;
          }
        }
      }
    });
  }

  async evaluate(
    message: Memory,
    state: State,
    didRespond?: boolean,
    callback?: HandlerCallback,
    responses?: Memory[]
  ) {
    return this.startSpan('AgentRuntime.evaluate', async (span) => {
      span.setAttributes({
        'agent.id': this.agentId,
        'character.name': this.character?.name,
        'message.id': message?.id,
        'room.id': message?.roomId,
        'entity.id': message?.entityId,
        did_respond: didRespond,
        responses_count: responses?.length || 0,
      });
      span.addEvent('evaluation_started');
      const evaluatorPromises = this.evaluators.map(async (evaluator: Evaluator) => {
        if (!evaluator.handler) {
          return null;
        }
        if (!didRespond && !evaluator.alwaysRun) {
          return null;
        }
        const result = await evaluator.validate(this, message, state);
        if (result) {
          return evaluator;
        }
        return null;
      });
      const evaluators = (await Promise.all(evaluatorPromises)).filter(Boolean) as Evaluator[];
      span.setAttribute('selected_evaluators_count', evaluators.length);
      span.addEvent('evaluator_selection_complete', {
        'evaluator.names': JSON.stringify(evaluators.map((e) => e.name)),
      });
      if (evaluators.length === 0) {
        span.addEvent('no_evaluators_selected');
        return [];
      }
      state = await this.composeState(message, ['RECENT_MESSAGES', 'EVALUATORS']);
      span.addEvent('evaluator_execution_start');
      await Promise.all(
        evaluators.map(async (evaluator) => {
          if (evaluator.handler) {
            await evaluator.handler(this, message, state, {}, callback, responses);
            this.adapter.log({
              entityId: message.entityId,
              roomId: message.roomId,
              type: 'evaluator',
              body: {
                evaluator: evaluator.name,
                messageId: message.id,
                message: message.content.text,
                state,
              },
            });
          }
        })
      );
      span.addEvent('evaluator_execution_complete');
      span.addEvent('evaluation_complete');
      return evaluators;
    });
  }

  async ensureConnection({
    entityId,
    roomId,
    worldId,
    worldName,
    userName,
    name,
    source,
    type,
    channelId,
    serverId,
    userId,
    metadata,
  }: {
    entityId: UUID;
    roomId: UUID;
    worldId: UUID;
    worldName?: string;
    userName?: string;
    name?: string;
    source?: string;
    type?: ChannelType;
    channelId?: string;
    serverId?: string;
    userId?: UUID;
    metadata?: Record<string, any>;
  }) {
    if (!worldId && serverId) {
      worldId = createUniqueUuid(this.agentId + serverId, serverId);
    }
    const names = [name, userName].filter(Boolean);
    const entityMetadata = {
      [source!]: {
        id: userId,
        name: name,
        userName: userName,
      },
    };
    try {
      // First check if the entity exists
      const entity = await this.getEntityById(entityId);

      if (!entity) {
        try {
          const success = await this.createEntity({
            id: entityId,
            names,
            metadata: entityMetadata,
            agentId: this.agentId,
          });
          if (success) {
            this.logger.debug(
              `Created new entity ${entityId} for user ${name || userName || 'unknown'}`
            );
          } else {
            throw new Error(`Failed to create entity ${entityId}`);
          }
        } catch (error: any) {
          if (error.message?.includes('duplicate key') || error.code === '23505') {
            this.logger.debug(
              `Entity ${entityId} exists in database but not for this agent. This is normal in multi-agent setups.`
            );
          } else {
            throw error;
          }
        }
      } else {
        await this.adapter.updateEntity({
          id: entityId,
          names: [...new Set([...(entity.names || []), ...names])].filter(Boolean) as string[],
          metadata: {
            ...entity.metadata,
            [source!]: {
              ...entity.metadata?.[source!],
              name: name,
              userName: userName,
            },
          },
          agentId: this.agentId,
        });
      }
      await this.ensureWorldExists({
        id: worldId,
        name: worldName || serverId ? `World for server ${serverId}` : `World for room ${roomId}`,
        agentId: this.agentId,
        serverId: serverId || 'default',
        metadata,
      });
      await this.ensureRoomExists({
        id: roomId,
        name: name,
        source,
        type,
        channelId,
        serverId,
        worldId,
      });
      try {
        await this.ensureParticipantInRoom(entityId, roomId);
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          const added = await this.addParticipant(entityId, roomId);
          if (!added) {
            throw new Error(`Failed to add participant ${entityId} to room ${roomId}`);
          }
          this.logger.debug(`Added participant ${entityId} to room ${roomId} directly`);
        } else {
          throw error;
        }
      }
      await this.ensureParticipantInRoom(this.agentId, roomId);

      this.logger.debug(`Success: Successfully connected entity ${entityId} in room ${roomId}`);
    } catch (error) {
      this.logger.error(
        `Failed to ensure connection: ${error instanceof Error ? error.message : String(error)}`
      );
      throw error;
    }
  }

  async ensureParticipantInRoom(entityId: UUID, roomId: UUID) {
    // Make sure entity exists in database before adding as participant
    const entity = await this.getEntityById(entityId);

    // If entity is not found but it's not the agent itself, we might still want to proceed
    // This can happen when an entity exists in the database but isn't associated with this agent
    if (!entity && entityId !== this.agentId) {
      this.logger.warn(
        `Entity ${entityId} not directly accessible to agent ${this.agentId}. Will attempt to add as participant anyway.`
      );
    } else if (!entity && entityId === this.agentId) {
      throw new Error(`Agent entity ${entityId} not found, cannot add as participant.`);
    } else if (!entity) {
      throw new Error(`User entity ${entityId} not found, cannot add as participant.`);
    }
    const participants = await this.adapter.getParticipantsForRoom(roomId);
    if (!participants.includes(entityId)) {
      // Add participant using the ID
      const added = await this.addParticipant(entityId, roomId);

      if (!added) {
        throw new Error(`Failed to add participant ${entityId} to room ${roomId}`);
      }
      if (entityId === this.agentId) {
        this.logger.debug(`Agent ${this.character.name} linked to room ${roomId} successfully.`);
      } else {
        this.logger.debug(`User ${entityId} linked to room ${roomId} successfully.`);
      }
    }
  }

  async removeParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    return await this.adapter.removeParticipant(entityId, roomId);
  }

  async getParticipantsForEntity(entityId: UUID): Promise<Participant[]> {
    return await this.adapter.getParticipantsForEntity(entityId);
  }

  async getParticipantsForRoom(roomId: UUID): Promise<UUID[]> {
    return await this.adapter.getParticipantsForRoom(roomId);
  }

  async addParticipant(entityId: UUID, roomId: UUID): Promise<boolean> {
    return await this.adapter.addParticipantsRoom([entityId], roomId);
  }

  async addParticipantsRoom(entityIds: UUID[], roomId: UUID): Promise<boolean> {
    return await this.adapter.addParticipantsRoom(entityIds, roomId);
  }

  /**
   * Ensure the existence of a world.
   */
  async ensureWorldExists({ id, name, serverId, metadata }: World) {
    const world = await this.getWorld(id);
    if (!world) {
      this.logger.debug('Creating world:', {
        id,
        name,
        serverId,
        agentId: this.agentId,
      });
      await this.adapter.createWorld({
        id,
        name,
        agentId: this.agentId,
        serverId: serverId || 'default',
        metadata,
      });
      this.logger.debug(`World ${id} created successfully.`);
    }
  }

  async ensureRoomExists({ id, name, source, type, channelId, serverId, worldId, metadata }: Room) {
    if (!worldId) throw new Error('worldId is required');
    const room = await this.getRoom(id);
    if (!room) {
      await this.createRoom({
        id,
        name,
        agentId: this.agentId,
        source,
        type,
        channelId,
        serverId,
        worldId,
        metadata,
      });
      this.logger.debug(`Room ${id} created successfully.`);
    }
  }

  async composeState(
    message: Memory,
    includeList: string[] | null = null,
    onlyInclude = false,
    skipCache = false
  ): Promise<State> {
    const filterList = onlyInclude ? includeList : null;
    return this.startSpan('AgentRuntime.composeState', async (span) => {
      span.setAttributes({
        'message.id': message.id,
        'agent.id': this.agentId,
        filter_list: filterList ? JSON.stringify(filterList) : 'none',
        include_list: includeList ? JSON.stringify(includeList) : 'none',
      });
      span.addEvent('state_composition_started');
      const emptyObj = {
        values: {},
        data: {},
        text: '',
      } as State;
      const cachedState = skipCache
        ? emptyObj
        : (await this.stateCache.get(message.id)) || emptyObj;
      const existingProviderNames = cachedState.data.providers
        ? Object.keys(cachedState.data.providers)
        : [];
      span.setAttributes({
        cached_state_exists: !!cachedState.data.providers,
        existing_providers_count: existingProviderNames.length,
        existing_providers: JSON.stringify(existingProviderNames),
      });
      const providerNames = new Set<string>();
      if (filterList && filterList.length > 0) {
        filterList.forEach((name) => providerNames.add(name));
      } else {
        this.providers
          .filter((p) => !p.private && !p.dynamic)
          .forEach((p) => providerNames.add(p.name));
      }
      if (!filterList && includeList && includeList.length > 0) {
        includeList.forEach((name) => providerNames.add(name));
      }
      const providersToGet = Array.from(
        new Set(this.providers.filter((p) => providerNames.has(p.name)))
      ).sort((a, b) => (a.position || 0) - (b.position || 0));
      const providerNamesToGet = providersToGet.map((p) => p.name);
      span.setAttributes({
        providers_to_get_count: providersToGet.length,
        providers_to_get: JSON.stringify(providerNamesToGet),
      });
      span.addEvent('starting_provider_fetch');
      const providerData = await Promise.all(
        providersToGet.map(async (provider) => {
          return this.startSpan(`provider.${provider.name}`, async (providerSpan) => {
            const start = Date.now();
            try {
              const result = await provider.get(this, message, cachedState);
              const duration = Date.now() - start;
              providerSpan.setAttributes({
                'provider.name': provider.name,
                'provider.duration_ms': duration,
                'result.has_text': !!result.text,
                'result.values_keys': result.values
                  ? JSON.stringify(Object.keys(result.values))
                  : '[]',
              });
              providerSpan.addEvent('provider_fetch_complete');

              this.logger.debug(`${provider.name} Provider took ${duration}ms to respond`);
              return {
                ...result,
                providerName: provider.name,
              };
            } catch (error: any) {
              const duration = Date.now() - start;
              const errorMessage = error instanceof Error ? error.message : String(error);
              providerSpan.recordException(error as Error);
              providerSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMessage });
              providerSpan.setAttributes({
                'provider.name': provider.name,
                'provider.duration_ms': duration,
                'error.message': errorMessage,
              });
              providerSpan.addEvent('provider_fetch_error');
              return { values: {}, text: '', data: {}, providerName: provider.name };
            }
          });
        })
      );
      const currentProviderResults = { ...(cachedState.data?.providers || {}) };
      for (const freshResult of providerData) {
        currentProviderResults[freshResult.providerName] = freshResult;
      }
      const orderedTexts: string[] = [];
      for (const provider of providersToGet) {
        const result = currentProviderResults[provider.name];
        if (result && result.text && result.text.trim() !== '') {
          orderedTexts.push(result.text);
        }
      }
      const providersText = orderedTexts.join('\n');
      const aggregatedStateValues = { ...(cachedState.values || {}) };
      for (const provider of providersToGet) {
        const providerResult = currentProviderResults[provider.name];
        if (providerResult && providerResult.values && typeof providerResult.values === 'object') {
          Object.assign(aggregatedStateValues, providerResult.values);
        }
      }
      for (const providerName in currentProviderResults) {
        if (!providersToGet.some((p) => p.name === providerName)) {
          const providerResult = currentProviderResults[providerName];
          if (
            providerResult &&
            providerResult.values &&
            typeof providerResult.values === 'object'
          ) {
            Object.assign(aggregatedStateValues, providerResult.values);
          }
        }
      }
      const newState = {
        values: {
          ...aggregatedStateValues,
          providers: providersText,
        },
        data: {
          ...(cachedState.data || {}),
          providers: currentProviderResults,
        },
        text: providersText,
      } as State;
      this.stateCache.set(message.id, newState);
      const finalProviderCount = Object.keys(currentProviderResults).length;
      const finalProviderNames = Object.keys(currentProviderResults);
      const finalValueKeys = Object.keys(newState.values);
      span.setAttributes({
        'context.sources.provider_count': finalProviderCount,
        'context.sources.provider_names': JSON.stringify(finalProviderNames),
        'context.state.value_keys': JSON.stringify(finalValueKeys),
        'context.state.text_length': providersText.length,
        'context.sources.used_memory': finalProviderNames.includes('RECENT_MESSAGES'),
        'context.sources.used_knowledge': finalProviderNames.includes('KNOWLEDGE'),
        'context.sources.used_character': finalProviderNames.includes('CHARACTER'),
        'context.sources.used_actions': finalProviderNames.includes('ACTIONS'),
        'context.sources.used_facts': finalProviderNames.includes('FACTS'),
      });
      span.addEvent('context.composed', {
        'context.final_string':
          providersText.length > 1000 ? providersText.substring(0, 997) + '...' : providersText,
        'context.final_length': providersText.length,
      });
      span.addEvent('state_composition_complete');
      return newState;
    });
  }

  getService<T extends Service = Service>(serviceName: ServiceTypeName | string): T | null {
    const serviceInstance = this.services.get(serviceName as ServiceTypeName);
    if (!serviceInstance) {
      // it's not a warn, a plugin might just not be installed
      this.logger.debug(`Service ${serviceName} not found`);
      return null;
    }
    return serviceInstance as T;
  }

  /**
   * Type-safe service getter that ensures the correct service type is returned
   * @template T - The expected service class type
   * @param serviceName - The service type name
   * @returns The service instance with proper typing, or null if not found
   */
  getTypedService<T extends Service = Service>(serviceName: ServiceTypeName | string): T | null {
    return this.getService<T>(serviceName);
  }

  /**
   * Get all registered service types
   * @returns Array of registered service type names
   */
  getRegisteredServiceTypes(): ServiceTypeName[] {
    return Array.from(this.services.keys());
  }

  /**
   * Check if a service type is registered
   * @param serviceType - The service type to check
   * @returns true if the service is registered
   */
  hasService(serviceType: ServiceTypeName | string): boolean {
    return this.services.has(serviceType as ServiceTypeName);
  }

  async registerService(serviceDef: typeof Service): Promise<void> {
    return this.startSpan('AgentRuntime.registerService', async (span) => {
      const serviceType = serviceDef.serviceType as ServiceTypeName;
      span.setAttributes({
        'service.type': serviceType || 'unknown',
        'agent.id': this.agentId,
      });
      if (!serviceType) {
        span.addEvent('service_missing_type');
        this.logger.warn(
          `Service ${serviceDef.name} is missing serviceType. Please define a static serviceType property.`
        );
        return;
      }
      this.logger.debug(
        `${this.character.name}(${this.agentId}) - Registering service:`,
        serviceType
      );
      if (this.services.has(serviceType)) {
        span.addEvent('service_already_registered');
        this.logger.warn(
          `${this.character.name}(${this.agentId}) - Service ${serviceType} is already registered. Skipping registration.`
        );
        return;
      }
      try {
        span.addEvent('starting_service');
        const serviceInstance = await serviceDef.start(this);
        this.services.set(serviceType, serviceInstance);
        this.serviceTypes.set(serviceType, serviceDef);
        if (typeof (serviceDef as any).registerSendHandlers === 'function') {
          (serviceDef as any).registerSendHandlers(this, serviceInstance);
        }
        span.addEvent('service_registered');
        this.logger.debug(
          `${this.character.name}(${this.agentId}) - Service ${serviceType} registered successfully`
        );
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage,
        });
        this.logger.error(
          `${this.character.name}(${this.agentId}) - Failed to register service ${serviceType}: ${errorMessage}`
        );
        throw error;
      }
    });
  }

  registerModel(
    modelType: ModelTypeName,
    handler: (params: any) => Promise<any>,
    provider: string,
    priority?: number
  ) {
    const modelKey = typeof modelType === 'string' ? modelType : ModelType[modelType];
    if (!this.models.has(modelKey)) {
      this.models.set(modelKey, []);
    }

    const registrationOrder = Date.now();
    this.models.get(modelKey)?.push({
      handler,
      provider,
      priority: priority || 0,
      registrationOrder,
    });
    this.models.get(modelKey)?.sort((a, b) => {
      if ((b.priority || 0) !== (a.priority || 0)) {
        return (b.priority || 0) - (a.priority || 0);
      }
      return a.registrationOrder - b.registrationOrder;
    });
  }

  getModel(
    modelType: ModelTypeName,
    provider?: string
  ): ((runtime: IAgentRuntime, params: any) => Promise<any>) | undefined {
    const modelKey = typeof modelType === 'string' ? modelType : ModelType[modelType];
    const models = this.models.get(modelKey);
    if (!models?.length) {
      return undefined;
    }
    if (provider) {
      const modelWithProvider = models.find((m) => m.provider === provider);
      if (modelWithProvider) {
        this.logger.debug(
          `[AgentRuntime][${this.character.name}] Using model ${modelKey} from provider ${provider}`
        );
        return modelWithProvider.handler;
      } else {
        this.logger.warn(
          `[AgentRuntime][${this.character.name}] No model found for provider ${provider}`
        );
      }
    }

    // Return highest priority handler (first in array after sorting)
    this.logger.debug(
      `[AgentRuntime][${this.character.name}] Using model ${modelKey} from provider ${models[0].provider}`
    );
    return models[0].handler;
  }

  async useModel<T extends ModelTypeName, R = ModelResultMap[T]>(
    modelType: T,
    params: Omit<ModelParamsMap[T], 'runtime'> | any,
    provider?: string
  ): Promise<R> {
    return this.startSpan(`AgentRuntime.useModel.${modelType}`, async (span) => {
      const modelKey = typeof modelType === 'string' ? modelType : ModelType[modelType];
      const promptContent =
        params?.prompt ||
        params?.input ||
        (Array.isArray(params?.messages) ? JSON.stringify(params.messages) : null);
      span.setAttributes({
        'llm.request.model': modelKey,
        'agent.id': this.agentId,
        'llm.request.temperature': params?.temperature,
        'llm.request.top_p': params?.top_p,
        'llm.request.max_tokens': params?.max_tokens || params?.max_tokens_to_sample,
      });
      span.addEvent('model_parameters', { params: JSON.stringify(params, safeReplacer()) });
      if (promptContent) {
        span.addEvent('llm.prompt', { 'prompt.content': promptContent });
      }
      const model = this.getModel(modelKey, provider);
      if (!model) {
        const errorMsg = `No handler found for delegate type: ${modelKey}`;
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        throw new Error(errorMsg);
      }

      // Log input parameters (keep debug log if useful)
      this.logger.debug(
        `[useModel] ${modelKey} input:`,
        JSON.stringify(params, safeReplacer(), 2).replace(/\\n/g, '\n')
      );
      let paramsWithRuntime: any;
      if (
        params === null ||
        params === undefined ||
        typeof params !== 'object' ||
        Array.isArray(params) ||
        (typeof Buffer !== 'undefined' && Buffer.isBuffer(params))
      ) {
        paramsWithRuntime = params;
      } else {
        paramsWithRuntime = {
          ...params,
          runtime: this,
        };
      }
      const startTime = performance.now();
      span.addEvent('model_execution_start');
      try {
        const response = await model(this, paramsWithRuntime);
        const elapsedTime = performance.now() - startTime;
        span.setAttributes({
          'llm.duration_ms': elapsedTime,
          'llm.usage.prompt_tokens': (response as any)?.usage?.prompt_tokens,
          'llm.usage.completion_tokens': (response as any)?.usage?.completion_tokens,
          'llm.usage.total_tokens': (response as any)?.usage?.total_tokens,
        });

        // Log response as event
        span.addEvent('model_response', { response: JSON.stringify(response, safeReplacer()) }); // Log processed response

        // Log timing (keep debug log if useful)
        this.logger.debug(
          `[useModel] ${modelKey} completed in ${Number(elapsedTime.toFixed(2)).toLocaleString()}ms`
        );

        // Log response (keep debug log if useful)
        this.logger.debug(
          `[useModel] ${modelKey} output:`,
          Array.isArray(response)
            ? `${JSON.stringify(response.slice(0, 5))}...${JSON.stringify(response.slice(-5))} (${
                response.length
              } items)`
            : JSON.stringify(response)
        );
        this.adapter.log({
          entityId: this.agentId,
          roomId: this.agentId,
          body: {
            modelType,
            modelKey,
            params: params
              ? typeof params === 'object'
                ? Object.keys(params)
                : typeof params
              : null,
            response:
              Array.isArray(response) && response.every((x) => typeof x === 'number')
                ? '[array]'
                : response,
          },
          type: `useModel:${modelKey}`,
        });
        span.addEvent('model_execution_complete');
        span.setStatus({ code: SpanStatusCode.OK });
        return response as R;
      } catch (error: any) {
        const errorTime = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: errorMessage,
        });
        span.setAttributes({
          'error.time_ms': errorTime,
          'error.message': errorMessage,
        });
        span.addEvent('model_execution_error');
        throw error;
      }
    });
  }

  registerEvent(event: string, handler: (params: any) => Promise<void>) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)?.push(handler);
  }

  getEvent(event: string): ((params: any) => Promise<void>)[] | undefined {
    return this.events.get(event);
  }

  async emitEvent(event: string | string[], params: any) {
    const events = Array.isArray(event) ? event : [event];
    for (const eventName of events) {
      const isMessageReceivedEvent = eventName === EventType.MESSAGE_RECEIVED;
      const instrumentationEnabled = this.instrumentationService?.isEnabled?.() && this.tracer;
      const eventHandlers = this.events.get(eventName);
      if (!eventHandlers) {
        continue;
      }
      if (isMessageReceivedEvent && instrumentationEnabled) {
        const message = (params as MessagePayload)?.message;
        const rootSpan = this.tracer.startSpan('AgentRuntime.handleMessageEvent', {
          attributes: {
            'agent.id': this.agentId,
            'character.name': this.character?.name,
            'room.id': message?.roomId || 'unknown',
            'user.id': message?.entityId || 'unknown',
            'message.id': message?.id || 'unknown',
            'event.name': eventName,
          },
        });
        const spanContext = trace.setSpan(context.active(), rootSpan);
        try {
          rootSpan.addEvent('processing_started');
          await context.with(spanContext, async () => {
            await Promise.all(
              eventHandlers.map((handler) => {
                const ctx = context.active();
                return context.with(ctx, () => handler(params));
              })
            );
          });
          rootSpan.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          this.logger.error(
            `Error during instrumented handler execution for event ${eventName}:`,
            error
          );
          rootSpan.recordException(error as Error);
          rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        } finally {
          rootSpan.addEvent('processing_ended');
          rootSpan.end();
        }
      } else {
        try {
          await Promise.all(eventHandlers.map((handler) => handler(params)));
        } catch (error) {
          this.logger.error(`Error during emitEvent for ${eventName} (handler execution):`, error);
          // throw error; // Re-throw if necessary
        }
      }
    }
  }

  async ensureEmbeddingDimension() {
    this.logger.debug(`[AgentRuntime][${this.character.name}] Starting ensureEmbeddingDimension`);

    if (!this.adapter) {
      throw new Error(
        `[AgentRuntime][${this.character.name}] Database adapter not initialized before ensureEmbeddingDimension`
      );
    }
    try {
      const model = this.getModel(ModelType.TEXT_EMBEDDING);
      if (!model) {
        throw new Error(
          `[AgentRuntime][${this.character.name}] No TEXT_EMBEDDING model registered`
        );
      }

      this.logger.debug(`[AgentRuntime][${this.character.name}] Getting embedding dimensions`);
      const embedding = await this.useModel(ModelType.TEXT_EMBEDDING, null);
      if (!embedding || !embedding.length) {
        throw new Error(`[AgentRuntime][${this.character.name}] Invalid embedding received`);
      }

      this.logger.debug(
        `[AgentRuntime][${this.character.name}] Setting embedding dimension: ${embedding.length}`
      );
      await this.adapter.ensureEmbeddingDimension(embedding.length);
      this.logger.debug(
        `[AgentRuntime][${this.character.name}] Successfully set embedding dimension`
      );
    } catch (error) {
      this.logger.debug(
        `[AgentRuntime][${this.character.name}] Error in ensureEmbeddingDimension:`,
        error
      );
      throw error;
    }
  }

  registerTaskWorker(taskHandler: TaskWorker): void {
    if (this.taskWorkers.has(taskHandler.name)) {
      this.logger.warn(
        `Task definition ${taskHandler.name} already registered. Will be overwritten.`
      );
    }
    this.taskWorkers.set(taskHandler.name, taskHandler);
  }

  getTaskWorker(name: string): TaskWorker | undefined {
    return this.taskWorkers.get(name);
  }

  get db(): any {
    return this.adapter.db;
  }
  async init(): Promise<void> {
    await this.adapter.init();
  }
  async close(): Promise<void> {
    await this.adapter.close();
  }
  async getAgent(agentId: UUID): Promise<Agent | null> {
    return await this.adapter.getAgent(agentId);
  }
  async getAgents(): Promise<Partial<Agent>[]> {
    return await this.adapter.getAgents();
  }
  async createAgent(agent: Partial<Agent>): Promise<boolean> {
    return await this.adapter.createAgent(agent);
  }
  async updateAgent(agentId: UUID, agent: Partial<Agent>): Promise<boolean> {
    return await this.adapter.updateAgent(agentId, agent);
  }
  async deleteAgent(agentId: UUID): Promise<boolean> {
    return await this.adapter.deleteAgent(agentId);
  }
  async ensureAgentExists(agent: Partial<Agent>): Promise<Agent> {
    return await this.adapter.ensureAgentExists(agent);
  }
  async getEntityById(entityId: UUID): Promise<Entity | null> {
    const entities = await this.adapter.getEntityByIds([entityId]);
    if (!entities?.length) return null;
    return entities[0];
  }

  async getEntityByIds(entityIds: UUID[]): Promise<Entity[] | null> {
    return await this.adapter.getEntityByIds(entityIds);
  }
  async getEntitiesForRoom(roomId: UUID, includeComponents?: boolean): Promise<Entity[]> {
    return await this.adapter.getEntitiesForRoom(roomId, includeComponents);
  }
  async createEntity(entity: Entity): Promise<boolean> {
    if (!entity.agentId) {
      entity.agentId = this.agentId;
    }
    return await this.createEntities([entity]);
  }

  async createEntities(entities: Entity[]): Promise<boolean> {
    entities.forEach((e) => {
      e.agentId = this.agentId;
    });
    return await this.adapter.createEntities(entities);
  }

  async updateEntity(entity: Entity): Promise<void> {
    await this.adapter.updateEntity(entity);
  }
  async getComponent(
    entityId: UUID,
    type: string,
    worldId?: UUID,
    sourceEntityId?: UUID
  ): Promise<Component | null> {
    return await this.adapter.getComponent(entityId, type, worldId, sourceEntityId);
  }
  async getComponents(entityId: UUID, worldId?: UUID, sourceEntityId?: UUID): Promise<Component[]> {
    return await this.adapter.getComponents(entityId, worldId, sourceEntityId);
  }
  async createComponent(component: Component): Promise<boolean> {
    return await this.adapter.createComponent(component);
  }
  async updateComponent(component: Component): Promise<void> {
    await this.adapter.updateComponent(component);
  }
  async deleteComponent(componentId: UUID): Promise<void> {
    await this.adapter.deleteComponent(componentId);
  }
  async addEmbeddingToMemory(memory: Memory): Promise<Memory> {
    if (memory.embedding) {
      return memory;
    }
    const memoryText = memory.content.text;
    if (!memoryText) {
      throw new Error('Cannot generate embedding: Memory content is empty');
    }
    try {
      memory.embedding = await this.useModel(ModelType.TEXT_EMBEDDING, {
        text: memoryText,
      });
    } catch (error: any) {
      logger.error('Failed to generate embedding:', error);
      memory.embedding = await this.useModel(ModelType.TEXT_EMBEDDING, null);
    }
    return memory;
  }
  async getMemories(params: {
    entityId?: UUID;
    agentId?: UUID;
    roomId?: UUID;
    count?: number;
    unique?: boolean;
    tableName: string;
    start?: number;
    end?: number;
  }): Promise<Memory[]> {
    return await this.adapter.getMemories(params);
  }
  async getMemoryById(id: UUID): Promise<Memory | null> {
    return await this.adapter.getMemoryById(id);
  }
  async getMemoriesByIds(ids: UUID[], tableName?: string): Promise<Memory[]> {
    return await this.adapter.getMemoriesByIds(ids, tableName);
  }
  async getMemoriesByRoomIds(params: {
    tableName: string;
    roomIds: UUID[];
    limit?: number;
  }): Promise<Memory[]> {
    return await this.adapter.getMemoriesByRoomIds(params);
  }

  async getMemoriesByServerId(params: { serverId: UUID; count?: number }): Promise<Memory[]> {
    return await this.adapter.getMemoriesByServerId(params);
  }

  async getCachedEmbeddings(params: {
    query_table_name: string;
    query_threshold: number;
    query_input: string;
    query_field_name: string;
    query_field_sub_name: string;
    query_match_count: number;
  }): Promise<{ embedding: number[]; levenshtein_score: number }[]> {
    return await this.adapter.getCachedEmbeddings(params);
  }
  async log(params: {
    body: { [key: string]: unknown };
    entityId: UUID;
    roomId: UUID;
    type: string;
  }): Promise<void> {
    await this.adapter.log(params);
  }
  async searchMemories(params: {
    embedding: number[];
    query?: string;
    match_threshold?: number;
    count?: number;
    roomId?: UUID;
    unique?: boolean;
    worldId?: UUID;
    entityId?: UUID;
    tableName: string;
  }): Promise<Memory[]> {
    const memories = await this.adapter.searchMemories(params);
    if (params.query) {
      const rerankedMemories = await this.rerankMemories(params.query, memories);
      return rerankedMemories;
    }
    return memories;
  }
  async rerankMemories(query: string, memories: Memory[]): Promise<Memory[]> {
    const docs = memories.map((memory) => ({
      title: memory.id,
      content: memory.content.text,
    }));
    const bm25 = new BM25(docs);
    const results = bm25.search(query, memories.length);
    return results.map((result) => memories[result.index]);
  }
  async createMemory(memory: Memory, tableName: string, unique?: boolean): Promise<UUID> {
    return await this.adapter.createMemory(memory, tableName, unique);
  }
  async updateMemory(
    memory: Partial<Memory> & { id: UUID; metadata?: MemoryMetadata }
  ): Promise<boolean> {
    return await this.adapter.updateMemory(memory);
  }
  async deleteMemory(memoryId: UUID): Promise<void> {
    await this.adapter.deleteMemory(memoryId);
  }
  async deleteAllMemories(roomId: UUID, tableName: string): Promise<void> {
    await this.adapter.deleteAllMemories(roomId, tableName);
  }
  async countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number> {
    return await this.adapter.countMemories(roomId, unique, tableName);
  }
  async getLogs(params: {
    entityId: UUID;
    roomId?: UUID;
    type?: string;
    count?: number;
    offset?: number;
  }): Promise<Log[]> {
    return await this.adapter.getLogs(params);
  }
  async deleteLog(logId: UUID): Promise<void> {
    await this.adapter.deleteLog(logId);
  }
  async createWorld(world: World): Promise<UUID> {
    return await this.adapter.createWorld(world);
  }
  async getWorld(id: UUID): Promise<World | null> {
    return await this.adapter.getWorld(id);
  }
  async removeWorld(worldId: UUID): Promise<void> {
    await this.adapter.removeWorld(worldId);
  }
  async getAllWorlds(): Promise<World[]> {
    return await this.adapter.getAllWorlds();
  }
  async updateWorld(world: World): Promise<void> {
    await this.adapter.updateWorld(world);
  }
  async getRoom(roomId: UUID): Promise<Room | null> {
    const rooms = await this.adapter.getRoomsByIds([roomId]);
    if (!rooms?.length) return null;
    return rooms[0];
  }

  async getRoomsByIds(roomIds: UUID[]): Promise<Room[] | null> {
    return await this.adapter.getRoomsByIds(roomIds);
  }
  async createRoom({ id, name, source, type, channelId, serverId, worldId }: Room): Promise<UUID> {
    if (!worldId) throw new Error('worldId is required');
    const res = await this.adapter.createRooms([
      {
        id,
        name,
        source,
        type,
        channelId,
        serverId,
        worldId,
      },
    ]);
    if (!res.length) return null;
    return res[0];
  }

  async createRooms(rooms: Room[]): Promise<UUID[]> {
    return await this.adapter.createRooms(rooms);
  }

  async deleteRoom(roomId: UUID): Promise<void> {
    await this.adapter.deleteRoom(roomId);
  }
  async deleteRoomsByWorldId(worldId: UUID): Promise<void> {
    await this.adapter.deleteRoomsByWorldId(worldId);
  }
  async updateRoom(room: Room): Promise<void> {
    await this.adapter.updateRoom(room);
  }
  async getRoomsForParticipant(entityId: UUID): Promise<UUID[]> {
    return await this.adapter.getRoomsForParticipant(entityId);
  }
  async getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]> {
    return await this.adapter.getRoomsForParticipants(userIds);
  }

  // deprecate this one
  async getRooms(worldId: UUID): Promise<Room[]> {
    return await this.adapter.getRoomsByWorld(worldId);
  }

  async getRoomsByWorld(worldId: UUID): Promise<Room[]> {
    return await this.adapter.getRoomsByWorld(worldId);
  }
  async getParticipantUserState(
    roomId: UUID,
    entityId: UUID
  ): Promise<'FOLLOWED' | 'MUTED' | null> {
    return await this.adapter.getParticipantUserState(roomId, entityId);
  }
  async setParticipantUserState(
    roomId: UUID,
    entityId: UUID,
    state: 'FOLLOWED' | 'MUTED' | null
  ): Promise<void> {
    await this.adapter.setParticipantUserState(roomId, entityId, state);
  }
  async createRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
    tags?: string[];
    metadata?: { [key: string]: any };
  }): Promise<boolean> {
    return await this.adapter.createRelationship(params);
  }
  async updateRelationship(relationship: Relationship): Promise<void> {
    await this.adapter.updateRelationship(relationship);
  }
  async getRelationship(params: {
    sourceEntityId: UUID;
    targetEntityId: UUID;
  }): Promise<Relationship | null> {
    return await this.adapter.getRelationship(params);
  }
  async getRelationships(params: { entityId: UUID; tags?: string[] }): Promise<Relationship[]> {
    return await this.adapter.getRelationships(params);
  }
  async getCache<T>(key: string): Promise<T | undefined> {
    return await this.adapter.getCache<T>(key);
  }
  async setCache<T>(key: string, value: T): Promise<boolean> {
    return await this.adapter.setCache<T>(key, value);
  }
  async deleteCache(key: string): Promise<boolean> {
    return await this.adapter.deleteCache(key);
  }
  async createTask(task: Task): Promise<UUID> {
    return await this.adapter.createTask(task);
  }
  async getTasks(params: { roomId?: UUID; tags?: string[]; entityId?: UUID }): Promise<Task[]> {
    return await this.adapter.getTasks(params);
  }
  async getTask(id: UUID): Promise<Task | null> {
    return await this.adapter.getTask(id);
  }
  async getTasksByName(name: string): Promise<Task[]> {
    return await this.adapter.getTasksByName(name);
  }
  async updateTask(id: UUID, task: Partial<Task>): Promise<void> {
    await this.adapter.updateTask(id, task);
  }
  async deleteTask(id: UUID): Promise<void> {
    await this.adapter.deleteTask(id);
  }
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(callback);
  }
  off(event: string, callback: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      return;
    }
    const handlers = this.eventHandlers.get(event)!;
    const index = handlers.indexOf(callback);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  emit(event: string, data: any): void {
    if (!this.eventHandlers.has(event)) {
      return;
    }
    for (const handler of this.eventHandlers.get(event)!) {
      handler(data);
    }
  }
  async sendControlMessage(params: {
    roomId: UUID;
    action: 'enable_input' | 'disable_input';
    target?: string;
  }): Promise<void> {
    try {
      const { roomId, action, target } = params;
      const controlMessage = {
        type: 'control',
        payload: {
          action,
          target,
        },
        roomId,
      };
      await this.emitEvent('CONTROL_MESSAGE', {
        runtime: this,
        message: controlMessage,
        source: 'agent',
      });

      this.logger.debug(`Sent control message: ${action} to room ${roomId}`);
    } catch (error) {
      this.logger.error(`Error sending control message: ${error}`);
    }
  }
  registerSendHandler(source: string, handler: SendHandlerFunction): void {
    if (this.sendHandlers.has(source)) {
      this.logger.warn(`Send handler for source '${source}' already registered. Overwriting.`);
    }
    this.sendHandlers.set(source, handler);
    this.logger.info(`Registered send handler for source: ${source}`);
  }
  async sendMessageToTarget(target: TargetInfo, content: Content): Promise<void> {
    return this.startSpan('AgentRuntime.sendMessageToTarget', async (span) => {
      span.setAttributes({
        'message.target.source': target.source,
        'message.target.roomId': target.roomId,
        'message.target.channelId': target.channelId,
        'message.target.serverId': target.serverId,
        'message.target.entityId': target.entityId,
        'message.target.threadId': target.threadId,
        'agent.id': this.agentId,
      });
      const handler = this.sendHandlers.get(target.source);
      if (!handler) {
        const errorMsg = `No send handler registered for source: ${target.source}`;
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        this.logger.error(errorMsg);
        // Optionally throw or just log the error
        throw new Error(errorMsg);
      }
      try {
        span.addEvent('executing_send_handler');
        await handler(this, target, content);
        span.addEvent('send_handler_executed');
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        this.logger.error(`Error executing send handler for source ${target.source}:`, error);
        throw error; // Re-throw error after logging and tracing
      }
    });
  }
  async getMemoriesByWorldId(params: {
    worldId: UUID;
    count?: number;
    tableName?: string;
  }): Promise<Memory[]> {
    return await this.adapter.getMemoriesByWorldId(params);
  }
}

Old packages/plugin-evm

Project Path: src

Source Tree:

```
src
├── types
│   └── index.ts
├── tee.d.ts
├── providers
│   └── wallet.ts
├── tests
│   ├── wallet.test.ts
│   ├── custom-chain.ts
│   └── swap.test.ts
├── constants.ts
├── actions
│   ├── gov-execute.ts
│   ├── transfer.ts
│   ├── gov-queue.ts
│   ├── bridge.ts
│   ├── swap.ts
├── templates
│   └── index.ts
├── index.ts
└── service.ts

```

`/plugin-evm/src/types/index.ts`:

```ts
import type { Route, Token } from '@lifi/types';
import type {
  Account,
  Address,
  Chain,
  Hash,
  HttpTransport,
  PublicClient,
  WalletClient,
  Log,
} from 'viem';
import * as viemChains from 'viem/chains';

const _SupportedChainList = Object.keys(viemChains) as Array<keyof typeof viemChains>;
export type SupportedChain = (typeof _SupportedChainList)[number];

// Transaction types
export interface Transaction {
  hash: Hash;
  from: Address;
  to: Address;
  value: bigint;
  data?: `0x${string}`;
  chainId?: number;
  logs?: Log[];
}

// Token types
export interface TokenWithBalance {
  token: Token;
  balance: bigint;
  formattedBalance: string;
  priceUSD: string;
  valueUSD: string;
}

export interface WalletBalance {
  chain: SupportedChain;
  address: Address;
  totalValueUSD: string;
  tokens: TokenWithBalance[];
}

// Chain configuration
export interface ChainMetadata {
  chainId: number;
  name: string;
  chain: Chain;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
}

export interface ChainConfig {
  chain: Chain;
  publicClient: PublicClient<HttpTransport, Chain, Account | undefined>;
  walletClient?: WalletClient;
}

// Action parameters
export interface TransferParams {
  fromChain: SupportedChain;
  toAddress: Address;
  amount: string;
  data?: `0x${string}`;
}

export interface SwapParams {
  chain: SupportedChain;
  fromToken: Address;
  toToken: Address;
  amount: string;
  slippage?: number;
}

export interface BebopRoute {
  data: string;
  approvalTarget: Address;
  sellAmount: string;
  from: Address;
  to: Address;
  value: string;
  gas: string;
  gasPrice: string;
}

export interface SwapQuote {
  aggregator: 'lifi' | 'bebop';
  minOutputAmount: string;
  swapData: Route | BebopRoute;
}

export interface BridgeParams {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  fromToken: Address;
  toToken: Address;
  amount: string;
  toAddress?: Address;
}

// Plugin configuration
export interface EvmPluginConfig {
  rpcUrl?: {
    ethereum?: string;
    abstract?: string;
    base?: string;
    sepolia?: string;
    bsc?: string;
    arbitrum?: string;
    avalanche?: string;
    polygon?: string;
    optimism?: string;
    cronos?: string;
    gnosis?: string;
    fantom?: string;
    fraxtal?: string;
    klaytn?: string;
    celo?: string;
    moonbeam?: string;
    aurora?: string;
    harmonyOne?: string;
    moonriver?: string;
    arbitrumNova?: string;
    mantle?: string;
    linea?: string;
    scroll?: string;
    filecoin?: string;
    taiko?: string;
    zksync?: string;
    canto?: string;
    alienx?: string;
    gravity?: string;
  };
  secrets?: {
    EVM_PRIVATE_KEY: string;
  };
  testMode?: boolean;
  multicall?: {
    batchSize?: number;
    wait?: number;
  };
}

// LiFi types
export type LiFiStatus = {
  status: 'PENDING' | 'DONE' | 'FAILED';
  substatus?: string;
  error?: Error;
};

export type LiFiRoute = {
  transactionHash: Hash;
  transactionData: `0x${string}`;
  toAddress: Address;
  status: LiFiStatus;
};

// Provider types
export interface TokenData extends Token {
  symbol: string;
  decimals: number;
  address: Address;
  name: string;
  logoURI?: string;
  chainId: number;
}

export interface TokenPriceResponse {
  priceUSD: string;
  token: TokenData;
}

export interface TokenListResponse {
  tokens: TokenData[];
}

export interface ProviderError extends Error {
  code?: number;
  data?: unknown;
}

export enum VoteType {
  AGAINST = 0,
  FOR = 1,
  ABSTAIN = 2,
}

export interface Proposal {
  targets: Address[];
  values: bigint[];
  calldatas: `0x${string}`[];
  description: string;
}

export interface VoteParams {
  chain: SupportedChain;
  governor: Address;
  proposalId: string;
  support: VoteType;
}

export interface QueueProposalParams extends Proposal {
  chain: SupportedChain;
  governor: Address;
}

export interface ExecuteProposalParams extends Proposal {
  chain: SupportedChain;
  governor: Address;
  proposalId: string;
}

export interface ProposeProposalParams extends Proposal {
  chain: SupportedChain;
  governor: Address;
}

```

`/plugin-evm/src/tee.d.ts`:

```ts
declare module "@elizaos/plugin-tee";
```

`/plugin-evm/src/providers/wallet.ts`:

```ts
import * as path from "node:path";
import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type ProviderResult,
  type State,
  elizaLogger,
} from "@elizaos/core-plugin-v2";
import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";
import type {
  Account,
  Address,
  Chain,
  HttpTransport,
  PrivateKeyAccount,
  PublicClient,
  TestClient,
  WalletClient,
} from "viem";
import {
  http,
  createPublicClient,
  createTestClient,
  createWalletClient,
  formatUnits,
  publicActions,
  walletActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";

import { EVM_SERVICE_NAME } from "../constants";
import type { EVMService } from "../service";
import type { SupportedChain, WalletBalance } from "../types";

export class WalletProvider {
  private cacheKey = "evm/wallet";
  chains: Record<string, Chain> = { ...viemChains };
  account: PrivateKeyAccount | any;
  runtime: IAgentRuntime;
  constructor(
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`,
    runtime: IAgentRuntime,
    chains?: Record<string, Chain>
  ) {
    this.setAccount(accountOrPrivateKey);
    this.addChains(chains);
    this.runtime = runtime;
  }

  getAddress(): Address {
    return this.account.address;
  }

  getPublicClient(
    chainName: SupportedChain
  ): PublicClient<HttpTransport, Chain, Account | undefined> {
    const transport = this.createHttpTransport(chainName);

    const publicClient = createPublicClient({
      chain: this.chains[chainName],
      transport,
    });
    return publicClient;
  }

  getWalletClient(chainName: SupportedChain): WalletClient {
    const transport = this.createHttpTransport(chainName);

    const walletClient = createWalletClient({
      chain: this.chains[chainName],
      transport,
      account: this.account,
    });

    return walletClient;
  }

  getTestClient(): TestClient {
    return createTestClient({
      chain: viemChains.hardhat,
      mode: "hardhat",
      transport: http(),
    })
      .extend(publicActions)
      .extend(walletActions);
  }

  getChainConfigs(chainName: SupportedChain): Chain {
    const chain = this.chains[chainName];

    if (!chain?.id) {
      throw new Error(`Invalid chain name: ${chainName}`);
    }

    return chain;
  }

  getSupportedChains(): SupportedChain[] {
    return Object.keys(this.chains) as SupportedChain[];
  }

  async getWalletBalances(): Promise<Record<SupportedChain, string>> {
    const cacheKey = path.join(this.cacheKey, "walletBalances");
    const cachedData =
      await this.runtime.getCache<Record<SupportedChain, string>>(cacheKey);
    if (cachedData) {
      elizaLogger.log(`Returning cached wallet balances`);
      return cachedData;
    }

    const balances = {} as Record<SupportedChain, string>;
    const chainNames = this.getSupportedChains();

    await Promise.all(
      chainNames.map(async (chainName) => {
        try {
          const balance = await this.getWalletBalanceForChain(chainName);
          if (balance !== null) {
            balances[chainName] = balance;
          }
        } catch (error) {
          elizaLogger.error(`Error getting balance for ${chainName}:`, error);
        }
      })
    );

    await this.runtime.setCache(cacheKey, balances);
    elizaLogger.log("Wallet balances cached");
    return balances;
  }

  async getWalletBalanceForChain(
    chainName: SupportedChain
  ): Promise<string | null> {
    try {
      const client = this.getPublicClient(chainName);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error(`Error getting wallet balance for ${chainName}:`, error);
      return null;
    }
  }

  addChain(chain: Record<string, Chain>) {
    this.addChains(chain);
  }

  private setAccount = (
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`
  ) => {
    if (typeof accountOrPrivateKey === "string") {
      this.account = privateKeyToAccount(accountOrPrivateKey);
    } else {
      this.account = accountOrPrivateKey;
    }
  };

  private addChains = (chains?: Record<string, Chain>) => {
    if (!chains) {
      return;
    }
    for (const chain of Object.keys(chains)) {
      this.chains[chain] = chains[chain];
    }
  };

  private createHttpTransport = (chainName: SupportedChain) => {
    const chain = this.chains[chainName];
    if (!chain) {
      throw new Error(`Chain not found: ${chainName}`);
    }

    if (chain.rpcUrls.custom) {
      return http(chain.rpcUrls.custom.http[0]);
    }
    return http(chain.rpcUrls.default.http[0]);
  };

  static genChainFromName(
    chainName: string,
    customRpcUrl?: string | null
  ): Chain {
    const baseChain = (viemChains as any)[chainName];

    if (!baseChain?.id) {
      throw new Error("Invalid chain name");
    }

    const viemChain: Chain = customRpcUrl
      ? {
          ...baseChain,
          rpcUrls: {
            ...baseChain.rpcUrls,
            custom: {
              http: [customRpcUrl],
            },
          },
        }
      : baseChain;

    return viemChain;
  }
}

const genChainsFromRuntime = (
  runtime: IAgentRuntime
): Record<string, Chain> => {
  // Get chains from settings or use default supported chains
  const configuredChains =
    (runtime.character.settings?.chains?.evm as SupportedChain[]) || [];

  // Default chains to include if not specified in settings
  const defaultChains = [
    "mainnet",
    "polygon",
    "arbitrum",
    "base",
    "optimism",
    "linea",
  ];

  // Combine configured chains with defaults, removing duplicates
  const chainNames = [...new Set([...configuredChains, ...defaultChains])];
  const chains: Record<string, Chain> = {};

  for (const chainName of chainNames) {
    try {
      // Try to get RPC URL from settings using different formats
      let rpcUrl = runtime.getSetting(
        `ETHEREUM_PROVIDER_${chainName.toUpperCase()}`
      );

      if (!rpcUrl) {
        rpcUrl = runtime.getSetting(`EVM_PROVIDER_${chainName.toUpperCase()}`);
      }

      // Skip chains that don't exist in viem
      if (!(viemChains as any)[chainName]) {
        elizaLogger.warn(
          `Chain ${chainName} not found in viem chains, skipping`
        );
        continue;
      }

      const chain = WalletProvider.genChainFromName(chainName, rpcUrl);
      chains[chainName] = chain;
    } catch (error) {
      elizaLogger.error(`Error configuring chain ${chainName}:`, error);
    }
  }

  return chains;
};

export const initWalletProvider = async (runtime: IAgentRuntime) => {
  const teeMode = runtime.getSetting("TEE_MODE") || TEEMode.OFF;

  const chains = genChainsFromRuntime(runtime);

  if (teeMode !== TEEMode.OFF) {
    const walletSecretSalt = runtime.getSetting("WALLET_SECRET_SALT");
    if (!walletSecretSalt) {
      throw new Error("WALLET_SECRET_SALT required when TEE_MODE is enabled");
    }

    const deriveKeyProvider = new DeriveKeyProvider(teeMode);
    const deriveKeyResult = await deriveKeyProvider.deriveEcdsaKeypair(
      walletSecretSalt,
      "evm",
      runtime.agentId
    );
    return new WalletProvider(deriveKeyResult.keypair, runtime, chains);
  }
  const privateKey = runtime.getSetting("EVM_PRIVATE_KEY") as `0x${string}`;
  if (!privateKey) {
    throw new Error("EVM_PRIVATE_KEY is missing");
  }
  return new WalletProvider(privateKey, runtime, chains);
};

export const evmWalletProvider: Provider = {
  name: "EVMWalletProvider",
  async get(
    runtime: IAgentRuntime,
    _message: Memory,
    state?: State
  ): Promise<ProviderResult> {
    try {
      // Get the EVM service
      const evmService = runtime.getService(EVM_SERVICE_NAME);

      // If service is not available, fall back to direct fetching
      if (!evmService) {
        elizaLogger.warn(
          "EVM service not found, falling back to direct fetching"
        );
        return await directFetchWalletData(runtime, state);
      }

      // Get wallet data from the service
      const walletData = await (evmService as any).getCachedData();
      if (!walletData) {
        elizaLogger.warn(
          "No cached wallet data available, falling back to direct fetching"
        );
        return await directFetchWalletData(runtime, state);
      }

      const agentName = state?.agentName || "The agent";

      // Create a text representation of all chain balances
      const balanceText = walletData.chains
        .map((chain: any) => `${chain.name}: ${chain.balance} ${chain.symbol}`)
        .join("\n");

      return {
        text: `${agentName}'s EVM Wallet Address: ${walletData.address}\n\nBalances:\n${balanceText}`,
        data: {
          address: walletData.address,
          chains: walletData.chains,
        },
        values: {
          address: walletData.address,
          chains: JSON.stringify(walletData.chains),
        },
      };
    } catch (error) {
      console.error("Error in EVM wallet provider:", error);
      return {
        text: "Error getting EVM wallet provider",
        data: {},
        values: {},
      };
    }
  },
};

// Fallback function to fetch wallet data directly
async function directFetchWalletData(
  runtime: IAgentRuntime,
  state?: State
): Promise<ProviderResult> {
  try {
    const walletProvider = await initWalletProvider(runtime);
    const address = walletProvider.getAddress();
    const balances = await walletProvider.getWalletBalances();
    const agentName = state?.agentName || "The agent";

    // Format balances for all chains
    const chainDetails = Object.entries(balances).map(
      ([chainName, balance]) => {
        const chain = walletProvider.getChainConfigs(
          chainName as SupportedChain
        );
        return {
          chainName,
          balance,
          symbol: chain.nativeCurrency.symbol,
          chainId: chain.id,
          name: chain.name,
        };
      }
    );

    // Create a text representation of all chain balances
    const balanceText = chainDetails
      .map((chain) => `${chain.name}: ${chain.balance} ${chain.symbol}`)
      .join("\n");

    return {
      text: `${agentName}'s EVM Wallet Address: ${address}\n\nBalances:\n${balanceText}`,
      data: {
        address,
        chains: chainDetails,
      },
      values: {
        address: address as string,
        chains: JSON.stringify(chainDetails),
      },
    };
  } catch (error) {
    console.error("Error fetching wallet data directly:", error);
    return {
      text: "Error getting EVM wallet provider",
      data: {},
      values: {},
    };
  }
}

```

`/plugin-evm/src/tests/wallet.test.ts`:

```ts
import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { mainnet, iotex, arbitrum, type Chain } from 'viem/chains';

import { WalletProvider } from '../providers/wallet';
import { customChain } from './custom-chain';

const customRpcUrls = {
  mainnet: 'custom-rpc.mainnet.io',
  arbitrum: 'custom-rpc.base.io',
  iotex: 'custom-rpc.iotex.io',
};

// Mock the ICacheManager
const mockCacheManager = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn(),
};

describe('Wallet provider', () => {
  let walletProvider: WalletProvider;
  let pk: `0x${string}`;
  const customChains: Record<string, Chain> = {};
  const chainName = 'myCustomChain';

  beforeAll(() => {
    pk = generatePrivateKey();
    // Add the custom chain to the customChains object
    customChains[chainName] = customChain;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
  });

  describe('Constructor', () => {
    it('sets address', () => {
      const account = privateKeyToAccount(pk);
      const expectedAddress = account.address;

      walletProvider = new WalletProvider(pk, mockCacheManager as any);

      expect(walletProvider.getAddress()).toEqual(expectedAddress);
    });
    it('sets default chains (including mainnet) when no custom chains are provided', () => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any);

      // mainnet from viem.chains is included by default
      expect(walletProvider.chains.mainnet.id).toEqual(mainnet.id);
    });

    it('sets custom chains', () => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any, customChains);

      expect(walletProvider.chains.myCustomChain.id).toEqual(customChain.id);
    });
  });
  describe('Clients', () => {
    beforeEach(() => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any);
    });
    it('generates public client for mainnet', () => {
      const client = walletProvider.getPublicClient('mainnet');
      expect(client.chain.id).toEqual(mainnet.id);
      expect(client.transport.url).toEqual(mainnet.rpcUrls.default.http[0]);
    });
    it('generates public client with custom rpcurl', () => {
      const chain = WalletProvider.genChainFromName('mainnet', customRpcUrls.mainnet);
      const wp = new WalletProvider(pk, mockCacheManager as any, {
        ['mainnet']: chain,
      });

      const client = wp.getPublicClient('mainnet');
      expect(client.chain.id).toEqual(mainnet.id);
      expect(client.chain.rpcUrls.default.http[0]).toEqual(mainnet.rpcUrls.default.http[0]);
      expect(client.chain.rpcUrls.custom.http[0]).toEqual(customRpcUrls.mainnet);
      expect(client.transport.url).toEqual(customRpcUrls.mainnet);
    });
    it('generates wallet client', () => {
      const account = privateKeyToAccount(pk);
      const expectedAddress = account.address;

      const client = walletProvider.getWalletClient('mainnet');

      expect(client.account.address).toEqual(expectedAddress);
      expect(client.transport.url).toEqual(mainnet.rpcUrls.default.http[0]);
    });
    it('generates wallet client with custom rpcurl', () => {
      const account = privateKeyToAccount(pk);
      const expectedAddress = account.address;
      const chain = WalletProvider.genChainFromName('mainnet', customRpcUrls.mainnet);
      const wp = new WalletProvider(pk, mockCacheManager as any, {
        ['mainnet']: chain,
      });

      const client = wp.getWalletClient('mainnet');

      expect(client.account.address).toEqual(expectedAddress);
      expect(client.chain.id).toEqual(mainnet.id);
      expect(client.chain.rpcUrls.default.http[0]).toEqual(mainnet.rpcUrls.default.http[0]);
      expect(client.chain.rpcUrls.custom.http[0]).toEqual(customRpcUrls.mainnet);
      expect(client.transport.url).toEqual(customRpcUrls.mainnet);
    });
  });
  describe('Balance', () => {
    beforeEach(() => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any, customChains);
    });
    it('should fetch balance for "mainnet" (returns "0" in test env)', async () => {
      const bal = await walletProvider.getWalletBalanceForChain('mainnet');
      expect(bal).toEqual('0');
    });
    it('should fetch balance for a specific added chain', async () => {
      const bal = await walletProvider.getWalletBalanceForChain('iotex');

      expect(bal).toEqual('0');
    });
    it('should return null if chain is not added', async () => {

      const bal = await walletProvider.getWalletBalanceForChain(chainName);
      expect(bal).toBe(null);
    });
  });
  describe('Chain helpers', () => {
    beforeEach(() => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any);
    });
    it('generates chains from chain name', () => {
      const chainName = 'iotex';
      const chain: Chain = WalletProvider.genChainFromName(chainName);

      expect(chain.id).toEqual(iotex.id);
      expect(chain.rpcUrls.default.http[0]).toEqual(iotex.rpcUrls.default.http[0]);
    });
    it('generates chains from chain name with custom rpc url', () => {
      const chainName = 'iotex';
      const customRpcUrl = 'custom.url.io';
      const chain: Chain = WalletProvider.genChainFromName(chainName, customRpcUrl);

      expect(chain.rpcUrls.default.http[0]).toEqual(iotex.rpcUrls.default.http[0]);
      expect(chain.rpcUrls.custom.http[0]).toEqual(customRpcUrl);
    });

    it('adds chain', () => {
      const initialChains = walletProvider.chains;
      expect(initialChains.customChain).toBeUndefined();

      walletProvider.addChain({ customChain });
      const newChains = walletProvider.chains;
      expect(newChains.customChain).toBeDefined();
    });
    it('gets chain configs', () => {
      const chain = walletProvider.getChainConfigs('iotex');

      expect(chain.id).toEqual(iotex.id);
    });

    it('throws if unsupported chain name', () => {
      // intentionally set incorrect chain, ts will complain
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => WalletProvider.genChainFromName('ethereum')).toThrow();
    });
    it('throws if invalid chain name', () => {
      // intentionally set incorrect chain, ts will complain
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => WalletProvider.genChainFromName('eth')).toThrow();
    });
  });
});

```

`/plugin-evm/src/tests/custom-chain.ts`:

```ts
import { defineChain } from 'viem';

export const customChain = defineChain({
  id: 12345, // Your custom chain ID
  name: 'My Custom Chain',
  nativeCurrency: {
    name: 'MyToken',
    symbol: 'MYT',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.mycustomchain.com'] },
    public: { http: ['https://rpc.mycustomchain.com'] },
  },
  blockExplorers: {
    default: { name: 'MyChain Explorer', url: 'https://explorer.mycustomchain.com' },
  },
  testnet: false, // Set to `true` if it's a testnet
});

```

`/plugin-evm/src/tests/swap.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { Account, Chain } from 'viem';

import { WalletProvider } from '../providers/wallet';
import { SwapAction } from '../actions/swap';

// Mock the ICacheManager
const mockCacheManager = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn(),
};

describe('Swap Action', () => {
  let wp: WalletProvider;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);

    const pk = generatePrivateKey();
    const customChains = prepareChains();
    wp = new WalletProvider(pk, mockCacheManager as any, customChains);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Constructor', () => {
    it('should initialize with wallet provider', () => {
      const ta = new SwapAction(wp);

      expect(ta).toBeDefined();
    });
  });
  describe('Swap', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let ta: SwapAction;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let receiver: Account;

    beforeEach(() => {
      ta = new SwapAction(wp);
      receiver = privateKeyToAccount(generatePrivateKey());
    });

    it('swap throws if not enough gas/tokens', async () => {
      const ta = new SwapAction(wp);
      await expect(
        ta.swap({
          chain: 'base',
          fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          toToken: '0x4200000000000000000000000000000000000006',
          amount: '100',
          slippage: 0.5,
        })
      ).rejects.toThrow('Execution failed');
    });
  });
});

const prepareChains = () => {
  const customChains: Record<string, Chain> = {};
  const chainNames = ['base'];
  chainNames.forEach((chain) => (customChains[chain] = WalletProvider.genChainFromName(chain)));

  return customChains;
};

```

`/plugin-evm/src/constants.ts`:

```ts
export const EVM_WALLET_DATA_CACHE_KEY = 'evm/wallet/data';
export const EVM_SERVICE_NAME = 'evmService';
export const CACHE_REFRESH_INTERVAL_MS = 60 * 1000; // 60 seconds

```

`/plugin-evm/src/actions/swap.ts`:

```ts
import type { IAgentRuntime, Memory, State } from "@elizaos/core-plugin-v2";
import { ModelType, composePrompt, elizaLogger } from "@elizaos/core-plugin-v2";
import {
  type ExtendedChain,
  type Route,
  createConfig,
  executeRoute,
  getRoutes,
} from "@lifi/sdk";

import {
  type Address,
  type ByteArray,
  type Hex,
  encodeFunctionData,
  parseAbi,
  parseUnits,
} from "viem";
import { type WalletProvider, initWalletProvider } from "../providers/wallet";
import { swapTemplate } from "../templates";
import type { SwapParams, SwapQuote, Transaction } from "../types";
import type { BebopRoute } from "../types/index";

export { swapTemplate };

export class SwapAction {
  private lifiConfig;
  private bebopChainsMap;

  constructor(private walletProvider: WalletProvider) {
    this.walletProvider = walletProvider;
    const lifiChains: ExtendedChain[] = [];
    for (const config of Object.values(this.walletProvider.chains)) {
      try {
        lifiChains.push({
          id: config.id,
          name: config.name,
          key: config.name.toLowerCase(),
          chainType: "EVM" as const,
          nativeToken: {
            ...config.nativeCurrency,
            chainId: config.id,
            address: "0x0000000000000000000000000000000000000000",
            coinKey: config.nativeCurrency.symbol,
            priceUSD: "0",
            logoURI: "",
            symbol: config.nativeCurrency.symbol,
            decimals: config.nativeCurrency.decimals,
            name: config.nativeCurrency.name,
          },
          rpcUrls: {
            public: { http: [config.rpcUrls.default.http[0]] },
          },
          blockExplorerUrls: [config.blockExplorers?.default.url],
          metamask: {
            chainId: `0x${config.id.toString(16)}`,
            chainName: config.name,
            nativeCurrency: config.nativeCurrency,
            rpcUrls: [config.rpcUrls.default.http[0]],
            blockExplorerUrls: [config.blockExplorers?.default.url],
          },
          coin: config.nativeCurrency.symbol,
          mainnet: true,
          diamondAddress: "0x0000000000000000000000000000000000000000",
        } as ExtendedChain);
      } catch {
        // Skip chains with missing config in viem
      }
    }
    this.lifiConfig = createConfig({
      integrator: "eliza",
      chains: lifiChains,
    });
    this.bebopChainsMap = {
      mainnet: "ethereum",
      optimism: "optimism",
      polygon: "polygon",
      arbitrum: "arbitrum",
      base: "base",
      linea: "linea",
    };
  }

  async swap(params: SwapParams): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient(params.chain);
    const [fromAddress] = await walletClient.getAddresses();

    // Getting quotes from different aggregators and sorting them by minAmount (amount after slippage)
    const sortedQuotes: SwapQuote[] = await this.getSortedQuotes(
      fromAddress,
      params
    );

    // Trying to execute the best quote by amount, fallback to the next one if it fails
    for (const quote of sortedQuotes) {
      let res;
      switch (quote.aggregator) {
        case "lifi":
          res = await this.executeLifiQuote(quote);
          break;
        case "bebop":
          res = await this.executeBebopQuote(quote, params);
          break;
        default:
          throw new Error("No aggregator found");
      }
      if (res !== undefined) return res;
    }
    throw new Error("Execution failed");
  }

  private async getSortedQuotes(
    fromAddress: Address,
    params: SwapParams
  ): Promise<SwapQuote[]> {
    const decimalsAbi = parseAbi(["function decimals() view returns (uint8)"]);
    const decimals = await this.walletProvider
      .getPublicClient(params.chain)
      .readContract({
        address: params.fromToken,
        abi: decimalsAbi,
        functionName: "decimals",
      });
    const quotes: SwapQuote[] = (await Promise.all([
      this.getLifiQuote(fromAddress, params, decimals),
      this.getBebopQuote(fromAddress, params, decimals),
    ])) as SwapQuote[];
    const sortedQuotes: SwapQuote[] = quotes.filter(
      (quote) => quote !== undefined
    ) as SwapQuote[];
    sortedQuotes.sort((a, b) =>
      BigInt(a.minOutputAmount) > BigInt(b.minOutputAmount) ? -1 : 1
    );
    if (sortedQuotes.length === 0) throw new Error("No routes found");
    return sortedQuotes;
  }

  private async getLifiQuote(
    fromAddress: Address,
    params: SwapParams,
    fromTokenDecimals: number
  ): Promise<SwapQuote | undefined> {
    try {
      const routes = await getRoutes({
        fromChainId: this.walletProvider.getChainConfigs(params.chain).id,
        toChainId: this.walletProvider.getChainConfigs(params.chain).id,
        fromTokenAddress: params.fromToken,
        toTokenAddress: params.toToken,
        fromAmount: parseUnits(params.amount, fromTokenDecimals).toString(),
        fromAddress: fromAddress,
        options: {
          slippage: (params.slippage as number) / 100 || 0.005,
          order: "RECOMMENDED",
        },
      });
      if (!routes.routes.length) throw new Error("No routes found");
      return {
        aggregator: "lifi",
        minOutputAmount: routes.routes[0].steps[0].estimate.toAmountMin,
        swapData: routes.routes[0],
      };
    } catch (error) {
      elizaLogger.error(
        "Error in getLifiQuote:",
        error instanceof Error ? error.message : String(error)
      );
      return undefined;
    }
  }

  private async getBebopQuote(
    fromAddress: Address,
    params: SwapParams,
    fromTokenDecimals: number
  ): Promise<SwapQuote | undefined> {
    try {
      const url = `https://api.bebop.xyz/router/${(this.bebopChainsMap as any)[params.chain] ?? params.chain}/v1/quote`;
      const reqParams = new URLSearchParams({
        sell_tokens: params.fromToken,
        buy_tokens: params.toToken,
        sell_amounts: parseUnits(params.amount, fromTokenDecimals).toString(),
        taker_address: fromAddress,
        approval_type: "Standard",
        skip_validation: "true",
        gasless: "false",
        source: "eliza",
      });
      const response = await fetch(`${url}?${reqParams.toString()}`, {
        method: "GET",
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        throw Error(response.statusText);
      }
      //const data: { routes: { quote: { tx: { data: string, from: string, value: string, to: string, gas: string, gasPrice: string }, approvalTarget: string, buyTokens: { [key: string]: { minimumAmount: string } } } }[] } = await response.json();
      const data: any = await response.json();
      const route: BebopRoute = {
        data: data.routes[0].quote.tx.data,
        sellAmount: parseUnits(params.amount, fromTokenDecimals).toString(),
        approvalTarget: data.routes[0].quote.approvalTarget as `0x${string}`,
        from: data.routes[0].quote.tx.from as `0x${string}`,
        value: data.routes[0].quote.tx.value.toString(),
        to: data.routes[0].quote.tx.to as `0x${string}`,
        gas: data.routes[0].quote.tx.gas.toString(),
        gasPrice: data.routes[0].quote.tx.gasPrice.toString(),
      };
      return {
        aggregator: "bebop",
        minOutputAmount:
          data.routes[0].quote.buyTokens[
            params.toToken
          ].minimumAmount.toString(),
        swapData: route,
      };
    } catch (error) {
      elizaLogger.error(
        "Error in getBebopQuote:",
        error instanceof Error ? error.message : String(error)
      );
      return undefined;
    }
  }

  private async executeLifiQuote(
    quote: SwapQuote
  ): Promise<Transaction | undefined> {
    try {
      const route: Route = quote.swapData as Route;
      const execution = await executeRoute(
        quote.swapData as Route,
        this.lifiConfig as any
      );
      const process = execution.steps[0]?.execution?.process[0];

      if (!process?.status || process.status === "FAILED") {
        throw new Error("Transaction failed");
      }
      return {
        hash: process.txHash as `0x${string}`,
        from: route.fromAddress! as `0x${string}`,
        to: route.steps[0].estimate.approvalAddress as `0x${string}`,
        value: 0n,
        data: process.data as `0x${string}`,
        chainId: route.fromChainId,
      };
    } catch (error) {
      elizaLogger.error(`Failed to execute lifi quote: ${error}`);
      return undefined;
    }
  }

  private async executeBebopQuote(
    quote: SwapQuote,
    params: SwapParams
  ): Promise<Transaction | undefined> {
    try {
      const bebopRoute: BebopRoute = quote.swapData as BebopRoute;
      const allowanceAbi = parseAbi([
        "function allowance(address,address) view returns (uint256)",
      ]);
      const allowance: bigint = await this.walletProvider
        .getPublicClient(params.chain)
        .readContract({
          address: params.fromToken,
          abi: allowanceAbi,
          functionName: "allowance",
          args: [bebopRoute.from, bebopRoute.approvalTarget],
        });
      if (allowance < BigInt(bebopRoute.sellAmount)) {
        const approvalData = encodeFunctionData({
          abi: parseAbi(["function approve(address,uint256)"]),
          functionName: "approve",
          args: [bebopRoute.approvalTarget, BigInt(bebopRoute.sellAmount)],
        });
        await this.walletProvider
          .getWalletClient(params.chain)
          .sendTransaction({
            account: this.walletProvider.getWalletClient(params.chain).account,
            to: params.fromToken,
            value: 0n,
            data: approvalData,
            kzg: {
              blobToKzgCommitment: (_: ByteArray): ByteArray => {
                throw new Error("Function not implemented.");
              },
              computeBlobKzgProof: (
                _blob: ByteArray,
                _commitment: ByteArray
              ): ByteArray => {
                throw new Error("Function not implemented.");
              },
            },
            chain: undefined,
          } as any);
      }
      const hash = await this.walletProvider
        .getWalletClient(params.chain)
        .sendTransaction({
          account: this.walletProvider.getWalletClient(params.chain).account,
          to: bebopRoute.to,
          value: BigInt(bebopRoute.value),
          data: bebopRoute.data as Hex,
          kzg: {
            blobToKzgCommitment: (_: ByteArray): ByteArray => {
              throw new Error("Function not implemented.");
            },
            computeBlobKzgProof: (
              _blob: ByteArray,
              _commitment: ByteArray
            ): ByteArray => {
              throw new Error("Function not implemented.");
            },
          },
          chain: undefined,
        } as any);
      return {
        hash,
        from: this.walletProvider.getWalletClient(params.chain)?.account
          ?.address as `0x${string}`,
        to: bebopRoute.to,
        value: BigInt(bebopRoute.value),
        data: bebopRoute.data as Hex,
      };
    } catch (error) {
      elizaLogger.error(`Failed to execute bebop quote: ${error}`);
      return undefined;
    }
  }
}

const buildSwapDetails = async (
  state: State,
  runtime: IAgentRuntime,
  wp: WalletProvider
): Promise<SwapParams> => {
  const chains = wp.getSupportedChains();
  state.supportedChains = chains.map((item) => `"${item}"`).join("|");

  // Add balances to state for better context in template
  const balances = await wp.getWalletBalances();
  state.chainBalances = Object.entries(balances)
    .map(([chain, balance]) => {
      const chainConfig = wp.getChainConfigs(chain as any);
      return `${chain}: ${balance} ${chainConfig.nativeCurrency.symbol}`;
    })
    .join(", ");

  const context = composePrompt({
    state,
    template: swapTemplate,
  });

  const swapDetails = await runtime.useModel(ModelType.OBJECT_SMALL, {
    context,
  });

  // Validate chain exists
  const chain = swapDetails.chain;
  if (!wp.chains[chain]) {
    throw new Error(
      `Chain ${chain} not configured. Available chains: ${chains.join(", ")}`
    );
  }

  return swapDetails;
};

export const swapAction = {
  name: "EVM_SWAP_TOKENS",
  description: "Swap tokens on the same chain",
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    state: State,
    _options: any,
    callback: any
  ) => {
    const walletProvider = await initWalletProvider(runtime);
    const action = new SwapAction(walletProvider);

    try {
      // Get swap parameters
      const swapOptions = await buildSwapDetails(
        state,
        runtime,
        walletProvider
      );

      const swapResp = await action.swap(swapOptions);
      if (callback) {
        callback({
          text: `Successfully swapped ${swapOptions.amount} ${swapOptions.fromToken} for ${swapOptions.toToken} on ${swapOptions.chain}\nTransaction Hash: ${swapResp.hash}`,
          content: {
            success: true,
            hash: swapResp.hash,
            chain: swapOptions.chain,
          },
        });
      }
      return true;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error in swap handler:", errMsg);
      if (callback) {
        callback({
          text: `Error: ${errMsg}`,
          content: { error: errMsg },
        });
      }
      return false;
    }
  },
  template: swapTemplate,
  validate: async (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Swap 1 WETH for USDC on Arbitrum",
          action: "TOKEN_SWAP",
        },
      },
    ],
  ],
  similes: ["TOKEN_SWAP", "EXCHANGE_TOKENS", "TRADE_TOKENS"],
};

```

`/plugin-evm/src/index.ts`:

```ts
export * from './actions/bridge';
export * from './actions/swap';
export * from './actions/transfer';
export * from './providers/wallet';
export * from './service';
export * from './types';

import type { Plugin } from '@elizaos/core-plugin-v2';
import { swapAction } from './actions/swap';
import { transferAction } from './actions/transfer';
import { evmWalletProvider } from './providers/wallet';
import { EVMService } from './service';
import { EVM_SERVICE_NAME } from './constants';

export const evmPlugin: Plugin = {
  name: 'evm',
  description: 'EVM blockchain integration plugin',
  providers: [evmWalletProvider],
  evaluators: [],
  services: [EVMService],
  actions: [transferAction as any, swapAction as any],
};

export default evmPlugin;

```

`/plugin-evm/src/service.ts`:

```ts
import { type IAgentRuntime, Service, elizaLogger } from "@elizaos/core-plugin-v2";
import {
  CACHE_REFRESH_INTERVAL_MS,
  EVM_SERVICE_NAME,
  EVM_WALLET_DATA_CACHE_KEY,
} from "./constants";
import { type WalletProvider, initWalletProvider } from "./providers/wallet";
import type { SupportedChain } from "./types";

export interface EVMWalletData {
  address: string;
  chains: {
    chainName: string;
    name: string;
    balance: string;
    symbol: string;
    chainId: number;
  }[];
  timestamp: number;
}

export class EVMService extends Service {
  static serviceType: string = EVM_SERVICE_NAME;
  capabilityDescription = "EVM blockchain wallet access";

  private walletProvider: WalletProvider | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private lastRefreshTimestamp = 0;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<EVMService> {
    elizaLogger.log("Initializing EVMService");

    const evmService = new EVMService(runtime);

    // Initialize wallet provider
    evmService.walletProvider = await initWalletProvider(runtime);

    // Fetch data immediately on initialization
    await evmService.refreshWalletData();

    // Set up refresh interval
    if (evmService.refreshInterval) {
      clearInterval(evmService.refreshInterval);
    }

    evmService.refreshInterval = setInterval(
      () => evmService.refreshWalletData(),
      CACHE_REFRESH_INTERVAL_MS
    );

    elizaLogger.log("EVM service initialized");
    return evmService;
  }

  static async stop(runtime: IAgentRuntime) {
    const service = runtime.getService(EVM_SERVICE_NAME);
    if (!service) {
      elizaLogger.error("EVMService not found");
      return;
    }
    await service.stop();
  }

  async stop(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    elizaLogger.log("EVM service shutdown");
  }

  async refreshWalletData(): Promise<void> {
    try {
      if (!this.walletProvider) {
        this.walletProvider = await initWalletProvider(this.runtime);
      }

      const address = this.walletProvider.getAddress();
      const balances = await this.walletProvider.getWalletBalances();

      // Format balances for all chains
      const chainDetails = Object.entries(balances)
        .map(([chainName, balance]) => {
          try {
            const chain = this.walletProvider!.getChainConfigs(
              chainName as SupportedChain
            );
            return {
              chainName,
              balance,
              symbol: chain.nativeCurrency.symbol,
              chainId: chain.id,
              name: chain.name,
            };
          } catch (error) {
            elizaLogger.error(`Error formatting chain ${chainName}:`, error);
            return null;
          }
        })
        .filter(Boolean);

      const walletData: EVMWalletData = {
        address,
        chains: chainDetails as EVMWalletData["chains"],
        timestamp: Date.now(),
      };

      // Cache the wallet data
      await this.runtime.setCache(EVM_WALLET_DATA_CACHE_KEY, walletData);
      this.lastRefreshTimestamp = walletData.timestamp;

      elizaLogger.log(
        "EVM wallet data refreshed for chains:",
        chainDetails.map((c) => c?.chainName).join(", ")
      );
    } catch (error) {
      elizaLogger.error("Error refreshing EVM wallet data:", error);
    }
  }

  async getCachedData(): Promise<EVMWalletData | undefined> {
    try {
      const cachedData = await this.runtime.getCache<EVMWalletData>(
        EVM_WALLET_DATA_CACHE_KEY
      );

      const now = Date.now();
      // If data is stale or doesn't exist, refresh it
      if (
        !cachedData ||
        now - cachedData.timestamp > CACHE_REFRESH_INTERVAL_MS
      ) {
        elizaLogger.log("EVM wallet data is stale, refreshing...");
        await this.refreshWalletData();
        return this.runtime.getCache<EVMWalletData>(EVM_WALLET_DATA_CACHE_KEY);
      }

      return cachedData;
    } catch (error) {
      elizaLogger.error("Error getting cached EVM wallet data:", error);
      return undefined;
    }
  }

  async forceUpdate(): Promise<EVMWalletData | undefined> {
    await this.refreshWalletData();
    return this.getCachedData();
  }
}

```

New packages/plugin-evm

Project Path: src

Source Tree:

```
src
├── types
│   └── index.ts
├── tee.d.ts
├── providers
│   └── wallet.ts
├── tests
│   ├── transfer.test.ts
│   ├── wallet.test.ts
│   ├── custom-chain.ts
│   └── swap.test.ts
├── constants.ts
├── actions
│   ├── transfer.ts
│   ├── bridge.ts
│   ├── swap.ts
├── templates
│   └── index.ts
├── index.ts
└── service.ts

```

`/plugin-evm/src/types/index.ts`:

```ts
import type { Route, Token } from '@lifi/types';
import type {
  Account,
  Address,
  Chain,
  Hash,
  HttpTransport,
  PublicClient,
  WalletClient,
  Log,
} from 'viem';
import * as viemChains from 'viem/chains';

const _SupportedChainList = Object.keys(viemChains) as Array<keyof typeof viemChains>;
export type SupportedChain = (typeof _SupportedChainList)[number];

// Transaction types
export interface Transaction {
  hash: Hash;
  from: Address;
  to: Address;
  value: bigint;
  data?: `0x${string}`;
  chainId?: number;
  logs?: Log[];
}

// Token types
export interface TokenWithBalance {
  token: Token;
  balance: bigint;
  formattedBalance: string;
  priceUSD: string;
  valueUSD: string;
}

export interface WalletBalance {
  chain: SupportedChain;
  address: Address;
  totalValueUSD: string;
  tokens: TokenWithBalance[];
}

// Chain configuration
export interface ChainMetadata {
  chainId: number;
  name: string;
  chain: Chain;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl: string;
}

export interface ChainConfig {
  chain: Chain;
  publicClient: PublicClient<HttpTransport, Chain, Account | undefined>;
  walletClient?: WalletClient;
}

// Action parameters
export interface TransferParams {
  fromChain: SupportedChain;
  toAddress: Address;
  amount: string;
  data?: `0x${string}`;
}

export interface SwapParams {
  chain: SupportedChain;
  fromToken: Address;
  toToken: Address;
  amount: string;
  slippage?: number;
}

export interface BebopRoute {
  data: string;
  approvalTarget: Address;
  sellAmount: string;
  from: Address;
  to: Address;
  value: string;
  gas: string;
  gasPrice: string;
}

export interface SwapQuote {
  aggregator: 'lifi' | 'bebop';
  minOutputAmount: string;
  swapData: Route | BebopRoute;
}

export interface BridgeParams {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  fromToken: Address;
  toToken: Address;
  amount: string;
  toAddress?: Address;
}

// Plugin configuration
export interface EvmPluginConfig {
  rpcUrl?: {
    ethereum?: string;
    abstract?: string;
    base?: string;
    sepolia?: string;
    bsc?: string;
    arbitrum?: string;
    avalanche?: string;
    polygon?: string;
    optimism?: string;
    cronos?: string;
    gnosis?: string;
    fantom?: string;
    fraxtal?: string;
    klaytn?: string;
    celo?: string;
    moonbeam?: string;
    aurora?: string;
    harmonyOne?: string;
    moonriver?: string;
    arbitrumNova?: string;
    mantle?: string;
    linea?: string;
    scroll?: string;
    filecoin?: string;
    taiko?: string;
    zksync?: string;
    canto?: string;
    alienx?: string;
    gravity?: string;
  };
  secrets?: {
    EVM_PRIVATE_KEY: string;
  };
  testMode?: boolean;
  multicall?: {
    batchSize?: number;
    wait?: number;
  };
}

// LiFi types
export type LiFiStatus = {
  status: 'PENDING' | 'DONE' | 'FAILED';
  substatus?: string;
  error?: Error;
};

export type LiFiRoute = {
  transactionHash: Hash;
  transactionData: `0x${string}`;
  toAddress: Address;
  status: LiFiStatus;
};

// Provider types
export interface TokenData extends Token {
  symbol: string;
  decimals: number;
  address: Address;
  name: string;
  logoURI?: string;
  chainId: number;
}

export interface TokenPriceResponse {
  priceUSD: string;
  token: TokenData;
}

export interface TokenListResponse {
  tokens: TokenData[];
}

export interface ProviderError extends Error {
  code?: number;
  data?: unknown;
}

export enum VoteType {
  AGAINST = 0,
  FOR = 1,
  ABSTAIN = 2,
}

export interface Proposal {
  targets: Address[];
  values: bigint[];
  calldatas: `0x${string}`[];
  description: string;
}

export interface VoteParams {
  chain: SupportedChain;
  governor: Address;
  proposalId: string;
  support: VoteType;
}

export interface QueueProposalParams extends Proposal {
  chain: SupportedChain;
  governor: Address;
}

export interface ExecuteProposalParams extends Proposal {
  chain: SupportedChain;
  governor: Address;
  proposalId: string;
}

export interface ProposeProposalParams extends Proposal {
  chain: SupportedChain;
  governor: Address;
}

```

`/plugin-evm/src/tee.d.ts`:

```ts
declare module "@elizaos/plugin-tee";
```

`/plugin-evm/src/providers/wallet.ts`:

```ts
import * as path from "node:path";
import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type ProviderResult,
  type State,
  elizaLogger,
} from "@elizaos/core-plugin-v2";
import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";
import type {
  Account,
  Address,
  Chain,
  HttpTransport,
  PrivateKeyAccount,
  PublicClient,
  TestClient,
  WalletClient,
} from "viem";
import {
  http,
  createPublicClient,
  createTestClient,
  createWalletClient,
  formatUnits,
  publicActions,
  walletActions,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";

import { EVM_SERVICE_NAME } from "../constants";
import type { EVMService } from "../service";
import type { SupportedChain, WalletBalance } from "../types";

export class WalletProvider {
  private cacheKey = "evm/wallet";
  chains: Record<string, Chain> = { ...viemChains };
  account: PrivateKeyAccount | any;
  runtime: IAgentRuntime;
  constructor(
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`,
    runtime: IAgentRuntime,
    chains?: Record<string, Chain>
  ) {
    this.setAccount(accountOrPrivateKey);
    this.addChains(chains);
    this.runtime = runtime;
  }

  getAddress(): Address {
    return this.account.address;
  }

  getPublicClient(
    chainName: SupportedChain
  ): PublicClient<HttpTransport, Chain, Account | undefined> {
    const transport = this.createHttpTransport(chainName);

    const publicClient = createPublicClient({
      chain: this.chains[chainName],
      transport,
    });
    return publicClient;
  }

  getWalletClient(chainName: SupportedChain): WalletClient {
    const transport = this.createHttpTransport(chainName);

    const walletClient = createWalletClient({
      chain: this.chains[chainName],
      transport,
      account: this.account,
    });

    return walletClient;
  }

  getTestClient(): TestClient {
    return createTestClient({
      chain: viemChains.hardhat,
      mode: "hardhat",
      transport: http(),
    })
      .extend(publicActions)
      .extend(walletActions);
  }

  getChainConfigs(chainName: SupportedChain): Chain {
    const chain = this.chains[chainName];

    if (!chain?.id) {
      throw new Error(`Invalid chain name: ${chainName}`);
    }

    return chain;
  }

  getSupportedChains(): SupportedChain[] {
    return Object.keys(this.chains) as SupportedChain[];
  }

  async getWalletBalances(): Promise<Record<SupportedChain, string>> {
    const cacheKey = path.join(this.cacheKey, "walletBalances");
    const cachedData =
      await this.runtime.getCache<Record<SupportedChain, string>>(cacheKey);
    if (cachedData) {
      elizaLogger.log(`Returning cached wallet balances`);
      return cachedData;
    }

    const balances = {} as Record<SupportedChain, string>;
    const chainNames = this.getSupportedChains();

    await Promise.all(
      chainNames.map(async (chainName) => {
        try {
          const balance = await this.getWalletBalanceForChain(chainName);
          if (balance !== null) {
            balances[chainName] = balance;
          }
        } catch (error) {
          elizaLogger.error(`Error getting balance for ${chainName}:`, error);
        }
      })
    );

    await this.runtime.setCache(cacheKey, balances);
    elizaLogger.log("Wallet balances cached");
    return balances;
  }

  async getWalletBalanceForChain(
    chainName: SupportedChain
  ): Promise<string | null> {
    try {
      const client = this.getPublicClient(chainName);
      const balance = await client.getBalance({
        address: this.account.address,
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error(`Error getting wallet balance for ${chainName}:`, error);
      return null;
    }
  }

  addChain(chain: Record<string, Chain>) {
    this.addChains(chain);
  }

  private setAccount = (
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`
  ) => {
    if (typeof accountOrPrivateKey === "string") {
      this.account = privateKeyToAccount(accountOrPrivateKey);
    } else {
      this.account = accountOrPrivateKey;
    }
  };

  private addChains = (chains?: Record<string, Chain>) => {
    if (!chains) {
      return;
    }
    for (const chain of Object.keys(chains)) {
      this.chains[chain] = chains[chain];
    }
  };

  private createHttpTransport = (chainName: SupportedChain) => {
    const chain = this.chains[chainName];
    if (!chain) {
      throw new Error(`Chain not found: ${chainName}`);
    }

    if (chain.rpcUrls.custom) {
      return http(chain.rpcUrls.custom.http[0]);
    }
    return http(chain.rpcUrls.default.http[0]);
  };

  static genChainFromName(
    chainName: string,
    customRpcUrl?: string | null
  ): Chain {
    const baseChain = (viemChains as any)[chainName];

    if (!baseChain?.id) {
      throw new Error("Invalid chain name");
    }

    const viemChain: Chain = customRpcUrl
      ? {
          ...baseChain,
          rpcUrls: {
            ...baseChain.rpcUrls,
            custom: {
              http: [customRpcUrl],
            },
          },
        }
      : baseChain;

    return viemChain;
  }
}

const genChainsFromRuntime = (
  runtime: IAgentRuntime
): Record<string, Chain> => {
  // Get chains from settings or use default supported chains
  const configuredChains =
    (runtime.character.settings?.chains?.evm as SupportedChain[]) || [];

  // Default chains to include if not specified in settings
  const defaultChains = [
    "mainnet",
    "polygon",
    "arbitrum",
    "base",
    "optimism",
    "linea",
  ];

  // Combine configured chains with defaults, removing duplicates
  const chainNames = [...new Set([...configuredChains, ...defaultChains])];
  const chains: Record<string, Chain> = {};

  for (const chainName of chainNames) {
    try {
      // Try to get RPC URL from settings using different formats
      let rpcUrl = runtime.getSetting(
        `ETHEREUM_PROVIDER_${chainName.toUpperCase()}`
      );

      if (!rpcUrl) {
        rpcUrl = runtime.getSetting(`EVM_PROVIDER_${chainName.toUpperCase()}`);
      }

      // Skip chains that don't exist in viem
      if (!(viemChains as any)[chainName]) {
        elizaLogger.warn(
          `Chain ${chainName} not found in viem chains, skipping`
        );
        continue;
      }

      const chain = WalletProvider.genChainFromName(chainName, rpcUrl);
      chains[chainName] = chain;
    } catch (error) {
      elizaLogger.error(`Error configuring chain ${chainName}:`, error);
    }
  }

  return chains;
};

export const initWalletProvider = async (runtime: IAgentRuntime) => {
  const teeMode = runtime.getSetting("TEE_MODE") || TEEMode.OFF;

  const chains = genChainsFromRuntime(runtime);

  if (teeMode !== TEEMode.OFF) {
    const walletSecretSalt = runtime.getSetting("WALLET_SECRET_SALT");
    if (!walletSecretSalt) {
      throw new Error("WALLET_SECRET_SALT required when TEE_MODE is enabled");
    }

    const deriveKeyProvider = new DeriveKeyProvider(teeMode);
    const deriveKeyResult = await deriveKeyProvider.deriveEcdsaKeypair(
      walletSecretSalt,
      "evm",
      runtime.agentId
    );
    return new WalletProvider(deriveKeyResult.keypair, runtime, chains);
  }
  const privateKey = runtime.getSetting("EVM_PRIVATE_KEY") as `0x${string}`;
  if (!privateKey) {
    throw new Error("EVM_PRIVATE_KEY is missing");
  }
  return new WalletProvider(privateKey, runtime, chains);
};

export const evmWalletProvider: Provider = {
  name: "EVMWalletProvider",
  async get(
    runtime: IAgentRuntime,
    _message: Memory,
    state?: State
  ): Promise<ProviderResult> {
    try {
      // Get the EVM service
      const evmService = runtime.getService(EVM_SERVICE_NAME);

      // If service is not available, fall back to direct fetching
      if (!evmService) {
        elizaLogger.warn(
          "EVM service not found, falling back to direct fetching"
        );
        return await directFetchWalletData(runtime, state);
      }

      // Get wallet data from the service
      const walletData = await (evmService as any).getCachedData();
      if (!walletData) {
        elizaLogger.warn(
          "No cached wallet data available, falling back to direct fetching"
        );
        return await directFetchWalletData(runtime, state);
      }

      const agentName = state?.agentName || "The agent";

      // Create a text representation of all chain balances
      const balanceText = walletData.chains
        .map((chain: any) => `${chain.name}: ${chain.balance} ${chain.symbol}`)
        .join("\n");

      return {
        text: `${agentName}'s EVM Wallet Address: ${walletData.address}\n\nBalances:\n${balanceText}`,
        data: {
          address: walletData.address,
          chains: walletData.chains,
        },
        values: {
          address: walletData.address,
          chains: JSON.stringify(walletData.chains),
        },
      };
    } catch (error) {
      console.error("Error in EVM wallet provider:", error);
      return {
        text: "Error getting EVM wallet provider",
        data: {},
        values: {},
      };
    }
  },
};

// Fallback function to fetch wallet data directly
async function directFetchWalletData(
  runtime: IAgentRuntime,
  state?: State
): Promise<ProviderResult> {
  try {
    const walletProvider = await initWalletProvider(runtime);
    const address = walletProvider.getAddress();
    const balances = await walletProvider.getWalletBalances();
    const agentName = state?.agentName || "The agent";

    // Format balances for all chains
    const chainDetails = Object.entries(balances).map(
      ([chainName, balance]) => {
        const chain = walletProvider.getChainConfigs(
          chainName as SupportedChain
        );
        return {
          chainName,
          balance,
          symbol: chain.nativeCurrency.symbol,
          chainId: chain.id,
          name: chain.name,
        };
      }
    );

    // Create a text representation of all chain balances
    const balanceText = chainDetails
      .map((chain) => `${chain.name}: ${chain.balance} ${chain.symbol}`)
      .join("\n");

    return {
      text: `${agentName}'s EVM Wallet Address: ${address}\n\nBalances:\n${balanceText}`,
      data: {
        address,
        chains: chainDetails,
      },
      values: {
        address: address as string,
        chains: JSON.stringify(chainDetails),
      },
    };
  } catch (error) {
    console.error("Error fetching wallet data directly:", error);
    return {
      text: "Error getting EVM wallet provider",
      data: {},
      values: {},
    };
  }
}

```

`/plugin-evm/src/tests/wallet.test.ts`:

```ts
import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { mainnet, iotex, arbitrum, type Chain } from 'viem/chains';

import { WalletProvider } from '../providers/wallet';
import { customChain } from './custom-chain';

const customRpcUrls = {
  mainnet: 'custom-rpc.mainnet.io',
  arbitrum: 'custom-rpc.base.io',
  iotex: 'custom-rpc.iotex.io',
};

// Mock the ICacheManager
const mockCacheManager = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn(),
};

describe('Wallet provider', () => {
  let walletProvider: WalletProvider;
  let pk: `0x${string}`;
  const customChains: Record<string, Chain> = {};
  const chainName = 'myCustomChain';

  beforeAll(() => {
    pk = generatePrivateKey();
    // Add the custom chain to the customChains object
    customChains[chainName] = customChain;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);
  });

  describe('Constructor', () => {
    it('sets address', () => {
      const account = privateKeyToAccount(pk);
      const expectedAddress = account.address;

      walletProvider = new WalletProvider(pk, mockCacheManager as any);

      expect(walletProvider.getAddress()).toEqual(expectedAddress);
    });
    it('sets default chains (including mainnet) when no custom chains are provided', () => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any);

      // mainnet from viem.chains is included by default
      expect(walletProvider.chains.mainnet.id).toEqual(mainnet.id);
    });

    it('sets custom chains', () => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any, customChains);

      expect(walletProvider.chains.myCustomChain.id).toEqual(customChain.id);
    });
  });
  describe('Clients', () => {
    beforeEach(() => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any);
    });
    it('generates public client for mainnet', () => {
      const client = walletProvider.getPublicClient('mainnet');
      expect(client.chain.id).toEqual(mainnet.id);
      expect(client.transport.url).toEqual(mainnet.rpcUrls.default.http[0]);
    });
    it('generates public client with custom rpcurl', () => {
      const chain = WalletProvider.genChainFromName('mainnet', customRpcUrls.mainnet);
      const wp = new WalletProvider(pk, mockCacheManager as any, {
        ['mainnet']: chain,
      });

      const client = wp.getPublicClient('mainnet');
      expect(client.chain.id).toEqual(mainnet.id);
      expect(client.chain.rpcUrls.default.http[0]).toEqual(mainnet.rpcUrls.default.http[0]);
      expect(client.chain.rpcUrls.custom.http[0]).toEqual(customRpcUrls.mainnet);
      expect(client.transport.url).toEqual(customRpcUrls.mainnet);
    });
    it('generates wallet client', () => {
      const account = privateKeyToAccount(pk);
      const expectedAddress = account.address;

      const client = walletProvider.getWalletClient('mainnet');

      expect(client.account.address).toEqual(expectedAddress);
      expect(client.transport.url).toEqual(mainnet.rpcUrls.default.http[0]);
    });
    it('generates wallet client with custom rpcurl', () => {
      const account = privateKeyToAccount(pk);
      const expectedAddress = account.address;
      const chain = WalletProvider.genChainFromName('mainnet', customRpcUrls.mainnet);
      const wp = new WalletProvider(pk, mockCacheManager as any, {
        ['mainnet']: chain,
      });

      const client = wp.getWalletClient('mainnet');

      expect(client.account.address).toEqual(expectedAddress);
      expect(client.chain.id).toEqual(mainnet.id);
      expect(client.chain.rpcUrls.default.http[0]).toEqual(mainnet.rpcUrls.default.http[0]);
      expect(client.chain.rpcUrls.custom.http[0]).toEqual(customRpcUrls.mainnet);
      expect(client.transport.url).toEqual(customRpcUrls.mainnet);
    });
  });
  describe('Balance', () => {
    beforeEach(() => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any, customChains);
    });
    it('should fetch balance for "mainnet" (returns "0" in test env)', async () => {
      const bal = await walletProvider.getWalletBalanceForChain('mainnet');
      expect(bal).toEqual('0');
    });
    it('should fetch balance for a specific added chain', async () => {
      const bal = await walletProvider.getWalletBalanceForChain('iotex');

      expect(bal).toEqual('0');
    });
    it('should return null if chain is not added', async () => {

      const bal = await walletProvider.getWalletBalanceForChain(chainName);
      expect(bal).toBe(null);
    });
  });
  describe('Chain helpers', () => {
    beforeEach(() => {
      walletProvider = new WalletProvider(pk, mockCacheManager as any);
    });
    it('generates chains from chain name', () => {
      const chainName = 'iotex';
      const chain: Chain = WalletProvider.genChainFromName(chainName);

      expect(chain.id).toEqual(iotex.id);
      expect(chain.rpcUrls.default.http[0]).toEqual(iotex.rpcUrls.default.http[0]);
    });
    it('generates chains from chain name with custom rpc url', () => {
      const chainName = 'iotex';
      const customRpcUrl = 'custom.url.io';
      const chain: Chain = WalletProvider.genChainFromName(chainName, customRpcUrl);

      expect(chain.rpcUrls.default.http[0]).toEqual(iotex.rpcUrls.default.http[0]);
      expect(chain.rpcUrls.custom.http[0]).toEqual(customRpcUrl);
    });

    it('adds chain', () => {
      const initialChains = walletProvider.chains;
      expect(initialChains.customChain).toBeUndefined();

      walletProvider.addChain({ customChain });
      const newChains = walletProvider.chains;
      expect(newChains.customChain).toBeDefined();
    });
    it('gets chain configs', () => {
      const chain = walletProvider.getChainConfigs('iotex');

      expect(chain.id).toEqual(iotex.id);
    });

    it('throws if unsupported chain name', () => {
      // intentionally set incorrect chain, ts will complain
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => WalletProvider.genChainFromName('ethereum')).toThrow();
    });
    it('throws if invalid chain name', () => {
      // intentionally set incorrect chain, ts will complain
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(() => WalletProvider.genChainFromName('eth')).toThrow();
    });
  });
});

```

`/plugin-evm/src/tests/custom-chain.ts`:

```ts
import { defineChain } from 'viem';

export const customChain = defineChain({
  id: 12345, // Your custom chain ID
  name: 'My Custom Chain',
  nativeCurrency: {
    name: 'MyToken',
    symbol: 'MYT',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.mycustomchain.com'] },
    public: { http: ['https://rpc.mycustomchain.com'] },
  },
  blockExplorers: {
    default: { name: 'MyChain Explorer', url: 'https://explorer.mycustomchain.com' },
  },
  testnet: false, // Set to `true` if it's a testnet
});

```

`/plugin-evm/src/tests/swap.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import type { Account, Chain } from 'viem';

import { WalletProvider } from '../providers/wallet';
import { SwapAction } from '../actions/swap';

// Mock the ICacheManager
const mockCacheManager = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn(),
};

describe('Swap Action', () => {
  let wp: WalletProvider;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCacheManager.get.mockResolvedValue(null);

    const pk = generatePrivateKey();
    const customChains = prepareChains();
    wp = new WalletProvider(pk, mockCacheManager as any, customChains);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Constructor', () => {
    it('should initialize with wallet provider', () => {
      const ta = new SwapAction(wp);

      expect(ta).toBeDefined();
    });
  });
  describe('Swap', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let ta: SwapAction;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let receiver: Account;

    beforeEach(() => {
      ta = new SwapAction(wp);
      receiver = privateKeyToAccount(generatePrivateKey());
    });

    it('swap throws if not enough gas/tokens', async () => {
      const ta = new SwapAction(wp);
      await expect(
        ta.swap({
          chain: 'base',
          fromToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          toToken: '0x4200000000000000000000000000000000000006',
          amount: '100',
          slippage: 0.5,
        })
      ).rejects.toThrow('Execution failed');
    });
  });
});

const prepareChains = () => {
  const customChains: Record<string, Chain> = {};
  const chainNames = ['base'];
  chainNames.forEach((chain) => (customChains[chain] = WalletProvider.genChainFromName(chain)));

  return customChains;
};

```

`/plugin-evm/src/constants.ts`:

```ts
export const EVM_WALLET_DATA_CACHE_KEY = 'evm/wallet/data';
export const EVM_SERVICE_NAME = 'evmService';
export const CACHE_REFRESH_INTERVAL_MS = 60 * 1000; // 60 seconds

```

`/plugin-evm/src/actions/swap.ts`:

```ts
import type { IAgentRuntime, Memory, State } from "@elizaos/core-plugin-v2";
import { ModelType, composePrompt, elizaLogger } from "@elizaos/core-plugin-v2";
import {
  type ExtendedChain,
  type Route,
  createConfig,
  executeRoute,
  getRoutes,
} from "@lifi/sdk";

import {
  type Address,
  type ByteArray,
  type Hex,
  encodeFunctionData,
  parseAbi,
  parseUnits,
} from "viem";
import { type WalletProvider, initWalletProvider } from "../providers/wallet";
import { swapTemplate } from "../templates";
import type { SwapParams, SwapQuote, Transaction } from "../types";
import type { BebopRoute } from "../types/index";

export { swapTemplate };

export class SwapAction {
  private lifiConfig;
  private bebopChainsMap;

  constructor(private walletProvider: WalletProvider) {
    this.walletProvider = walletProvider;
    const lifiChains: ExtendedChain[] = [];
    for (const config of Object.values(this.walletProvider.chains)) {
      try {
        lifiChains.push({
          id: config.id,
          name: config.name,
          key: config.name.toLowerCase(),
          chainType: "EVM" as const,
          nativeToken: {
            ...config.nativeCurrency,
            chainId: config.id,
            address: "0x0000000000000000000000000000000000000000",
            coinKey: config.nativeCurrency.symbol,
            priceUSD: "0",
            logoURI: "",
            symbol: config.nativeCurrency.symbol,
            decimals: config.nativeCurrency.decimals,
            name: config.nativeCurrency.name,
          },
          rpcUrls: {
            public: { http: [config.rpcUrls.default.http[0]] },
          },
          blockExplorerUrls: [config.blockExplorers?.default.url],
          metamask: {
            chainId: `0x${config.id.toString(16)}`,
            chainName: config.name,
            nativeCurrency: config.nativeCurrency,
            rpcUrls: [config.rpcUrls.default.http[0]],
            blockExplorerUrls: [config.blockExplorers?.default.url],
          },
          coin: config.nativeCurrency.symbol,
          mainnet: true,
          diamondAddress: "0x0000000000000000000000000000000000000000",
        } as ExtendedChain);
      } catch {
        // Skip chains with missing config in viem
      }
    }
    this.lifiConfig = createConfig({
      integrator: "eliza",
      chains: lifiChains,
    });
    this.bebopChainsMap = {
      mainnet: "ethereum",
      optimism: "optimism",
      polygon: "polygon",
      arbitrum: "arbitrum",
      base: "base",
      linea: "linea",
    };
  }

  async swap(params: SwapParams): Promise<Transaction> {
    const walletClient = this.walletProvider.getWalletClient(params.chain);
    const [fromAddress] = await walletClient.getAddresses();

    // Getting quotes from different aggregators and sorting them by minAmount (amount after slippage)
    const sortedQuotes: SwapQuote[] = await this.getSortedQuotes(
      fromAddress,
      params
    );

    // Trying to execute the best quote by amount, fallback to the next one if it fails
    for (const quote of sortedQuotes) {
      let res;
      switch (quote.aggregator) {
        case "lifi":
          res = await this.executeLifiQuote(quote);
          break;
        case "bebop":
          res = await this.executeBebopQuote(quote, params);
          break;
        default:
          throw new Error("No aggregator found");
      }
      if (res !== undefined) return res;
    }
    throw new Error("Execution failed");
  }

  private async getSortedQuotes(
    fromAddress: Address,
    params: SwapParams
  ): Promise<SwapQuote[]> {
    const decimalsAbi = parseAbi(["function decimals() view returns (uint8)"]);
    const decimals = await this.walletProvider
      .getPublicClient(params.chain)
      .readContract({
        address: params.fromToken,
        abi: decimalsAbi,
        functionName: "decimals",
      });
    const quotes: SwapQuote[] = (await Promise.all([
      this.getLifiQuote(fromAddress, params, decimals),
      this.getBebopQuote(fromAddress, params, decimals),
    ])) as SwapQuote[];
    const sortedQuotes: SwapQuote[] = quotes.filter(
      (quote) => quote !== undefined
    ) as SwapQuote[];
    sortedQuotes.sort((a, b) =>
      BigInt(a.minOutputAmount) > BigInt(b.minOutputAmount) ? -1 : 1
    );
    if (sortedQuotes.length === 0) throw new Error("No routes found");
    return sortedQuotes;
  }

  private async getLifiQuote(
    fromAddress: Address,
    params: SwapParams,
    fromTokenDecimals: number
  ): Promise<SwapQuote | undefined> {
    try {
      const routes = await getRoutes({
        fromChainId: this.walletProvider.getChainConfigs(params.chain).id,
        toChainId: this.walletProvider.getChainConfigs(params.chain).id,
        fromTokenAddress: params.fromToken,
        toTokenAddress: params.toToken,
        fromAmount: parseUnits(params.amount, fromTokenDecimals).toString(),
        fromAddress: fromAddress,
        options: {
          slippage: (params.slippage as number) / 100 || 0.005,
          order: "RECOMMENDED",
        },
      });
      if (!routes.routes.length) throw new Error("No routes found");
      return {
        aggregator: "lifi",
        minOutputAmount: routes.routes[0].steps[0].estimate.toAmountMin,
        swapData: routes.routes[0],
      };
    } catch (error) {
      elizaLogger.error(
        "Error in getLifiQuote:",
        error instanceof Error ? error.message : String(error)
      );
      return undefined;
    }
  }

  private async getBebopQuote(
    fromAddress: Address,
    params: SwapParams,
    fromTokenDecimals: number
  ): Promise<SwapQuote | undefined> {
    try {
      const url = `https://api.bebop.xyz/router/${(this.bebopChainsMap as any)[params.chain] ?? params.chain}/v1/quote`;
      const reqParams = new URLSearchParams({
        sell_tokens: params.fromToken,
        buy_tokens: params.toToken,
        sell_amounts: parseUnits(params.amount, fromTokenDecimals).toString(),
        taker_address: fromAddress,
        approval_type: "Standard",
        skip_validation: "true",
        gasless: "false",
        source: "eliza",
      });
      const response = await fetch(`${url}?${reqParams.toString()}`, {
        method: "GET",
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        throw Error(response.statusText);
      }
      //const data: { routes: { quote: { tx: { data: string, from: string, value: string, to: string, gas: string, gasPrice: string }, approvalTarget: string, buyTokens: { [key: string]: { minimumAmount: string } } } }[] } = await response.json();
      const data: any = await response.json();
      const route: BebopRoute = {
        data: data.routes[0].quote.tx.data,
        sellAmount: parseUnits(params.amount, fromTokenDecimals).toString(),
        approvalTarget: data.routes[0].quote.approvalTarget as `0x${string}`,
        from: data.routes[0].quote.tx.from as `0x${string}`,
        value: data.routes[0].quote.tx.value.toString(),
        to: data.routes[0].quote.tx.to as `0x${string}`,
        gas: data.routes[0].quote.tx.gas.toString(),
        gasPrice: data.routes[0].quote.tx.gasPrice.toString(),
      };
      return {
        aggregator: "bebop",
        minOutputAmount:
          data.routes[0].quote.buyTokens[
            params.toToken
          ].minimumAmount.toString(),
        swapData: route,
      };
    } catch (error) {
      elizaLogger.error(
        "Error in getBebopQuote:",
        error instanceof Error ? error.message : String(error)
      );
      return undefined;
    }
  }

  private async executeLifiQuote(
    quote: SwapQuote
  ): Promise<Transaction | undefined> {
    try {
      const route: Route = quote.swapData as Route;
      const execution = await executeRoute(
        quote.swapData as Route,
        this.lifiConfig as any
      );
      const process = execution.steps[0]?.execution?.process[0];

      if (!process?.status || process.status === "FAILED") {
        throw new Error("Transaction failed");
      }
      return {
        hash: process.txHash as `0x${string}`,
        from: route.fromAddress! as `0x${string}`,
        to: route.steps[0].estimate.approvalAddress as `0x${string}`,
        value: 0n,
        data: process.data as `0x${string}`,
        chainId: route.fromChainId,
      };
    } catch (error) {
      elizaLogger.error(`Failed to execute lifi quote: ${error}`);
      return undefined;
    }
  }

  private async executeBebopQuote(
    quote: SwapQuote,
    params: SwapParams
  ): Promise<Transaction | undefined> {
    try {
      const bebopRoute: BebopRoute = quote.swapData as BebopRoute;
      const allowanceAbi = parseAbi([
        "function allowance(address,address) view returns (uint256)",
      ]);
      const allowance: bigint = await this.walletProvider
        .getPublicClient(params.chain)
        .readContract({
          address: params.fromToken,
          abi: allowanceAbi,
          functionName: "allowance",
          args: [bebopRoute.from, bebopRoute.approvalTarget],
        });
      if (allowance < BigInt(bebopRoute.sellAmount)) {
        const approvalData = encodeFunctionData({
          abi: parseAbi(["function approve(address,uint256)"]),
          functionName: "approve",
          args: [bebopRoute.approvalTarget, BigInt(bebopRoute.sellAmount)],
        });
        await this.walletProvider
          .getWalletClient(params.chain)
          .sendTransaction({
            account: this.walletProvider.getWalletClient(params.chain).account,
            to: params.fromToken,
            value: 0n,
            data: approvalData,
            kzg: {
              blobToKzgCommitment: (_: ByteArray): ByteArray => {
                throw new Error("Function not implemented.");
              },
              computeBlobKzgProof: (
                _blob: ByteArray,
                _commitment: ByteArray
              ): ByteArray => {
                throw new Error("Function not implemented.");
              },
            },
            chain: undefined,
          } as any);
      }
      const hash = await this.walletProvider
        .getWalletClient(params.chain)
        .sendTransaction({
          account: this.walletProvider.getWalletClient(params.chain).account,
          to: bebopRoute.to,
          value: BigInt(bebopRoute.value),
          data: bebopRoute.data as Hex,
          kzg: {
            blobToKzgCommitment: (_: ByteArray): ByteArray => {
              throw new Error("Function not implemented.");
            },
            computeBlobKzgProof: (
              _blob: ByteArray,
              _commitment: ByteArray
            ): ByteArray => {
              throw new Error("Function not implemented.");
            },
          },
          chain: undefined,
        } as any);
      return {
        hash,
        from: this.walletProvider.getWalletClient(params.chain)?.account
          ?.address as `0x${string}`,
        to: bebopRoute.to,
        value: BigInt(bebopRoute.value),
        data: bebopRoute.data as Hex,
      };
    } catch (error) {
      elizaLogger.error(`Failed to execute bebop quote: ${error}`);
      return undefined;
    }
  }
}

const buildSwapDetails = async (
  state: State,
  runtime: IAgentRuntime,
  wp: WalletProvider
): Promise<SwapParams> => {
  const chains = wp.getSupportedChains();
  state.supportedChains = chains.map((item) => `"${item}"`).join("|");

  // Add balances to state for better context in template
  const balances = await wp.getWalletBalances();
  state.chainBalances = Object.entries(balances)
    .map(([chain, balance]) => {
      const chainConfig = wp.getChainConfigs(chain as any);
      return `${chain}: ${balance} ${chainConfig.nativeCurrency.symbol}`;
    })
    .join(", ");

  const context = composePrompt({
    state,
    template: swapTemplate,
  });

  const swapDetails = await runtime.useModel(ModelType.OBJECT_SMALL, {
    context,
  });

  // Validate chain exists
  const chain = swapDetails.chain;
  if (!wp.chains[chain]) {
    throw new Error(
      `Chain ${chain} not configured. Available chains: ${chains.join(", ")}`
    );
  }

  return swapDetails;
};

export const swapAction = {
  name: "EVM_SWAP_TOKENS",
  description: "Swap tokens on the same chain",
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    state: State,
    _options: any,
    callback: any
  ) => {
    const walletProvider = await initWalletProvider(runtime);
    const action = new SwapAction(walletProvider);

    try {
      // Get swap parameters
      const swapOptions = await buildSwapDetails(
        state,
        runtime,
        walletProvider
      );

      const swapResp = await action.swap(swapOptions);
      if (callback) {
        callback({
          text: `Successfully swapped ${swapOptions.amount} ${swapOptions.fromToken} for ${swapOptions.toToken} on ${swapOptions.chain}\nTransaction Hash: ${swapResp.hash}`,
          content: {
            success: true,
            hash: swapResp.hash,
            chain: swapOptions.chain,
          },
        });
      }
      return true;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Error in swap handler:", errMsg);
      if (callback) {
        callback({
          text: `Error: ${errMsg}`,
          content: { error: errMsg },
        });
      }
      return false;
    }
  },
  template: swapTemplate,
  validate: async (runtime: IAgentRuntime) => {
    const privateKey = runtime.getSetting("EVM_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Swap 1 WETH for USDC on Arbitrum",
          action: "TOKEN_SWAP",
        },
      },
    ],
  ],
  similes: ["TOKEN_SWAP", "EXCHANGE_TOKENS", "TRADE_TOKENS"],
};

```

`/plugin-evm/src/index.ts`:

```ts
export * from './actions/bridge';
export * from './actions/swap';
export * from './actions/transfer';
export * from './providers/wallet';
export * from './service';
export * from './types';

import type { Plugin } from '@elizaos/core-plugin-v2';
import { swapAction } from './actions/swap';
import { transferAction } from './actions/transfer';
import { evmWalletProvider } from './providers/wallet';
import { EVMService } from './service';
import { EVM_SERVICE_NAME } from './constants';

export const evmPlugin: Plugin = {
  name: 'evm',
  description: 'EVM blockchain integration plugin',
  providers: [evmWalletProvider],
  evaluators: [],
  services: [EVMService],
  actions: [transferAction as any, swapAction as any],
};

export default evmPlugin;

```

`/plugin-evm/src/service.ts`:

```ts
import { type IAgentRuntime, Service, elizaLogger } from "@elizaos/core-plugin-v2";
import {
  CACHE_REFRESH_INTERVAL_MS,
  EVM_SERVICE_NAME,
  EVM_WALLET_DATA_CACHE_KEY,
} from "./constants";
import { type WalletProvider, initWalletProvider } from "./providers/wallet";
import type { SupportedChain } from "./types";

export interface EVMWalletData {
  address: string;
  chains: {
    chainName: string;
    name: string;
    balance: string;
    symbol: string;
    chainId: number;
  }[];
  timestamp: number;
}

export class EVMService extends Service {
  static serviceType: string = EVM_SERVICE_NAME;
  capabilityDescription = "EVM blockchain wallet access";

  private walletProvider: WalletProvider | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private lastRefreshTimestamp = 0;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<EVMService> {
    elizaLogger.log("Initializing EVMService");

    const evmService = new EVMService(runtime);

    // Initialize wallet provider
    evmService.walletProvider = await initWalletProvider(runtime);

    // Fetch data immediately on initialization
    await evmService.refreshWalletData();

    // Set up refresh interval
    if (evmService.refreshInterval) {
      clearInterval(evmService.refreshInterval);
    }

    evmService.refreshInterval = setInterval(
      () => evmService.refreshWalletData(),
      CACHE_REFRESH_INTERVAL_MS
    );

    elizaLogger.log("EVM service initialized");
    return evmService;
  }

  static async stop(runtime: IAgentRuntime) {
    const service = runtime.getService(EVM_SERVICE_NAME);
    if (!service) {
      elizaLogger.error("EVMService not found");
      return;
    }
    await service.stop();
  }

  async stop(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    elizaLogger.log("EVM service shutdown");
  }

  async refreshWalletData(): Promise<void> {
    try {
      if (!this.walletProvider) {
        this.walletProvider = await initWalletProvider(this.runtime);
      }

      const address = this.walletProvider.getAddress();
      const balances = await this.walletProvider.getWalletBalances();

      // Format balances for all chains
      const chainDetails = Object.entries(balances)
        .map(([chainName, balance]) => {
          try {
            const chain = this.walletProvider!.getChainConfigs(
              chainName as SupportedChain
            );
            return {
              chainName,
              balance,
              symbol: chain.nativeCurrency.symbol,
              chainId: chain.id,
              name: chain.name,
            };
          } catch (error) {
            elizaLogger.error(`Error formatting chain ${chainName}:`, error);
            return null;
          }
        })
        .filter(Boolean);

      const walletData: EVMWalletData = {
        address,
        chains: chainDetails as EVMWalletData["chains"],
        timestamp: Date.now(),
      };

      // Cache the wallet data
      await this.runtime.setCache(EVM_WALLET_DATA_CACHE_KEY, walletData);
      this.lastRefreshTimestamp = walletData.timestamp;

      elizaLogger.log(
        "EVM wallet data refreshed for chains:",
        chainDetails.map((c) => c?.chainName).join(", ")
      );
    } catch (error) {
      elizaLogger.error("Error refreshing EVM wallet data:", error);
    }
  }

  async getCachedData(): Promise<EVMWalletData | undefined> {
    try {
      const cachedData = await this.runtime.getCache<EVMWalletData>(
        EVM_WALLET_DATA_CACHE_KEY
      );

      const now = Date.now();
      // If data is stale or doesn't exist, refresh it
      if (
        !cachedData ||
        now - cachedData.timestamp > CACHE_REFRESH_INTERVAL_MS
      ) {
        elizaLogger.log("EVM wallet data is stale, refreshing...");
        await this.refreshWalletData();
        return this.runtime.getCache<EVMWalletData>(EVM_WALLET_DATA_CACHE_KEY);
      }

      return cachedData;
    } catch (error) {
      elizaLogger.error("Error getting cached EVM wallet data:", error);
      return undefined;
    }
  }

  async forceUpdate(): Promise<EVMWalletData | undefined> {
    await this.refreshWalletData();
    return this.getCachedData();
  }
}

```

Old OpenAI plugin

Project Path: src

Source Tree:

```
src
├── types.ts
├── actions
│   ├── transcribeAudioAction.ts
│   ├── analyzeSentimentAction.ts
│   ├── generateEmbeddingAction.ts
│   ├── moderateContentAction.ts
│   ├── action.ts
│   ├── editTextAction.ts
│   └── generateTextAction.ts
└── index.ts

```

`/plugin-openai/src/types.ts`:

```ts
// Types for generating text
export interface OpenAITextRequest {
    model: string;
    prompt: string;
    max_tokens: number;
    temperature: number;
}

export interface OpenAITextResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        text: string;
        index: number;
        logprobs: null | {
            tokens: string[];
            token_logprobs: number[];
            top_logprobs: Record<string, number>[];
            text_offset: number[];
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// Types for generating embeddings
export interface OpenAIEmbeddingRequest {
    model: string;
    input: string | string[];
}

export interface OpenAIEmbeddingResponse {
    object: string;
    data: Array<{
        embedding: number[];
        index: number;
    }>;
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

// Types for analyzing sentiment
export interface OpenAISentimentAnalysisRequest {
    model: string;
    prompt: string;
    max_tokens: number;
    temperature: number;
}

export interface OpenAISentimentAnalysisResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        text: string;
        index: number;
        logprobs: null | {
            tokens: string[];
            token_logprobs: number[];
            top_logprobs: Record<string, number>[];
            text_offset: number[];
        };
        finish_reason: string;
    }>;
}

// Types for audio transcription
export interface OpenAITranscriptionRequest {
    file: File | Blob;
    model: string;
    prompt?: string;
    response_format?: "json" | "text" | "srt" | "verbose_json" | "vtt";
    temperature?: number;
    language?: string;
}

export interface OpenAITranscriptionResponse {
    text: string;
}

// Types for content moderation
export interface OpenAIModerationRequest {
    input: string | string[];
    model?: string;
}

export interface OpenAIModerationResponse {
    id: string;
    model: string;
    results: Array<{
        flagged: boolean;
        categories: Record<string, boolean>;
        category_scores: Record<string, number>;
    }>;
}

// Types for editing text
export interface OpenAIEditRequest {
    model: string;
    input: string;
    instruction: string;
    temperature?: number;
    top_p?: number;
}

export interface OpenAIEditResponse {
    object: string;
    created: number;
    choices: Array<{
        text: string;
        index: number;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

```

`/plugin-openai/src/actions/transcribeAudioAction.ts`:

```ts
import type { Action } from "@elizaos/core";
import { 
    validateApiKey, 
    callOpenAiApi, 
    buildRequestData,
    type OpenAIRequestData
} from "./action";

export const transcribeAudioAction: Action = {
    name: "transcribeAudio",
    description: "Transcribe audio using OpenAI Whisper",
    similes: [],
    async handler(_runtime, message, _state) {
        const file = message.content.file;
        if (!file) {
            throw new Error("No audio file provided");
        }

        const apiKey = validateApiKey();
        const formData = new FormData();
        formData.append("file", file as Blob);
        formData.append("model", "whisper-1");

        interface TranscriptionResponse {
            text: string;
        }

        const response = await callOpenAiApi(
            "https://api.openai.com/v1/audio/transcriptions",
            formData as unknown as OpenAIRequestData,
            apiKey,
        ) as TranscriptionResponse;
        return response.text;
    },
    validate: async (runtime, _message) => {
        return !!runtime.getSetting("OPENAI_API_KEY");
    },
    examples: [],
};

```

`/plugin-openai/src/actions/analyzeSentimentAction.ts`:

```ts
import type { Action } from "@elizaos/core";
import {
    validatePrompt,
    validateApiKey,
    callOpenAiApi,
    buildRequestData,
} from "./action";

export const analyzeSentimentAction: Action = {
    name: "analyzeSentiment",
    description: "Analyze sentiment using OpenAI",
    similes: [], // Added missing required property
    async handler(_runtime, message, _state) {
        const prompt = `Analyze the sentiment of the following text: "${message.content.text?.trim() || ""}"`;
        validatePrompt(prompt);

        const apiKey = validateApiKey();
        const requestData = buildRequestData(prompt);

        const response = await callOpenAiApi<{ choices: Array<{ text: string }> }>(
            "https://api.openai.com/v1/completions",
            requestData,
            apiKey,
        );
        return response.choices[0].text.trim();
    },
    validate: async (runtime, _message) => {
        return !!runtime.getSetting("OPENAI_API_KEY");
    },
    examples: [],
};

```

`/plugin-openai/src/actions/generateEmbeddingAction.ts`:

```ts
import type { Action } from "@elizaos/core";
import {
    validatePrompt,
    validateApiKey,
    callOpenAiApi,
    buildRequestData,
} from "./action";

export const generateEmbeddingAction: Action = {
    name: "generateEmbedding",
    description: "Generate embeddings using OpenAI",
    similes: [],
    async handler(_runtime, message, _state) {
        const input = (message.content.text as string)?.trim() || "";
        validatePrompt(input);

        const apiKey = validateApiKey();
        const requestData = buildRequestData(
            "text-embedding-ada-002",
            input
        );

        const response = await callOpenAiApi(
            "https://api.openai.com/v1/embeddings",
            requestData,
            apiKey,
        ) as { data: Array<{ embedding: number[] }> };
        return response.data.map((item: { embedding: number[] }) => item.embedding);
    },
    validate: async (runtime, _message) => {
        return !!runtime.getSetting("OPENAI_API_KEY");
    },
    examples: [],
};

```

`/plugin-openai/src/actions/moderateContentAction.ts`:

```ts
import type { Action } from "@elizaos/core";
import { validatePrompt, validateApiKey, callOpenAiApi, buildRequestData } from "./action";

export const moderateContentAction: Action = {
    name: "moderateContent",
    description: "Moderate content using OpenAI",
    similes: [],
    async handler(_runtime, message, _state) {
        const input = (message.content.text as string)?.trim() || "";
        validatePrompt(input);

        const apiKey = validateApiKey();
        const requestData = buildRequestData(
            "text-moderation-latest",
            input
        );

        const response = await callOpenAiApi(
            "https://api.openai.com/v1/moderations",
            requestData,
            apiKey,
        ) as { results: Array<{ flagged: boolean; categories: Record<string, boolean>; category_scores: Record<string, number> }> };
        return response.results;
    },
    validate: async (runtime, _message) => {
        return !!runtime.getSetting("OPENAI_API_KEY");
    },
    examples: [],
};
    
```

`/plugin-openai/src/actions/action.ts`:

```ts
import axios, { type AxiosRequestConfig } from "axios";

export const DEFAULT_MODEL = process.env.OPENAI_DEFAULT_MODEL || "text-davinci-003";
export const DEFAULT_MAX_TOKENS = Number.parseInt(process.env.OPENAI_MAX_TOKENS || "200", 10);
export const DEFAULT_TEMPERATURE = Number.parseFloat(process.env.OPENAI_TEMPERATURE || "0.7");
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Validate a prompt for length and content.
 * @param prompt - The prompt to validate.
 * @throws Will throw an error if the prompt is invalid.
 */
export function validatePrompt(prompt: string): void {
    if (!prompt.trim()) {
        throw new Error("Prompt cannot be empty");
    }
    if (prompt.length > 4000) {
        throw new Error("Prompt exceeds maximum length of 4000 characters");
    }
}

/**
 * Validate the presence of the OpenAI API key.
 * @throws Will throw an error if the API key is not set.
 * @returns The API key.
 */
export function validateApiKey(): string {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OpenAI API key is not set");
    }
    return apiKey;
}

/**
 * Send a request to the OpenAI API.
 * @param url - The OpenAI API endpoint.
 * @param data - The request payload.
 * @returns The response data.
 * @throws Will throw an error for request failures or rate limits.
 */

export interface OpenAIRequestData {
    model: string;
    prompt: string;
    max_tokens: number;
    temperature: number;
    [key: string]: unknown;
}

export interface OpenAIEditRequestData {
    model: string;
    input: string;
    instruction: string;
    max_tokens: number;
    temperature: number;
    [key: string]: unknown;
}

export async function callOpenAiApi<T>(
    url: string,
    data: OpenAIRequestData | OpenAIEditRequestData,
    apiKey: string,
): Promise<T> {
    try {
        const config: AxiosRequestConfig = {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            timeout: DEFAULT_TIMEOUT,
        };
        const response = await axios.post<T>(url, data, config);
        return response.data;
    } catch (error) {
        console.error("Error communicating with OpenAI API:", error instanceof Error ? error.message : String(error));
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 429) {
                throw new Error("Rate limit exceeded. Please try again later.");
            }
        }
        throw new Error("Failed to communicate with OpenAI API");
    }
}

/**
 * Build a request object for OpenAI completions.
 * @param prompt - The text prompt to process.
 * @param model - The model to use.
 * @param maxTokens - The maximum number of tokens to generate.
 * @param temperature - The sampling temperature.
 * @returns The request payload for OpenAI completions.
 */

export function buildRequestData(
    prompt: string,
    model: string = DEFAULT_MODEL,
    maxTokens: number = DEFAULT_MAX_TOKENS,
    temperature: number = DEFAULT_TEMPERATURE,
): OpenAIRequestData {
    return {
        model,
        prompt,
        max_tokens: maxTokens,
        temperature,
    };
}

```

`/plugin-openai/src/actions/editTextAction.ts`:

```ts
import type { Action } from "@elizaos/core";
import {
    validatePrompt,
    validateApiKey,
    callOpenAiApi,
} from "./action";

interface EditResponse {
    choices: Array<{ text: string }>;
}

export const editTextAction: Action = {
    name: "editText",
    description: "Edit text using OpenAI",
    similes: [],
    async handler(_runtime, message, _state) {
        const input = (message.content.input as string)?.trim() || "";
        const instruction = (message.content.instruction as string)?.trim() || "";
        validatePrompt(input);
        validatePrompt(instruction);

        const apiKey = validateApiKey();
        const requestData = {
            model: "text-davinci-edit-001",
            input,
            instruction,
            max_tokens: 1000,
            temperature: 0.7,
        };

        const response = await callOpenAiApi<EditResponse>(
            "https://api.openai.com/v1/edits",
            requestData,
            apiKey,
        );
        return response.choices[0].text.trim();
    },
    validate: async (runtime, _message) => {
        return !!runtime.getSetting("OPENAI_API_KEY");
    },
    examples: [],
};

```

`/plugin-openai/src/actions/generateTextAction.ts`:

```ts
import type { Action } from "@elizaos/core";
import {
    validatePrompt,
    validateApiKey,
    callOpenAiApi,
    buildRequestData,
} from "./action";

export const generateTextAction: Action = {
    name: "generateText",
    description: "Generate text using OpenAI",
    similes: [],
    async handler(_runtime, message, _state) {
        const prompt = (message.content.text as string)?.trim() || "";
        validatePrompt(prompt);

        const apiKey = validateApiKey();
        const requestData = buildRequestData(
            String(message.content.model),
            prompt,
            typeof message.content.maxTokens === 'number' ? message.content.maxTokens : undefined,
            typeof message.content.temperature === 'number' ? message.content.temperature : undefined,
        );

        const response = await callOpenAiApi(
            "https://api.openai.com/v1/completions",
            requestData,
            apiKey,
        ) as { choices: Array<{ text: string }> };
        return { text: response.choices[0].text.trim() };
    },
    validate: async (runtime, _message) => {
        return !!runtime.getSetting("OPENAI_API_KEY");
    },
    examples: [],
};

```

`/plugin-openai/src/index.ts`:

```ts
import type { Plugin } from "@elizaos/core";
import { generateTextAction } from "./actions/generateTextAction";
import { generateEmbeddingAction } from "./actions/generateEmbeddingAction";
import { analyzeSentimentAction } from "./actions/analyzeSentimentAction";
import { transcribeAudioAction } from "./actions/transcribeAudioAction";
import { moderateContentAction } from "./actions/moderateContentAction";
import { editTextAction } from "./actions/editTextAction";

// Simple terminal output
console.log("\n===============================");
console.log("      OpenAI Plugin Loaded      ");
console.log("===============================");
console.log("Name      : openai-plugin");
console.log("Version   : 0.1.0");
console.log("X Account : https://x.com/Data0x88850");
console.log("GitHub    : https://github.com/0xrubusdata");
console.log("Actions   :");
console.log("  - generateTextAction");
console.log("  - generateEmbeddingAction");
console.log("  - analyzeSentimentAction");
console.log("  - transcribeAudioAction");
console.log("  - moderateContentAction");
console.log("  - editTextAction");
console.log("===============================\n");

export const openaiPlugin: Plugin = {
    name: "openai",
    description: "OpenAI integration plugin for various AI capabilities",
    actions: [
        generateTextAction,
        generateEmbeddingAction,
        analyzeSentimentAction,
        transcribeAudioAction,
        moderateContentAction,
        editTextAction,
    ],
    evaluators: [],
    providers: [],
    tests: [
        {
            name: "test-generateTextAction",
            tests: [
                {
                    name: "test-generateTextAction-1",
                    fn: async (runtime) => {
                        const result = "Empty OpenAI Plugin test!!";
                        console.log(result);
                        Promise.resolve(true);
                    },
                },
            ],
        },
    ],
};

export default openaiPlugin;

```

New OpenAI Plugin

Project Path: src

Source Tree:

```
src
└── index.ts

```

`/plugin-openai/src/index.ts`:

```ts
import { createOpenAI } from "@ai-sdk/openai";
import type {
  DetokenizeTextParams,
  GenerateTextParams,
  IAgentRuntime,
  ImageDescriptionParams,
  ModelTypeName,
  ObjectGenerationParams,
  Plugin,
  TextEmbeddingParams,
  TokenizeTextParams,
} from "@elizaos/core";
import {
  EventType,
  logger,
  ModelType,
  safeReplacer,
  ServiceType,
  VECTOR_DIMS,
  type InstrumentationService,
} from "@elizaos/core";
import { context, SpanStatusCode, type Span } from "@opentelemetry/api";
import {
  generateObject,
  generateText,
  JSONParseError,
  type JSONValue,
  type LanguageModelUsage,
} from "ai";
import { encodingForModel, type TiktokenModel } from "js-tiktoken";
import { fetch, FormData } from "undici";

/**
 * Helper function to get tracer if instrumentation is enabled
 */
function getTracer(runtime: IAgentRuntime) {
  const availableServices = Array.from(runtime.getAllServices().keys());
  logger.debug(
    `[getTracer] Available services: ${JSON.stringify(availableServices)}`
  );
  logger.debug(
    `[getTracer] Attempting to get service with key: ${ServiceType.INSTRUMENTATION}`
  );

  const instrumentationService = runtime.getService<InstrumentationService>(
    ServiceType.INSTRUMENTATION
  );

  if (!instrumentationService) {
    logger.warn(
      `[getTracer] Service ${ServiceType.INSTRUMENTATION} not found in runtime.`
    );
    return null;
  }

  if (!instrumentationService.isEnabled()) {
    logger.debug("[getTracer] Instrumentation service found but is disabled.");
    return null;
  }

  logger.debug(
    "[getTracer] Successfully retrieved enabled instrumentation service."
  );
  return instrumentationService.getTracer("eliza.llm.openai");
}

/**
 * Helper function to start an LLM span
 */
async function startLlmSpan<T>(
  runtime: IAgentRuntime,
  spanName: string,
  attributes: Record<string, string | number | boolean | undefined>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getTracer(runtime);
  if (!tracer) {
    const dummySpan = {
      setAttribute: () => {},
      setAttributes: () => {},
      addEvent: () => {},
      recordException: () => {},
      setStatus: () => {},
      end: () => {},
      spanContext: () => ({ traceId: "", spanId: "", traceFlags: 0 }),
    } as unknown as Span;
    return fn(dummySpan);
  }

  // Get active context to ensure proper nesting
  const activeContext = context.active();

  return tracer.startActiveSpan(
    spanName,
    { attributes },
    activeContext,
    async (span: Span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message });
        span.end();
        throw error;
      }
    }
  );
}

/**
 * Retrieves a configuration setting from the runtime, falling back to environment variables or a default value if not found.
 *
 * @param key - The name of the setting to retrieve.
 * @param defaultValue - The value to return if the setting is not found in the runtime or environment.
 * @returns The resolved setting value, or {@link defaultValue} if not found.
 */
function getSetting(
  runtime: IAgentRuntime,
  key: string,
  defaultValue?: string
): string | undefined {
  return runtime.getSetting(key) ?? process.env[key] ?? defaultValue;
}

/**
 * Retrieves the OpenAI API base URL from runtime settings, environment variables, or defaults, using provider-aware resolution.
 *
 * @returns The resolved base URL for OpenAI API requests.
 */
function getBaseURL(runtime: IAgentRuntime): string {
  const baseURL = getSetting(
    runtime,
    "OPENAI_BASE_URL",
    "https://api.openai.com/v1"
  ) as string;
  logger.debug(`[OpenAI] Default base URL: ${baseURL}`);
  return baseURL;
}

/**
 * Retrieves the OpenAI API base URL for embeddings, falling back to the general base URL.
 *
 * @returns The resolved base URL for OpenAI embedding requests.
 */
function getEmbeddingBaseURL(runtime: IAgentRuntime): string {
  const embeddingURL = getSetting(runtime, "OPENAI_EMBEDDING_URL");
  if (embeddingURL) {
    logger.debug(`[OpenAI] Using specific embedding base URL: ${embeddingURL}`);
    return embeddingURL;
  }
  logger.debug("[OpenAI] Falling back to general base URL for embeddings.");
  return getBaseURL(runtime);
}

/**
 * Helper function to get the API key for OpenAI
 *
 * @param runtime The runtime context
 * @returns The configured API key
 */
function getApiKey(runtime: IAgentRuntime): string | undefined {
  return getSetting(runtime, "OPENAI_API_KEY");
}

/**
 * Helper function to get the small model name with fallbacks
 *
 * @param runtime The runtime context
 * @returns The configured small model name
 */
function getSmallModel(runtime: IAgentRuntime): string {
  return (
    getSetting(runtime, "OPENAI_SMALL_MODEL") ??
    (getSetting(runtime, "SMALL_MODEL", "gpt-4o-mini") as string)
  );
}

/**
 * Helper function to get the large model name with fallbacks
 *
 * @param runtime The runtime context
 * @returns The configured large model name
 */
function getLargeModel(runtime: IAgentRuntime): string {
  return (
    getSetting(runtime, "OPENAI_LARGE_MODEL") ??
    (getSetting(runtime, "LARGE_MODEL", "gpt-4o") as string)
  );
}

/**
 * Helper function to get the image description model name with fallbacks
 *
 * @param runtime The runtime context
 * @returns The configured image description model name
 */
function getImageDescriptionModel(runtime: IAgentRuntime): string {
  return getSetting(runtime, "OPENAI_IMAGE_DESCRIPTION_MODEL", "gpt-4o-mini") ?? "gpt-4o-mini";
}

/**
 * Create an OpenAI client with proper configuration
 *
 * @param runtime The runtime context
 * @returns Configured OpenAI client
 */
function createOpenAIClient(runtime: IAgentRuntime) {
  return createOpenAI({
    apiKey: getApiKey(runtime),
    baseURL: getBaseURL(runtime),
  });
}

/**
 * Asynchronously tokenizes the given text based on the specified model and prompt.
 *
 * @param {ModelTypeName} model - The type of model to use for tokenization.
 * @param {string} prompt - The text prompt to tokenize.
 * @returns {number[]} - An array of tokens representing the encoded prompt.
 */
async function tokenizeText(model: ModelTypeName, prompt: string) {
  const modelName =
    model === ModelType.TEXT_SMALL
      ? (process.env.OPENAI_SMALL_MODEL ??
        process.env.SMALL_MODEL ??
        "gpt-4o-mini")
      : (process.env.LARGE_MODEL ?? "gpt-4o");
  const encoding = encodingForModel(modelName as TiktokenModel);
  const tokens = encoding.encode(prompt);
  return tokens;
}

/**
 * Detokenize a sequence of tokens back into text using the specified model.
 *
 * @param {ModelTypeName} model - The type of model to use for detokenization.
 * @param {number[]} tokens - The sequence of tokens to detokenize.
 * @returns {string} The detokenized text.
 */
async function detokenizeText(model: ModelTypeName, tokens: number[]) {
  const modelName =
    model === ModelType.TEXT_SMALL
      ? (process.env.OPENAI_SMALL_MODEL ??
        process.env.SMALL_MODEL ??
        "gpt-4o-mini")
      : (process.env.OPENAI_LARGE_MODEL ?? process.env.LARGE_MODEL ?? "gpt-4o");
  const encoding = encodingForModel(modelName as TiktokenModel);
  return encoding.decode(tokens);
}

/**
 * Helper function to generate objects using specified model type
 */
async function generateObjectByModelType(
  runtime: IAgentRuntime,
  params: ObjectGenerationParams,
  modelType: string,
  getModelFn: (runtime: IAgentRuntime) => string
): Promise<JSONValue> {
  const openai = createOpenAIClient(runtime);
  const modelName = getModelFn(runtime);
  logger.log(`[OpenAI] Using ${modelType} model: ${modelName}`);
  const temperature = params.temperature ?? 0;
  const schemaPresent = !!params.schema;

  // --- Start Instrumentation ---
  const attributes = {
    "llm.vendor": "OpenAI",
    "llm.request.type": "object_generation",
    "llm.request.model": modelName,
    "llm.request.temperature": temperature,
    "llm.request.schema_present": schemaPresent,
  };

  return startLlmSpan(
    runtime,
    "LLM.generateObject",
    attributes,
    async (span) => {
      span.addEvent("llm.prompt", { "prompt.content": params.prompt });
      if (schemaPresent) {
        span.addEvent("llm.request.schema", {
          schema: JSON.stringify(params.schema, safeReplacer()),
        });
        logger.info(
          `Using ${modelType} without schema validation (schema provided but output=no-schema)`
        );
      }

      try {
        const { object, usage } = await generateObject({
          model: openai.languageModel(modelName),
          output: "no-schema",
          prompt: params.prompt,
          temperature: temperature,
          experimental_repairText: getJsonRepairFunction(),
        });

        span.addEvent("llm.response.processed", {
          "response.object": JSON.stringify(object, safeReplacer()),
        });

        if (usage) {
          span.setAttributes({
            "llm.usage.prompt_tokens": usage.promptTokens,
            "llm.usage.completion_tokens": usage.completionTokens,
            "llm.usage.total_tokens": usage.totalTokens,
          });
          emitModelUsageEvent(
            runtime,
            modelType as ModelTypeName,
            params.prompt,
            usage
          );
        }
        return object;
      } catch (error: unknown) {
        if (error instanceof JSONParseError) {
          logger.error(
            `[generateObject] Failed to parse JSON: ${error.message}`
          );
          span.recordException(error);
          span.addEvent("llm.error.json_parse", {
            "error.message": error.message,
            "error.text": error.text,
          });

          span.addEvent("llm.repair.attempt");
          const repairFunction = getJsonRepairFunction();
          const repairedJsonString = await repairFunction({
            text: error.text,
            error,
          });

          if (repairedJsonString) {
            try {
              const repairedObject = JSON.parse(repairedJsonString);
              span.addEvent("llm.repair.success", {
                repaired_object: JSON.stringify(repairedObject, safeReplacer()),
              });
              logger.info("[generateObject] Successfully repaired JSON.");
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: "JSON parsing failed but was repaired",
              });
              return repairedObject;
            } catch (repairParseError: unknown) {
              const message =
                repairParseError instanceof Error
                  ? repairParseError.message
                  : String(repairParseError);
              logger.error(
                `[generateObject] Failed to parse repaired JSON: ${message}`
              );
              const exception =
                repairParseError instanceof Error
                  ? repairParseError
                  : new Error(message);
              span.recordException(exception);
              span.addEvent("llm.repair.parse_error", {
                "error.message": message,
              });
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `JSON repair failed: ${message}`,
              });
              throw repairParseError;
            }
          } else {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            logger.error("[generateObject] JSON repair failed.");
            span.addEvent("llm.repair.failed");
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `JSON repair failed: ${errMsg}`,
            });
            throw error;
          }
        } else {
          const message =
            error instanceof Error ? error.message : String(error);
          logger.error(`[generateObject] Unknown error: ${message}`);
          const exception = error instanceof Error ? error : new Error(message);
          span.recordException(exception);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: message,
          });
          throw error;
        }
      }
    }
  );
}

/**
 * Returns a function to repair JSON text
 */
function getJsonRepairFunction(): (params: {
  text: string;
  error: unknown;
}) => Promise<string | null> {
  return async ({ text, error }: { text: string; error: unknown }) => {
    try {
      if (error instanceof JSONParseError) {
        const cleanedText = text.replace(/```json\n|\n```|```/g, "");
        JSON.parse(cleanedText);
        return cleanedText;
      }
      return null;
    } catch (jsonError: unknown) {
      const message =
        jsonError instanceof Error ? jsonError.message : String(jsonError);
      logger.warn(`Failed to repair JSON text: ${message}`);
      return null;
    }
  };
}

/**
 * Emits a model usage event
 * @param runtime The runtime context
 * @param type The model type
 * @param prompt The prompt used
 * @param usage The LLM usage data
 */
function emitModelUsageEvent(
  runtime: IAgentRuntime,
  type: ModelTypeName,
  prompt: string,
  usage: LanguageModelUsage
) {
  runtime.emitEvent(EventType.MODEL_USED, {
    provider: "openai",
    type,
    prompt,
    tokens: {
      prompt: usage.promptTokens,
      completion: usage.completionTokens,
      total: usage.totalTokens,
    },
  });
}

/**
 * function for text-to-speech
 */
async function fetchTextToSpeech(runtime: IAgentRuntime, text: string) {
  const apiKey = getApiKey(runtime);
  const model = getSetting(runtime, "OPENAI_TTS_MODEL", "gpt-4o-mini-tts");
  const voice = getSetting(runtime, "OPENAI_TTS_VOICE", "nova");
  const instructions = getSetting(runtime, "OPENAI_TTS_INSTRUCTIONS", "");
  const baseURL = getBaseURL(runtime);

  try {
    const res = await fetch(`${baseURL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        ...(instructions && { instructions }),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI TTS error ${res.status}: ${err}`);
    }

    return res.body;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch speech from OpenAI TTS: ${message}`);
  }
}

/**
 * Defines the OpenAI plugin with its name, description, and configuration options.
 * @type {Plugin}
 */
export const openaiPlugin: Plugin = {
  name: "openai",
  description: "OpenAI plugin",
  config: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_SMALL_MODEL: process.env.OPENAI_SMALL_MODEL,
    OPENAI_LARGE_MODEL: process.env.OPENAI_LARGE_MODEL,
    SMALL_MODEL: process.env.SMALL_MODEL,
    LARGE_MODEL: process.env.LARGE_MODEL,
    OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
    OPENAI_EMBEDDING_URL: process.env.OPENAI_EMBEDDING_URL,
    OPENAI_EMBEDDING_DIMENSIONS: process.env.OPENAI_EMBEDDING_DIMENSIONS,
    OPENAI_IMAGE_DESCRIPTION_MODEL: process.env.OPENAI_IMAGE_DESCRIPTION_MODEL,
    OPENAI_IMAGE_DESCRIPTION_MAX_TOKENS: process.env.OPENAI_IMAGE_DESCRIPTION_MAX_TOKENS,
  },
  async init(_config, runtime) {
    try {
      if (!getApiKey(runtime)) {
        logger.warn(
          "OPENAI_API_KEY is not set in environment - OpenAI functionality will be limited"
        );
        return;
      }
      try {
        const baseURL = getBaseURL(runtime);
        const response = await fetch(`${baseURL}/models`, {
          headers: { Authorization: `Bearer ${getApiKey(runtime)}` },
        });
        if (!response.ok) {
          logger.warn(
            `OpenAI API key validation failed: ${response.statusText}`
          );
          logger.warn(
            "OpenAI functionality will be limited until a valid API key is provided"
          );
        } else {
          logger.log("OpenAI API key validated successfully");
        }
      } catch (fetchError: unknown) {
        const message =
          fetchError instanceof Error ? fetchError.message : String(fetchError);
        logger.warn(`Error validating OpenAI API key: ${message}`);
        logger.warn(
          "OpenAI functionality will be limited until a valid API key is provided"
        );
      }
    } catch (error: unknown) {
      const message =
        (error as { errors?: Array<{ message: string }> })?.errors
          ?.map((e) => e.message)
          .join(", ") ||
        (error instanceof Error ? error.message : String(error));
      logger.warn(
        `OpenAI plugin configuration issue: ${message} - You need to configure the OPENAI_API_KEY in your environment variables`
      );
    }
  },
  models: {
    [ModelType.TEXT_EMBEDDING]: async (
      runtime: IAgentRuntime,
      params: TextEmbeddingParams | string | null
    ): Promise<number[]> => {
      const embeddingModelName = getSetting(
        runtime,
        "OPENAI_EMBEDDING_MODEL",
        "text-embedding-3-small"
      );
      const embeddingDimension = Number.parseInt(
        getSetting(runtime, "OPENAI_EMBEDDING_DIMENSIONS", "1536") || "1536",
        10
      ) as (typeof VECTOR_DIMS)[keyof typeof VECTOR_DIMS];

      // Added log for specific embedding model
      logger.debug(
        `[OpenAI] Using embedding model: ${embeddingModelName} with dimension: ${embeddingDimension}`
      );

      if (!Object.values(VECTOR_DIMS).includes(embeddingDimension)) {
        const errorMsg = `Invalid embedding dimension: ${embeddingDimension}. Must be one of: ${Object.values(VECTOR_DIMS).join(", ")}`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      if (params === null) {
        logger.debug("Creating test embedding for initialization");
        const testVector = Array(embeddingDimension).fill(0);
        testVector[0] = 0.1;
        return testVector;
      }
      let text: string;
      if (typeof params === "string") {
        text = params;
      } else if (typeof params === "object" && params.text) {
        text = params.text;
      } else {
        logger.warn("Invalid input format for embedding");
        const fallbackVector = Array(embeddingDimension).fill(0);
        fallbackVector[0] = 0.2;
        return fallbackVector;
      }
      if (!text.trim()) {
        logger.warn("Empty text for embedding");
        const emptyVector = Array(embeddingDimension).fill(0);
        emptyVector[0] = 0.3;
        return emptyVector;
      }

      const attributes = {
        "llm.vendor": "OpenAI",
        "llm.request.type": "embedding",
        "llm.request.model": embeddingModelName,
        "llm.request.embedding.dimensions": embeddingDimension,
        "input.text.length": text.length,
      };

      return startLlmSpan(
        runtime,
        "LLM.embedding",
        attributes,
        async (span) => {
          span.addEvent("llm.prompt", { "prompt.content": text });

          const embeddingBaseURL = getEmbeddingBaseURL(runtime);
          const apiKey = getApiKey(runtime);

          if (!apiKey) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "OpenAI API key not configured",
            });
            throw new Error("OpenAI API key not configured");
          }

          try {
            const response = await fetch(`${embeddingBaseURL}/embeddings`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: embeddingModelName,
                input: text,
              }),
            });

            const responseClone = response.clone();
            const rawResponseBody = await responseClone.text();
            span.addEvent("llm.response.raw", {
              "response.body": rawResponseBody,
            });

            if (!response.ok) {
              logger.error(
                `OpenAI API error: ${response.status} - ${response.statusText}`
              );
              span.setAttributes({ "error.api.status": response.status });
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `OpenAI API error: ${response.status} - ${response.statusText}. Response: ${rawResponseBody}`,
              });
              const errorVector = Array(embeddingDimension).fill(0);
              errorVector[0] = 0.4;
              return errorVector;
            }

            const data = (await response.json()) as {
              data: [{ embedding: number[] }];
              usage?: { prompt_tokens: number; total_tokens: number };
            };

            if (!data?.data?.[0]?.embedding) {
              logger.error("API returned invalid structure");
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: "API returned invalid structure",
              });
              const errorVector = Array(embeddingDimension).fill(0);
              errorVector[0] = 0.5;
              return errorVector;
            }

            const embedding = data.data[0].embedding;
            span.setAttribute(
              "llm.response.embedding.vector_length",
              embedding.length
            );

            if (data.usage) {
              span.setAttributes({
                "llm.usage.prompt_tokens": data.usage.prompt_tokens,
                "llm.usage.total_tokens": data.usage.total_tokens,
              });

              const usage = {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: 0,
                totalTokens: data.usage.total_tokens,
              };

              emitModelUsageEvent(
                runtime,
                ModelType.TEXT_EMBEDDING,
                text,
                usage
              );
            }

            logger.log(`Got valid embedding with length ${embedding.length}`);
            return embedding;
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            logger.error(`Error generating embedding: ${message}`);
            const exception =
              error instanceof Error ? error : new Error(message);
            span.recordException(exception);
            span.setStatus({ code: SpanStatusCode.ERROR, message: message });
            const errorVector = Array(embeddingDimension).fill(0);
            errorVector[0] = 0.6;
            return errorVector;
          }
        }
      );
    },
    [ModelType.TEXT_TOKENIZER_ENCODE]: async (
      _runtime,
      { prompt, modelType = ModelType.TEXT_LARGE }: TokenizeTextParams
    ) => {
      return await tokenizeText(modelType ?? ModelType.TEXT_LARGE, prompt);
    },
    [ModelType.TEXT_TOKENIZER_DECODE]: async (
      _runtime,
      { tokens, modelType = ModelType.TEXT_LARGE }: DetokenizeTextParams
    ) => {
      return await detokenizeText(modelType ?? ModelType.TEXT_LARGE, tokens);
    },
    [ModelType.TEXT_SMALL]: async (
      runtime: IAgentRuntime,
      { prompt, stopSequences = [] }: GenerateTextParams
    ) => {
      const temperature = 0.7;
      const frequency_penalty = 0.7;
      const presence_penalty = 0.7;
      const max_response_length = 8192;

      const openai = createOpenAIClient(runtime);
      const modelName = getSmallModel(runtime);

      logger.log(`[OpenAI] Using TEXT_SMALL model: ${modelName}`);
      logger.log(prompt);

      const attributes = {
        "llm.vendor": "OpenAI",
        "llm.request.type": "completion",
        "llm.request.model": modelName,
        "llm.request.temperature": temperature,
        "llm.request.max_tokens": max_response_length,
        "llm.request.frequency_penalty": frequency_penalty,
        "llm.request.presence_penalty": presence_penalty,
        "llm.request.stop_sequences": JSON.stringify(stopSequences),
      };

      return startLlmSpan(
        runtime,
        "LLM.generateText",
        attributes,
        async (span) => {
          span.addEvent("llm.prompt", { "prompt.content": prompt });

          const { text: openaiResponse, usage } = await generateText({
            model: openai.languageModel(modelName),
            prompt: prompt,
            system: runtime.character.system ?? undefined,
            temperature: temperature,
            maxTokens: max_response_length,
            frequencyPenalty: frequency_penalty,
            presencePenalty: presence_penalty,
            stopSequences: stopSequences,
          });

          span.setAttribute(
            "llm.response.processed.length",
            openaiResponse.length
          );
          span.addEvent("llm.response.processed", {
            "response.content":
              openaiResponse.substring(0, 200) +
              (openaiResponse.length > 200 ? "..." : ""),
          });

          if (usage) {
            span.setAttributes({
              "llm.usage.prompt_tokens": usage.promptTokens,
              "llm.usage.completion_tokens": usage.completionTokens,
              "llm.usage.total_tokens": usage.totalTokens,
            });
            emitModelUsageEvent(runtime, ModelType.TEXT_SMALL, prompt, usage);
          }

          return openaiResponse;
        }
      );
    },
    [ModelType.TEXT_LARGE]: async (
      runtime: IAgentRuntime,
      {
        prompt,
        stopSequences = [],
        maxTokens = 8192,
        temperature = 0.7,
        frequencyPenalty = 0.7,
        presencePenalty = 0.7,
      }: GenerateTextParams
    ) => {
      const openai = createOpenAIClient(runtime);
      const modelName = getLargeModel(runtime);

      logger.log(`[OpenAI] Using TEXT_LARGE model: ${modelName}`);
      logger.log(prompt);

      const attributes = {
        "llm.vendor": "OpenAI",
        "llm.request.type": "completion",
        "llm.request.model": modelName,
        "llm.request.temperature": temperature,
        "llm.request.max_tokens": maxTokens,
        "llm.request.frequency_penalty": frequencyPenalty,
        "llm.request.presence_penalty": presencePenalty,
        "llm.request.stop_sequences": JSON.stringify(stopSequences),
      };

      return startLlmSpan(
        runtime,
        "LLM.generateText",
        attributes,
        async (span) => {
          span.addEvent("llm.prompt", { "prompt.content": prompt });

          const { text: openaiResponse, usage } = await generateText({
            model: openai.languageModel(modelName),
            prompt: prompt,
            system: runtime.character.system ?? undefined,
            temperature: temperature,
            maxTokens: maxTokens,
            frequencyPenalty: frequencyPenalty,
            presencePenalty: presencePenalty,
            stopSequences: stopSequences,
          });

          span.setAttribute(
            "llm.response.processed.length",
            openaiResponse.length
          );
          span.addEvent("llm.response.processed", {
            "response.content":
              openaiResponse.substring(0, 200) +
              (openaiResponse.length > 200 ? "..." : ""),
          });

          if (usage) {
            span.setAttributes({
              "llm.usage.prompt_tokens": usage.promptTokens,
              "llm.usage.completion_tokens": usage.completionTokens,
              "llm.usage.total_tokens": usage.totalTokens,
            });
            emitModelUsageEvent(runtime, ModelType.TEXT_LARGE, prompt, usage);
          }

          return openaiResponse;
        }
      );
    },
    [ModelType.IMAGE]: async (
      runtime: IAgentRuntime,
      params: {
        prompt: string;
        n?: number;
        size?: string;
      }
    ) => {
      const n = params.n || 1;
      const size = params.size || "1024x1024";
      const prompt = params.prompt;
      const modelName = "dall-e-3"; // Default DALL-E model
      logger.log(`[OpenAI] Using IMAGE model: ${modelName}`);

      const attributes = {
        "llm.vendor": "OpenAI",
        "llm.request.type": "image_generation",
        "llm.request.image.size": size,
        "llm.request.image.count": n,
      };

      return startLlmSpan(
        runtime,
        "LLM.imageGeneration",
        attributes,
        async (span) => {
          span.addEvent("llm.prompt", { "prompt.content": prompt });

          const baseURL = getBaseURL(runtime);
          const apiKey = getApiKey(runtime);

          if (!apiKey) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "OpenAI API key not configured",
            });
            throw new Error("OpenAI API key not configured");
          }

          try {
            const response = await fetch(`${baseURL}/images/generations`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: prompt,
                n: n,
                size: size,
              }),
            });

            const responseClone = response.clone();
            const rawResponseBody = await responseClone.text();
            span.addEvent("llm.response.raw", {
              "response.body": rawResponseBody,
            });

            if (!response.ok) {
              span.setAttributes({ "error.api.status": response.status });
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `Failed to generate image: ${response.statusText}. Response: ${rawResponseBody}`,
              });
              throw new Error(
                `Failed to generate image: ${response.statusText}`
              );
            }

            const data = await response.json();
            const typedData = data as { data: { url: string }[] };

            span.addEvent("llm.response.processed", {
              "response.urls": JSON.stringify(typedData.data),
            });

            return typedData.data;
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            const exception =
              error instanceof Error ? error : new Error(message);
            span.recordException(exception);
            span.setStatus({ code: SpanStatusCode.ERROR, message: message });
            throw error;
          }
        }
      );
    },
    [ModelType.IMAGE_DESCRIPTION]: async (
      runtime: IAgentRuntime,
      params: ImageDescriptionParams | string
    ) => {
      let imageUrl: string;
      let promptText: string | undefined;
      const modelName = getImageDescriptionModel(runtime);
      logger.log(`[OpenAI] Using IMAGE_DESCRIPTION model: ${modelName}`);
      const maxTokens = Number.parseInt(
        getSetting(runtime, "OPENAI_IMAGE_DESCRIPTION_MAX_TOKENS", "8192") || "8192",
        10
      );

      if (typeof params === "string") {
        imageUrl = params;
        promptText =
          "Please analyze this image and provide a title and detailed description.";
      } else {
        imageUrl = params.imageUrl;
        promptText =
          params.prompt ||
          "Please analyze this image and provide a title and detailed description.";
      }

      const attributes = {
        "llm.vendor": "OpenAI",
        "llm.request.type": "chat",
        "llm.request.model": modelName,
        "llm.request.max_tokens": maxTokens,
        "llm.request.image.url": imageUrl,
      };

      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ];

      return startLlmSpan(
        runtime,
        "LLM.imageDescription",
        attributes,
        async (span) => {
          span.addEvent("llm.prompt", {
            "prompt.content": JSON.stringify(messages, safeReplacer()),
          });

          const baseURL = getBaseURL(runtime);
          const apiKey = getApiKey(runtime);

          if (!apiKey) {
            logger.error("OpenAI API key not set");
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "OpenAI API key not configured",
            });
            return {
              title: "Failed to analyze image",
              description: "API key not configured",
            };
          }

          try {
            const requestBody: Record<string, any> = {
              model: modelName,
              messages: messages,
              max_tokens: maxTokens,
            };

            const response = await fetch(`${baseURL}/chat/completions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(requestBody),
            });

            const responseClone = response.clone();
            const rawResponseBody = await responseClone.text();
            span.addEvent("llm.response.raw", {
              "response.body": rawResponseBody,
            });

            if (!response.ok) {
              span.setAttributes({ "error.api.status": response.status });
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `OpenAI API error: ${response.status}. Response: ${rawResponseBody}`,
              });
              throw new Error(`OpenAI API error: ${response.status}`);
            }

            const result: unknown = await response.json();

            type OpenAIResponseType = {
              choices?: Array<{
                message?: { content?: string };
                finish_reason?: string;
              }>;
              usage?: {
                prompt_tokens: number;
                completion_tokens: number;
                total_tokens: number;
              };
            };

            const typedResult = result as OpenAIResponseType;
            const content = typedResult.choices?.[0]?.message?.content;

            if (typedResult.usage) {
              span.setAttributes({
                "llm.usage.prompt_tokens": typedResult.usage.prompt_tokens,
                "llm.usage.completion_tokens":
                  typedResult.usage.completion_tokens,
                "llm.usage.total_tokens": typedResult.usage.total_tokens,
              });

              emitModelUsageEvent(
                runtime,
                ModelType.IMAGE_DESCRIPTION,
                typeof params === "string" ? params : params.prompt || "",
                {
                  promptTokens: typedResult.usage.prompt_tokens,
                  completionTokens: typedResult.usage.completion_tokens,
                  totalTokens: typedResult.usage.total_tokens,
                }
              );
            }
            if (typedResult.choices?.[0]?.finish_reason) {
              span.setAttribute(
                "llm.response.finish_reason",
                typedResult.choices[0].finish_reason
              );
            }

            if (!content) {
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: "No content in API response",
              });
              return {
                title: "Failed to analyze image",
                description: "No response from API",
              };
            }

            const titleMatch = content.match(/title[:\s]+(.+?)(?:\n|$)/i);
            const title = titleMatch?.[1]?.trim() || "Image Analysis";
            const description = content
              .replace(/title[:\s]+(.+?)(?:\n|$)/i, "")
              .trim();

            const processedResult = { title, description };
            span.addEvent("llm.response.processed", {
              "response.object": JSON.stringify(
                processedResult,
                safeReplacer()
              ),
            });

            return processedResult;
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            logger.error(`Error analyzing image: ${message}`);
            const exception =
              error instanceof Error ? error : new Error(message);
            span.recordException(exception);
            span.setStatus({ code: SpanStatusCode.ERROR, message: message });
            return {
              title: "Failed to analyze image",
              description: `Error: ${message}`,
            };
          }
        }
      );
    },
    [ModelType.TRANSCRIPTION]: async (
      runtime: IAgentRuntime,
      audioBuffer: Buffer
    ) => {
      logger.log("audioBuffer", audioBuffer);

      const modelName = "whisper-1";
      logger.log(`[OpenAI] Using TRANSCRIPTION model: ${modelName}`);
      const attributes = {
        "llm.vendor": "OpenAI",
        "llm.request.type": "transcription",
        "llm.request.model": modelName,
        "llm.request.audio.input_size_bytes": audioBuffer?.length || 0,
      };

      return startLlmSpan(
        runtime,
        "LLM.transcription",
        attributes,
        async (span) => {
          span.addEvent("llm.prompt", {
            "prompt.info": "Audio buffer for transcription",
          });

          const baseURL = getBaseURL(runtime);
          const apiKey = getApiKey(runtime);

          if (!apiKey) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "OpenAI API key not configured",
            });
            throw new Error(
              "OpenAI API key not configured - Cannot make request"
            );
          }
          if (!audioBuffer || audioBuffer.length === 0) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "Audio buffer is empty or invalid",
            });
            throw new Error(
              "Audio buffer is empty or invalid for transcription"
            );
          }

          const formData = new FormData();
          formData.append("file", new Blob([audioBuffer]), "recording.mp3");
          formData.append("model", "whisper-1");

          try {
            const response = await fetch(`${baseURL}/audio/transcriptions`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
              body: formData,
            });

            const responseClone = response.clone();
            const rawResponseBody = await responseClone.text();
            span.addEvent("llm.response.raw", {
              "response.body": rawResponseBody,
            });

            logger.log("response", response);

            if (!response.ok) {
              span.setAttributes({ "error.api.status": response.status });
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `Failed to transcribe audio: ${response.statusText}. Response: ${rawResponseBody}`,
              });
              throw new Error(
                `Failed to transcribe audio: ${response.statusText}`
              );
            }

            const data = (await response.json()) as { text: string };
            const processedText = data.text;

            span.setAttribute(
              "llm.response.processed.length",
              processedText.length
            );
            span.addEvent("llm.response.processed", {
              "response.text": processedText,
            });

            return processedText;
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : String(error);
            const exception =
              error instanceof Error ? error : new Error(message);
            span.recordException(exception);
            span.setStatus({ code: SpanStatusCode.ERROR, message: message });
            throw error;
          }
        }
      );
    },
    [ModelType.TEXT_TO_SPEECH]: async (
      runtime: IAgentRuntime,
      text: string
    ) => {
      const ttsModelName = getSetting(
        runtime,
        "OPENAI_TTS_MODEL",
        "gpt-4o-mini-tts"
      );
      const attributes = {
        "llm.vendor": "OpenAI",
        "llm.request.type": "tts",
        "llm.request.model": ttsModelName,
        "input.text.length": text.length,
      };
      return startLlmSpan(runtime, "LLM.tts", attributes, async (span) => {
        logger.log(`[OpenAI] Using TEXT_TO_SPEECH model: ${ttsModelName}`);
        span.addEvent("llm.prompt", { "prompt.content": text });
        try {
          const speechStream = await fetchTextToSpeech(runtime, text);
          span.addEvent("llm.response.success", {
            info: "Speech stream generated",
          });
          return speechStream;
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          const exception = error instanceof Error ? error : new Error(message);
          span.recordException(exception);
          span.setStatus({ code: SpanStatusCode.ERROR, message: message });
          throw error;
        }
      });
    },
    [ModelType.OBJECT_SMALL]: async (
      runtime: IAgentRuntime,
      params: ObjectGenerationParams
    ) => {
      return generateObjectByModelType(
        runtime,
        params,
        ModelType.OBJECT_SMALL,
        getSmallModel
      );
    },
    [ModelType.OBJECT_LARGE]: async (
      runtime: IAgentRuntime,
      params: ObjectGenerationParams
    ) => {
      return generateObjectByModelType(
        runtime,
        params,
        ModelType.OBJECT_LARGE,
        getLargeModel
      );
    },
  },
  tests: [
    {
      name: "openai_plugin_tests",
      tests: [
        {
          name: "openai_test_url_and_api_key_validation",
          fn: async (runtime: IAgentRuntime) => {
            const baseURL = getBaseURL(runtime);
            const response = await fetch(`${baseURL}/models`, {
              headers: {
                Authorization: `Bearer ${getApiKey(runtime)}`,
              },
            });
            const data = await response.json();
            logger.log(
              "Models Available:",
              (data as { data?: unknown[] })?.data?.length ?? "N/A"
            );
            if (!response.ok) {
              throw new Error(
                `Failed to validate OpenAI API key: ${response.statusText}`
              );
            }
          },
        },
        {
          name: "openai_test_text_embedding",
          fn: async (runtime: IAgentRuntime) => {
            try {
              const embedding = await runtime.useModel(
                ModelType.TEXT_EMBEDDING,
                {
                  text: "Hello, world!",
                }
              );
              logger.log("embedding", embedding);
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              logger.error(`Error in test_text_embedding: ${message}`);
              throw error;
            }
          },
        },
        {
          name: "openai_test_text_large",
          fn: async (runtime: IAgentRuntime) => {
            try {
              const text = await runtime.useModel(ModelType.TEXT_LARGE, {
                prompt: "What is the nature of reality in 10 words?",
              });
              if (text.length === 0) {
                throw new Error("Failed to generate text");
              }
              logger.log("generated with test_text_large:", text);
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              logger.error(`Error in test_text_large: ${message}`);
              throw error;
            }
          },
        },
        {
          name: "openai_test_text_small",
          fn: async (runtime: IAgentRuntime) => {
            try {
              const text = await runtime.useModel(ModelType.TEXT_SMALL, {
                prompt: "What is the nature of reality in 10 words?",
              });
              if (text.length === 0) {
                throw new Error("Failed to generate text");
              }
              logger.log("generated with test_text_small:", text);
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              logger.error(`Error in test_text_small: ${message}`);
              throw error;
            }
          },
        },
        {
          name: "openai_test_image_generation",
          fn: async (runtime: IAgentRuntime) => {
            logger.log("openai_test_image_generation");
            try {
              const image = await runtime.useModel(ModelType.IMAGE, {
                prompt: "A beautiful sunset over a calm ocean",
                n: 1,
                size: "1024x1024",
              });
              logger.log("generated with test_image_generation:", image);
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              logger.error(`Error in test_image_generation: ${message}`);
              throw error;
            }
          },
        },
        {
          name: "image-description",
          fn: async (runtime: IAgentRuntime) => {
            try {
              logger.log("openai_test_image_description");
              try {
                const result = await runtime.useModel(
                  ModelType.IMAGE_DESCRIPTION,
                  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Vitalik_Buterin_TechCrunch_London_2015_%28cropped%29.jpg/537px-Vitalik_Buterin_TechCrunch_London_2015_%28cropped%29.jpg"
                );

                if (
                  result &&
                  typeof result === "object" &&
                  "title" in result &&
                  "description" in result
                ) {
                  logger.log("Image description:", result);
                } else {
                  logger.error(
                    "Invalid image description result format:",
                    result
                  );
                }
              } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                logger.error(`Error in image description test: ${message}`);
              }
            } catch (e: unknown) {
              const message = e instanceof Error ? e.message : String(e);
              logger.error(
                `Error in openai_test_image_description: ${message}`
              );
            }
          },
        },
        {
          name: "openai_test_transcription",
          fn: async (runtime: IAgentRuntime) => {
            logger.log("openai_test_transcription");
            try {
              const response = await fetch(
                "https://upload.wikimedia.org/wikipedia/en/4/40/Chris_Benoit_Voice_Message.ogg"
              );
              const arrayBuffer = await response.arrayBuffer();
              const transcription = await runtime.useModel(
                ModelType.TRANSCRIPTION,
                Buffer.from(new Uint8Array(arrayBuffer))
              );
              logger.log("generated with test_transcription:", transcription);
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              logger.error(`Error in test_transcription: ${message}`);
              throw error;
            }
          },
        },
        {
          name: "openai_test_text_tokenizer_encode",
          fn: async (runtime: IAgentRuntime) => {
            const prompt = "Hello tokenizer encode!";
            const tokens = await runtime.useModel(
              ModelType.TEXT_TOKENIZER_ENCODE,
              { prompt }
            );
            if (!Array.isArray(tokens) || tokens.length === 0) {
              throw new Error(
                "Failed to tokenize text: expected non-empty array of tokens"
              );
            }
            logger.log("Tokenized output:", tokens);
          },
        },
        {
          name: "openai_test_text_tokenizer_decode",
          fn: async (runtime: IAgentRuntime) => {
            const prompt = "Hello tokenizer decode!";
            const tokens = await runtime.useModel(
              ModelType.TEXT_TOKENIZER_ENCODE,
              { prompt }
            );
            const decodedText = await runtime.useModel(
              ModelType.TEXT_TOKENIZER_DECODE,
              { tokens }
            );
            if (decodedText !== prompt) {
              throw new Error(
                `Decoded text does not match original. Expected "${prompt}", got "${decodedText}"`
              );
            }
            logger.log("Decoded text:", decodedText);
          },
        },
        {
          name: "openai_test_text_to_speech",
          fn: async (runtime: IAgentRuntime) => {
            try {
              const text = "Hello, this is a test for text-to-speech.";
              const response = await fetchTextToSpeech(runtime, text);
              if (!response) {
                throw new Error("Failed to generate speech");
              }
              logger.log("Generated speech successfully");
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : String(error);
              logger.error(`Error in openai_test_text_to_speech: ${message}`);
              throw error;
            }
          },
        },
      ],
    },
  ],
};
export default openaiPlugin;

```

Old Twitter plugin

Project Path: src

Source Tree:

```
src
├── base.ts
├── interactions.ts
├── search.ts
├── types.ts
├── client.ts
├── index.ts
└── post.ts

```

`/plugin-twitter/src/base.ts`:

```ts
import {
    type Content,
    type IAgentRuntime,
    type IImageDescriptionService,
    type Memory,
    type State,
    type UUID,
    getEmbeddingZeroVector,
    elizaLogger,
    stringToUuid,
    ActionTimelineType,
} from "@elizaos/core";
import {
    type QueryTweetsResponse,
    Scraper,
    SearchMode,
    type Tweet,
} from "agent-twitter-client";
import { EventEmitter } from "events";
import type { TwitterConfig } from "./environment.ts";

export function extractAnswer(text: string): string {
    const startIndex = text.indexOf("Answer: ") + 8;
    const endIndex = text.indexOf("<|eof|>", 11);
    return text.slice(startIndex, endIndex);
}

type TwitterProfile = {
    id: string;
    username: string;
    screenName: string;
    bio: string;
    nicknames: string[];
};

class RequestQueue {
    private queue: (() => Promise<any>)[] = [];
    private processing = false;

    async add<T>(request: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await request();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }
        this.processing = true;

        while (this.queue.length > 0) {
            const request = this.queue.shift()!;
            try {
                await request();
            } catch (error) {
                console.error("Error processing request:", error);
                this.queue.unshift(request);
                await this.exponentialBackoff(this.queue.length);
            }
            await this.randomDelay();
        }

        this.processing = false;
    }

    private async exponentialBackoff(retryCount: number): Promise<void> {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    private async randomDelay(): Promise<void> {
        const delay = Math.floor(Math.random() * 2000) + 1500;
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
}

export class ClientBase extends EventEmitter {
    static _twitterClients: { [accountIdentifier: string]: Scraper } = {};
    twitterClient: Scraper;
    runtime: IAgentRuntime;
    twitterConfig: TwitterConfig;
    directions: string;
    lastCheckedTweetId: bigint | null = null;
    imageDescriptionService: IImageDescriptionService;
    temperature = 0.5;

    requestQueue: RequestQueue = new RequestQueue();

    profile: TwitterProfile | null;

    async cacheTweet(tweet: Tweet): Promise<void> {
        if (!tweet) {
            console.warn("Tweet is undefined, skipping cache");
            return;
        }

        this.runtime.cacheManager.set(`twitter/tweets/${tweet.id}`, tweet);
    }

    async getCachedTweet(tweetId: string): Promise<Tweet | undefined> {
        const cached = await this.runtime.cacheManager.get<Tweet>(
            `twitter/tweets/${tweetId}`
        );

        return cached;
    }

    async getTweet(tweetId: string): Promise<Tweet> {
        const cachedTweet = await this.getCachedTweet(tweetId);

        if (cachedTweet) {
            return cachedTweet;
        }

        const tweet = await this.requestQueue.add(() =>
            this.twitterClient.getTweet(tweetId)
        );

        await this.cacheTweet(tweet);
        return tweet;
    }

    callback: (self: ClientBase) => any = null;

    onReady() {
        throw new Error(
            "Not implemented in base class, please call from subclass"
        );
    }

    /**
     * Parse the raw tweet data into a standardized Tweet object.
     */
    private parseTweet(raw: any, depth = 0, maxDepth = 3): Tweet {
        // If we've reached maxDepth, don't parse nested quotes/retweets further
        const canRecurse = depth < maxDepth;

        const quotedStatus = raw.quoted_status_result?.result && canRecurse
            ? this.parseTweet(raw.quoted_status_result.result, depth + 1, maxDepth)
            : undefined;

        const retweetedStatus = raw.retweeted_status_result?.result && canRecurse
            ? this.parseTweet(raw.retweeted_status_result.result, depth + 1, maxDepth)
            : undefined;

        const t: Tweet = {
            bookmarkCount:
                raw.bookmarkCount ?? raw.legacy?.bookmark_count ?? undefined,
            conversationId:
                raw.conversationId ?? raw.legacy?.conversation_id_str,
            hashtags: raw.hashtags ?? raw.legacy?.entities?.hashtags ?? [],
            html: raw.html,
            id: raw.id ?? raw.rest_id ?? raw.id_str ?? undefined,
            inReplyToStatus: raw.inReplyToStatus,
            inReplyToStatusId:
                raw.inReplyToStatusId ??
                raw.legacy?.in_reply_to_status_id_str ??
                undefined,
            isQuoted: raw.legacy?.is_quote_status === true,
            isPin: raw.isPin,
            isReply: raw.isReply,
            isRetweet: raw.legacy?.retweeted === true,
            isSelfThread: raw.isSelfThread,
            language: raw.legacy?.lang,
            likes: raw.legacy?.favorite_count ?? 0,
            name:
                raw.name ??
                raw?.user_results?.result?.legacy?.name ??
                raw.core?.user_results?.result?.legacy?.name,
            mentions: raw.mentions ?? raw.legacy?.entities?.user_mentions ?? [],
            permanentUrl:
                raw.permanentUrl ??
                (raw.core?.user_results?.result?.legacy?.screen_name &&
                 raw.rest_id
                    ? `https://x.com/${raw.core?.user_results?.result?.legacy?.screen_name}/status/${raw.rest_id}`
                    : undefined),
            photos:
                raw.photos ??
                (raw.legacy?.entities?.media
                    ?.filter((media: any) => media.type === "photo")
                    .map((media: any) => ({
                        id: media.id_str,
                        url: media.media_url_https,
                        alt_text: media.alt_text,
                    })) || []),
            place: raw.place,
            poll: raw.poll ?? null,
            quotedStatus,
            quotedStatusId:
                raw.quotedStatusId ?? raw.legacy?.quoted_status_id_str ?? undefined,
            quotes: raw.legacy?.quote_count ?? 0,
            replies: raw.legacy?.reply_count ?? 0,
            retweets: raw.legacy?.retweet_count ?? 0,
            retweetedStatus,
            retweetedStatusId: raw.legacy?.retweeted_status_id_str ?? undefined,
            text: raw.text ?? raw.legacy?.full_text ?? undefined,
            thread: raw.thread || [],
            timeParsed: raw.timeParsed
                ? new Date(raw.timeParsed)
                : raw.legacy?.created_at
                ? new Date(raw.legacy?.created_at)
                : undefined,
            timestamp:
                raw.timestamp ??
                (raw.legacy?.created_at
                    ? new Date(raw.legacy.created_at).getTime() / 1000
                    : undefined),
            urls: raw.urls ?? raw.legacy?.entities?.urls ?? [],
            userId: raw.userId ?? raw.legacy?.user_id_str ?? undefined,
            username:
                raw.username ??
                raw.core?.user_results?.result?.legacy?.screen_name ??
                undefined,
            videos:
                raw.videos ??
                (raw.legacy?.entities?.media
                    ?.filter((media: any) => media.type === "video") ?? []),
            views: raw.views?.count ? Number(raw.views.count) : 0,
            sensitiveContent: raw.sensitiveContent,
        };

        return t;
    }

    constructor(runtime: IAgentRuntime, twitterConfig: TwitterConfig) {
        super();
        this.runtime = runtime;
        this.twitterConfig = twitterConfig;
        const username = twitterConfig.TWITTER_USERNAME;
        if (ClientBase._twitterClients[username]) {
            this.twitterClient = ClientBase._twitterClients[username];
        } else {
            this.twitterClient = new Scraper();
            ClientBase._twitterClients[username] = this.twitterClient;
        }

        this.directions =
            "- " +
            this.runtime.character.style.all.join("\n- ") +
            "- " +
            this.runtime.character.style.post.join();
    }

    async init() {
        const username = this.twitterConfig.TWITTER_USERNAME;
        const password = this.twitterConfig.TWITTER_PASSWORD;
        const email = this.twitterConfig.TWITTER_EMAIL;
        let retries = this.twitterConfig.TWITTER_RETRY_LIMIT;
        const twitter2faSecret = this.twitterConfig.TWITTER_2FA_SECRET;

        if (!username) {
            throw new Error("Twitter username not configured");
        }

        const authToken = this.runtime.getSetting("TWITTER_COOKIES_AUTH_TOKEN");
        const ct0 = this.runtime.getSetting("TWITTER_COOKIES_CT0");
        const guestId = this.runtime.getSetting("TWITTER_COOKIES_GUEST_ID");

        const createTwitterCookies = (authToken: string, ct0: string, guestId: string) => 
        authToken && ct0 && guestId
            ? [
                { key: 'auth_token', value: authToken, domain: '.twitter.com' },
                { key: 'ct0', value: ct0, domain: '.twitter.com' },
                { key: 'guest_id', value: guestId, domain: '.twitter.com' },
            ]
            : null;

        const cachedCookies = await this.getCachedCookies(username) || createTwitterCookies(authToken, ct0, guestId);

        if (cachedCookies) {
            elizaLogger.info("Using cached cookies");
            await this.setCookiesFromArray(cachedCookies);
        }

        elizaLogger.log("Waiting for Twitter login");
        while (retries > 0) {
            try {
                if (await this.twitterClient.isLoggedIn()) {
                    // cookies are valid, no login required
                    elizaLogger.info("Successfully logged in.");
                    break;
                } else {
                    await this.twitterClient.login(
                        username,
                        password,
                        email,
                        twitter2faSecret
                    );
                    if (await this.twitterClient.isLoggedIn()) {
                        // fresh login, store new cookies
                        elizaLogger.info("Successfully logged in.");
                        elizaLogger.info("Caching cookies");
                        await this.cacheCookies(
                            username,
                            await this.twitterClient.getCookies()
                        );
                        break;
                    }
                }
            } catch (error) {
                elizaLogger.error(`Login attempt failed: ${error.message}`);
            }

            retries--;
            elizaLogger.error(
                `Failed to login to Twitter. Retrying... (${retries} attempts left)`
            );

            if (retries === 0) {
                elizaLogger.error(
                    "Max retries reached. Exiting login process."
                );
                throw new Error("Twitter login failed after maximum retries.");
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        // Initialize Twitter profile
        this.profile = await this.fetchProfile(username);

        if (this.profile) {
            elizaLogger.log("Twitter user ID:", this.profile.id);
            elizaLogger.log(
                "Twitter loaded:",
                JSON.stringify(this.profile, null, 10)
            );
            // Store profile info for use in responses
            this.runtime.character.twitterProfile = {
                id: this.profile.id,
                username: this.profile.username,
                screenName: this.profile.screenName,
                bio: this.profile.bio,
                nicknames: this.profile.nicknames,
            };
        } else {
            throw new Error("Failed to load profile");
        }

        await this.loadLatestCheckedTweetId();
        await this.populateTimeline();
    }

    async fetchOwnPosts(count: number): Promise<Tweet[]> {
        elizaLogger.debug("fetching own posts");
        const homeTimeline = await this.twitterClient.getUserTweets(
            this.profile.id,
            count
        );
        // Use parseTweet on each tweet
        return homeTimeline.tweets.map((t) => this.parseTweet(t));
    }

    /**
     * Fetch timeline for twitter account, optionally only from followed accounts
     */
    async fetchHomeTimeline(
        count: number,
        following?: boolean
    ): Promise<Tweet[]> {
        elizaLogger.debug("fetching home timeline");
        const homeTimeline = following
            ? await this.twitterClient.fetchFollowingTimeline(count, [])
            : await this.twitterClient.fetchHomeTimeline(count, []);

        elizaLogger.debug(homeTimeline, { depth: Number.POSITIVE_INFINITY });
        const processedTimeline = homeTimeline
            .filter((t) => t.__typename !== "TweetWithVisibilityResults") // what's this about?
            .map((tweet) => this.parseTweet(tweet));

        //elizaLogger.debug("process homeTimeline", processedTimeline);
        return processedTimeline;
    }

    async fetchTimelineForActions(count: number): Promise<Tweet[]> {
        elizaLogger.debug("fetching timeline for actions");

        const agentUsername = this.twitterConfig.TWITTER_USERNAME;

        const homeTimeline =
            this.twitterConfig.ACTION_TIMELINE_TYPE ===
            ActionTimelineType.Following
                ? await this.twitterClient.fetchFollowingTimeline(count, [])
                : await this.twitterClient.fetchHomeTimeline(count, []);

        // Parse, filter out self-tweets, limit to count
        return homeTimeline
            .map((tweet) => this.parseTweet(tweet))
            .filter((tweet) => tweet.username !== agentUsername) // do not perform action on self-tweets
            .slice(0, count);
        // TODO: Once the 'count' parameter is fixed in the 'fetchTimeline' method of the 'agent-twitter-client',
        // this workaround can be removed.
        // Related issue: https://github.com/elizaos/agent-twitter-client/issues/43
    }

    async fetchSearchTweets(
        query: string,
        maxTweets: number,
        searchMode: SearchMode,
        cursor?: string
    ): Promise<QueryTweetsResponse> {
        try {
            // Sometimes this fails because we are rate limited. in this case, we just need to return an empty array
            // if we dont get a response in 5 seconds, something is wrong
            const timeoutPromise = new Promise((resolve) =>
                setTimeout(() => resolve({ tweets: [] }), 15000)
            );

            try {
                const result = await this.requestQueue.add(
                    async () =>
                        await Promise.race([
                            this.twitterClient.fetchSearchTweets(
                                query,
                                maxTweets,
                                searchMode,
                                cursor
                            ),
                            timeoutPromise,
                        ])
                );
                return (result ?? { tweets: [] }) as QueryTweetsResponse;
            } catch (error) {
                elizaLogger.error("Error fetching search tweets:", error);
                return { tweets: [] };
            }
        } catch (error) {
            elizaLogger.error("Error fetching search tweets:", error);
            return { tweets: [] };
        }
    }

    private async populateTimeline() {
        elizaLogger.debug("populating timeline...");

        const cachedTimeline = await this.getCachedTimeline();

        // Check if the cache file exists
        if (cachedTimeline) {
            // Read the cached search results from the file

            // Get the existing memories from the database
            const existingMemories =
                await this.runtime.messageManager.getMemoriesByRoomIds({
                    roomIds: cachedTimeline.map((tweet) =>
                        stringToUuid(
                            tweet.conversationId + "-" + this.runtime.agentId
                        )
                    ),
                });

            //TODO: load tweets not in cache?

            // Create a Set to store the IDs of existing memories
            const existingMemoryIds = new Set(
                existingMemories.map((memory) => memory.id.toString())
            );

            // Check if any of the cached tweets exist in the existing memories
            const someCachedTweetsExist = cachedTimeline.some((tweet) =>
                existingMemoryIds.has(
                    stringToUuid(tweet.id + "-" + this.runtime.agentId)
                )
            );

            if (someCachedTweetsExist) {
                // Filter out the cached tweets that already exist in the database
                const tweetsToSave = cachedTimeline.filter(
                    (tweet) =>
                        !existingMemoryIds.has(
                            stringToUuid(tweet.id + "-" + this.runtime.agentId)
                        )
                );

                console.log({
                    processingTweets: tweetsToSave
                        .map((tweet) => tweet.id)
                        .join(","),
                });

                // Save the missing tweets as memories
                for (const tweet of tweetsToSave) {
                    elizaLogger.log("Saving Tweet", tweet.id);

                    const roomId = stringToUuid(
                        tweet.conversationId + "-" + this.runtime.agentId
                    );

                    const userId =
                        tweet.userId === this.profile.id
                            ? this.runtime.agentId
                            : stringToUuid(tweet.userId);

                    if (tweet.userId === this.profile.id) {
                        await this.runtime.ensureConnection(
                            this.runtime.agentId,
                            roomId,
                            this.profile.username,
                            this.profile.screenName,
                            "twitter"
                        );
                    } else {
                        await this.runtime.ensureConnection(
                            userId,
                            roomId,
                            tweet.username,
                            tweet.name,
                            "twitter"
                        );
                    }

                    const content = {
                        text: tweet.text,
                        url: tweet.permanentUrl,
                        source: "twitter",
                        inReplyTo: tweet.inReplyToStatusId
                            ? stringToUuid(
                                  tweet.inReplyToStatusId +
                                      "-" +
                                      this.runtime.agentId
                              )
                            : undefined,
                    } as Content;

                    elizaLogger.log("Creating memory for tweet", tweet.id);

                    // check if it already exists
                    const memory =
                        await this.runtime.messageManager.getMemoryById(
                            stringToUuid(tweet.id + "-" + this.runtime.agentId)
                        );

                    if (memory) {
                        elizaLogger.log(
                            "Memory already exists, skipping timeline population"
                        );
                        break;
                    }

                    await this.runtime.messageManager.createMemory({
                        id: stringToUuid(tweet.id + "-" + this.runtime.agentId),
                        userId,
                        content: content,
                        agentId: this.runtime.agentId,
                        roomId,
                        embedding: getEmbeddingZeroVector(),
                        createdAt: tweet.timestamp * 1000,
                    });

                    await this.cacheTweet(tweet);
                }

                elizaLogger.log(
                    `Populated ${tweetsToSave.length} missing tweets from the cache.`
                );
                return;
            }
        }

        const timeline = await this.fetchHomeTimeline(cachedTimeline ? 10 : 50);
        const username = this.twitterConfig.TWITTER_USERNAME;

        // Get the most recent 20 mentions and interactions
        const mentionsAndInteractions = await this.fetchSearchTweets(
            `@${username}`,
            20,
            SearchMode.Latest
        );

        // Combine the timeline tweets and mentions/interactions
        const allTweets = [...timeline, ...mentionsAndInteractions.tweets];

        // Create a Set to store unique tweet IDs
        const tweetIdsToCheck = new Set<string>();
        const roomIds = new Set<UUID>();

        // Add tweet IDs to the Set
        for (const tweet of allTweets) {
            tweetIdsToCheck.add(tweet.id);
            roomIds.add(
                stringToUuid(tweet.conversationId + "-" + this.runtime.agentId)
            );
        }

        // Check the existing memories in the database
        const existingMemories =
            await this.runtime.messageManager.getMemoriesByRoomIds({
                roomIds: Array.from(roomIds),
            });

        // Create a Set to store the existing memory IDs
        const existingMemoryIds = new Set<UUID>(
            existingMemories.map((memory) => memory.id)
        );

        // Filter out the tweets that already exist in the database
        const tweetsToSave = allTweets.filter(
            (tweet) =>
                !existingMemoryIds.has(
                    stringToUuid(tweet.id + "-" + this.runtime.agentId)
                )
        );

        elizaLogger.debug({
            processingTweets: tweetsToSave.map((tweet) => tweet.id).join(","),
        });

        await this.runtime.ensureUserExists(
            this.runtime.agentId,
            this.profile.username,
            this.runtime.character.name,
            "twitter"
        );

        // Save the new tweets as memories
        for (const tweet of tweetsToSave) {
            elizaLogger.log("Saving Tweet", tweet.id);

            const roomId = stringToUuid(
                tweet.conversationId + "-" + this.runtime.agentId
            );
            const userId =
                tweet.userId === this.profile.id
                    ? this.runtime.agentId
                    : stringToUuid(tweet.userId);

            if (tweet.userId === this.profile.id) {
                await this.runtime.ensureConnection(
                    this.runtime.agentId,
                    roomId,
                    this.profile.username,
                    this.profile.screenName,
                    "twitter"
                );
            } else {
                await this.runtime.ensureConnection(
                    userId,
                    roomId,
                    tweet.username,
                    tweet.name,
                    "twitter"
                );
            }

            const content = {
                text: tweet.text,
                url: tweet.permanentUrl,
                source: "twitter",
                inReplyTo: tweet.inReplyToStatusId
                    ? stringToUuid(tweet.inReplyToStatusId)
                    : undefined,
            } as Content;

            await this.runtime.messageManager.createMemory({
                id: stringToUuid(tweet.id + "-" + this.runtime.agentId),
                userId,
                content: content,
                agentId: this.runtime.agentId,
                roomId,
                embedding: getEmbeddingZeroVector(),
                createdAt: tweet.timestamp * 1000,
            });

            await this.cacheTweet(tweet);
        }

        // Cache
        await this.cacheTimeline(timeline);
        await this.cacheMentions(mentionsAndInteractions.tweets);
    }

    async setCookiesFromArray(cookiesArray: any[]) {
        const cookieStrings = cookiesArray.map(
            (cookie) =>
                `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${
                    cookie.secure ? "Secure" : ""
                }; ${cookie.httpOnly ? "HttpOnly" : ""}; SameSite=${
                    cookie.sameSite || "Lax"
                }`
        );
        await this.twitterClient.setCookies(cookieStrings);
    }

    async saveRequestMessage(message: Memory, state: State) {
        if (message.content.text) {
            const recentMessage = await this.runtime.messageManager.getMemories(
                {
                    roomId: message.roomId,
                    count: 1,
                    unique: false,
                }
            );

            if (
                recentMessage.length > 0 &&
                recentMessage[0].content === message.content
            ) {
                elizaLogger.debug("Message already saved", recentMessage[0].id);
            } else {
                await this.runtime.messageManager.createMemory({
                    ...message,
                    embedding: getEmbeddingZeroVector(),
                });
            }

            await this.runtime.evaluate(message, {
                ...state,
                twitterClient: this.twitterClient,
            });
        }
    }

    async loadLatestCheckedTweetId(): Promise<void> {
        const latestCheckedTweetId =
            await this.runtime.cacheManager.get<string>(
                `twitter/${this.profile.username}/latest_checked_tweet_id`
            );

        if (latestCheckedTweetId) {
            this.lastCheckedTweetId = BigInt(latestCheckedTweetId);
        }
    }

    async cacheLatestCheckedTweetId() {
        if (this.lastCheckedTweetId) {
            await this.runtime.cacheManager.set(
                `twitter/${this.profile.username}/latest_checked_tweet_id`,
                this.lastCheckedTweetId.toString()
            );
        }
    }

    async getCachedTimeline(): Promise<Tweet[] | undefined> {
        return await this.runtime.cacheManager.get<Tweet[]>(
            `twitter/${this.profile.username}/timeline`
        );
    }

    async cacheTimeline(timeline: Tweet[]) {
        await this.runtime.cacheManager.set(
            `twitter/${this.profile.username}/timeline`,
            timeline,
            { expires: Date.now() + 10 * 1000 }
        );
    }

    async cacheMentions(mentions: Tweet[]) {
        await this.runtime.cacheManager.set(
            `twitter/${this.profile.username}/mentions`,
            mentions,
            { expires: Date.now() + 10 * 1000 }
        );
    }

    async getCachedCookies(username: string) {
        return await this.runtime.cacheManager.get<any[]>(
            `twitter/${username}/cookies`
        );
    }

    async cacheCookies(username: string, cookies: any[]) {
        await this.runtime.cacheManager.set(
            `twitter/${username}/cookies`,
            cookies
        );
    }

    async fetchProfile(username: string): Promise<TwitterProfile> {
        try {
            const profile = await this.requestQueue.add(async () => {
                const profile = await this.twitterClient.getProfile(username);
                return {
                    id: profile.userId,
                    username,
                    screenName: profile.name || this.runtime.character.name,
                    bio:
                        profile.biography ||
                        typeof this.runtime.character.bio === "string"
                            ? (this.runtime.character.bio as string)
                            : this.runtime.character.bio.length > 0
                              ? this.runtime.character.bio[0]
                              : "",
                    nicknames:
                        this.runtime.character.twitterProfile?.nicknames || [],
                } satisfies TwitterProfile;
            });

            return profile;
        } catch (error) {
            console.error("Error fetching Twitter profile:", error);
            throw error;
        }
    }
}

```

`/plugin-twitter/src/interactions.ts`:

```ts
import { SearchMode, type Tweet } from "agent-twitter-client";
import {
    composeContext,
    generateMessageResponse,
    generateShouldRespond,
    messageCompletionFooter,
    shouldRespondFooter,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    stringToUuid,
    elizaLogger,
    getEmbeddingZeroVector,
    type IImageDescriptionService,
    ServiceType
} from "@elizaos/core";
import type { ClientBase } from "./base";
import { buildConversationThread, sendTweet, wait } from "./utils.ts";

export class TwitterInteractionClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    private isDryRun: boolean;
    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.isDryRun = this.client.twitterConfig.TWITTER_DRY_RUN;
    }

    async start() {
        const handleTwitterInteractionsLoop = () => {
            this.handleTwitterInteractions();
            setTimeout(
                handleTwitterInteractionsLoop,
                // Defaults to 2 minutes
                this.client.twitterConfig.TWITTER_POLL_INTERVAL * 1000
            );
        };
        handleTwitterInteractionsLoop();
    }

    async handleTwitterInteractions() {
        elizaLogger.log("Checking Twitter interactions");

        const twitterUsername = this.client.profile.username;
        try {
            // Check for mentions
            const mentionCandidates = (
                await this.client.fetchSearchTweets(
                    `@${twitterUsername}`,
                    20,
                    SearchMode.Latest
                )
            ).tweets;

            elizaLogger.log(
                "Completed checking mentioned tweets:",
                mentionCandidates.length
            );
            let uniqueTweetCandidates = [...mentionCandidates];
            // Only process target users if configured
            if (this.client.twitterConfig.TWITTER_TARGET_USERS.length) {
                const TARGET_USERS =
                    this.client.twitterConfig.TWITTER_TARGET_USERS;

                elizaLogger.log("Processing target users:", TARGET_USERS);

                if (TARGET_USERS.length > 0) {
                    // Create a map to store tweets by user
                    const tweetsByUser = new Map<string, Tweet[]>();

                    // Fetch tweets from all target users
                    for (const username of TARGET_USERS) {
                        try {
                            const userTweets = (
                                await this.client.twitterClient.fetchSearchTweets(
                                    `from:${username}`,
                                    3,
                                    SearchMode.Latest
                                )
                            ).tweets;

                            // Filter for unprocessed, non-reply, recent tweets
                            const validTweets = userTweets.filter((tweet) => {
                                const isUnprocessed =
                                    !this.client.lastCheckedTweetId ||
                                    Number.parseInt(tweet.id) >
                                        this.client.lastCheckedTweetId;
                                const isRecent =
                                    Date.now() - tweet.timestamp * 1000 <
                                    2 * 60 * 60 * 1000;

                                elizaLogger.log(`Tweet ${tweet.id} checks:`, {
                                    isUnprocessed,
                                    isRecent,
                                    isReply: tweet.isReply,
                                    isRetweet: tweet.isRetweet,
                                });

                                return (
                                    isUnprocessed &&
                                    !tweet.isReply &&
                                    !tweet.isRetweet &&
                                    isRecent
                                );
                            });

                            if (validTweets.length > 0) {
                                tweetsByUser.set(username, validTweets);
                                elizaLogger.log(
                                    `Found ${validTweets.length} valid tweets from ${username}`
                                );
                            }
                        } catch (error) {
                            elizaLogger.error(
                                `Error fetching tweets for ${username}:`,
                                error
                            );
                            continue;
                        }
                    }

                    // Select one tweet from each user that has tweets
                    const selectedTweets: Tweet[] = [];
                    for (const [username, tweets] of tweetsByUser) {
                        if (tweets.length > 0) {
                            // Randomly select one tweet from this user
                            const randomTweet =
                                tweets[
                                    Math.floor(Math.random() * tweets.length)
                                ];
                            selectedTweets.push(randomTweet);
                            elizaLogger.log(
                                `Selected tweet from ${username}: ${randomTweet.text?.substring(0, 100)}`
                            );
                        }
                    }

                    // Add selected tweets to candidates
                    uniqueTweetCandidates = [
                        ...mentionCandidates,
                        ...selectedTweets,
                    ];
                }
            } else {
                elizaLogger.log(
                    "No target users configured, processing only mentions"
                );
            }

            // Sort tweet candidates by ID in ascending order
            uniqueTweetCandidates
                .sort((a, b) => a.id.localeCompare(b.id))
                .filter((tweet) => tweet.userId !== this.client.profile.id);

            // for each tweet candidate, handle the tweet
            for (const tweet of uniqueTweetCandidates) {
                if (
                    !this.client.lastCheckedTweetId ||
                    BigInt(tweet.id) > this.client.lastCheckedTweetId
                ) {
                    // Generate the tweetId UUID the same way it's done in handleTweet
                    const tweetId = stringToUuid(
                        tweet.id + "-" + this.runtime.agentId
                    );

                    // Check if we've already processed this tweet
                    const existingResponse =
                        await this.runtime.messageManager.getMemoryById(
                            tweetId
                        );

                    if (existingResponse) {
                        elizaLogger.log(
                            `Already responded to tweet ${tweet.id}, skipping`
                        );
                        continue;
                    }
                    elizaLogger.log("New Tweet found", tweet.permanentUrl);

                    const roomId = stringToUuid(
                        tweet.conversationId + "-" + this.runtime.agentId
                    );

                    const userIdUUID =
                        tweet.userId === this.client.profile.id
                            ? this.runtime.agentId
                            : stringToUuid(tweet.userId!);

                    await this.runtime.ensureConnection(
                        userIdUUID,
                        roomId,
                        tweet.username,
                        tweet.name,
                        "twitter"
                    );

                    const thread = await buildConversationThread(
                        tweet,
                        this.client
                    );

                    const message = {
                        content: { 
                            text: tweet.text,
                            imageUrls: tweet.photos?.map(photo => photo.url) || []
                        },
                        agentId: this.runtime.agentId,
                        userId: userIdUUID,
                        roomId,
                    };

                    await this.handleTweet({
                        tweet,
                        message,
                        thread,
                    });

                    // Update the last checked tweet ID after processing each tweet
                    this.client.lastCheckedTweetId = BigInt(tweet.id);
                }
            }

            // Save the latest checked tweet ID to the file
            await this.client.cacheLatestCheckedTweetId();

            elizaLogger.log("Finished checking Twitter interactions");
        } catch (error) {
            elizaLogger.error("Error handling Twitter interactions:", error);
        }
    }

    private async handleTweet({
        tweet,
        message,
        thread,
    }: {
        tweet: Tweet;
        message: Memory;
        thread: Tweet[];
    }) {
        // Only skip if tweet is from self AND not from a target user
        if (tweet.userId === this.client.profile.id &&
            !this.client.twitterConfig.TWITTER_TARGET_USERS.includes(tweet.username)) {
            return;
        }

        if (!message.content.text) {
            elizaLogger.log("Skipping Tweet with no text", tweet.id);
            return { text: "", action: "IGNORE" };
        }

        elizaLogger.log("Processing Tweet: ", tweet.id);
        const formatTweet = (tweet: Tweet) => {
            return `  ID: ${tweet.id}
  From: ${tweet.name} (@${tweet.username})
  Text: ${tweet.text}`;
        };
        const currentPost = formatTweet(tweet);

        const formattedConversation = thread
            .map(
                (tweet) => `@${tweet.username} (${new Date(
                    tweet.timestamp * 1000
                ).toLocaleString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                })}):
        ${tweet.text}`
            )
            .join("\n\n");

        const imageDescriptionsArray = [];
        try{
            for (const photo of tweet.photos) {
                const description = await this.runtime
                    .getService<IImageDescriptionService>(
                        ServiceType.IMAGE_DESCRIPTION
                    )
                    .describeImage(photo.url);
                imageDescriptionsArray.push(description);
            }
        } catch (error) {
    // Handle the error
    elizaLogger.error("Error Occured during describing image: ", error);
}




        let state = await this.runtime.composeState(message, {
            twitterClient: this.client.twitterClient,
            twitterUserName: this.client.twitterConfig.TWITTER_USERNAME,
            currentPost,
            formattedConversation,
            imageDescriptions: imageDescriptionsArray.length > 0
            ? `\nImages in Tweet:\n${imageDescriptionsArray.map((desc, i) =>
              `Image ${i + 1}: Title: ${desc.title}\nDescription: ${desc.description}`).join("\n\n")}`:""
        });

        // check if the tweet exists, save if it doesn't
        const tweetId = stringToUuid(tweet.id + "-" + this.runtime.agentId);
        const tweetExists =
            await this.runtime.messageManager.getMemoryById(tweetId);

        if (!tweetExists) {
            elizaLogger.log("tweet does not exist, saving");
            const userIdUUID = stringToUuid(tweet.userId as string);
            const roomId = stringToUuid(tweet.conversationId);

            const message = {
                id: tweetId,
                agentId: this.runtime.agentId,
                content: {
                    text: tweet.text,
                    url: tweet.permanentUrl,
                    imageUrls: tweet.photos?.map(photo => photo.url) || [],
                    inReplyTo: tweet.inReplyToStatusId
                        ? stringToUuid(
                              tweet.inReplyToStatusId +
                                  "-" +
                                  this.runtime.agentId
                          )
                        : undefined,
                },
                userId: userIdUUID,
                roomId,
                createdAt: tweet.timestamp * 1000,
            };
            this.client.saveRequestMessage(message, state);
        }

        // get usernames into str
        const validTargetUsersStr =
            this.client.twitterConfig.TWITTER_TARGET_USERS.join(",");

        const shouldRespondContext = composeContext({
            state,
            template:
                this.runtime.character.templates
                    ?.twitterShouldRespondTemplate ||
                this.runtime.character?.templates?.shouldRespondTemplate ||
                twitterShouldRespondTemplate(validTargetUsersStr),
        });

        const shouldRespond = await generateShouldRespond({
            runtime: this.runtime,
            context: shouldRespondContext,
            modelClass: ModelClass.MEDIUM,
        });

        // Promise<"RESPOND" | "IGNORE" | "STOP" | null> {
        if (shouldRespond !== "RESPOND") {
            elizaLogger.log("Not responding to message");
            return { text: "Response Decision:", action: shouldRespond };
        }

        const context = composeContext({
            state: {
                ...state,
                // Convert actionNames array to string
                actionNames: Array.isArray(state.actionNames)
                    ? state.actionNames.join(', ')
                    : state.actionNames || '',
                actions: Array.isArray(state.actions)
                    ? state.actions.join('\n')
                    : state.actions || '',
                // Ensure character examples are included
                characterPostExamples: this.runtime.character.messageExamples
                    ? this.runtime.character.messageExamples
                        .map(example =>
                            example.map(msg =>
                                `${msg.user}: ${msg.content.text}${msg.content.action ? ` [Action: ${msg.content.action}]` : ''}`
                            ).join('\n')
                        ).join('\n\n')
                    : '',
            },
            template:
                this.runtime.character.templates
                    ?.twitterMessageHandlerTemplate ||
                this.runtime.character?.templates?.messageHandlerTemplate ||
                twitterMessageHandlerTemplate,
        });

        const response = await generateMessageResponse({
            runtime: this.runtime,
            context,
            modelClass: ModelClass.LARGE,
        });

        const removeQuotes = (str: string) =>
            str.replace(/^['"](.*)['"]$/, "$1");

        const stringId = stringToUuid(tweet.id + "-" + this.runtime.agentId);

        response.inReplyTo = stringId;

        response.text = removeQuotes(response.text);

        if (response.text) {
            if (this.isDryRun) {
                elizaLogger.info(
                    `Dry run: Selected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`
                );
            } else {
                try {
                    const callback: HandlerCallback = async (
                        response: Content,
                        tweetId?: string
                    ) => {
                        const memories = await sendTweet(
                            this.client,
                            response,
                            message.roomId,
                            this.client.twitterConfig.TWITTER_USERNAME,
                            tweetId || tweet.id
                        );
                        return memories;
                    };

                    const action = this.runtime.actions.find((a) => a.name === response.action);
                    const shouldSuppressInitialMessage = action?.suppressInitialMessage;

                    let responseMessages = [];

                    if (!shouldSuppressInitialMessage) {
                        responseMessages = await callback(response);
                    } else {
                        responseMessages = [{
                            id: stringToUuid(tweet.id + "-" + this.runtime.agentId),
                            userId: this.runtime.agentId,
                            agentId: this.runtime.agentId,
                            content: response,
                            roomId: message.roomId,
                            embedding: getEmbeddingZeroVector(),
                            createdAt: Date.now(),
                        }];
                    }

                    state = (await this.runtime.updateRecentMessageState(
                        state
                    )) as State;

                    for (const responseMessage of responseMessages) {
                        if (
                            responseMessage ===
                            responseMessages[responseMessages.length - 1]
                        ) {
                            responseMessage.content.action = response.action;
                        } else {
                            responseMessage.content.action = "CONTINUE";
                        }
                        await this.runtime.messageManager.createMemory(
                            responseMessage
                        );
                    }

                    const responseTweetId =
                    responseMessages[responseMessages.length - 1]?.content
                        ?.tweetId;

                    await this.runtime.processActions(
                        message,
                        responseMessages,
                        state,
                        (response: Content) => {
                            return callback(response, responseTweetId);
                        }
                    );

                    const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${tweet.id} - ${tweet.username}: ${tweet.text}\nAgent's Output:\n${response.text}`;

                    await this.runtime.cacheManager.set(
                        `twitter/tweet_generation_${tweet.id}.txt`,
                        responseInfo
                    );
                    await wait();
                } catch (error) {
                    elizaLogger.error(`Error sending response tweet: ${error}`);
                }
            }
        }
    }

    async buildConversationThread(
        tweet: Tweet,
        maxReplies = 10
    ): Promise<Tweet[]> {
        const thread: Tweet[] = [];
        const visited: Set<string> = new Set();

        async function processThread(currentTweet: Tweet, depth = 0) {
            elizaLogger.log("Processing tweet:", {
                id: currentTweet.id,
                inReplyToStatusId: currentTweet.inReplyToStatusId,
                depth: depth,
            });

            if (!currentTweet) {
                elizaLogger.log("No current tweet found for thread building");
                return;
            }

            if (depth >= maxReplies) {
                elizaLogger.log("Reached maximum reply depth", depth);
                return;
            }

            // Handle memory storage
            const memory = await this.runtime.messageManager.getMemoryById(
                stringToUuid(currentTweet.id + "-" + this.runtime.agentId)
            );
            if (!memory) {
                const roomId = stringToUuid(
                    currentTweet.conversationId + "-" + this.runtime.agentId
                );
                const userId = stringToUuid(currentTweet.userId);

                await this.runtime.ensureConnection(
                    userId,
                    roomId,
                    currentTweet.username,
                    currentTweet.name,
                    "twitter"
                );

                this.runtime.messageManager.createMemory({
                    id: stringToUuid(
                        currentTweet.id + "-" + this.runtime.agentId
                    ),
                    agentId: this.runtime.agentId,
                    content: {
                        text: currentTweet.text,
                        source: "twitter",
                        url: currentTweet.permanentUrl,
                        imageUrls: currentTweet.photos?.map(photo => photo.url) || [],
                        inReplyTo: currentTweet.inReplyToStatusId
                            ? stringToUuid(
                                  currentTweet.inReplyToStatusId +
                                      "-" +
                                      this.runtime.agentId
                              )
                            : undefined,
                    },
                    createdAt: currentTweet.timestamp * 1000,
                    roomId,
                    userId:
                        currentTweet.userId === this.twitterUserId
                            ? this.runtime.agentId
                            : stringToUuid(currentTweet.userId),
                    embedding: getEmbeddingZeroVector(),
                });
            }

            if (visited.has(currentTweet.id)) {
                elizaLogger.log("Already visited tweet:", currentTweet.id);
                return;
            }

            visited.add(currentTweet.id);
            thread.unshift(currentTweet);

            if (currentTweet.inReplyToStatusId) {
                elizaLogger.log(
                    "Fetching parent tweet:",
                    currentTweet.inReplyToStatusId
                );
                try {
                    const parentTweet = await this.twitterClient.getTweet(
                        currentTweet.inReplyToStatusId
                    );

                    if (parentTweet) {
                        elizaLogger.log("Found parent tweet:", {
                            id: parentTweet.id,
                            text: parentTweet.text?.slice(0, 50),
                        });
                        await processThread(parentTweet, depth + 1);
                    } else {
                        elizaLogger.log(
                            "No parent tweet found for:",
                            currentTweet.inReplyToStatusId
                        );
                    }
                } catch (error) {
                    elizaLogger.log("Error fetching parent tweet:", {
                        tweetId: currentTweet.inReplyToStatusId,
                        error,
                    });
                }
            } else {
                elizaLogger.log(
                    "Reached end of reply chain at:",
                    currentTweet.id
                );
            }
        }

        // Need to bind this context for the inner function
        await processThread.bind(this)(tweet, 0);

        return thread;
    }
}
```

`/plugin-twitter/src/search.ts`:

```ts
import { SearchMode } from "agent-twitter-client";
import { composeContext, elizaLogger } from "@elizaos/core";
import { generateMessageResponse, generateText } from "@elizaos/core";
import { messageCompletionFooter } from "@elizaos/core";
import {
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type IImageDescriptionService,
    ModelClass,
    ServiceType,
    type State,
} from "@elizaos/core";
import { stringToUuid } from "@elizaos/core";
import type { ClientBase } from "./base";
import { buildConversationThread, sendTweet, wait } from "./utils.ts";

export class TwitterSearchClient {
    client: ClientBase;
    runtime: IAgentRuntime;
    twitterUsername: string;
    private respondedTweets: Set<string> = new Set();

    constructor(client: ClientBase, runtime: IAgentRuntime) {
        this.client = client;
        this.runtime = runtime;
        this.twitterUsername = this.client.twitterConfig.TWITTER_USERNAME;
    }

    async start() {
        this.engageWithSearchTermsLoop();
    }

    private engageWithSearchTermsLoop() {
        this.engageWithSearchTerms().then();
        const randomMinutes = Math.floor(Math.random() * (120 - 60 + 1)) + 60;
        elizaLogger.log(
            `Next twitter search scheduled in ${randomMinutes} minutes`
        );
        setTimeout(
            () => this.engageWithSearchTermsLoop(),
            randomMinutes * 60 * 1000
        );
    }

    private async engageWithSearchTerms() {
        elizaLogger.log("Engaging with search terms");
        try {
            const searchTerm = [...this.runtime.character.topics][
                Math.floor(Math.random() * this.runtime.character.topics.length)
            ];

            elizaLogger.log("Fetching search tweets");
            // TODO: we wait 5 seconds here to avoid getting rate limited on startup, but we should queue
            await new Promise((resolve) => setTimeout(resolve, 5000));
            const recentTweets = await this.client.fetchSearchTweets(
                searchTerm,
                20,
                SearchMode.Top
            );
            elizaLogger.log("Search tweets fetched");

            const homeTimeline = await this.client.fetchHomeTimeline(50);

            await this.client.cacheTimeline(homeTimeline);

            const formattedHomeTimeline =
                `# ${this.runtime.character.name}'s Home Timeline\n\n` +
                homeTimeline
                    .map((tweet) => {
                        return `ID: ${tweet.id}\nFrom: ${tweet.name} (@${tweet.username})${tweet.inReplyToStatusId ? ` In reply to: ${tweet.inReplyToStatusId}` : ""}\nText: ${tweet.text}\n---\n`;
                    })
                    .join("\n");

            // randomly slice .tweets down to 20
            const slicedTweets = recentTweets.tweets
                .sort(() => Math.random() - 0.5)
                .slice(0, 20);

            if (slicedTweets.length === 0) {
                elizaLogger.log(
                    "No valid tweets found for the search term",
                    searchTerm
                );
                return;
            }

            const prompt = `
  Here are some tweets related to the search term "${searchTerm}":

  ${[...slicedTweets, ...homeTimeline]
      .filter((tweet) => {
          // ignore tweets where any of the thread tweets contain a tweet by the bot
          const thread = tweet.thread;
          const botTweet = thread.find(
              (t) => t.username === this.twitterUsername
          );
          return !botTweet;
      })
      .map(
          (tweet) => `
    ID: ${tweet.id}${tweet.inReplyToStatusId ? ` In reply to: ${tweet.inReplyToStatusId}` : ""}
    From: ${tweet.name} (@${tweet.username})
    Text: ${tweet.text}
  `
      )
      .join("\n")}

  Which tweet is the most interesting and relevant for Ruby to reply to? Please provide only the ID of the tweet in your response.
  Notes:
    - Respond to English tweets only
    - Respond to tweets that don't have a lot of hashtags, links, URLs or images
    - Respond to tweets that are not retweets
    - Respond to tweets where there is an easy exchange of ideas to have with the user
    - ONLY respond with the ID of the tweet`;

            const mostInterestingTweetResponse = await generateText({
                runtime: this.runtime,
                context: prompt,
                modelClass: ModelClass.SMALL,
            });

            const tweetId = mostInterestingTweetResponse.trim();
            const selectedTweet = slicedTweets.find(
                (tweet) =>
                    tweet.id.toString().includes(tweetId) ||
                    tweetId.includes(tweet.id.toString())
            );

            if (!selectedTweet) {
                elizaLogger.warn("No matching tweet found for the selected ID");
                elizaLogger.log("Selected tweet ID:", tweetId);
                return;
            }

            elizaLogger.log("Selected tweet to reply to:", selectedTweet?.text);

            if (selectedTweet.username === this.twitterUsername) {
                elizaLogger.log("Skipping tweet from bot itself");
                return;
            }

            const conversationId = selectedTweet.conversationId;
            const roomId = stringToUuid(
                conversationId + "-" + this.runtime.agentId
            );

            const userIdUUID = stringToUuid(selectedTweet.userId as string);

            await this.runtime.ensureConnection(
                userIdUUID,
                roomId,
                selectedTweet.username,
                selectedTweet.name,
                "twitter"
            );

            // crawl additional conversation tweets, if there are any
            await buildConversationThread(selectedTweet, this.client);

            const message = {
                id: stringToUuid(selectedTweet.id + "-" + this.runtime.agentId),
                agentId: this.runtime.agentId,
                content: {
                    text: selectedTweet.text,
                    url: selectedTweet.permanentUrl,
                    inReplyTo: selectedTweet.inReplyToStatusId
                        ? stringToUuid(
                              selectedTweet.inReplyToStatusId +
                                  "-" +
                                  this.runtime.agentId
                          )
                        : undefined,
                },
                userId: userIdUUID,
                roomId,
                // Timestamps are in seconds, but we need them in milliseconds
                createdAt: selectedTweet.timestamp * 1000,
            };

            if (!message.content.text) {
                elizaLogger.warn("Returning: No response text found");
                return;
            }

            // Fetch replies and retweets
            const replies = selectedTweet.thread;
            const replyContext = replies
                .filter((reply) => reply.username !== this.twitterUsername)
                .map((reply) => `@${reply.username}: ${reply.text}`)
                .join("\n");

            let tweetBackground = "";
            if (selectedTweet.isRetweet) {
                const originalTweet = await this.client.requestQueue.add(() =>
                    this.client.twitterClient.getTweet(selectedTweet.id)
                );
                tweetBackground = `Retweeting @${originalTweet.username}: ${originalTweet.text}`;
            }

            // Generate image descriptions using GPT-4 vision API
            const imageDescriptions = [];
            for (const photo of selectedTweet.photos) {
                const description = await this.runtime
                    .getService<IImageDescriptionService>(
                        ServiceType.IMAGE_DESCRIPTION
                    )
                    .describeImage(photo.url);
                imageDescriptions.push(description);
            }

            let state = await this.runtime.composeState(message, {
                twitterClient: this.client.twitterClient,
                twitterUserName: this.twitterUsername,
                timeline: formattedHomeTimeline,
                tweetContext: `${tweetBackground}

  Original Post:
  By @${selectedTweet.username}
  ${selectedTweet.text}${replyContext.length > 0 && `\nReplies to original post:\n${replyContext}`}
  ${`Original post text: ${selectedTweet.text}`}
  ${selectedTweet.urls.length > 0 ? `URLs: ${selectedTweet.urls.join(", ")}\n` : ""}${imageDescriptions.length > 0 ? `\nImages in Post (Described): ${imageDescriptions.join(", ")}\n` : ""}
  `,
            });

            await this.client.saveRequestMessage(message, state as State);

            const context = composeContext({
                state,
                template:
                    this.runtime.character.templates?.twitterSearchTemplate ||
                    twitterSearchTemplate,
            });

            const responseContent = await generateMessageResponse({
                runtime: this.runtime,
                context,
                modelClass: ModelClass.LARGE,
            });

            responseContent.inReplyTo = message.id;

            const response = responseContent;

            if (!response.text) {
                elizaLogger.warn("Returning: No response text found");
                return;
            }

            elizaLogger.log(
                `Bot would respond to tweet ${selectedTweet.id} with: ${response.text}`
            );
            try {
                const callback: HandlerCallback = async (response: Content) => {
                    const memories = await sendTweet(
                        this.client,
                        response,
                        message.roomId,
                        this.twitterUsername,
                        selectedTweet.id
                    );
                    return memories;
                };

                const responseMessages = await callback(responseContent);

                state = await this.runtime.updateRecentMessageState(state);

                for (const responseMessage of responseMessages) {
                    await this.runtime.messageManager.createMemory(
                        responseMessage,
                        false
                    );
                }

                state = await this.runtime.updateRecentMessageState(state);

                await this.runtime.evaluate(message, state);

                await this.runtime.processActions(
                    message,
                    responseMessages,
                    state,
                    callback
                );

                this.respondedTweets.add(selectedTweet.id);
                const responseInfo = `Context:\n\n${context}\n\nSelected Post: ${selectedTweet.id} - ${selectedTweet.username}: ${selectedTweet.text}\nAgent's Output:\n${response.text}`;

                await this.runtime.cacheManager.set(
                    `twitter/tweet_generation_${selectedTweet.id}.txt`,
                    responseInfo
                );

                await wait();
            } catch (error) {
                console.error(`Error sending response post: ${error}`);
            }
        } catch (error) {
            console.error("Error engaging with search terms:", error);
        }
    }
}

```

`/plugin-twitter/src/types.ts`:

```ts
export type MediaData = {
    data: Buffer;
    mediaType: string;
};

```

`/plugin-twitter/src/client.ts`:

```ts
import { type Client, elizaLogger, type IAgentRuntime, type Plugin } from "@elizaos/core";
import { ClientBase } from "./base.ts";
import { validateTwitterConfig, type TwitterConfig } from "./environment.ts";
import { TwitterInteractionClient } from "./interactions.ts";
import { TwitterPostClient } from "./post.ts";
import { TwitterSearchClient } from "./search.ts";
import { TwitterSpaceClient } from "./spaces.ts";

/**
 * A manager that orchestrates all specialized Twitter logic:
 * - client: base operations (login, timeline caching, etc.)
 * - post: autonomous posting logic
 * - search: searching tweets / replying logic
 * - interaction: handling mentions, replies
 * - space: launching and managing Twitter Spaces (optional)
 */
class TwitterManager {
    client: ClientBase;
    post: TwitterPostClient;
    search: TwitterSearchClient;
    interaction: TwitterInteractionClient;
    space?: TwitterSpaceClient;

    constructor(runtime: IAgentRuntime, twitterConfig: TwitterConfig) {
        // Pass twitterConfig to the base client
        this.client = new ClientBase(runtime, twitterConfig);

        // Posting logic
        this.post = new TwitterPostClient(this.client, runtime);

        // Optional search logic (enabled if TWITTER_SEARCH_ENABLE is true)
        if (twitterConfig.TWITTER_SEARCH_ENABLE) {
            elizaLogger.warn("Twitter/X client running in a mode that:");
            elizaLogger.warn("1. violates consent of random users");
            elizaLogger.warn("2. burns your rate limit");
            elizaLogger.warn("3. can get your account banned");
            elizaLogger.warn("use at your own risk");
            this.search = new TwitterSearchClient(this.client, runtime);
        }

        // Mentions and interactions
        this.interaction = new TwitterInteractionClient(this.client, runtime);

        // Optional Spaces logic (enabled if TWITTER_SPACES_ENABLE is true)
        if (twitterConfig.TWITTER_SPACES_ENABLE) {
            this.space = new TwitterSpaceClient(this.client, runtime);
        }
    }

    async stop() {
        elizaLogger.warn("Twitter client does not support stopping yet");
    }
}

export const TwitterClientInterface: Client = {
    name: 'twitter',
    async start(runtime: IAgentRuntime) {
        const twitterConfig: TwitterConfig =
            await validateTwitterConfig(runtime);

        elizaLogger.log("Twitter client started");

        const manager = new TwitterManager(runtime, twitterConfig);

        // Initialize login/session
        await manager.client.init();

        // Start the posting loop
        await manager.post.start();

        // Start the search logic if it exists
        if (manager.search) {
            await manager.search.start();
        }

        // Start interactions (mentions, replies)
        await manager.interaction.start();

        // If Spaces are enabled, start the periodic check
        if (manager.space) {
            manager.space.startPeriodicSpaceCheck();
        }

        return manager;
    },
};
```

`/plugin-twitter/src/index.ts`:

```ts
import { TwitterClientInterface } from "./client";

const twitterPlugin = {
    name: "twitter",
    description: "Twitter client",
    clients: [TwitterClientInterface],
};
export default twitterPlugin;

```

New twitter Plugin

Project Path: src

Source Tree:

```
src
├── base.ts
├── tests.ts
├── interactions.ts
├── templates.ts
├── types.ts
├── spaces.ts
├── constants.ts
├── index.ts
├── timeline.ts
└── post.ts

```

`/plugin-twitter/src/base.ts`:

```ts
import {
  ChannelType,
  type Content,
  type IAgentRuntime,
  type Memory,
  type State,
  type UUID,
  createUniqueUuid,
  logger,
} from '@elizaos/core';
import { Client, type QueryTweetsResponse, SearchMode, type Tweet } from './client/index';
import { TwitterInteractionPayload } from './types';

interface TwitterUser {
  id_str: string;
  screen_name: string;
  name: string;
}

interface TwitterFollowersResponse {
  users: TwitterUser[];
}

/**
 * Extracts the answer from the given text.
 *
 * @param {string} text - The text containing the answer
 * @returns {string} The extracted answer
 */
export function extractAnswer(text: string): string {
  const startIndex = text.indexOf('Answer: ') + 8;
  const endIndex = text.indexOf('<|eof|>', 11);
  return text.slice(startIndex, endIndex);
}

/**
 * Represents a Twitter Profile.
 * @typedef {Object} TwitterProfile
 * @property {string} id - The unique identifier of the profile.
 * @property {string} username - The username of the profile.
 * @property {string} screenName - The screen name of the profile.
 * @property {string} bio - The biography of the profile.
 * @property {string[]} nicknames - An array of nicknames associated with the profile.
 */
type TwitterProfile = {
  id: string;
  username: string;
  screenName: string;
  bio: string;
  nicknames: string[];
};

/**
 * Class representing a request queue for handling asynchronous requests in a controlled manner.
 */

class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private processing = false;

  /**
   * Asynchronously adds a request to the queue, then processes the queue.
   *
   * @template T
   * @param {() => Promise<T>} request - The request to be added to the queue
   * @returns {Promise<T>} - A promise that resolves with the result of the request or rejects with an error
   */
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  /**
   * Asynchronously processes the queue of requests.
   *
   * @returns A promise that resolves when the queue has been fully processed.
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      try {
        await request();
      } catch (error) {
        console.error('Error processing request:', error);
        this.queue.unshift(request);
        await this.exponentialBackoff(this.queue.length);
      }
      await this.randomDelay();
    }

    this.processing = false;
  }

  /**
   * Implements an exponential backoff strategy for retrying a task.
   * @param {number} retryCount - The number of retries attempted so far.
   * @returns {Promise<void>} - A promise that resolves after a delay based on the retry count.
   */
  private async exponentialBackoff(retryCount: number): Promise<void> {
    const delay = 2 ** retryCount * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Asynchronous method that creates a random delay between 1500ms and 3500ms.
   *
   * @returns A Promise that resolves after the random delay has passed.
   */
  private async randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * 2000) + 1500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Class representing a base client for interacting with Twitter.
 * @extends EventEmitter
 */
export class ClientBase {
  static _twitterClients: { [accountIdentifier: string]: Client } = {};
  twitterClient: Client;
  runtime: IAgentRuntime;
  lastCheckedTweetId: bigint | null = null;
  temperature = 0.5;

  requestQueue: RequestQueue = new RequestQueue();

  profile: TwitterProfile | null;

  /**
   * Caches a tweet in the database.
   *
   * @param {Tweet} tweet - The tweet to cache.
   * @returns {Promise<void>} A promise that resolves once the tweet is cached.
   */
  async cacheTweet(tweet: Tweet): Promise<void> {
    if (!tweet) {
      console.warn('Tweet is undefined, skipping cache');
      return;
    }

    this.runtime.setCache<Tweet>(`twitter/tweets/${tweet.id}`, tweet);
  }

  /**
   * Retrieves a cached tweet by its ID.
   * @param {string} tweetId - The ID of the tweet to retrieve from the cache.
   * @returns {Promise<Tweet | undefined>} A Promise that resolves to the cached tweet, or undefined if the tweet is not found in the cache.
   */
  async getCachedTweet(tweetId: string): Promise<Tweet | undefined> {
    const cached = await this.runtime.getCache<Tweet>(`twitter/tweets/${tweetId}`);

    if (!cached) {
      return undefined;
    }

    return cached;
  }

  /**
   * Asynchronously retrieves a tweet with the specified ID.
   * If the tweet is found in the cache, it is returned from the cache.
   * If not, a request is made to the Twitter API to get the tweet, which is then cached and returned.
   * @param {string} tweetId - The ID of the tweet to retrieve.
   * @returns {Promise<Tweet>} A Promise that resolves to the retrieved tweet.
   */
  async getTweet(tweetId: string): Promise<Tweet> {
    const cachedTweet = await this.getCachedTweet(tweetId);

    if (cachedTweet) {
      return cachedTweet;
    }

    const tweet = await this.requestQueue.add(() => this.twitterClient.getTweet(tweetId));

    await this.cacheTweet(tweet);
    return tweet;
  }

  callback: (self: ClientBase) => any = null;

  /**
   * This method is called when the application is ready.
   * It throws an error indicating that it is not implemented in the base class
   * and should be implemented in the subclass.
   */
  onReady() {
    throw new Error('Not implemented in base class, please call from subclass');
  }

  /**
   * Parse the raw tweet data into a standardized Tweet object.
   */
  /**
   * Parses a raw tweet object into a structured Tweet object.
   *
   * @param {any} raw - The raw tweet object to parse.
   * @param {number} [depth=0] - The current depth of parsing nested quotes/retweets.
   * @param {number} [maxDepth=3] - The maximum depth allowed for parsing nested quotes/retweets.
   * @returns {Tweet} The parsed Tweet object.
   */
  parseTweet(raw: any, depth = 0, maxDepth = 3): Tweet {
    // If we've reached maxDepth, don't parse nested quotes/retweets further
    const canRecurse = depth < maxDepth;

    const quotedStatus =
      raw.quoted_status_result?.result && canRecurse
        ? this.parseTweet(raw.quoted_status_result.result, depth + 1, maxDepth)
        : undefined;

    const retweetedStatus =
      raw.retweeted_status_result?.result && canRecurse
        ? this.parseTweet(raw.retweeted_status_result.result, depth + 1, maxDepth)
        : undefined;

    const t: Tweet = {
      bookmarkCount: raw.bookmarkCount ?? raw.legacy?.bookmark_count ?? undefined,
      conversationId: raw.conversationId ?? raw.legacy?.conversation_id_str,
      hashtags: raw.hashtags ?? raw.legacy?.entities?.hashtags ?? [],
      html: raw.html,
      id: raw.id ?? raw.rest_id ?? raw.legacy.id_str ?? raw.id_str ?? undefined,
      inReplyToStatus: raw.inReplyToStatus,
      inReplyToStatusId:
        raw.inReplyToStatusId ?? raw.legacy?.in_reply_to_status_id_str ?? undefined,
      isQuoted: raw.legacy?.is_quote_status === true,
      isPin: raw.isPin,
      isReply: raw.isReply,
      isRetweet: raw.legacy?.retweeted === true,
      isSelfThread: raw.isSelfThread,
      language: raw.legacy?.lang,
      likes: raw.legacy?.favorite_count ?? 0,
      name:
        raw.name ??
        raw?.user_results?.result?.legacy?.name ??
        raw.core?.user_results?.result?.legacy?.name,
      mentions: raw.mentions ?? raw.legacy?.entities?.user_mentions ?? [],
      permanentUrl:
        raw.permanentUrl ??
        (raw.core?.user_results?.result?.legacy?.screen_name && raw.rest_id
          ? `https://x.com/${raw.core?.user_results?.result?.legacy?.screen_name}/status/${raw.rest_id}`
          : undefined),
      photos:
        raw.photos ??
        (raw.legacy?.entities?.media
          ?.filter((media: any) => media.type === 'photo')
          .map((media: any) => ({
            id: media.id_str || media.rest_id || media.legacy.id_str,
            url: media.media_url_https,
            alt_text: media.alt_text,
          })) ||
          []),
      place: raw.place,
      poll: raw.poll ?? null,
      quotedStatus,
      quotedStatusId: raw.quotedStatusId ?? raw.legacy?.quoted_status_id_str ?? undefined,
      quotes: raw.legacy?.quote_count ?? 0,
      replies: raw.legacy?.reply_count ?? 0,
      retweets: raw.legacy?.retweet_count ?? 0,
      retweetedStatus,
      retweetedStatusId: raw.legacy?.retweeted_status_id_str ?? undefined,
      text: raw.text ?? raw.legacy?.full_text ?? undefined,
      thread: raw.thread || [],
      timeParsed: raw.timeParsed
        ? new Date(raw.timeParsed)
        : raw.legacy?.created_at
          ? new Date(raw.legacy?.created_at)
          : undefined,
      timestamp:
        raw.timestamp ??
        (raw.legacy?.created_at ? new Date(raw.legacy.created_at).getTime() / 1000 : undefined),
      urls: raw.urls ?? raw.legacy?.entities?.urls ?? [],
      userId: raw.userId ?? raw.legacy?.user_id_str ?? undefined,
      username: raw.username ?? raw.core?.user_results?.result?.legacy?.screen_name ?? undefined,
      videos:
        raw.videos ??
        raw.legacy?.entities?.media?.filter((media: any) => media.type === 'video') ??
        [],
      views: raw.views?.count ? Number(raw.views.count) : 0,
      sensitiveContent: raw.sensitiveContent,
    };

    return t;
  }

  state: any;

  constructor(runtime: IAgentRuntime, state: any) {
    this.runtime = runtime;
    this.state = state;
    const username =
      state?.TWITTER_USERNAME || (this.runtime.getSetting('TWITTER_USERNAME') as string);
    if (ClientBase._twitterClients[username]) {
      this.twitterClient = ClientBase._twitterClients[username];
    } else {
      this.twitterClient = new Client();
      ClientBase._twitterClients[username] = this.twitterClient;
    }
  }

  async init() {
    // First ensure the agent exists in the database
    await this.runtime.ensureAgentExists(this.runtime.character);

    const username = this.state?.TWITTER_USERNAME || this.runtime.getSetting('TWITTER_USERNAME');
    const password = this.state?.TWITTER_PASSWORD || this.runtime.getSetting('TWITTER_PASSWORD');
    const email = this.state?.TWITTER_EMAIL || this.runtime.getSetting('TWITTER_EMAIL');
    const twitter2faSecret =
      this.state?.TWITTER_2FA_SECRET || this.runtime.getSetting('TWITTER_2FA_SECRET');

    // Validate required credentials
    if (!username || !password || !email) {
      const missing = [];
      if (!username) missing.push('TWITTER_USERNAME');
      if (!password) missing.push('TWITTER_PASSWORD');
      if (!email) missing.push('TWITTER_EMAIL');
      throw new Error(`Missing required Twitter credentials: ${missing.join(', ')}`);
    }

    const maxRetries = process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : 3;
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        const authToken =
          this.state?.TWITTER_COOKIES_AUTH_TOKEN ||
          this.runtime.getSetting('TWITTER_COOKIES_AUTH_TOKEN');
        const ct0 =
          this.state?.TWITTER_COOKIES_CT0 || this.runtime.getSetting('TWITTER_COOKIES_CT0');
        const guestId =
          this.state?.TWITTER_COOKIES_GUEST_ID ||
          this.runtime.getSetting('TWITTER_COOKIES_GUEST_ID');

        const createTwitterCookies = (authToken: string, ct0: string, guestId: string) =>
          authToken && ct0 && guestId
            ? [
                { key: 'auth_token', value: authToken, domain: '.twitter.com' },
                { key: 'ct0', value: ct0, domain: '.twitter.com' },
                { key: 'guest_id', value: guestId, domain: '.twitter.com' },
              ]
            : null;

        const cachedCookies =
          (await this.getCachedCookies(username)) || createTwitterCookies(authToken, ct0, guestId);

        if (cachedCookies) {
          logger.info('Using cached cookies');
          await this.setCookiesFromArray(cachedCookies);
        }

        logger.log('Waiting for Twitter login');
        if (await this.twitterClient.isLoggedIn()) {
          // cookies are valid, no login required
          logger.info('Successfully logged in.');
          break;
        }
        await this.twitterClient.login(username, password, email, twitter2faSecret);
        if (await this.twitterClient.isLoggedIn()) {
          // fresh login, store new cookies
          logger.info('Successfully logged in.');
          logger.info('Caching cookies');
          await this.cacheCookies(username, await this.twitterClient.getCookies());
          break;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error(`Login attempt ${retryCount + 1} failed: ${lastError.message}`);
        retryCount++;

        if (retryCount < maxRetries) {
          const delay = 2 ** retryCount * 1000; // Exponential backoff
          logger.info(`Retrying in ${delay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (retryCount >= maxRetries) {
      throw new Error(
        `Twitter login failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
      );
    }

    // Initialize Twitter profile
    this.profile = await this.fetchProfile(username);

    if (this.profile) {
      logger.log('Twitter user ID:', this.profile.id);
      logger.log('Twitter loaded:', JSON.stringify(this.profile, null, 10));

      const agentId = this.runtime.agentId;

      const entity = await this.runtime.getEntityById(agentId);
      if (entity?.metadata?.twitter?.userName !== this.profile.username) {
        logger.log(
          'Updating Agents known X/twitter handle',
          this.profile.username,
          'was',
          entity?.metadata?.twitter
        );
        const names = [this.profile.screenName, this.profile.username];
        await this.runtime.updateEntity({
          id: agentId,
          names: [...new Set([...(entity.names || []), ...names])].filter(Boolean),
          metadata: {
            ...entity.metadata,
            twitter: {
              // we should stomp this, we don't want to carry dev data over to public
              // but you should just clear the db when you do that
              ...entity.metadata?.twitter,
              name: this.profile.screenName,
              userName: this.profile.username,
            },
          },
          agentId,
        });
      }

      // Store profile info for use in responses
      this.profile = {
        id: this.profile.id,
        username: this.profile.username, // this is the at
        screenName: this.profile.screenName, // this is the human readable name of the at
        bio: this.profile.bio,
        nicknames: this.profile.nicknames,
      };
    } else {
      throw new Error('Failed to load profile');
    }

    await this.loadLatestCheckedTweetId();
    await this.populateTimeline();
  }

  async fetchOwnPosts(count: number): Promise<Tweet[]> {
    logger.debug('fetching own posts');
    const homeTimeline = await this.twitterClient.getUserTweets(this.profile.id, count);
    // Use parseTweet on each tweet
    return homeTimeline.tweets.map((t) => this.parseTweet(t));
  }

  /**
   * Fetch timeline for twitter account, optionally only from followed accounts
   */
  async fetchHomeTimeline(count: number, following?: boolean): Promise<Tweet[]> {
    logger.debug('fetching home timeline');
    const homeTimeline = following
      ? await this.twitterClient.fetchFollowingTimeline(count, [])
      : await this.twitterClient.fetchHomeTimeline(count, []);

    const processedTimeline = homeTimeline
      .filter((t) => t.__typename !== 'TweetWithVisibilityResults') // what's this about?
      .map((tweet) => this.parseTweet(tweet));

    //logger.debug("process homeTimeline", processedTimeline);
    return processedTimeline;
  }

  async fetchSearchTweets(
    query: string,
    maxTweets: number,
    searchMode: SearchMode,
    cursor?: string
  ): Promise<QueryTweetsResponse> {
    try {
      // Sometimes this fails because we are rate limited. in this case, we just need to return an empty array
      // if we dont get a response in 5 seconds, something is wrong
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ tweets: [] }), 15000)
      );

      try {
        const result = await this.requestQueue.add(
          async () =>
            await Promise.race([
              this.twitterClient.fetchSearchTweets(query, maxTweets, searchMode, cursor),
              timeoutPromise,
            ])
        );
        return (result ?? { tweets: [] }) as QueryTweetsResponse;
      } catch (error) {
        logger.error('Error fetching search tweets:', error);
        return { tweets: [] };
      }
    } catch (error) {
      logger.error('Error fetching search tweets:', error);
      return { tweets: [] };
    }
  }

  private async populateTimeline() {
    logger.debug('populating timeline...');

    const cachedTimeline = await this.getCachedTimeline();

    // Check if the cache file exists
    if (cachedTimeline) {
      // Read the cached search results from the file

      // Get the existing memories from the database
      const existingMemories = await this.runtime.getMemoriesByRoomIds({
        tableName: 'messages',
        roomIds: cachedTimeline.map((tweet) =>
          createUniqueUuid(this.runtime, tweet.conversationId)
        ),
      });

      //TODO: load tweets not in cache?

      // Create a Set to store the IDs of existing memories
      const existingMemoryIds = new Set(existingMemories.map((memory) => memory.id.toString()));

      // Check if any of the cached tweets exist in the existing memories
      const someCachedTweetsExist = cachedTimeline.some((tweet) =>
        existingMemoryIds.has(createUniqueUuid(this.runtime, tweet.id))
      );

      if (someCachedTweetsExist) {
        // Filter out the cached tweets that already exist in the database
        const tweetsToSave = cachedTimeline.filter(
          (tweet) =>
            tweet.userId !== this.profile.id &&
            !existingMemoryIds.has(createUniqueUuid(this.runtime, tweet.id))
        );

        // Save the missing tweets as memories
        for (const tweet of tweetsToSave) {
          logger.log('Saving Tweet', tweet.id);

          if (tweet.userId === this.profile.id) {
            continue;
          }

          // Create a world for this Twitter user if it doesn't exist
          const worldId = createUniqueUuid(this.runtime, tweet.userId) as UUID;
          await this.runtime.ensureWorldExists({
            id: worldId,
            name: `${tweet.username}'s Twitter`,
            agentId: this.runtime.agentId,
            serverId: tweet.userId,
            metadata: {
              ownership: { ownerId: tweet.userId },
              twitter: {
                username: tweet.username,
                id: tweet.userId,
              },
            },
          });

          const roomId = createUniqueUuid(this.runtime, tweet.conversationId);
          const entityId =
            tweet.userId === this.profile.id
              ? this.runtime.agentId
              : createUniqueUuid(this.runtime, tweet.userId);

          // Ensure the entity exists with proper world association
          await this.runtime.ensureConnection({
            entityId,
            roomId,
            userName: tweet.username,
            name: tweet.name,
            source: 'twitter',
            type: ChannelType.FEED,
            worldId: worldId,
          });

          const content = {
            text: tweet.text,
            url: tweet.permanentUrl,
            source: 'twitter',
            inReplyTo: tweet.inReplyToStatusId
              ? createUniqueUuid(this.runtime, tweet.inReplyToStatusId)
              : undefined,
          } as Content;

          await this.runtime.createMemory(
            {
              id: createUniqueUuid(this.runtime, tweet.id),
              entityId,
              content: content,
              agentId: this.runtime.agentId,
              roomId,
              createdAt: tweet.timestamp * 1000,
            },
            'messages'
          );

          await this.cacheTweet(tweet);
        }

        logger.log(`Populated ${tweetsToSave.length} missing tweets from the cache.`);
        return;
      }
    }

    const timeline = await this.fetchHomeTimeline(cachedTimeline ? 10 : 50);
    const username = this.runtime.getSetting('TWITTER_USERNAME');

    // Get the most recent 20 mentions and interactions
    const mentionsAndInteractions = await this.fetchSearchTweets(
      `@${username}`,
      20,
      SearchMode.Latest
    );

    // Combine the timeline tweets and mentions/interactions
    const allTweets = [...timeline, ...mentionsAndInteractions.tweets];

    // Create a Set to store unique tweet IDs
    const tweetIdsToCheck = new Set<string>();
    const roomIds = new Set<UUID>();

    // Add tweet IDs to the Set
    for (const tweet of allTweets) {
      tweetIdsToCheck.add(tweet.id);
      roomIds.add(createUniqueUuid(this.runtime, tweet.conversationId));
    }

    // Check the existing memories in the database
    const existingMemories = await this.runtime.getMemoriesByRoomIds({
      tableName: 'messages',
      roomIds: Array.from(roomIds),
    });

    // Create a Set to store the existing memory IDs
    const existingMemoryIds = new Set<UUID>(existingMemories.map((memory) => memory.id));

    // Filter out the tweets that already exist in the database
    const tweetsToSave = allTweets.filter(
      (tweet) =>
        tweet.userId !== this.profile.id &&
        !existingMemoryIds.has(createUniqueUuid(this.runtime, tweet.id))
    );

    logger.debug({
      processingTweets: tweetsToSave.map((tweet) => tweet.id).join(','),
    });

    // Save the new tweets as memories
    for (const tweet of tweetsToSave) {
      logger.log('Saving Tweet', tweet.id);

      if (tweet.userId === this.profile.id) {
        continue;
      }

      // Create a world for this Twitter user if it doesn't exist
      const worldId = createUniqueUuid(this.runtime, tweet.userId) as UUID;
      await this.runtime.ensureWorldExists({
        id: worldId,
        name: `${tweet.username}'s Twitter`,
        agentId: this.runtime.agentId,
        serverId: tweet.userId,
        metadata: {
          ownership: { ownerId: tweet.userId },
          twitter: {
            username: tweet.username,
            id: tweet.userId,
          },
        },
      });

      const roomId = createUniqueUuid(this.runtime, tweet.conversationId);

      const entityId =
        tweet.userId === this.profile.id
          ? this.runtime.agentId
          : createUniqueUuid(this.runtime, tweet.userId);

      // Ensure the entity exists with proper world association
      await this.runtime.ensureConnection({
        entityId,
        roomId,
        userName: tweet.username,
        name: tweet.name,
        source: 'twitter',
        type: ChannelType.FEED,
        worldId: worldId,
      });

      const content = {
        text: tweet.text,
        url: tweet.permanentUrl,
        source: 'twitter',
        inReplyTo: tweet.inReplyToStatusId
          ? createUniqueUuid(this.runtime, tweet.inReplyToStatusId)
          : undefined,
      } as Content;

      await this.runtime.createMemory(
        {
          id: createUniqueUuid(this.runtime, tweet.id),
          entityId,
          content: content,
          agentId: this.runtime.agentId,
          roomId,
          createdAt: tweet.timestamp * 1000,
        },
        'messages'
      );

      await this.cacheTweet(tweet);
    }

    // Cache
    await this.cacheTimeline(timeline);
    await this.cacheMentions(mentionsAndInteractions.tweets);
  }

  async setCookiesFromArray(cookiesArray: any[]) {
    const cookieStrings = cookiesArray.map(
      (cookie) =>
        `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}; ${
          cookie.secure ? 'Secure' : ''
        }; ${cookie.httpOnly ? 'HttpOnly' : ''}; SameSite=${cookie.sameSite || 'Lax'}`
    );
    await this.twitterClient.setCookies(cookieStrings);
  }

  async saveRequestMessage(message: Memory, state: State) {
    if (message.content.text) {
      const recentMessage = await this.runtime.getMemories({
        tableName: 'messages',
        roomId: message.roomId,
        count: 1,
        unique: false,
      });

      if (recentMessage.length > 0 && recentMessage[0].content === message.content) {
        logger.debug('Message already saved', recentMessage[0].id);
      } else {
        await this.runtime.createMemory(message, 'messages');
      }

      await this.runtime.evaluate(message, {
        ...state,
        twitterClient: this.twitterClient,
      });
    }
  }

  async loadLatestCheckedTweetId(): Promise<void> {
    const latestCheckedTweetId = await this.runtime.getCache<string>(
      `twitter/${this.profile.username}/latest_checked_tweet_id`
    );

    if (latestCheckedTweetId) {
      this.lastCheckedTweetId = BigInt(latestCheckedTweetId);
    }
  }

  async cacheLatestCheckedTweetId() {
    if (this.lastCheckedTweetId) {
      await this.runtime.setCache<string>(
        `twitter/${this.profile.username}/latest_checked_tweet_id`,
        this.lastCheckedTweetId.toString()
      );
    }
  }

  async getCachedTimeline(): Promise<Tweet[] | undefined> {
    const cached = await this.runtime.getCache<Tweet[]>(
      `twitter/${this.profile.username}/timeline`
    );

    if (!cached) {
      return undefined;
    }

    return cached;
  }

  async cacheTimeline(timeline: Tweet[]) {
    await this.runtime.setCache<Tweet[]>(`twitter/${this.profile.username}/timeline`, timeline);
  }

  async cacheMentions(mentions: Tweet[]) {
    await this.runtime.setCache<Tweet[]>(`twitter/${this.profile.username}/mentions`, mentions);
  }

  async getCachedCookies(username: string) {
    const cached = await this.runtime.getCache<any[]>(`twitter/${username}/cookies`);

    if (!cached) {
      return undefined;
    }

    return cached;
  }

  async cacheCookies(username: string, cookies: any[]) {
    await this.runtime.setCache<any[]>(`twitter/${username}/cookies`, cookies);
  }

  async fetchProfile(username: string): Promise<TwitterProfile> {
    try {
      const profile = await this.requestQueue.add(async () => {
        const profile = await this.twitterClient.getProfile(username);
        return {
          id: profile.userId,
          username,
          screenName: profile.name || this.runtime.character.name,
          bio:
            profile.biography || typeof this.runtime.character.bio === 'string'
              ? (this.runtime.character.bio as string)
              : this.runtime.character.bio.length > 0
                ? this.runtime.character.bio[0]
                : '',
          nicknames: this.profile?.nicknames || [],
        } satisfies TwitterProfile;
      });

      return profile;
    } catch (error) {
      console.error('Error fetching Twitter profile:', error);
      throw error;
    }
  }

  /**
   * Fetches recent interactions (likes, retweets, quotes) for the authenticated user's tweets
   */
  async fetchInteractions() {
    try {
      const username = this.profile.username;
      // Use fetchSearchTweets to get mentions instead of the non-existent get method
      const mentionsResponse = await this.requestQueue.add(() =>
        this.twitterClient.fetchSearchTweets(`@${username}`, 100, SearchMode.Latest)
      );

      // Process tweets directly into the expected interaction format
      return mentionsResponse.tweets.map((tweet) => this.formatTweetToInteraction(tweet));
    } catch (error) {
      logger.error('Error fetching Twitter interactions:', error);
      return [];
    }
  }

  formatTweetToInteraction(tweet): TwitterInteractionPayload | null {
    if (!tweet) return null;

    const isQuote = tweet.isQuoted;
    const isRetweet = !!tweet.retweetedStatus;
    const type = isQuote ? 'quote' : isRetweet ? 'retweet' : 'like';

    return {
      id: tweet.id,
      type,
      userId: tweet.userId,
      username: tweet.username,
      name: tweet.name || tweet.username,
      targetTweetId: tweet.inReplyToStatusId || tweet.quotedStatusId,
      targetTweet: tweet.quotedStatus || tweet,
      quoteTweet: isQuote ? tweet : undefined,
      retweetId: tweet.retweetedStatus?.id,
    };
  }
}

```

`/plugin-twitter/src/tests.ts`:

```ts
// packages/plugin-twitter/src/tests/ClientBaseTestSuite.ts

import type { IAgentRuntime, TestSuite } from '@elizaos/core';
import { ClientBase } from './base';
import type { TwitterConfig } from './environment';
import { logger } from '@elizaos/core';

export class ClientBaseTestSuite implements TestSuite {
  name = 'twitter-client-base';

  private mockRuntime: IAgentRuntime;
  private mockConfig: TwitterConfig;

  constructor() {
    this.mockRuntime = {
      env: {
        TWITTER_USERNAME: 'testuser',
        TWITTER_DRY_RUN: 'true',
        TWITTER_POST_INTERVAL_MIN: '90',
        TWITTER_POST_INTERVAL_MAX: '180',
        TWITTER_ENABLE_ACTION_PROCESSING: 'true',
        TWITTER_POST_IMMEDIATELY: 'false',
      },
      getEnv: (key: string) => this.mockRuntime.env[key] || null,
      getSetting: (key: string) => this.mockRuntime.env[key] || null,
      character: {
        style: {
          all: ['Test style 1', 'Test style 2'],
          post: ['Post style 1', 'Post style 2'],
        },
      },
    } as unknown as IAgentRuntime;

    this.mockConfig = {
      TWITTER_USERNAME: 'testuser',
      TWITTER_DRY_RUN: true,
      TWITTER_SPACES_ENABLE: false,
      TWITTER_TARGET_USERS: [],
      TWITTER_PASSWORD: 'hashedpassword',
      TWITTER_EMAIL: 'test@example.com',
      TWITTER_2FA_SECRET: '',
      TWITTER_RETRY_LIMIT: 5,
      TWITTER_POLL_INTERVAL: 120,
      TWITTER_ENABLE_POST_GENERATION: true,
      TWITTER_POST_INTERVAL_MIN: 90,
      TWITTER_POST_INTERVAL_MAX: 180,
      TWITTER_POST_IMMEDIATELY: false,
    };
  }

  tests = [
    {
      name: 'Create instance with correct configuration',
      fn: this.testInstanceCreation.bind(this),
    },
    { name: 'Initialize with correct post intervals', fn: this.testPostIntervals.bind(this) },
  ];

  async testInstanceCreation() {
    const client = new ClientBase(this.mockRuntime, this.mockConfig);
    if (!client) throw new Error('ClientBase instance creation failed.');

    if (this.mockRuntime.getSetting('TWITTER_USERNAME') !== 'testuser') {
      throw new Error('TWITTER_USERNAME setting mismatch.');
    }

    if (client.state.TWITTER_USERNAME !== 'testuser') {
      throw new Error('Client state TWITTER_USERNAME mismatch.');
    }

    if (this.mockRuntime.getSetting('TWITTER_DRY_RUN') !== 'true') {
      throw new Error('TWITTER_DRY_RUN setting mismatch.');
    }

    if (client.state.TWITTER_DRY_RUN !== true) {
      throw new Error('Client state TWITTER_DRY_RUN mismatch.');
    }

    logger.success('ClientBase instance created with correct configuration.');
  }

  async testPostIntervals() {
    const client = new ClientBase(this.mockRuntime, this.mockConfig);

    if (this.mockRuntime.getSetting('TWITTER_POST_INTERVAL_MIN') !== '90') {
      throw new Error('TWITTER_POST_INTERVAL_MIN setting mismatch.');
    }

    if (client.state.TWITTER_POST_INTERVAL_MIN !== 90) {
      throw new Error('Client state TWITTER_POST_INTERVAL_MIN mismatch.');
    }

    if (this.mockRuntime.getSetting('TWITTER_POST_INTERVAL_MAX') !== '180') {
      throw new Error('TWITTER_POST_INTERVAL_MAX setting mismatch.');
    }

    if (client.state.TWITTER_POST_INTERVAL_MAX !== 180) {
      throw new Error('Client state TWITTER_POST_INTERVAL_MAX mismatch.');
    }

    logger.success('ClientBase initialized with correct post intervals.');
  }
}

```

`/plugin-twitter/src/interactions.ts`:

```ts
import {
  ChannelType,
  type Content,
  EventType,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type MessagePayload,
  ModelType,
  composePrompt,
  createUniqueUuid,
  logger,
} from '@elizaos/core';
import type { ClientBase } from './base';
import { SearchMode } from './client/index';
import type { Tweet as ClientTweet } from './client/tweets';
import type {
  Tweet as CoreTweet,
  TwitterInteractionMemory,
  TwitterInteractionPayload,
  TwitterLikeReceivedPayload,
  TwitterMemory,
  TwitterMentionReceivedPayload,
  TwitterQuoteReceivedPayload,
  TwitterRetweetReceivedPayload,
  TwitterUserFollowedPayload,
  TwitterUserUnfollowedPayload,
} from './types';
import { TwitterEventTypes } from './types';
import { sendTweet } from './utils';

// Add conversion functions
const convertToCoreTweet = (tweet: ClientTweet): CoreTweet => ({
  id: tweet.id,
  text: tweet.text,
  conversationId: tweet.conversationId,
  timestamp: tweet.timestamp,
  userId: tweet.userId,
  username: tweet.username,
  name: tweet.name,
  inReplyToStatusId: tweet.inReplyToStatusId,
  permanentUrl: tweet.permanentUrl,
  photos: tweet.photos,
  hashtags: tweet.hashtags,
  mentions: tweet.mentions.map((mention) => mention.username),
  urls: tweet.urls,
  videos: tweet.videos,
  thread: tweet.thread,
});

const convertToCoreTweets = (tweets: ClientTweet[]): CoreTweet[] => tweets.map(convertToCoreTweet);

/**
 * Class representing a client for interacting with Twitter.
 */
export class TwitterInteractionClient {
  client: ClientBase;
  runtime: IAgentRuntime;
  private isDryRun: boolean;
  private state: any;
  /**
   * Constructor for setting up a new instance with the provided client, runtime, and state.
   * @param {ClientBase} client - The client being used for communication.
   * @param {IAgentRuntime} runtime - The runtime environment for the agent.
   * @param {any} state - The initial state of the agent.
   */
  constructor(client: ClientBase, runtime: IAgentRuntime, state: any) {
    this.client = client;
    this.runtime = runtime;
    this.state = state;
    this.isDryRun =
      this.state?.TWITTER_DRY_RUN ||
      (this.runtime.getSetting('TWITTER_DRY_RUN') as unknown as boolean);
  }

  /**
   * Asynchronously starts the process of handling Twitter interactions on a loop.
   * Uses an interval based on the 'TWITTER_POLL_INTERVAL' setting, or defaults to 2 minutes if not set.
   */
  async start() {
    const handleTwitterInteractionsLoop = () => {
      // Defaults to 2 minutes
      const interactionInterval =
        (this.state?.TWITTER_POLL_INTERVAL ||
          (this.runtime.getSetting('TWITTER_POLL_INTERVAL') as unknown as number) ||
          120) * 1000;

      this.handleTwitterInteractions();
      setTimeout(handleTwitterInteractionsLoop, interactionInterval);
    };
    handleTwitterInteractionsLoop();
  }

  /**
   * Asynchronously handles Twitter interactions by checking for mentions, processing tweets, and updating the last checked tweet ID.
   */
  async handleTwitterInteractions() {
    logger.log('Checking Twitter interactions');

    const twitterUsername = this.client.profile?.username;
    try {
      // Check for mentions
      const cursorKey = `twitter/${twitterUsername}/mention_cursor`;
      const cachedCursor: String = await this.runtime.getCache<string>(cursorKey);

      const searchResult = await this.client.fetchSearchTweets(
        `@${twitterUsername}`,
        20,
        SearchMode.Latest,
        String(cachedCursor)
      );

      const mentionCandidates = searchResult.tweets;

      // If we got tweets and there's a valid cursor, cache it
      if (mentionCandidates.length > 0 && searchResult.previous) {
        await this.runtime.setCache(cursorKey, searchResult.previous);
      } else if (!searchResult.previous && !searchResult.next) {
        // If both previous and next are missing, clear the outdated cursor
        await this.runtime.setCache(cursorKey, ''); // used to be null, but DB doesn't allow it
      }

      await this.processMentionTweets(mentionCandidates);

      // Save the latest checked tweet ID to the file
      await this.client.cacheLatestCheckedTweetId();

      logger.log('Finished checking Twitter interactions');
    } catch (error) {
      logger.error('Error handling Twitter interactions:', error);
    }
  }

  async processMentionTweets(mentionCandidates: ClientTweet[]) {
    logger.log('Completed checking mentioned tweets:', mentionCandidates.length);
    let uniqueTweetCandidates = [...mentionCandidates];

    // Sort tweet candidates by ID in ascending order
    uniqueTweetCandidates = uniqueTweetCandidates
      .sort((a, b) => a.id.localeCompare(b.id))
      .filter((tweet) => tweet.userId !== this.client.profile.id);

    // for each tweet candidate, handle the tweet
    for (const tweet of uniqueTweetCandidates) {
      if (!this.client.lastCheckedTweetId || BigInt(tweet.id) > this.client.lastCheckedTweetId) {
        // Generate the tweetId UUID the same way it's done in handleTweet
        const tweetId = createUniqueUuid(this.runtime, tweet.id);

        // Check if we've already processed this tweet
        const existingResponse = await this.runtime.getMemoryById(tweetId);

        if (existingResponse) {
          logger.log(`Already responded to tweet ${tweet.id}, skipping`);
          continue;
        }
        logger.log('New Tweet found', tweet.permanentUrl);

        const entityId = createUniqueUuid(
          this.runtime,
          tweet.userId === this.client.profile.id ? this.runtime.agentId : tweet.userId
        );

        // Create standardized world and room IDs
        const worldId = createUniqueUuid(this.runtime, tweet.userId);
        const roomId = createUniqueUuid(this.runtime, tweet.conversationId);

        await this.runtime.ensureConnection({
          entityId,
          roomId,
          userName: tweet.username,
          worldName: `${tweet.name}'s Twitter`,
          name: tweet.name,
          source: 'twitter',
          type: ChannelType.GROUP,
          channelId: tweet.conversationId,
          serverId: tweet.userId,
          worldId: worldId,
          metadata: {
            ownership: { ownerId: tweet.userId },
            twitter: {
              username: tweet.username,
              id: tweet.userId,
              name: tweet.name,
            },
          },
        });

        // Create standardized message memory
        const memory: Memory = {
          id: tweetId,
          agentId: this.runtime.agentId,
          content: {
            text: tweet.text,
            url: tweet.permanentUrl,
            imageUrls: tweet.photos?.map((photo) => photo.url) || [],
            inReplyTo: tweet.inReplyToStatusId
              ? createUniqueUuid(this.runtime, tweet.inReplyToStatusId)
              : undefined,
            source: 'twitter',
            channelType: ChannelType.GROUP,
            tweet,
          },
          entityId,
          roomId,
          createdAt: tweet.timestamp * 1000,
        };
        await this.runtime.createMemory(memory, 'messages');

        // Handle thread events
        if (tweet.thread.length > 1) {
          const threadPayload = {
            runtime: this.runtime,
            tweets: convertToCoreTweets(tweet.thread),
            user: {
              id: tweet.userId,
              username: tweet.username,
              name: tweet.name,
            },
            source: 'twitter',
          };

          if (tweet.thread[tweet.thread.length - 1].id === tweet.id) {
            // This is a new tweet in an existing thread
            this.runtime.emitEvent(TwitterEventTypes.THREAD_UPDATED, {
              ...threadPayload,
              newTweet: convertToCoreTweet(tweet),
            });
          } else if (tweet.thread[0].id === tweet.id) {
            // This is the start of a new thread
            this.runtime.emitEvent(TwitterEventTypes.THREAD_CREATED, threadPayload);
          }
        }

        await this.handleTweet({
          tweet,
          message: memory,
          thread: tweet.thread,
        });

        // Update the last checked tweet ID after processing each tweet
        this.client.lastCheckedTweetId = BigInt(tweet.id);
      }
    }
  }

  /**
   * Handles Twitter interactions such as likes, retweets, and quotes.
   * For each interaction:
   *  - Creates a memory object
   *  - Emits platform-specific events (LIKE_RECEIVED, RETWEET_RECEIVED, QUOTE_RECEIVED)
   *  - Emits a generic REACTION_RECEIVED event with metadata
   */
  async handleInteraction(interaction: TwitterInteractionPayload) {
    if (interaction?.targetTweet?.conversationId) {
      const memory = this.createMemoryObject(
        interaction.type,
        `${interaction.id}-${interaction.type}`,
        interaction.userId,
        interaction.targetTweet.conversationId
      );

      await this.runtime.createMemory(memory, 'messages');

      // Create message for reaction
      const reactionMessage: TwitterMemory = {
        id: createUniqueUuid(this.runtime, interaction.targetTweetId),
        content: {
          text: interaction.targetTweet.text,
          source: 'twitter',
        },
        entityId: createUniqueUuid(this.runtime, interaction.targetTweet.userId),
        roomId: createUniqueUuid(this.runtime, interaction.targetTweet.conversationId),
        agentId: this.runtime.agentId,
      };

      // Create base event payload
      const basePayload = {
        runtime: this.runtime,
        user: {
          id: interaction.userId,
          username: interaction.username,
          name: interaction.name,
        },
        source: 'twitter' as const,
      };

      // Emit platform-specific event
      switch (interaction.type) {
        case 'like': {
          const likePayload: TwitterLikeReceivedPayload = {
            ...basePayload,
            tweet: interaction.targetTweet as unknown as CoreTweet,
          };
          // Emit platform-specific event
          this.runtime.emitEvent(TwitterEventTypes.LIKE_RECEIVED, likePayload);

          // Emit generic REACTION_RECEIVED event
          this.runtime.emitEvent(EventType.REACTION_RECEIVED, {
            ...basePayload,
            reaction: {
              type: 'like',
              entityId: createUniqueUuid(this.runtime, interaction.userId),
            },
            message: reactionMessage,
            callback: async () => {
              return [];
            },
          } as MessagePayload);
          break;
        }

        case 'retweet': {
          const retweetPayload: TwitterRetweetReceivedPayload = {
            ...basePayload,
            tweet: interaction.targetTweet as unknown as CoreTweet,
            retweetId: interaction.retweetId,
          };
          // Emit platform-specific event
          this.runtime.emitEvent(TwitterEventTypes.RETWEET_RECEIVED, retweetPayload);

          // Emit generic REACTION_RECEIVED event
          this.runtime.emitEvent(EventType.REACTION_RECEIVED, {
            ...basePayload,
            reaction: {
              type: 'retweet',
              entityId: createUniqueUuid(this.runtime, interaction.userId),
            },
            message: reactionMessage,
            callback: async () => {
              return [];
            },
          } as MessagePayload);
          break;
        }

        case 'quote': {
          const quotePayload: TwitterQuoteReceivedPayload = {
            ...basePayload,
            message: reactionMessage,
            quotedTweet: interaction.targetTweet as unknown as CoreTweet,
            quoteTweet: (interaction.quoteTweet || interaction.targetTweet) as unknown as CoreTweet,
            callback: async () => [],
            reaction: {
              type: 'quote',
              entityId: createUniqueUuid(this.runtime, interaction.userId),
            },
          };
          // Emit platform-specific event
          this.runtime.emitEvent(TwitterEventTypes.QUOTE_RECEIVED, quotePayload);

          // Emit generic REACTION_RECEIVED event
          this.runtime.emitEvent(EventType.REACTION_RECEIVED, {
            ...basePayload,
            reaction: {
              type: 'quote',
              entityId: createUniqueUuid(this.runtime, interaction.userId),
            },
            message: reactionMessage,
            callback: async () => {
              return [];
            },
          } as MessagePayload);
          break;
        }
      }
    }
  }

  /**
   * Handles a tweet by processing its content, formatting it, generating image descriptions,
   * saving the tweet if it doesn't already exist, determining if a response should be sent,
   * composing a response prompt, generating a response based on the prompt, handling the response
   * tweet, and saving information about the response.
   *
   * @param {object} params - The parameters object containing the tweet, message, and thread.
   * @param {Tweet} params.tweet - The tweet object to handle.
   * @param {Memory} params.message - The memory object associated with the tweet.
   * @param {Tweet[]} params.thread - The array of tweets in the thread.
   * @returns {object} - An object containing the text of the response and any relevant actions.
   */
  async handleTweet({
    tweet,
    message,
    thread,
  }: {
    tweet: ClientTweet;
    message: Memory;
    thread: ClientTweet[];
  }) {
    if (!message.content.text) {
      logger.log('Skipping Tweet with no text', tweet.id);
      return { text: '', actions: ['IGNORE'] };
    }

    logger.log('Processing Tweet: ', tweet.id);
    const formatTweet = (tweet: ClientTweet) => {
      return `  ID: ${tweet.id}
  From: ${tweet.name} (@${tweet.username})
  Text: ${tweet.text}`;
    };
    const currentPost = formatTweet(tweet);

    const formattedConversation = thread
      .map(
        (tweet) => `@${tweet.username} (${new Date(tweet.timestamp * 1000).toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        })}):
        ${tweet.text}`
      )
      .join('\n\n');

    const imageDescriptionsArray = [];
    try {
      for (const photo of tweet.photos) {
        const description = await this.runtime.useModel(ModelType.IMAGE_DESCRIPTION, photo.url);
        imageDescriptionsArray.push(description);
      }
    } catch (error) {
      // Handle the error
      logger.error('Error Occured during describing image: ', error);
    }

    // Create a callback for handling the response
    const callback: HandlerCallback = async (response: Content, tweetId?: string) => {
      try {
        if (!response.text) {
          logger.warn('No text content in response, skipping tweet reply');
          return [];
        }

        const tweetToReplyTo = tweetId || tweet.id;

        if (this.isDryRun) {
          logger.info(`[DRY RUN] Would have replied to ${tweet.username} with: ${response.text}`);
          return [];
        }

        logger.info(`Replying to tweet ${tweetToReplyTo}`);

        // Create the actual tweet using the Twitter API through the client
        const tweetResult = await sendTweet(this.client, response.text, [], tweetToReplyTo);

        if (!tweetResult) {
          throw new Error('Failed to get tweet result from response');
        }

        // Create memory for our response
        const responseId = createUniqueUuid(this.runtime, tweetResult.rest_id);
        const responseMemory: Memory = {
          id: responseId,
          entityId: this.runtime.agentId,
          agentId: this.runtime.agentId,
          roomId: message.roomId,
          content: {
            ...response,
            source: 'twitter',
            inReplyTo: message.id,
          },
          createdAt: Date.now(),
        };

        // Save the response to memory
        await this.runtime.createMemory(responseMemory, 'messages');

        return [responseMemory];
      } catch (error) {
        logger.error('Error replying to tweet:', error);
        return [];
      }
    };

    // Emit standardized event for handling the message
    this.runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
      runtime: this.runtime,
      message,
      callback,
      source: 'twitter',
    } as MessagePayload);

    return { text: '', actions: ['RESPOND'] };
  }

  /**
   * Build a conversation thread based on a given tweet.
   *
   * @param {Tweet} tweet - The tweet to start the thread from.
   * @param {number} [maxReplies=10] - The maximum number of replies to include in the thread.
   * @returns {Promise<Tweet[]>} The conversation thread as an array of tweets.
   */
  async buildConversationThread(tweet: ClientTweet, maxReplies = 10): Promise<ClientTweet[]> {
    const thread: ClientTweet[] = [];
    const visited: Set<string> = new Set();

    async function processThread(currentTweet: ClientTweet, depth = 0) {
      logger.log('Processing tweet:', {
        id: currentTweet.id,
        inReplyToStatusId: currentTweet.inReplyToStatusId,
        depth: depth,
      });

      if (!currentTweet) {
        logger.log('No current tweet found for thread building');
        return;
      }

      if (depth >= maxReplies) {
        logger.log('Reached maximum reply depth', depth);
        return;
      }

      // Handle memory storage
      const memory = await this.runtime.getMemoryById(
        createUniqueUuid(this.runtime, currentTweet.id)
      );
      if (!memory) {
        const roomId = createUniqueUuid(this.runtime, tweet.conversationId);
        const entityId = createUniqueUuid(this.runtime, currentTweet.userId);

        await this.runtime.ensureConnection({
          entityId,
          roomId,
          userName: currentTweet.username,
          name: currentTweet.name,
          source: 'twitter',
          type: ChannelType.GROUP,
          worldId: createUniqueUuid(this.runtime, currentTweet.userId),
          worldName: `${currentTweet.name}'s Twitter`,
        });

        this.runtime.createMemory(
          {
            id: createUniqueUuid(this.runtime, currentTweet.id),
            agentId: this.runtime.agentId,
            content: {
              text: currentTweet.text,
              source: 'twitter',
              url: currentTweet.permanentUrl,
              imageUrls: currentTweet.photos?.map((photo) => photo.url) || [],
              inReplyTo: currentTweet.inReplyToStatusId
                ? createUniqueUuid(this.runtime, currentTweet.inReplyToStatusId)
                : undefined,
            },
            createdAt: currentTweet.timestamp * 1000,
            roomId,
            entityId:
              currentTweet.userId === this.twitterUserId
                ? this.runtime.agentId
                : createUniqueUuid(this.runtime, currentTweet.userId),
          },
          'messages'
        );
      }

      if (visited.has(currentTweet.id)) {
        logger.log('Already visited tweet:', currentTweet.id);
        return;
      }

      visited.add(currentTweet.id);
      thread.unshift(currentTweet);

      if (currentTweet.inReplyToStatusId) {
        logger.log('Fetching parent tweet:', currentTweet.inReplyToStatusId);
        try {
          const parentTweet = await this.twitterClient.getTweet(currentTweet.inReplyToStatusId);

          if (parentTweet) {
            logger.log('Found parent tweet:', {
              id: parentTweet.id,
              text: parentTweet.text?.slice(0, 50),
            });
            await processThread(parentTweet, depth + 1);
          } else {
            logger.log('No parent tweet found for:', currentTweet.inReplyToStatusId);
          }
        } catch (error) {
          logger.log('Error fetching parent tweet:', {
            tweetId: currentTweet.inReplyToStatusId,
            error,
          });
        }
      } else {
        logger.log('Reached end of reply chain at:', currentTweet.id);
      }
    }

    // Need to bind this prompt for the inner function
    await processThread.bind(this)(tweet, 0);

    return thread;
  }

  private createMemoryObject(
    type: string,
    id: string,
    userId: string,
    roomId: string
  ): TwitterInteractionMemory {
    return {
      id: createUniqueUuid(this.runtime, id),
      agentId: this.runtime.agentId,
      entityId: createUniqueUuid(this.runtime, userId),
      roomId: createUniqueUuid(this.runtime, roomId),
      content: {
        type,
        source: 'twitter',
      },
      createdAt: Date.now(),
    };
  }
}

```

`/plugin-twitter/src/types.ts`:

```ts
import type {
  EntityPayload,
  EventPayload,
  HandlerCallback,
  Memory,
  MessagePayload,
  UUID,
  WorldPayload,
} from '@elizaos/core';
import type { TwitterService } from '.';
import type { ClientBase } from './base';
import type { Tweet as ClientTweet, Mention } from './client/tweets';
import type { TwitterInteractionClient } from './interactions';
import type { TwitterPostClient } from './post';
import type { TwitterSpaceClient } from './spaces';

/**
 * Defines a type for media data, which includes a Buffer representing the actual data
 * and a mediaType string indicating the type of media.
 *
 * @typedef {Object} MediaData
 * @property {Buffer} data - The Buffer representing the actual media data.
 * @property {string} mediaType - The type of media (e.g. image, video).
 */
export type MediaData = {
  data: Buffer;
  mediaType: string;
};

/**
 * Interface representing the response from an action.
 * @typedef {Object} ActionResponse
 * @property {boolean} like - Indicates if the action is a like.
 * @property {boolean} retweet - Indicates if the action is a retweet.
 * @property {boolean=} quote - Indicates if the action is a quote. (optional)
 * @property {boolean=} reply - Indicates if the action is a reply. (optional)
 */
export interface ActionResponse {
  like: boolean;
  retweet: boolean;
  quote?: boolean;
  reply?: boolean;
}

/**
 * Interface for a Twitter client.
 *
 * @property {ClientBase} client - The base client for making requests.
 * @property {TwitterPostClient} post - The client for posting on Twitter.
 * @property {TwitterInteractionClient} interaction - The client for interacting with tweets.
 * @property {TwitterSpaceClient} [space] - The client for managing Twitter spaces (optional).
 * @property {TwitterService} service - The service provider for Twitter API.
 */
export interface ITwitterClient {
  client: ClientBase;
  post: TwitterPostClient;
  interaction: TwitterInteractionClient;
  space?: TwitterSpaceClient;
  service: TwitterService;
}

export const ServiceType = {
  TWITTER: 'twitter',
} as const;

/**
 * Twitter-specific tweet type
 */
export type Tweet = {
  id: string;
  text: string;
  userId: string;
  username: string;
  name: string;
  conversationId: string;
  inReplyToStatusId?: string;
  timestamp: number;
  photos: { url: string }[];
  mentions: string[];
  hashtags: string[];
  urls: string[];
  videos: any[];
  thread: any[];
  permanentUrl: string;
};

/**
 * Convert client tweet to core tweet
 */
export function convertClientTweetToCoreTweet(tweet: ClientTweet): Tweet {
  const mentions = Array.isArray(tweet.mentions)
    ? tweet.mentions
        .filter(
          (mention): mention is Mention =>
            typeof mention === 'object' && mention !== null && typeof mention.username === 'string'
        )
        .map((mention) => mention.username)
    : [];

  const hashtags = Array.isArray(tweet.hashtags)
    ? tweet.hashtags
        .filter((tag) => tag !== null && typeof tag === 'object')
        .map((tag) => {
          const tagObj = tag as { text?: string };
          return typeof tagObj.text === 'string' ? tagObj.text : '';
        })
        .filter((text) => text !== '')
    : [];

  const urls = Array.isArray(tweet.urls)
    ? tweet.urls
        .filter((url) => url !== null && typeof url === 'object')
        .map((url) => {
          const urlObj = url as { expanded_url?: string };
          return typeof urlObj.expanded_url === 'string' ? urlObj.expanded_url : '';
        })
        .filter((url) => url !== '')
    : [];

  return {
    id: tweet.id || '',
    text: tweet.text || '',
    userId: tweet.userId || '',
    username: tweet.username || '',
    name: tweet.name || '',
    conversationId: tweet.conversationId || '',
    inReplyToStatusId: tweet.inReplyToStatusId,
    timestamp: tweet.timestamp || 0,
    photos: tweet.photos || [],
    mentions,
    hashtags,
    urls,
    videos: tweet.videos || [],
    thread: tweet.thread || [],
    permanentUrl: tweet.permanentUrl || '',
  };
}

export interface QueryTweetsResponse {
  tweets: Tweet[];
  cursor?: string;
}

/**
 * Twitter-specific event types
 */
export enum TwitterEventTypes {
  // Message (interaction) events
  MESSAGE_RECEIVED = 'TWITTER_MESSAGE_RECEIVED',
  MESSAGE_SENT = 'TWITTER_MESSAGE_SENT',

  // Post events
  POST_GENERATED = 'TWITTER_POST_GENERATED',
  POST_SENT = 'TWITTER_POST_SENT',

  // Reaction events
  REACTION_RECEIVED = 'TWITTER_REACTION_RECEIVED',
  LIKE_RECEIVED = 'TWITTER_LIKE_RECEIVED',
  RETWEET_RECEIVED = 'TWITTER_RETWEET_RECEIVED',
  QUOTE_RECEIVED = 'TWITTER_QUOTE_RECEIVED',

  // Server events
  WORLD_JOINED = 'TWITTER_WORLD_JOINED',

  // User events
  ENTITY_JOINED = 'TWITTER_USER_JOINED',
  ENTITY_LEFT = 'TWITTER_USER_LEFT',
  USER_FOLLOWED = 'TWITTER_USER_FOLLOWED',
  USER_UNFOLLOWED = 'TWITTER_USER_UNFOLLOWED',

  // Thread events
  THREAD_CREATED = 'TWITTER_THREAD_CREATED',
  THREAD_UPDATED = 'TWITTER_THREAD_UPDATED',

  // Mention events
  MENTION_RECEIVED = 'TWITTER_MENTION_RECEIVED',
}

/**
 * Twitter-specific memory interface
 */
export interface TwitterMemory extends Memory {
  content: {
    source: 'twitter';
    text?: string;
    type?: string;
    targetId?: string;
    [key: string]: any;
  };
  roomId: UUID;
}

/**
 * Twitter-specific message received payload
 */
export interface TwitterMessageReceivedPayload extends Omit<MessagePayload, 'message'> {
  message: TwitterMemory;
  tweet: Tweet;
  user: any;
}

/**
 * Twitter-specific message sent payload (for replies)
 */
export interface TwitterMessageSentPayload extends MessagePayload {
  /** The tweet ID that was replied to */
  inReplyToTweetId: string;
  /** The tweet result from Twitter API */
  tweetResult: any;
}

/**
 * Twitter-specific post generated payload
 */
export interface TwitterPostGeneratedPayload extends MessagePayload {
  /** The tweet result from Twitter API */
  tweetResult: any;
}

/**
 * Twitter-specific post sent payload
 */
export interface TwitterPostSentPayload extends MessagePayload {
  /** The tweet result from Twitter API */
  tweetResult: any;
}

/**
 * Twitter-specific reaction received payload
 */
export interface TwitterReactionReceivedPayload extends MessagePayload {
  /** The tweet that was reacted to */
  tweet: Tweet;
  /** The reaction type (like, retweet) */
  reactionType: 'like' | 'retweet';
  /** The user who reacted */
  user: any;
}

/**
 * Twitter-specific quote tweet received payload
 */
export interface TwitterQuoteReceivedPayload extends Omit<MessagePayload, 'message' | 'reaction'> {
  /** The original tweet that was quoted */
  quotedTweet: Tweet;
  /** The quote tweet */
  quoteTweet: Tweet;
  /** The user who quoted */
  user: any;
  /** The message being reacted to */
  message: TwitterMemory;
  /** Callback for handling the reaction */
  callback: HandlerCallback;
  /** The reaction details */
  reaction: {
    type: 'quote';
    entityId: UUID;
  };
}

/**
 * Twitter-specific mention received payload
 */
export interface TwitterMentionReceivedPayload extends Omit<MessagePayload, 'message'> {
  /** The tweet containing the mention */
  tweet: Tweet;
  /** The user who mentioned */
  user: any;
  /** The message being reacted to */
  message: TwitterMemory;
  /** Callback for handling the mention */
  callback: HandlerCallback;
  /** Source platform */
  source: 'twitter';
}

/**
 * Twitter-specific server joined payload
 */
export interface TwitterServerPayload extends WorldPayload {
  /** The Twitter profile */
  profile: {
    id: string;
    username: string;
    screenName: string;
  };
}

/**
 * Twitter-specific user joined payload
 */
export interface TwitterUserJoinedPayload extends EntityPayload {
  /** The Twitter user who joined */
  twitterUser: {
    id: string;
    username: string;
    name: string;
  };
}

/**
 * Twitter-specific user followed payload
 */
export interface TwitterUserFollowedPayload extends EntityPayload {
  /** The user who followed */
  follower: any;
}

/**
 * Twitter-specific user unfollowed payload
 */
export interface TwitterUserUnfollowedPayload extends EntityPayload {
  /** The user who unfollowed */
  unfollower: any;
}

/**
 * Twitter-specific thread created payload
 */
export interface TwitterThreadCreatedPayload extends EventPayload {
  /** The tweets in the thread */
  tweets: Tweet[];
  /** The user who created the thread */
  user: any;
}

/**
 * Twitter-specific thread updated payload
 */
export interface TwitterThreadUpdatedPayload extends EventPayload {
  /** The tweets in the thread */
  tweets: Tweet[];
  /** The user who updated the thread */
  user: any;
  /** The new tweet that was added */
  newTweet: Tweet;
}

/**
 * Maps Twitter event types to their payload interfaces
 */
export interface TwitterEventPayloadMap {
  [TwitterEventTypes.MESSAGE_RECEIVED]: TwitterMessageReceivedPayload;
  [TwitterEventTypes.MESSAGE_SENT]: TwitterMessageSentPayload;
  [TwitterEventTypes.POST_GENERATED]: TwitterPostGeneratedPayload;
  [TwitterEventTypes.POST_SENT]: TwitterPostSentPayload;
  [TwitterEventTypes.REACTION_RECEIVED]: TwitterReactionReceivedPayload;
  [TwitterEventTypes.LIKE_RECEIVED]: TwitterLikeReceivedPayload;
  [TwitterEventTypes.RETWEET_RECEIVED]: TwitterRetweetReceivedPayload;
  [TwitterEventTypes.QUOTE_RECEIVED]: TwitterQuoteReceivedPayload;
  [TwitterEventTypes.WORLD_JOINED]: TwitterServerPayload;
  [TwitterEventTypes.ENTITY_JOINED]: TwitterUserJoinedPayload;
  [TwitterEventTypes.ENTITY_LEFT]: EntityPayload;
  [TwitterEventTypes.USER_FOLLOWED]: TwitterUserFollowedPayload;
  [TwitterEventTypes.USER_UNFOLLOWED]: TwitterUserUnfollowedPayload;
  [TwitterEventTypes.THREAD_CREATED]: TwitterThreadCreatedPayload;
  [TwitterEventTypes.THREAD_UPDATED]: TwitterThreadUpdatedPayload;
  [TwitterEventTypes.MENTION_RECEIVED]: TwitterMentionReceivedPayload;
}

/**
 * Twitter-specific interaction memory
 */
export interface TwitterInteractionMemory extends TwitterMemory {
  content: {
    type: string;
    source: 'twitter';
    targetId?: string;
  };
}

/**
 * Twitter-specific interaction payload
 */
export interface TwitterInteractionPayload {
  id: string;
  type: 'like' | 'retweet' | 'quote';
  userId: string;
  username: string;
  name: string;
  targetTweetId: string;
  targetTweet: Tweet;
  quoteTweet?: Tweet;
  retweetId?: string;
}

/**
 * Twitter-specific like received payload
 */
export interface TwitterLikeReceivedPayload extends EventPayload {
  tweet: Tweet;
  user: {
    id: string;
    username: string;
    name: string;
  };
  source: 'twitter';
}

/**
 * Twitter-specific retweet received payload
 */
export interface TwitterRetweetReceivedPayload extends EventPayload {
  tweet: Tweet;
  retweetId: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
  source: 'twitter';
}

```

`/plugin-twitter/src/constants.ts`:

```ts
export const TWITTER_SERVICE_NAME = 'twitter';
export const TWEET_CHAR_LIMIT = 280;

```

`/plugin-twitter/src/index.ts`:

```ts
import {
  ChannelType,
  type Entity,
  EventType,
  type IAgentRuntime,
  type Plugin,
  Role,
  type Room,
  Service,
  type UUID,
  type World,
  createUniqueUuid,
  logger,
} from '@elizaos/core';
import spaceJoin from './actions/spaceJoin';
import { ClientBase } from './base';
import { TWITTER_SERVICE_NAME } from './constants';
import type { TwitterConfig } from './environment';
import { TwitterInteractionClient } from './interactions';
import { TwitterPostClient } from './post';
import { TwitterSpaceClient } from './spaces';
import { TwitterTimelineClient } from './timeline';
import { ClientBaseTestSuite } from './tests';
import { type ITwitterClient, TwitterEventTypes } from './types';

/**
 * A manager that orchestrates all specialized Twitter logic:
 * - client: base operations (login, timeline caching, etc.)
 * - post: autonomous posting logic
 * - search: searching tweets / replying logic
 * - interaction: handling mentions, replies
 * - space: launching and managing Twitter Spaces (optional)
 */
/**
 * TwitterClientInstance class that implements ITwitterClient interface.
 *
 * @class
 * @implements {ITwitterClient}
 */

export class TwitterClientInstance implements ITwitterClient {
  client: ClientBase;
  post: TwitterPostClient;
  interaction: TwitterInteractionClient;
  timeline?: TwitterTimelineClient;
  space?: TwitterSpaceClient;
  service: TwitterService;

  constructor(runtime: IAgentRuntime, state: any) {
    // Pass twitterConfig to the base client
    this.client = new ClientBase(runtime, state);

    // Posting logic
    if (runtime.getSetting('TWITTER_ENABLE_POST_GENERATION') === true) {
      this.post = new TwitterPostClient(this.client, runtime, state);
    }

    // Mentions and interactions
    if (runtime.getSetting('TWITTER_INTERACTION_ENABLE') === true) {
      this.interaction = new TwitterInteractionClient(this.client, runtime, state);
    }

    // handle timeline
    if (runtime.getSetting('TWITTER_TIMELINE_ENABLE') === true) {
      this.timeline = new TwitterTimelineClient(this.client, runtime, state);
    }

    // Optional Spaces logic (enabled if TWITTER_SPACES_ENABLE is true)
    if (runtime.getSetting('TWITTER_SPACES_ENABLE') === true) {
      this.space = new TwitterSpaceClient(this.client, runtime);
    }

    this.service = TwitterService.getInstance();
  }
}

export class TwitterService extends Service {
  static serviceType: string = TWITTER_SERVICE_NAME;
  capabilityDescription = 'The agent is able to send and receive messages on twitter';
  private static instance: TwitterService;
  private clients: Map<string, TwitterClientInstance> = new Map();

  static getInstance(): TwitterService {
    if (!TwitterService.instance) {
      TwitterService.instance = new TwitterService();
    }
    return TwitterService.instance;
  }

  async createClient(
    runtime: IAgentRuntime,
    clientId: string,
    state: any
  ): Promise<TwitterClientInstance> {
    if (runtime.getSetting('TWITTER_2FA_SECRET') === null) {
      runtime.setSetting('TWITTER_2FA_SECRET', undefined, false);
    }
    try {
      // Check if client already exists
      const existingClient = this.getClient(clientId, runtime.agentId);
      if (existingClient) {
        logger.info(`Twitter client already exists for ${clientId}`);
        return existingClient;
      }

      // Create new client instance
      const client = new TwitterClientInstance(runtime, state);

      // Initialize the client
      await client.client.init();

      if (client.space) {
        client.space.startPeriodicSpaceCheck();
      }

      if (client.post) {
        client.post.start();
      }

      if (client.interaction) {
        client.interaction.start();
      }

      if (client.timeline) {
        client.timeline.start();
      }

      // Store the client instance
      this.clients.set(this.getClientKey(clientId, runtime.agentId), client);

      // Emit standardized WORLD_JOINED event once we have client profile
      await this.emitServerJoinedEvent(runtime, client);

      logger.info(`Created Twitter client for ${clientId}`);
      return client;
    } catch (error) {
      logger.error(`Failed to create Twitter client for ${clientId}:`, error);
      throw error;
    }
  }

  /**
   * Emits a standardized WORLD_JOINED event for Twitter
   * @param runtime The agent runtime
   * @param client The Twitter client instance
   */
  private async emitServerJoinedEvent(
    runtime: IAgentRuntime,
    client: TwitterClientInstance
  ): Promise<void> {
    try {
      if (!client.client.profile) {
        logger.warn("Twitter profile not available yet, can't emit WORLD_JOINED event");
        return;
      }

      const profile = client.client.profile;
      const twitterId = profile.id;
      const username = profile.username;

      // Create the world ID based on the twitter user ID
      const worldId = createUniqueUuid(runtime, twitterId) as UUID;

      // For Twitter, we create a single world representing the user's Twitter account
      const world: World = {
        id: worldId,
        name: `${username}'s Twitter`,
        agentId: runtime.agentId,
        serverId: twitterId,
        metadata: {
          ownership: { ownerId: twitterId },
          roles: {
            [twitterId]: Role.OWNER,
          },
          twitter: {
            username: username,
            id: twitterId,
          },
        },
      };

      // We'll create a "home timeline" room
      const homeTimelineRoomId = createUniqueUuid(runtime, `${twitterId}-home`) as UUID;
      const homeTimelineRoom: Room = {
        id: homeTimelineRoomId,
        name: `${username}'s Timeline`,
        source: 'twitter',
        type: ChannelType.FEED,
        channelId: `${twitterId}-home`,
        serverId: twitterId,
        worldId: worldId,
      };

      // Create a "mentions" room
      const mentionsRoomId = createUniqueUuid(runtime, `${twitterId}-mentions`) as UUID;
      const mentionsRoom: Room = {
        id: mentionsRoomId,
        name: `${username}'s Mentions`,
        source: 'twitter',
        type: ChannelType.GROUP,
        channelId: `${twitterId}-mentions`,
        serverId: twitterId,
        worldId: worldId,
      };

      // Create an entity for the Twitter user
      const twitterUserId = createUniqueUuid(runtime, twitterId) as UUID;
      const twitterUser: Entity = {
        id: twitterUserId,
        names: [profile.screenName || username],
        agentId: runtime.agentId,
        metadata: {
          twitter: {
            id: twitterId,
            username: username,
            screenName: profile.screenName || username,
            name: profile.screenName || username,
          },
        },
      };

      // Emit the WORLD_JOINED event
      runtime.emitEvent([TwitterEventTypes.WORLD_JOINED, EventType.WORLD_JOINED], {
        runtime: runtime,
        world: world,
        rooms: [homeTimelineRoom, mentionsRoom],
        users: [twitterUser],
        source: 'twitter',
      });

      logger.info(`Emitted WORLD_JOINED event for Twitter account ${username}`);
    } catch (error) {
      logger.error('Failed to emit WORLD_JOINED event for Twitter:', error);
    }
  }

  getClient(clientId: string, agentId: UUID): TwitterClientInstance | undefined {
    return this.clients.get(this.getClientKey(clientId, agentId));
  }

  async stopClient(clientId: string, agentId: UUID): Promise<void> {
    const key = this.getClientKey(clientId, agentId);
    const client = this.clients.get(key);
    if (client) {
      try {
        await client.service.stop();
        this.clients.delete(key);
        logger.info(`Stopped Twitter client for ${clientId}`);
      } catch (error) {
        logger.error(`Error stopping Twitter client for ${clientId}:`, error);
      }
    }
  }

  static async start(runtime: IAgentRuntime) {
    const twitterClientManager = TwitterService.getInstance();

    // Check for character-level Twitter credentials
    const twitterConfig: Partial<TwitterConfig> = {
      TWITTER_USERNAME:
        (runtime.getSetting('TWITTER_USERNAME') as string) ||
        runtime.character.settings?.TWITTER_USERNAME ||
        runtime.character.secrets?.TWITTER_USERNAME,
      TWITTER_PASSWORD:
        (runtime.getSetting('TWITTER_PASSWORD') as string) ||
        runtime.character.settings?.TWITTER_PASSWORD ||
        runtime.character.secrets?.TWITTER_PASSWORD,
      TWITTER_EMAIL:
        (runtime.getSetting('TWITTER_EMAIL') as string) ||
        runtime.character.settings?.TWITTER_EMAIL ||
        runtime.character.secrets?.TWITTER_EMAIL,
      TWITTER_2FA_SECRET:
        (runtime.getSetting('TWITTER_2FA_SECRET') as string) ||
        runtime.character.settings?.TWITTER_2FA_SECRET ||
        runtime.character.secrets?.TWITTER_2FA_SECRET,
    };

    // Filter out undefined values
    const config = Object.fromEntries(
      Object.entries(twitterConfig).filter(([_, v]) => v !== undefined)
    ) as TwitterConfig;

    // If we have enough settings to create a client, do so
    try {
      if (
        config.TWITTER_USERNAME &&
        // Basic auth
        config.TWITTER_PASSWORD &&
        config.TWITTER_EMAIL
        // ||
        // // API auth
        // (config.TWITTER_API_KEY && config.TWITTER_API_SECRET &&
        //  config.TWITTER_ACCESS_TOKEN && config.TWITTER_ACCESS_TOKEN_SECRET)
      ) {
        logger.info('Creating default Twitter client from character settings');
        await twitterClientManager.createClient(runtime, runtime.agentId, config);
      }
    } catch (error) {
      logger.error('Failed to create default Twitter client:', error);
      throw error;
    }

    return twitterClientManager;
  }

  async stop(): Promise<void> {
    await this.stopAllClients();
  }

  async stopAllClients(): Promise<void> {
    for (const [key, client] of this.clients.entries()) {
      try {
        await client.service.stop();
        this.clients.delete(key);
      } catch (error) {
        logger.error(`Error stopping Twitter client ${key}:`, error);
      }
    }
  }

  private getClientKey(clientId: string, agentId: UUID): string {
    return `${clientId}-${agentId}`;
  }
}

const twitterPlugin: Plugin = {
  name: TWITTER_SERVICE_NAME,
  description: 'Twitter client with per-server instance management',
  services: [TwitterService],
  actions: [spaceJoin],
  tests: [new ClientBaseTestSuite()],
};

export default twitterPlugin;

```

`/plugin-twitter/src/timeline.ts`:

```ts
import type { ClientBase } from './base';
import {
  ChannelType,
  composePromptFromState,
  createUniqueUuid,
  ModelType,
  type IAgentRuntime,
  UUID,
  State,
  type ActionResponse,
  Memory,
  parseKeyValueXml,
} from '@elizaos/core';
import type { Client, Tweet } from './client/index';
import { logger } from '@elizaos/core';

import { twitterActionTemplate, quoteTweetTemplate, replyTweetTemplate } from './templates';
import { sendTweet, parseActionResponseFromText } from './utils';

enum TIMELINE_TYPE {
  ForYou = 'foryou',
  Following = 'following',
}

export class TwitterTimelineClient {
  client: ClientBase;
  twitterClient: Client;
  runtime: IAgentRuntime;
  isDryRun: boolean;
  timelineType: TIMELINE_TYPE;
  private state: any;

  constructor(client: ClientBase, runtime: IAgentRuntime, state: any) {
    this.client = client;
    this.twitterClient = client.twitterClient;
    this.runtime = runtime;
    this.state = state;

    this.timelineType =
      this.state?.TWITTER_TIMELINE_MODE || this.runtime.getSetting('TWITTER_TIMELINE_MODE');
  }

  async start() {
    const handleTwitterTimelineLoop = () => {
      // Defaults to 2 minutes
      const interactionInterval =
        (this.state?.TWITTER_TIMELINE_POLL_INTERVAL ||
          (this.runtime.getSetting('TWITTER_TIMELINE_POLL_INTERVAL') as unknown as number) ||
          120) * 1000;

      this.handleTimeline();
      setTimeout(handleTwitterTimelineLoop, interactionInterval);
    };
    handleTwitterTimelineLoop();
  }

  async getTimeline(count: number): Promise<Tweet[]> {
    const twitterUsername = this.client.profile?.username;
    const homeTimeline =
      this.timelineType === TIMELINE_TYPE.Following
        ? await this.twitterClient.fetchFollowingTimeline(count, [])
        : await this.twitterClient.fetchHomeTimeline(count, []);

    return homeTimeline
      .map((tweet) => ({
        id: tweet.rest_id,
        name: tweet.core?.user_results?.result?.legacy?.name,
        username: tweet.core?.user_results?.result?.legacy?.screen_name,
        text: tweet.legacy?.full_text,
        inReplyToStatusId: tweet.legacy?.in_reply_to_status_id_str,
        timestamp: new Date(tweet.legacy?.created_at).getTime() / 1000,
        userId: tweet.legacy?.user_id_str,
        conversationId: tweet.legacy?.conversation_id_str,
        permanentUrl: `https://twitter.com/${tweet.core?.user_results?.result?.legacy?.screen_name}/status/${tweet.rest_id}`,
        hashtags: tweet.legacy?.entities?.hashtags || [],
        mentions: tweet.legacy?.entities?.user_mentions || [],
        photos:
          tweet.legacy?.entities?.media
            ?.filter((media) => media.type === 'photo')
            .map((media) => ({
              id: media.id_str,
              url: media.media_url_https, // Store media_url_https as url
              alt_text: media.alt_text,
            })) || [],
        thread: tweet.thread || [],
        urls: tweet.legacy?.entities?.urls || [],
        videos: tweet.legacy?.entities?.media?.filter((media) => media.type === 'video') || [],
      }))
      .filter((tweet) => tweet.username !== twitterUsername); // do not perform action on self-tweets
  }

  createTweetId(runtime: IAgentRuntime, tweet: Tweet) {
    return createUniqueUuid(runtime, tweet.id);
  }

  formMessage(runtime: IAgentRuntime, tweet: Tweet) {
    return {
      id: this.createTweetId(runtime, tweet),
      agentId: runtime.agentId,
      content: {
        text: tweet.text,
        url: tweet.permanentUrl,
        imageUrls: tweet.photos?.map((photo) => photo.url) || [],
        inReplyTo: tweet.inReplyToStatusId
          ? createUniqueUuid(runtime, tweet.inReplyToStatusId)
          : undefined,
        source: 'twitter',
        channelType: ChannelType.GROUP,
        tweet,
      },
      entityId: createUniqueUuid(runtime, tweet.userId),
      roomId: createUniqueUuid(runtime, tweet.conversationId),
      createdAt: tweet.timestamp * 1000,
    };
  }

  async handleTimeline() {
    console.log('Start Hanldeling Twitter Timeline');

    const tweets = await this.getTimeline(20);
    const maxActionsPerCycle = 20;
    const tweetDecisions = [];
    for (const tweet of tweets) {
      try {
        const tweetId = this.createTweetId(this.runtime, tweet);
        // Skip if we've already processed this tweet
        const memory = await this.runtime.getMemoryById(tweetId);
        if (memory) {
          console.log(`Already processed tweet ID: ${tweet.id}`);
          continue;
        }

        const roomId = createUniqueUuid(this.runtime, tweet.conversationId);

        const message = this.formMessage(this.runtime, tweet);

        let state = await this.runtime.composeState(message);

        const actionRespondPrompt =
          composePromptFromState({
            state,
            template:
              this.runtime.character.templates?.twitterActionTemplate || twitterActionTemplate,
          }) +
          `
Tweet:
${tweet.text}

# Respond with qualifying action tags only.

Choose any combination of [LIKE], [RETWEET], [QUOTE], and [REPLY] that are appropriate. Each action must be on its own line. Your response must only include the chosen actions.`;

        const actionResponse = await this.runtime.useModel(ModelType.TEXT_SMALL, {
          prompt: actionRespondPrompt,
        });

        if (!actionResponse) {
          logger.log(`No valid actions generated for tweet ${tweet.id}`);
          continue;
        }

        const { actions } = parseActionResponseFromText(actionResponse.trim());

        tweetDecisions.push({
          tweet: tweet,
          actionResponse: actions,
          tweetState: state,
          roomId: roomId,
        });
      } catch (error) {
        logger.error(`Error processing tweet ${tweet.id}:`, error);
        continue;
      }
    }
    const rankByActionRelevance = (arr) => {
      return arr.sort((a, b) => {
        // Count the number of true values in the actionResponse object
        const countTrue = (obj: typeof a.actionResponse) =>
          Object.values(obj).filter(Boolean).length;

        const countA = countTrue(a.actionResponse);
        const countB = countTrue(b.actionResponse);

        // Primary sort by number of true values
        if (countA !== countB) {
          return countB - countA;
        }

        // Secondary sort by the "like" property
        if (a.actionResponse.like !== b.actionResponse.like) {
          return a.actionResponse.like ? -1 : 1;
        }

        // Tertiary sort keeps the remaining objects with equal weight
        return 0;
      });
    };
    // Sort the timeline based on the action decision score,
    const prioritizedTweets = rankByActionRelevance(tweetDecisions);

    this.processTimelineActions(prioritizedTweets);
  }

  private async processTimelineActions(
    tweetDecisions: {
      tweet: Tweet;
      actionResponse: ActionResponse;
      tweetState: State;
      roomId: UUID;
    }[]
  ): Promise<
    {
      tweetId: string;
      actionResponse: ActionResponse;
      executedActions: string[];
    }[]
  > {
    const results = [];
    for (const decision of tweetDecisions) {
      const { actionResponse, tweetState, roomId, tweet } = decision;
      const entityId = createUniqueUuid(this.runtime, tweet.userId);
      const worldId = createUniqueUuid(this.runtime, tweet.userId);

      await this.ensureTweetWorldContext(tweet, roomId, worldId, entityId);

      try {
        const message = this.formMessage(this.runtime, tweet);

        await Promise.all([
          this.runtime.addEmbeddingToMemory(message),
          this.runtime.createMemory(message, 'messages'),
        ]);

        // Execute actions
        if (actionResponse.like) {
          this.handleLikeAction(tweet);
        }

        if (actionResponse.retweet) {
          this.handleRetweetAction(tweet);
        }

        if (actionResponse.quote) {
          this.handleQuoteAction(tweet);
        }

        if (actionResponse.reply) {
          this.handleReplyAction(tweet);
        }
      } catch (error) {
        logger.error(`Error processing tweet ${tweet.id}:`, error);
        continue;
      }
    }

    return results;
  }

  private async ensureTweetWorldContext(tweet: Tweet, roomId: UUID, worldId: UUID, entityId: UUID) {
    await this.runtime.ensureConnection({
      entityId,
      roomId,
      userName: tweet.username,
      name: tweet.name,
      worldName: `${tweet.name}'s Twitter`,
      source: 'twitter',
      type: ChannelType.GROUP,
      channelId: tweet.conversationId,
      serverId: tweet.userId,
      worldId,
      metadata: {
        ownership: { ownerId: tweet.userId },
        twitter: {
          username: tweet.username,
          id: tweet.userId,
          name: tweet.name,
        },
      },
    });
  }

  async handleLikeAction(tweet: Tweet) {
    try {
      await this.twitterClient.likeTweet(tweet.id);
      logger.log(`Liked tweet ${tweet.id}`);
    } catch (error) {
      logger.error(`Error liking tweet ${tweet.id}:`, error);
    }
  }

  async handleRetweetAction(tweet: Tweet) {
    try {
      await this.twitterClient.retweet(tweet.id);
      logger.log(`Retweeted tweet ${tweet.id}`);
    } catch (error) {
      logger.error(`Error retweeting tweet ${tweet.id}:`, error);
    }
  }

  async handleQuoteAction(tweet: Tweet) {
    try {
      const message = this.formMessage(this.runtime, tweet);

      let state = await this.runtime.composeState(message);

      const quotePrompt =
        composePromptFromState({
          state,
          template: this.runtime.character.templates?.quoteTweetTemplate || quoteTweetTemplate,
        }) +
        `
You are responding to this tweet:
${tweet.text}`;

      const quoteResponse = await this.runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: quotePrompt,
      });
      const responseObject = parseKeyValueXml(quoteResponse);

      if (responseObject.post) {
        const result = await this.client.requestQueue.add(
          async () => await this.twitterClient.sendQuoteTweet(responseObject.post, tweet.id)
        );

        const body = await result.json();

        if (body?.data?.create_tweet?.tweet_results?.result) {
          logger.log('Successfully posted quote tweet');
        } else {
          logger.error('Quote tweet creation failed:', body);
        }

        // Create memory for our response
        const responseId = createUniqueUuid(this.runtime, body.rest_id);
        const responseMemory: Memory = {
          id: responseId,
          entityId: this.runtime.agentId,
          agentId: this.runtime.agentId,
          roomId: message.roomId,
          content: {
            ...responseObject,
            inReplyTo: message.id,
          },
          createdAt: Date.now(),
        };

        // Save the response to memory
        await this.runtime.createMemory(responseMemory, 'messages');
      }
    } catch (error) {
      logger.error('Error in quote tweet generation:', error);
    }
  }

  async handleReplyAction(tweet: Tweet) {
    try {
      const message = this.formMessage(this.runtime, tweet);

      let state = await this.runtime.composeState(message);

      const replyPrompt =
        composePromptFromState({
          state,
          template: this.runtime.character.templates?.replyTweetTemplate || replyTweetTemplate,
        }) +
        `
You are responding to this tweet:
${tweet.text}`;

      const replyResponse = await this.runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: replyPrompt,
      });
      const responseObject = parseKeyValueXml(replyResponse);

      if (responseObject.post) {
        const tweetResult = await sendTweet(this.client, responseObject.post, [], tweet.id);

        if (!tweetResult) {
          throw new Error('Failed to get tweet result from response');
        }

        // Create memory for our response
        const responseId = createUniqueUuid(this.runtime, tweetResult.rest_id);
        const responseMemory: Memory = {
          id: responseId,
          entityId: this.runtime.agentId,
          agentId: this.runtime.agentId,
          roomId: message.roomId,
          content: {
            ...responseObject,
            inReplyTo: message.id,
          },
          createdAt: Date.now(),
        };

        // Save the response to memory
        await this.runtime.createMemory(responseMemory, 'messages');
      }
    } catch (error) {
      logger.error('Error in quote tweet generation:', error);
    }
  }
}

```