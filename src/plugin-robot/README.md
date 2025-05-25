# Robot Plugin

The Robot Plugin provides screen control capabilities for ElizaOS agents, allowing them to interact with the desktop environment through mouse and keyboard automation, screen capture, and AI-powered screen analysis.

## Features

- **Screen Capture**: Automatically captures screenshots for analysis
- **AI-Powered Screen Analysis**:
  - Screen description using vision models
  - OCR text extraction
  - Object detection with bounding boxes
- **Mouse Control**: Move cursor and click actions
- **Keyboard Control**: Text input automation
- **Context Caching**: Efficient screen context caching with TTL
- **Error Handling**: Graceful handling of AI model failures

## Components

### RobotService

The core service that provides screen control and analysis capabilities.

**Methods:**

- `getContext()`: Returns current screen context with caching
- `updateContext()`: Forces screen context refresh
- `moveMouse(x, y)`: Move mouse to coordinates
- `click(button?)`: Perform mouse click (left, right, middle)
- `typeText(text)`: Type text string

### performScreenAction

Action that allows agents to perform sequences of screen interactions.

**Parameters:**

- `steps`: Array of action steps
  - `move`: Move mouse to coordinates (`x`, `y`)
  - `click`: Click mouse button (`button`)
  - `type`: Type text (`text`)

**Example:**

```typescript
{
  steps: [
    { action: 'move', x: 100, y: 200 },
    { action: 'click', button: 'left' },
    { action: 'type', text: 'Hello, World!' },
  ];
}
```

### screenProvider

Provider that supplies current screen context to the agent.

**Provides:**

- Screen description from AI vision model
- OCR text extraction results
- Detected objects with bounding boxes
- Raw screenshot data

## Installation

The plugin requires the `@jitsi/robotjs` package for screen control:

```bash
npm install @jitsi/robotjs
```

**Note**: RobotJS has platform-specific requirements:

- **Windows**: No additional requirements
- **macOS**: May require accessibility permissions
- **Linux**: Requires X11 development libraries

## Usage

### Basic Setup

```typescript
import { robotPlugin } from './plugin-robot';

// Add to your agent's plugins
const character = {
  plugins: [robotPlugin],
  // ... other configuration
};
```

### Screen Analysis

The plugin automatically provides screen context through the `SCREEN_CONTEXT` provider:

```
# Screen Description
A desktop showing a web browser with a login form

# OCR
Email: [text field]
Password: [text field]
Login [button]

# Objects
text_field at (100,150)
text_field at (100,200)
button at (200,250)
```

### Performing Actions

Agents can use the `PERFORM_SCREEN_ACTION` action to interact with the screen:

```typescript
// Example: Fill out a login form
const steps = [
  { action: 'move', x: 100, y: 150 }, // Move to email field
  { action: 'click', button: 'left' }, // Click email field
  { action: 'type', text: 'user@example.com' }, // Type email
  { action: 'move', x: 100, y: 200 }, // Move to password field
  { action: 'click', button: 'left' }, // Click password field
  { action: 'type', text: 'password123' }, // Type password
  { action: 'move', x: 200, y: 250 }, // Move to login button
  { action: 'click', button: 'left' }, // Click login button
];
```

## Configuration

### Cache TTL

The screen context cache TTL can be configured by modifying the `CACHE_TTL` constant in the service (default: 5 seconds).

### AI Models

The plugin uses the following AI models:

- `TEXT_SMALL`: For screen description
- `OBJECT_SMALL`: For object detection
- `TRANSCRIPTION`: For OCR text extraction

## Error Handling

The plugin includes comprehensive error handling:

- **AI Model Failures**: Gracefully handles model failures, returning empty results
- **Screen Capture Errors**: Logs errors and continues operation
- **Invalid Actions**: Skips invalid action parameters without failing
- **Service Unavailability**: Provides fallback responses when service is not available

## Testing

The plugin includes comprehensive tests:

```bash
# Run all tests
npm test

# Run specific test files
npm test service.test.ts
npm test action.test.ts
npm test provider.test.ts
npm test integration.test.ts
```

### Test Coverage

- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end workflow testing
- **Error Handling**: Edge cases and failure scenarios
- **Performance Tests**: Caching and resource management

## Security Considerations

- **Screen Access**: The plugin requires screen capture permissions
- **Input Control**: Can control mouse and keyboard (use with caution)
- **Accessibility**: May require accessibility permissions on macOS
- **Sandboxing**: Consider running in controlled environments

## Platform Support

| Platform | Support | Notes                              |
| -------- | ------- | ---------------------------------- |
| Windows  | ✅ Full | Native support                     |
| macOS    | ✅ Full | Requires accessibility permissions |
| Linux    | ✅ Full | Requires X11 libraries             |

## Troubleshooting

### Common Issues

1. **Permission Denied (macOS)**

   - Grant accessibility permissions in System Preferences
   - Add your application to Privacy & Security settings

2. **Missing Dependencies (Linux)**

   ```bash
   # Ubuntu/Debian
   sudo apt-get install libxtst6 libxrandr2 libasound2-dev

   # CentOS/RHEL
   sudo yum install libXtst libXrandr alsa-lib-devel
   ```

3. **Screen Capture Fails**
   - Check display permissions
   - Verify screen is not locked
   - Ensure display is accessible

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
import { logger } from '@elizaos/core';
logger.setLevel('debug');
```

## API Reference

### Types

```typescript
interface ScreenObject {
  label: string;
  bbox: { x: number; y: number; width: number; height: number };
}

interface ScreenContext {
  screenshot: Buffer;
  description: string;
  ocr: string;
  objects: ScreenObject[];
  timestamp: number;
}

interface ScreenActionStep {
  action: 'move' | 'click' | 'type';
  x?: number;
  y?: number;
  text?: string;
  button?: 'left' | 'right' | 'middle';
}
```

## Contributing

When contributing to the robot plugin:

1. **Add Tests**: Include comprehensive tests for new features
2. **Error Handling**: Ensure graceful error handling
3. **Documentation**: Update README and code comments
4. **Platform Testing**: Test on multiple platforms when possible
5. **Security Review**: Consider security implications of screen control

## License

This plugin is part of the ElizaOS project and follows the same license terms.
