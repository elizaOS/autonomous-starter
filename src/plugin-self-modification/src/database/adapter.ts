import { type IDatabaseAdapter, type UUID, logger } from "@elizaos/core";
import { type CharacterModification, type CharacterSnapshot } from "../types";

/**
 * Database adapter for character modification data
 * Provides database-agnostic interface for both SQLite and PostgreSQL
 */
export class CharacterModificationDatabaseAdapter {
  constructor(private adapter: IDatabaseAdapter) {}

  /**
   * Get database type to handle SQL differences
   */
  private async getDatabaseType(): Promise<'sqlite' | 'postgres' | 'unknown'> {
    try {
      // Try to get connection and determine type
      const connection = await this.adapter.getConnection();
      
      // Check if it's a Sqlite or Pool (PostgreSQL)
      if (connection && connection.constructor.name === 'Pool') {
        return 'postgres';
      }
      
      // Check if it's SQLite (by attempting a SQLite-specific query)
      try {
        if (this.adapter.db && typeof this.adapter.db.execute === 'function') {
          await this.adapter.db.execute('SELECT sqlite_version()');
          return 'sqlite';
        }
      } catch {
        // Not SQLite
      }
      
      return 'unknown';
    } catch (error) {
      logger.warn('Could not determine database type:', error);
      return 'unknown';
    }
  }

  /**
   * Initialize database schema with compatibility for both SQLite and PostgreSQL
   */
  async initializeSchema(): Promise<void> {
    const dbType = await this.getDatabaseType();
    
    if (dbType === 'sqlite') {
      await this.initializeSQLiteSchema();
    } else {
      await this.initializePostgreSQLSchema();
    }
  }

