# Experience Plugin

The Experience Plugin enables autonomous agents to learn from their experiences, detect patterns, and make better decisions over time. It provides a comprehensive system for recording, analyzing, and retrieving experiences to support continuous learning and improvement.

## Features

### Core Capabilities

- **Automatic Experience Recording**: Captures significant events, successes, failures, and discoveries
- **Pattern Detection**: Identifies behavioral patterns, success/failure rates, and learning velocity
- **Semantic Search**: Find relevant past experiences using natural language queries
- **Contradiction Detection**: Identifies when new experiences contradict previous learnings
- **Experience Analysis**: Provides insights, recommendations, and alternative approaches
- **Memory Management**: Efficiently manages large numbers of experiences with importance-based pruning

### Experience Types

- **SUCCESS**: Agent accomplished something successfully
- **FAILURE**: Agent failed at a task or encountered an error
- **DISCOVERY**: Agent discovered new information or capabilities
- **CORRECTION**: Agent corrected a previous mistake or misunderstanding
- **LEARNING**: Agent learned something new through observation or experimentation
- **HYPOTHESIS**: Agent formed a hypothesis about how something works
- **VALIDATION**: Agent validated or invalidated a hypothesis
- **WARNING**: Agent encountered a warning or limitation

### Outcome Types

- **POSITIVE**: Favorable outcome that achieved the desired result
- **NEGATIVE**: Unfavorable outcome that did not achieve the desired result
- **NEUTRAL**: Outcome that was neither particularly good nor bad
- **MIXED**: Outcome that had both positive and negative aspects

## Architecture

### Components

#### Service

- **ExperienceService**: Core service that manages experience storage, retrieval, and analysis
  - Records experiences with metadata and embeddings
  - Provides querying capabilities with multiple filters
  - Performs semantic similarity search
  - Analyzes patterns and generates insights
  - Manages memory with importance-based pruning

#### Providers

- **experienceRAG**: Retrieves relevant past experiences for context
- **recentExperiences**: Provides recent experiences with statistics and patterns

#### Actions

- **recordExperience**: Manually record significant experiences
- **queryExperiences**: Search and retrieve experiences based on criteria
- **analyzeOutcome**: Analyze the outcome of actions and extract learnings

#### Evaluators

- **experienceEvaluator**: Automatically detects and records significant experiences from agent activities

#### Utilities

- **experienceAnalyzer**: Pattern detection and experience analysis logic
- **experienceFormatter**: Display formatting and statistics utilities

## Usage

### Basic Experience Recording

```typescript
// Record a successful experience
await experienceService.recordExperience({
  type: ExperienceType.SUCCESS,
  outcome: OutcomeType.POSITIVE,
  context: "File system operation",
  action: "create_directory",
  result: "Directory created successfully",
  learning: "mkdir command works reliably for directory creation",
  domain: "shell",
  tags: ["filesystem", "mkdir"],
  confidence: 0.9,
  importance: 0.7,
});

// Record a failure with correction
await experienceService.recordExperience({
  type: ExperienceType.CORRECTION,
  outcome: OutcomeType.POSITIVE,
  context: "Python script execution",
  action: "run_script",
  result: "Script ran after installing dependencies",
  learning:
    "Always check and install required dependencies before running scripts",
  domain: "coding",
  tags: ["python", "dependencies"],
  confidence: 0.8,
  importance: 0.9,
  previousBelief: "Script should run without additional setup",
  correctedBelief: "Scripts often require dependency installation",
});
```

### Querying Experiences

```typescript
// Query by type and domain
const shellFailures = await experienceService.queryExperiences({
  type: ExperienceType.FAILURE,
  domain: "shell",
  minConfidence: 0.7,
});

// Query by outcome and time range
const recentSuccesses = await experienceService.queryExperiences({
  outcome: OutcomeType.POSITIVE,
  timeRange: {
    start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
    end: Date.now(),
  },
  limit: 10,
});

// Query by tags
const codingExperiences = await experienceService.queryExperiences({
  tags: ["python", "debugging"],
  minImportance: 0.6,
});
```

