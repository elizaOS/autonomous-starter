# @elizaos/plugin-self-modification

A plugin that enables ElizaOS agents to dynamically modify their own character/personality through reflection and self-learning.

## Overview

This plugin allows agents to:

- Reflect on conversations and adapt their personality
- Add new topics of interest based on interactions
- Refine communication styles
- Update biographical information and lore
- Maintain a versioned history of all changes
- Rollback to previous personality versions if needed

## Installation

```bash
npm install @elizaos/plugin-self-modification
```

## Usage

### Basic Setup

```typescript
import { AgentRuntime } from "@elizaos/core";
import selfModificationPlugin from "@elizaos/plugin-self-modification";

const runtime = new AgentRuntime({
  character: myCharacter,
  plugins: [selfModificationPlugin],
});
```

### Actions

#### modifyCharacter

Triggers self-reflection and character modification based on recent interactions.

```
User: "You should update your personality based on our conversations about philosophy"
Agent: "I'll reflect on our philosophical discussions and update my character accordingly."
```

#### viewCharacterHistory

Shows the history of character modifications.

```
User: "Show me your character history"
Agent: "Character Modification History (Current Version: 3):
Version 1: Added interest in quantum physics (2024-01-01T10:00:00Z)
Version 2: Refined communication style for technical topics (2024-01-01T11:00:00Z)
Version 3: Expanded philosophical perspectives (2024-01-01T12:00:00Z)"
```

#### rollbackCharacter

Reverts the character to a previous version.

```
User: "Rollback to version 2"
Agent: "Successfully rolled back character to version 2"
```

### XML Diff Format

The plugin uses XML to represent character modifications:

```xml
<character-modification>
  <operations>
    <add path="bio[]" type="string">Has developed interest in quantum mechanics</add>
    <modify path="system" type="string">Updated system prompt with new perspective</modify>
    <add path="topics[]" type="string">quantum physics</add>
    <add path="adjectives[]" type="string">philosophical</add>
    <delete path="topics[0]" />
  </operations>
  <reasoning>Based on recent conversations about physics and consciousness</reasoning>
  <timestamp>2024-01-01T12:00:00Z</timestamp>
</character-modification>
```

### Providers

#### characterState

Provides complete current character state and modification history.

#### characterDiff

Provides guidelines and examples for creating character modifications.

### Evaluators

#### characterEvolution

Analyzes conversations to recommend when character evolution would be beneficial.

## Configuration

### Rate Limiting

The plugin enforces rate limits to prevent excessive modifications:

- Maximum 5 modifications per hour
- Maximum 20 modifications per day

### Immutable Fields

The following fields cannot be modified:

- `name` - Agent's name
- `id` - Agent's unique identifier

### Validation Rules

- System prompt cannot be empty
- Bio entries limited to 1000 characters
- Array fields limited to 50 items
- All modifications require reasoning

## API Reference

### CharacterModificationService

```typescript
class CharacterModificationService extends Service {
  // Apply a character diff
  applyCharacterDiff(
    diffXml: string,
    options?: ModificationOptions,
  ): Promise<{
    success: boolean;
    errors?: string[];
    warnings?: string[];
    appliedChanges?: number;
  }>;

  // Rollback to a previous version
  rollbackCharacter(versionId: string): Promise<boolean>;

  // Get modification history
  getCharacterHistory(): CharacterModification[];

  // Get character snapshots
  getCharacterSnapshots(): CharacterSnapshot[];

  // Get current version number
  getCurrentVersion(): number;

  // Lock/unlock modifications
  lockModifications(): void;
  unlockModifications(): void;
}
```

### Types

```typescript
interface CharacterModification {
  id: UUID;
  agentId: UUID;
  versionNumber: number;
  diffXml: string;
  reasoning: string;
  appliedAt: Date;
  rolledBackAt?: Date;
  createdAt: Date;
}

interface ModificationOperation {
  type: "add" | "modify" | "delete";
  path: string;
  value?: any;
  dataType?: string;
}

interface ModificationOptions {
  focusAreas?: string[]; // Limit modifications to specific areas
  maxChanges?: number; // Maximum operations in one modification
  preserveCore?: boolean; // Preserve core personality traits
}
```

## Safety Mechanisms

1. **Validation**: All modifications are validated before application
2. **Rate Limiting**: Prevents runaway modifications
3. **Version History**: Complete audit trail of all changes
4. **Rollback**: Can revert to any previous version
5. **Lock/Unlock**: Admin can lock character from modifications

## Examples

### Adapting to User Interests

```typescript
// After conversations about technology
<character-modification>
  <operations>
    <add path="topics[]" type="string">artificial intelligence</add>
    <add path="topics[]" type="string">machine learning</add>
    <add path="bio[]" type="string">Developed expertise in AI through user interactions</add>
  </operations>
  <reasoning>User frequently asks about AI topics, adapting to provide better assistance</reasoning>
</character-modification>
```

### Refining Communication Style

```typescript
// After feedback about being too formal
<character-modification>
  <operations>
    <modify path="style/chat[0]" type="string">Use casual, friendly language</modify>
    <add path="style/all[]" type="string">Include relevant examples and analogies</add>
  </operations>
  <reasoning>User prefers casual conversation style with practical examples</reasoning>
</character-modification>
```

## Best Practices

1. **Gradual Evolution**: Make small, incremental changes rather than dramatic shifts
2. **Coherent Updates**: Ensure modifications align with existing personality
3. **User-Driven**: Base modifications on actual user interactions
4. **Regular Review**: Periodically review modification history
5. **Testing**: Test modifications in non-critical environments first

## License

MIT