  private async initializeSQLiteSchema(): Promise<void> {
    // SQLite-compatible schema
    const queries = [
      // Character modifications table
      `CREATE TABLE IF NOT EXISTS character_modifications (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        diff_xml TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        rolled_back_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (agent_id, version_number)
      )`,
      
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_agent_version ON character_modifications(agent_id, version_number)`,
      `CREATE INDEX IF NOT EXISTS idx_agent_applied ON character_modifications(agent_id, applied_at)`,
      `CREATE INDEX IF NOT EXISTS idx_rolled_back ON character_modifications(rolled_back_at)`,
      
      // Character snapshots table
      `CREATE TABLE IF NOT EXISTS character_snapshots (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        character_data TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (agent_id, version_number),
        FOREIGN KEY (agent_id, version_number) 
          REFERENCES character_modifications(agent_id, version_number)
          ON DELETE CASCADE
      )`,
      
      // Indexes for snapshots
      `CREATE INDEX IF NOT EXISTS idx_snapshot_agent_version ON character_snapshots(agent_id, version_number)`,
      `CREATE INDEX IF NOT EXISTS idx_snapshot_created ON character_snapshots(created_at)`,
      
      // Rate limiting table
      `CREATE TABLE IF NOT EXISTS character_modification_rate_limits (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
        successful INTEGER NOT NULL DEFAULT 1
      )`,
      
      // Index for rate limits
      `CREATE INDEX IF NOT EXISTS idx_rate_limit_agent_time ON character_modification_rate_limits(agent_id, attempted_at)`,
      
      // Character modification lock table
      `CREATE TABLE IF NOT EXISTS character_modification_locks (
        agent_id TEXT PRIMARY KEY,
        locked INTEGER NOT NULL DEFAULT 0,
        locked_by TEXT,
        locked_at TEXT,
        lock_reason TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      
      // Evolution recommendations table
      `CREATE TABLE IF NOT EXISTS character_evolution_recommendations (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        room_id TEXT,
        conversation_id TEXT,
        recommendation TEXT NOT NULL,
        analysis_result TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        processed INTEGER NOT NULL DEFAULT 0,
        processed_at TEXT
      )`,
      
      // Indexes for recommendations
      `CREATE INDEX IF NOT EXISTS idx_recommendations_agent ON character_evolution_recommendations(agent_id)`,
      `CREATE INDEX IF NOT EXISTS idx_recommendations_unprocessed ON character_evolution_recommendations(agent_id, processed)`,
      `CREATE INDEX IF NOT EXISTS idx_recommendations_created ON character_evolution_recommendations(created_at)`
    ];

    // Execute all queries
    for (const query of queries) {
      try {
        if (this.adapter.db && typeof this.adapter.db.execute === 'function') {
          await this.adapter.db.execute(query);
        } else {
          throw new Error('Database adapter does not support execute method');
        }
      } catch (error) {
        logger.error('Error creating SQLite schema:', error);
        throw error;
      }
    }
  }

  private async initializePostgreSQLSchema(): Promise<void> {
    // PostgreSQL schema from the original schema.sql file
    const query = `
      -- Character Modifications Table
      CREATE TABLE IF NOT EXISTS character_modifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id UUID NOT NULL,
          version_number INTEGER NOT NULL,
          diff_xml TEXT NOT NULL,
          reasoning TEXT NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          rolled_back_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (agent_id, version_number)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_agent_version ON character_modifications(agent_id, version_number);
      CREATE INDEX IF NOT EXISTS idx_agent_applied ON character_modifications(agent_id, applied_at);
      CREATE INDEX IF NOT EXISTS idx_rolled_back ON character_modifications(rolled_back_at);

      -- Character Snapshots Table
      CREATE TABLE IF NOT EXISTS character_snapshots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id UUID NOT NULL,
          version_number INTEGER NOT NULL,
          character_data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (agent_id, version_number),
          FOREIGN KEY (agent_id, version_number) 
              REFERENCES character_modifications(agent_id, version_number)
              ON DELETE CASCADE
      );

      -- Indexes for snapshots
      CREATE INDEX IF NOT EXISTS idx_snapshot_agent_version ON character_snapshots(agent_id, version_number);
      CREATE INDEX IF NOT EXISTS idx_snapshot_created ON character_snapshots(created_at);

      -- Rate Limiting Table
      CREATE TABLE IF NOT EXISTS character_modification_rate_limits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id UUID NOT NULL,
          attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          successful BOOLEAN NOT NULL DEFAULT true
      );

      -- Index for rate limits
      CREATE INDEX IF NOT EXISTS idx_rate_limit_agent_time ON character_modification_rate_limits(agent_id, attempted_at);

      -- Character Modification Lock Table
      CREATE TABLE IF NOT EXISTS character_modification_locks (
          agent_id UUID PRIMARY KEY,
          locked BOOLEAN NOT NULL DEFAULT false,
          locked_by TEXT,
          locked_at TIMESTAMP WITH TIME ZONE,
          lock_reason TEXT,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Evolution Recommendations Table
      CREATE TABLE IF NOT EXISTS character_evolution_recommendations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id UUID NOT NULL,
          room_id UUID,
          conversation_id UUID,
          recommendation TEXT NOT NULL,
          analysis_result TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed BOOLEAN NOT NULL DEFAULT false,
          processed_at TIMESTAMP WITH TIME ZONE
      );

      -- Indexes for recommendations
      CREATE INDEX IF NOT EXISTS idx_recommendations_agent ON character_evolution_recommendations(agent_id);
      CREATE INDEX IF NOT EXISTS idx_recommendations_unprocessed ON character_evolution_recommendations(agent_id, processed);
      CREATE INDEX IF NOT EXISTS idx_recommendations_created ON character_evolution_recommendations(created_at);

      -- Trigger for updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      CREATE TRIGGER update_character_modifications_updated_at
          BEFORE UPDATE ON character_modifications
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      CREATE TRIGGER update_character_modification_locks_updated_at
          BEFORE UPDATE ON character_modification_locks
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      if (this.adapter.db && typeof this.adapter.db.execute === 'function') {
        await this.adapter.db.execute(query);
      } else {
        throw new Error('Database adapter does not support execute method');
      }
    } catch (error) {
      logger.error('Error creating PostgreSQL schema:', error);
      throw error;
    }
  }

  /**
   * Generate a UUID compatible with the database type
   */
  private async generateId(): Promise<string> {
    const dbType = await this.getDatabaseType();
    
    if (dbType === 'sqlite') {
      // Generate UUID v4 for SQLite
      return crypto.randomUUID();
    } else {
      // PostgreSQL will auto-generate UUIDs using gen_random_uuid()
      return crypto.randomUUID();
    }
  }

  /**
   * Get current timestamp in database-compatible format
   */
  private async getCurrentTimestamp(): Promise<string> {
    const dbType = await this.getDatabaseType();
    
    if (dbType === 'sqlite') {
      return new Date().toISOString();
    } else {
      return 'CURRENT_TIMESTAMP';
    }
  }

  /**
   * Save a character modification to the database
   */
  async saveModification(modification: CharacterModification): Promise<void> {
    try {
      // TODO: Implement when character_modifications table is available
      // await this.adapter.query(`
      //   INSERT INTO character_modifications
      //   (id, agent_id, version_number, diff_xml, reasoning, applied_at, created_at)
      //   VALUES ($1, $2, $3, $4, $5, $6, $7)
      // `, [
      //   modification.id,
      //   modification.agentId,
      //   modification.versionNumber,
      //   modification.diffXml,
      //   modification.reasoning,
      //   modification.appliedAt,
      //   modification.createdAt
      // ]);

      logger.debug("Would save modification to database:", modification.id);
    } catch (error) {
      logger.error("Failed to save modification to database:", error);
      throw error;
    }
  }