### Semantic Search

```typescript
// Find similar experiences using natural language
const similar = await experienceService.findSimilarExperiences(
  "file permission errors when accessing system directories",
  5,
);

// Results are ranked by semantic similarity
similar.forEach((exp) => {
  console.log(`${exp.learning} (confidence: ${exp.confidence})`);
});
```

### Pattern Analysis

```typescript
// Analyze experiences for a specific domain
const analysis = await experienceService.analyzeExperiences("shell");

console.log(`Frequency: ${analysis.frequency}`);
console.log(`Reliability: ${analysis.reliability}`);
console.log(`Pattern: ${analysis.pattern}`);
console.log(`Recommendations: ${analysis.recommendations?.join(", ")}`);
console.log(`Alternatives: ${analysis.alternatives?.join(", ")}`);
```

### Using Actions

```typescript
// Record experience via action
await recordExperienceAction.handler(runtime, message, {
  experienceType: ExperienceType.DISCOVERY,
  outcome: OutcomeType.POSITIVE,
  confidence: 0.8,
  importance: 0.7,
  domain: "system",
  tags: ["tools", "discovery"],
});

// Query experiences via action
const result = await queryExperiencesAction.handler(runtime, message, {
  type: ExperienceType.SUCCESS,
  domain: "coding",
  minConfidence: 0.8,
  limit: 5,
});

// Analyze outcome via action
await analyzeOutcomeAction.handler(runtime, message, {
  action: "compile_code",
  success: true,
  expectation: "clean compilation",
});
```

### Using Providers

```typescript
// Get relevant experiences for context
const ragResult = await experienceRAGProvider.get(runtime, message);
console.log(ragResult.summary);
console.log(`Found ${ragResult.experiences.length} relevant experiences`);

// Get recent experiences with statistics
const recentResult = await recentExperiencesProvider.get(runtime, message, {
  limit: 15,
  includeStats: true,
  includePatterns: true,
});
console.log(recentResult.summary);
console.log(`Success rate: ${recentResult.stats.successRate * 100}%`);
```

## Configuration

### Service Configuration

```typescript
// Configure maximum experiences to keep in memory
const experienceService = new ExperienceService(runtime);
(experienceService as any).maxExperiences = 5000; // Default: 10000

// The service automatically prunes low-importance experiences when the limit is reached
```

### Experience Importance

Experiences are automatically assigned importance scores based on:

- **Type significance**: Failures and corrections are typically more important
- **Contradiction detection**: Experiences that contradict previous learnings
- **Frequency**: Rare experiences may be more important to remember
- **Confidence level**: Higher confidence experiences are more valuable
- **Manual override**: Explicitly set importance in experience data

### Memory Management

The service implements intelligent memory management:

- **Automatic pruning**: Removes low-importance experiences when memory limit is reached
- **Access tracking**: Tracks how often experiences are accessed
- **Importance preservation**: Keeps high-importance experiences regardless of age
- **Embedding optimization**: Generates embeddings for semantic search

## Integration

### With Knowledge Plugin

The experience plugin integrates with the knowledge plugin for persistent storage:

```typescript
// Experiences are automatically stored in the knowledge base
// and can be retrieved across agent restarts
const knowledgeService = runtime.getService("KNOWLEDGE");
// Experience data is stored with semantic embeddings for retrieval
```

### With Other Plugins

The experience plugin can enhance other plugins by:

- **Shell Plugin**: Learning from command successes and failures
- **Coding Plugin**: Remembering debugging strategies and solutions
- **File Plugin**: Understanding file system patterns and permissions
- **Network Plugin**: Learning API reliability and error patterns

## Testing

### Running Tests

```bash
# Run all experience plugin tests
npm test src/plugin-experience

# Run specific test suites
npm test src/plugin-experience/tests/experienceService.test.ts
npm test src/plugin-experience/tests/actions.test.ts
npm test src/plugin-experience/tests/integration.test.ts
```

