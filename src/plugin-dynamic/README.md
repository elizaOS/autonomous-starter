# ElizaOS Plugin Dynamic Creation System

This plugin enables ElizaOS agents to autonomously create new plugins using AI-driven development. Agents can generate, build, test, and validate plugins based on specifications or natural language descriptions.

## Features

- **AI-Powered Code Generation**: Uses Claude (Anthropic) to generate TypeScript code
- **Iterative Development**: Automatically refines code through up to 5 iterations
- **Comprehensive Testing**: Built-in linting, testing with vitest, and validation
- **Natural Language Support**: Create plugins from simple descriptions
- **Job Management**: Track and control plugin creation jobs

## Installation

1. Install the plugin in your ElizaOS project:

```bash
npm install @elizaos/plugin-dynamic
```

2. Set up your environment variables:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

3. Register the plugin in your agent configuration:

```typescript
import { pluginDynamic } from "@elizaos/plugin-dynamic";

const agent = new Agent({
  plugins: [pluginDynamic],
  // ... other configuration
});
```

## Usage

### Creating a Plugin from Specification

```typescript
// Agent conversation example
User: Create a plugin with the following specification:
{
    "name": "@elizaos/plugin-weather",
    "description": "Weather information plugin",
    "version": "1.0.0",
    "actions": [
        {
            "name": "getCurrentWeather",
            "description": "Get current weather for a location",
            "parameters": {
                "location": "string"
            }
        }
    ],
    "providers": [
        {
            "name": "weatherData",
            "description": "Provides weather data context"
        }
    ]
}

Agent: I'll create a weather information plugin for you. Let me start by generating the necessary components...
Plugin creation job started with ID: abc123. Use checkPluginCreationStatus to monitor progress.
```

### Creating a Plugin from Natural Language

```typescript
User: I need a plugin that helps manage todo lists with add, remove, and list functionality

Agent: I'll create a todo list management plugin based on your description. This will include actions for adding, removing, and listing todos.
I'm creating a plugin based on your description. Job ID: xyz789. Use checkPluginCreationStatus to monitor progress.
```

### Checking Plugin Creation Status

```typescript
User: What's the status of my plugin creation?

Agent: Plugin Creation Status: running
Current Phase: building
Progress: 60%

Recent logs:
- Starting iteration 2
- Generating plugin code...
- Building plugin...
- Running tests...
- 5 tests passed
```

### Canceling a Plugin Creation

```typescript
User: Cancel the plugin creation

Agent: Plugin creation job has been cancelled.
```

## Actions

### createPlugin

Creates a new plugin from a JSON specification.

**Parameters:**

- `name`: Plugin name (e.g., "@elizaos/plugin-example")
- `description`: Plugin description
- `version`: Plugin version (default: "1.0.0")
- `actions`: Array of actions to implement
- `providers`: Array of providers to implement
- `services`: Array of services to implement
- `evaluators`: Array of evaluators to implement
- `dependencies`: Additional npm dependencies
- `environmentVariables`: Required environment variables

### checkPluginCreationStatus

Checks the status of the current plugin creation job.

### cancelPluginCreation

Cancels the current plugin creation job.

### createPluginFromDescription

Creates a plugin from a natural language description.

## Providers

### plugin_creation_status

Provides the current status of active plugin creation jobs.

### plugin_creation_capabilities

Provides information about the plugin creation service capabilities.

## Architecture

### Plugin Creation Workflow

1. **Specification Phase**: Parse and validate the plugin specification
2. **Generation Phase**: Use AI to generate TypeScript code
3. **Build Phase**: Compile TypeScript to JavaScript
4. **Lint Phase**: Run ESLint to check code quality
5. **Test Phase**: Run vitest tests
6. **Validation Phase**: AI validates the implementation
7. **Iteration**: If validation fails, refine and repeat (max 5 iterations)

### Directory Structure

```
plugin-dynamic/
├── services/
│   └── plugin-creation-service.ts    # Core service logic
├── actions/
│   └── plugin-creation-actions.ts    # Agent actions
├── providers/
│   └── plugin-creation-providers.ts  # Context providers
├── utils/
│   ├── plugin-templates.ts           # Code generation templates
│   └── validation.ts                 # Validation utilities
├── __tests__/                        # Test files
└── index.ts                          # Main export
```

## Configuration

### Environment Variables

- `ANTHROPIC_API_KEY`: Required for AI code generation
- `PLUGIN_DATA_DIR`: Directory for plugin workspace (default: "./data")

### Service Configuration

The plugin creation service can be configured with:

- `maxIterations`: Maximum refinement iterations (default: 5)
- `timeout`: Job timeout in milliseconds
- `workspace`: Custom workspace directory

## Examples

### Example 1: Database Plugin

```typescript
const specification = {
  name: "@elizaos/plugin-database",
  description: "Database operations plugin",
  actions: [
    {
      name: "queryDatabase",
      description: "Execute a database query",
      parameters: {
        query: "string",
        params: "array",
      },
    },
  ],
  services: [
    {
      name: "DatabaseService",
      description: "Manages database connections",
      methods: ["connect", "disconnect", "query"],
    },
  ],
  dependencies: {
    pg: "^8.0.0",
  },
  environmentVariables: [
    {
      name: "DATABASE_URL",
      description: "PostgreSQL connection string",
      required: true,
      sensitive: true,
    },
  ],
};
```

### Example 2: API Integration Plugin

```typescript
const specification = {
  name: "@elizaos/plugin-api",
  description: "External API integration",
  actions: [
    {
      name: "callAPI",
      description: "Make an API request",
      parameters: {
        endpoint: "string",
        method: "string",
        body: "object",
      },
    },
  ],
  providers: [
    {
      name: "apiResponse",
      description: "Provides latest API response data",
    },
  ],
};
```

## Troubleshooting

### Common Issues

1. **"Plugin creation service not available"**

   - Ensure the plugin is properly registered
   - Check that the service has been initialized

2. **"AI code generation not available"**

   - Verify ANTHROPIC_API_KEY is set
   - Check API key validity

3. **Build failures**
   - Review the error logs from the job status
   - Check for missing dependencies
   - Ensure TypeScript syntax is valid

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG = "elizaos:plugin-dynamic:*";
```

## Best Practices

1. **Clear Specifications**: Provide detailed descriptions for better AI generation
2. **Iterative Refinement**: Let the system run through iterations for better results
3. **Test Coverage**: Ensure generated plugins include comprehensive tests
4. **Environment Variables**: Use sensitive flags for secrets
5. **Resource Management**: Cancel long-running jobs if needed

## Contributing

To contribute to the plugin dynamic creation system:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details