  /**
   * Save a character snapshot to the database
   */
  async saveSnapshot(snapshot: CharacterSnapshot): Promise<void> {
    try {
      // TODO: Implement when character_snapshots table is available
      // await this.adapter.query(`
      //   INSERT INTO character_snapshots
      //   (id, agent_id, version_number, character_data, created_at)
      //   VALUES ($1, $2, $3, $4, $5)
      // `, [
      //   snapshot.id,
      //   snapshot.agentId,
      //   snapshot.versionNumber,
      //   JSON.stringify(snapshot.characterData),
      //   snapshot.createdAt
      // ]);

      logger.debug("Would save snapshot to database:", snapshot.id);
    } catch (error) {
      logger.error("Failed to save snapshot to database:", error);
      throw error;
    }
  }

  /**
   * Load modification history for an agent
   */
  async loadModificationHistory(
    agentId: UUID,
  ): Promise<CharacterModification[]> {
    try {
      // TODO: Implement when character_modifications table is available
      // const result = await this.adapter.query(`
      //   SELECT * FROM character_modifications
      //   WHERE agent_id = $1
      //   ORDER BY version_number ASC
      // `, [agentId]);
      //
      // return result.rows.map(row => ({
      //   id: row.id,
      //   agentId: row.agent_id,
      //   versionNumber: row.version_number,
      //   diffXml: row.diff_xml,
      //   reasoning: row.reasoning,
      //   appliedAt: new Date(row.applied_at),
      //   rolledBackAt: row.rolled_back_at ? new Date(row.rolled_back_at) : undefined,
      //   createdAt: new Date(row.created_at)
      // }));

      logger.debug(
        "Would load modification history from database for agent:",
        agentId,
      );
      return [];
    } catch (error) {
      logger.error("Failed to load modification history:", error);
      return [];
    }
  }

  /**
   * Load snapshots for an agent
   */
  async loadSnapshots(agentId: UUID): Promise<CharacterSnapshot[]> {
    try {
      // TODO: Implement when character_snapshots table is available
      // const result = await this.adapter.query(`
      //   SELECT * FROM character_snapshots
      //   WHERE agent_id = $1
      //   ORDER BY version_number ASC
      // `, [agentId]);
      //
      // return result.rows.map(row => ({
      //   id: row.id,
      //   agentId: row.agent_id,
      //   versionNumber: row.version_number,
      //   characterData: JSON.parse(row.character_data),
      //   createdAt: new Date(row.created_at)
      // }));

      logger.debug("Would load snapshots from database for agent:", agentId);
      return [];
    } catch (error) {
      logger.error("Failed to load snapshots:", error);
      return [];
    }
  }

  /**
   * Mark modifications as rolled back
   */
  async markModificationsRolledBack(
    agentId: UUID,
    fromVersion: number,
  ): Promise<void> {
    try {
      // TODO: Implement when character_modifications table is available
      // await this.adapter.query(`
      //   UPDATE character_modifications
      //   SET rolled_back_at = CURRENT_TIMESTAMP
      //   WHERE agent_id = $1 AND version_number > $2
      // `, [agentId, fromVersion]);

      logger.debug("Would mark modifications as rolled back in database");
    } catch (error) {
      logger.error("Failed to mark modifications as rolled back:", error);
      throw error;
    }
  }

  /**
   * Save rate limit attempt
   */
  async saveRateLimitAttempt(
    agentId: UUID,
    successful: boolean,
  ): Promise<void> {
    try {
      // TODO: Implement when character_modification_rate_limits table is available
      // await this.adapter.query(`
      //   INSERT INTO character_modification_rate_limits
      //   (agent_id, attempted_at, successful)
      //   VALUES ($1, CURRENT_TIMESTAMP, $2)
      // `, [agentId, successful]);

      logger.debug("Would save rate limit attempt to database");
    } catch (error) {
      logger.error("Failed to save rate limit attempt:", error);
    }
  }

