import { 
  Service, 
  type IAgentRuntime, 
  type Character,
  logger,
  stringToUuid,
  type UUID
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import {
  type CharacterModification,
  type CharacterSnapshot,
  type CharacterDiff,
  type ValidationResult,
  type ModificationOptions
} from '../types';
import { parseCharacterDiff, buildCharacterDiffXml } from '../utils/xml-parser';
import { applyOperationsToCharacter, validateCharacterStructure } from '../utils/character-updater';
import { validateCharacterDiff, validateModificationRate } from '../utils/validation';

export class CharacterModificationService extends Service {
  static serviceName = 'characterModification';
  
  private modifications: Map<UUID, CharacterModification[]> = new Map();
  private snapshots: Map<UUID, CharacterSnapshot[]> = new Map();
  private currentVersion: Map<UUID, number> = new Map();
  private isLocked: boolean = false;
  
  async initialize(): Promise<void> {
    logger.info('Initializing CharacterModificationService');
    
    // Load modification history from database
    await this.loadModificationHistory();
    
    // Take initial snapshot if none exists
    const agentId = this.runtime.agentId;
    if (!this.snapshots.has(agentId) || this.snapshots.get(agentId)!.length === 0) {
      await this.createSnapshot('Initial character state');
    }
  }
  
  async applyCharacterDiff(diffXml: string, options?: ModificationOptions): Promise<{
    success: boolean;
    errors?: string[];
    warnings?: string[];
    appliedChanges?: number;
  }> {
    if (this.isLocked) {
      return {
        success: false,
        errors: ['Character modifications are currently locked']
      };
    }
    
    try {
      // Parse the XML diff
      const diff = parseCharacterDiff(diffXml);
      
      // Validate the diff
      const validation = validateCharacterDiff(diff);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }
      
      // Check rate limits
      const recentMods = this.getRecentModifications(24); // Last 24 hours
      const modTimestamps = recentMods.map(m => ({ timestamp: m.appliedAt }));
      if (!validateModificationRate(modTimestamps)) {
        return {
          success: false,
          errors: ['Modification rate limit exceeded']
        };
      }
      
      // Apply focus area filtering if specified
      let filteredDiff = diff;
      if (options?.focusAreas && options.focusAreas.length > 0) {
        filteredDiff = this.filterDiffByFocusAreas(diff, options.focusAreas);
      }
      
      // Create snapshot before modification
      await this.createSnapshot(diff.reasoning);
      
      // Apply modifications to current character
      const currentCharacter = this.runtime.character;
      const updatedCharacter = applyOperationsToCharacter(
        currentCharacter,
        filteredDiff.operations
      );
      
      // Validate the updated character structure
      if (!validateCharacterStructure(updatedCharacter)) {
        return {
          success: false,
          errors: ['Updated character structure is invalid']
        };
      }
      
      // Store modification record
      const modification = await this.storeModification(filteredDiff, diffXml);
      
      // Update the runtime character
      await this.updateRuntimeCharacter(updatedCharacter);
      
      // Persist to database
      await this.persistCharacterUpdate(updatedCharacter);
      
      return {
        success: true,
        warnings: validation.warnings,
        appliedChanges: filteredDiff.operations.length
      };
      
    } catch (error) {
      logger.error('Failed to apply character diff:', error);
      return {
        success: false,
        errors: [`Failed to apply modifications: ${error.message}`]
      };
    }
  }
  
  async rollbackCharacter(versionId: string): Promise<boolean> {
    try {
      const agentId = this.runtime.agentId;
      const snapshots = this.snapshots.get(agentId) || [];
      
      const targetSnapshot = snapshots.find(s => s.id === versionId as UUID);
      if (!targetSnapshot) {
        logger.error(`Snapshot ${versionId} not found`);
        return false;
      }
      
      // Create rollback snapshot
      await this.createSnapshot(`Rollback to version ${targetSnapshot.versionNumber}`);
      
      // Restore character data
      const restoredCharacter = targetSnapshot.characterData;
      
      // Update runtime
      await this.updateRuntimeCharacter(restoredCharacter);
      
      // Persist to database
      await this.persistCharacterUpdate(restoredCharacter);
      
      // Mark modifications as rolled back
      const modifications = this.modifications.get(agentId) || [];
      const rolledBackMods = modifications.filter(
        m => m.versionNumber > targetSnapshot.versionNumber
      );
      
      for (const mod of rolledBackMods) {
        mod.rolledBackAt = new Date();
      }
      
      logger.info(`Rolled back to version ${targetSnapshot.versionNumber}`);
      return true;
      
    } catch (error) {
      logger.error('Failed to rollback character:', error);
      return false;
    }
  }
  
  getCharacterHistory(): CharacterModification[] {
    const agentId = this.runtime.agentId;
    return this.modifications.get(agentId) || [];
  }
  
  getCharacterSnapshots(): CharacterSnapshot[] {
    const agentId = this.runtime.agentId;
    return this.snapshots.get(agentId) || [];
  }
  
  getCurrentVersion(): number {
    const agentId = this.runtime.agentId;
    return this.currentVersion.get(agentId) || 0;
  }
  
  lockModifications(): void {
    this.isLocked = true;
    logger.info('Character modifications locked');
  }
  
  unlockModifications(): void {
    this.isLocked = false;
    logger.info('Character modifications unlocked');
  }
  
  // Private helper methods
  
  private async loadModificationHistory(): Promise<void> {
    try {
      // This would load from database in production
      // For now, initialize empty collections
      const agentId = this.runtime.agentId;
      
      if (!this.modifications.has(agentId)) {
        this.modifications.set(agentId, []);
      }
      
      if (!this.snapshots.has(agentId)) {
        this.snapshots.set(agentId, []);
      }
      
      if (!this.currentVersion.has(agentId)) {
        this.currentVersion.set(agentId, 0);
      }
      
    } catch (error) {
      logger.error('Failed to load modification history:', error);
    }
  }
  
  private async createSnapshot(reason: string): Promise<CharacterSnapshot> {
    const agentId = this.runtime.agentId;
    const currentSnapshots = this.snapshots.get(agentId) || [];
    const version = this.getNextVersion();
    
    const snapshot: CharacterSnapshot = {
      id: stringToUuid(uuidv4()) as UUID,
      agentId,
      versionNumber: version,
      characterData: JSON.parse(JSON.stringify(this.runtime.character)),
      createdAt: new Date()
    };
    
    currentSnapshots.push(snapshot);
    this.snapshots.set(agentId, currentSnapshots);
    
    logger.debug(`Created character snapshot version ${version}: ${reason}`);
    return snapshot;
  }
  
  private async storeModification(
    diff: CharacterDiff,
    originalXml: string
  ): Promise<CharacterModification> {
    const agentId = this.runtime.agentId;
    const currentMods = this.modifications.get(agentId) || [];
    const version = this.getNextVersion();
    
    const modification: CharacterModification = {
      id: stringToUuid(uuidv4()) as UUID,
      agentId,
      versionNumber: version,
      diffXml: originalXml,
      reasoning: diff.reasoning,
      appliedAt: new Date(),
      createdAt: new Date()
    };
    
    currentMods.push(modification);
    this.modifications.set(agentId, currentMods);
    this.currentVersion.set(agentId, version);
    
    return modification;
  }
  
  private getNextVersion(): number {
    const agentId = this.runtime.agentId;
    const current = this.currentVersion.get(agentId) || 0;
    return current + 1;
  }
  
  private getRecentModifications(hoursBack: number): CharacterModification[] {
    const agentId = this.runtime.agentId;
    const mods = this.modifications.get(agentId) || [];
    const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    return mods.filter(m => m.appliedAt > cutoff && !m.rolledBackAt);
  }
  
  private filterDiffByFocusAreas(
    diff: CharacterDiff,
    focusAreas: string[]
  ): CharacterDiff {
    const filteredOps = diff.operations.filter(op => {
      return focusAreas.some(area => op.path.includes(area));
    });
    
    return {
      ...diff,
      operations: filteredOps
    };
  }
  
  private async updateRuntimeCharacter(updatedCharacter: Character): Promise<void> {
    // Update the runtime character object
    Object.assign(this.runtime.character, updatedCharacter);
    
    // Notify other services of the change
    await this.runtime.emit('character:updated', {
      agentId: this.runtime.agentId,
      character: updatedCharacter,
      timestamp: new Date()
    });
  }
  
  private async persistCharacterUpdate(character: Character): Promise<void> {
    try {
      // Update agent in database
      const success = await this.runtime.updateAgent(this.runtime.agentId, character);
      
      if (!success) {
        throw new Error('Failed to update agent in database');
      }
      
      logger.info('Character update persisted to database');
      
    } catch (error) {
      logger.error('Failed to persist character update:', error);
      throw error;
    }
  }
}