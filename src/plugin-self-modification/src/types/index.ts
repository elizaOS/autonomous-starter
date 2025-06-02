import { type UUID } from "@elizaos/core";

export interface CharacterModification {
  id: UUID;
  agentId: UUID;
  versionNumber: number;
  diffXml: string;
  reasoning: string;
  appliedAt: Date;
  rolledBackAt?: Date;
  createdAt: Date;
}

export interface CharacterSnapshot {
  id: UUID;
  agentId: UUID;
  versionNumber: number;
  characterData: any; // Will be the full Character object
  createdAt: Date;
}

export interface ModificationOperation {
  type: "add" | "modify" | "delete";
  path: string;
  value?: any;
  dataType?: string;
}

export interface CharacterDiff {
  operations: ModificationOperation[];
  reasoning: string;
  timestamp: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ModificationOptions {
  focusAreas?: string[];
  maxChanges?: number;
  preserveCore?: boolean;
}