### Test Coverage

The test suite covers:

- **Service functionality**: Recording, querying, and analyzing experiences
- **Action behavior**: All three actions with various scenarios
- **Provider integration**: RAG and recent experience providers
- **Evaluator detection**: Automatic experience detection from messages
- **Error handling**: Graceful degradation and error recovery
- **Memory management**: Pruning and optimization
- **Concurrent access**: Thread safety and data consistency

### Mock Setup

Tests use comprehensive mocking:

- **Runtime mocking**: Simulated agent runtime with services
- **Embedding mocking**: Consistent vector embeddings for testing
- **UUID mocking**: Predictable IDs for test assertions
- **Event mocking**: Simulated event emission and handling

## Best Practices

### Recording Experiences

1. **Be specific**: Include detailed context and clear learning statements
2. **Set appropriate confidence**: Reflect uncertainty in confidence scores
3. **Use meaningful tags**: Help with categorization and retrieval
4. **Include domain information**: Enables domain-specific analysis
5. **Record contradictions**: When new experiences contradict old ones

### Querying Experiences

1. **Use multiple filters**: Combine type, domain, confidence, and time filters
2. **Limit results**: Avoid overwhelming responses with too many experiences
3. **Consider recency**: Recent experiences may be more relevant
4. **Check confidence**: Filter out low-confidence experiences when precision matters

### Pattern Analysis

1. **Analyze regularly**: Periodic analysis reveals emerging patterns
2. **Focus on domains**: Domain-specific analysis provides better insights
3. **Act on recommendations**: Use analysis results to improve behavior
4. **Monitor reliability**: Track success rates and adjust strategies

## Troubleshooting

### Common Issues

1. **No experiences found**: Check query filters and ensure experiences exist
2. **Low similarity scores**: Verify embedding generation is working
3. **Memory issues**: Monitor experience count and adjust pruning settings
4. **Performance problems**: Consider reducing embedding dimensions or query limits

### Debugging

```typescript
// Enable debug logging
process.env.DEBUG = "experience:*";

// Check service status
const service = runtime.getService("EXPERIENCE");
console.log("Service available:", !!service);

// Verify experience count
const allExperiences = await service.queryExperiences({ limit: 1000 });
console.log("Total experiences:", allExperiences.length);

// Check embedding generation
const testEmbedding = await runtime.useModel("TEXT_EMBEDDING", {
  prompt: "test embedding generation",
});
console.log("Embedding generated:", !!testEmbedding);
```

## Future Enhancements

### Planned Features

1. **Experience clustering**: Group similar experiences automatically
2. **Temporal analysis**: Understand how learnings change over time
3. **Cross-domain insights**: Find patterns across different domains
4. **Collaborative learning**: Share experiences between agent instances
5. **Experience validation**: Verify experiences through repeated trials
6. **Adaptive importance**: Dynamically adjust importance based on usage
7. **Experience compression**: Summarize redundant experiences
8. **Causal reasoning**: Understand cause-and-effect relationships

### Integration Opportunities

1. **Planning systems**: Use experiences to inform action planning
2. **Risk assessment**: Evaluate risks based on past failures
3. **Performance optimization**: Optimize strategies based on success patterns
4. **Error recovery**: Develop recovery strategies from failure experiences
5. **Knowledge graphs**: Build structured knowledge from experiences
6. **Explanation systems**: Explain decisions based on past experiences

## Contributing

When contributing to the experience plugin:

1. **Add tests**: Ensure new features have comprehensive test coverage
2. **Update types**: Keep TypeScript interfaces up to date
3. **Document changes**: Update README and inline documentation
4. **Consider performance**: Monitor impact on memory and query performance
5. **Maintain compatibility**: Ensure backward compatibility with existing experiences

## License

This plugin is part of the Eliza framework and follows the same licensing terms.
