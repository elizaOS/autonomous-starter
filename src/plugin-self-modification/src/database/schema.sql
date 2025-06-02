-- Character Modifications Table
-- Stores all character modification diffs with version history
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
    
    -- Indexes for performance
    INDEX idx_agent_version (agent_id, version_number),
    INDEX idx_agent_applied (agent_id, applied_at),
    INDEX idx_rolled_back (rolled_back_at),
    
    -- Ensure version numbers are unique per agent
    UNIQUE KEY unique_agent_version (agent_id, version_number)
);

-- Character Snapshots Table
-- Stores complete character state at each version for rollback capability
CREATE TABLE IF NOT EXISTS character_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    character_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_snapshot_agent_version (agent_id, version_number),
    INDEX idx_snapshot_created (created_at),
    
    -- Ensure version numbers are unique per agent
    UNIQUE KEY unique_snapshot_agent_version (agent_id, version_number),
    
    -- Foreign key to modifications table
    FOREIGN KEY (agent_id, version_number) 
        REFERENCES character_modifications(agent_id, version_number)
        ON DELETE CASCADE
);

-- Rate Limiting Table
-- Tracks modification attempts for rate limiting
CREATE TABLE IF NOT EXISTS character_modification_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    successful BOOLEAN NOT NULL DEFAULT true,
    
    -- Index for rate limit queries
    INDEX idx_rate_limit_agent_time (agent_id, attempted_at)
);

-- Character Modification Lock Table
-- Stores lock status for agents
CREATE TABLE IF NOT EXISTS character_modification_locks (
    agent_id UUID PRIMARY KEY,
    locked BOOLEAN NOT NULL DEFAULT false,
    locked_by TEXT,
    locked_at TIMESTAMP WITH TIME ZONE,
    lock_reason TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Evolution Recommendations Table
-- Stores evaluator recommendations for character evolution
CREATE TABLE IF NOT EXISTS character_evolution_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    room_id UUID,
    conversation_id UUID,
    recommendation TEXT NOT NULL,
    analysis_result TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_recommendations_agent (agent_id),
    INDEX idx_recommendations_unprocessed (agent_id, processed),
    INDEX idx_recommendations_created (created_at)
);

-- Add triggers for updated_at columns
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

-- Helper views
CREATE OR REPLACE VIEW latest_character_versions AS
SELECT 
    cm.agent_id,
    MAX(cm.version_number) as latest_version,
    COUNT(*) as total_modifications,
    COUNT(CASE WHEN cm.rolled_back_at IS NOT NULL THEN 1 END) as rolled_back_count
FROM character_modifications cm
GROUP BY cm.agent_id;

CREATE OR REPLACE VIEW recent_modification_activity AS
SELECT 
    agent_id,
    COUNT(*) as modifications_last_hour,
    COUNT(CASE WHEN attempted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as modifications_last_day
FROM character_modification_rate_limits
WHERE attempted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
  AND successful = true
GROUP BY agent_id;