  /**
   * Check rate limit for an agent
   */
  async checkRateLimit(agentId: UUID): Promise<{
    hourlyCount: number;
    dailyCount: number;
  }> {
    try {
      // TODO: Implement when character_modification_rate_limits table is available
      // const result = await this.adapter.query(`
      //   SELECT
      //     COUNT(CASE WHEN attempted_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) as hourly_count,
      //     COUNT(CASE WHEN attempted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as daily_count
      //   FROM character_modification_rate_limits
      //   WHERE agent_id = $1 AND successful = true
      // `, [agentId]);
      //
      // return {
      //   hourlyCount: parseInt(result.rows[0].hourly_count),
      //   dailyCount: parseInt(result.rows[0].daily_count)
      // };

      logger.debug("Would check rate limit from database for agent:", agentId);
      return { hourlyCount: 0, dailyCount: 0 };
    } catch (error) {
      logger.error("Failed to check rate limit:", error);
      return { hourlyCount: 0, dailyCount: 0 };
    }
  }

  /**
   * Get or create lock status for an agent
   */
  async getLockStatus(agentId: UUID): Promise<{
    locked: boolean;
    lockedBy?: string;
    lockReason?: string;
  }> {
    try {
      // TODO: Implement when character_modification_locks table is available
      // const result = await this.adapter.query(`
      //   SELECT locked, locked_by, lock_reason
      //   FROM character_modification_locks
      //   WHERE agent_id = $1
      // `, [agentId]);
      //
      // if (result.rows.length === 0) {
      //   return { locked: false };
      // }
      //
      // return {
      //   locked: result.rows[0].locked,
      //   lockedBy: result.rows[0].locked_by,
      //   lockReason: result.rows[0].lock_reason
      // };

      logger.debug("Would get lock status from database for agent:", agentId);
      return { locked: false };
    } catch (error) {
      logger.error("Failed to get lock status:", error);
      return { locked: false };
    }
  }

  /**
   * Set lock status for an agent
   */
  async setLockStatus(
    agentId: UUID,
    locked: boolean,
    lockedBy?: string,
    lockReason?: string,
  ): Promise<void> {
    try {
      // TODO: Implement when character_modification_locks table is available
      // await this.adapter.query(`
      //   INSERT INTO character_modification_locks
      //   (agent_id, locked, locked_by, locked_at, lock_reason)
      //   VALUES ($1, $2, $3, $4, $5)
      //   ON CONFLICT (agent_id) DO UPDATE SET
      //     locked = EXCLUDED.locked,
      //     locked_by = EXCLUDED.locked_by,
      //     locked_at = CASE WHEN EXCLUDED.locked THEN CURRENT_TIMESTAMP ELSE NULL END,
      //     lock_reason = EXCLUDED.lock_reason,
      //     updated_at = CURRENT_TIMESTAMP
      // `, [
      //   agentId,
      //   locked,
      //   lockedBy,
      //   locked ? new Date() : null,
      //   lockReason
      // ]);

      logger.debug("Would set lock status in database for agent:", agentId);
    } catch (error) {
      logger.error("Failed to set lock status:", error);
      throw error;
    }
  }

  /**
   * Save evolution recommendation from evaluator
   */
  async saveEvolutionRecommendation(
    agentId: UUID,
    roomId: UUID | null,
    conversationId: UUID,
    recommendation: string,
    analysisResult: string,
  ): Promise<void> {
    try {
      // TODO: Implement when character_evolution_recommendations table is available
      // await this.adapter.query(`
      //   INSERT INTO character_evolution_recommendations
      //   (agent_id, room_id, conversation_id, recommendation, analysis_result)
      //   VALUES ($1, $2, $3, $4, $5)
      // `, [agentId, roomId, conversationId, recommendation, analysisResult]);

      logger.debug("Would save evolution recommendation to database");
    } catch (error) {
      logger.error("Failed to save evolution recommendation:", error);
    }
  }

  /**
   * Get unprocessed evolution recommendations
   */
  async getUnprocessedRecommendations(agentId: UUID): Promise<
    Array<{
      id: UUID;
      recommendation: string;
      analysisResult: string;
      createdAt: Date;
    }>
  > {
    try {
      // TODO: Implement when character_evolution_recommendations table is available
      // const result = await this.adapter.query(`
      //   SELECT id, recommendation, analysis_result, created_at
      //   FROM character_evolution_recommendations
      //   WHERE agent_id = $1 AND processed = false
      //   ORDER BY created_at ASC
      //   LIMIT 10
      // `, [agentId]);
      //
      // return result.rows.map(row => ({
      //   id: row.id,
      //   recommendation: row.recommendation,
      //   analysisResult: row.analysis_result,
      //   createdAt: new Date(row.created_at)
      // }));

      logger.debug("Would get unprocessed recommendations from database");
      return [];
    } catch (error) {
      logger.error("Failed to get unprocessed recommendations:", error);
      return [];
    }
  }
}
