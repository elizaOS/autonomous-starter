import {
  type IAgentRuntime,
  type Component,
  type UUID,
  logger,
} from "@elizaos/core";
import { dbCompat } from "./dbCompatibility";

/**
 * Component service that provides database-compatible component operations
 */
export class ComponentService {
  constructor(private runtime: IAgentRuntime) {}

  /**
   * Get a component with database-compatible data parsing
   */
  async getComponent(
    entityId: UUID,
    componentType: string
  ): Promise<Component | null> {
    try {
      const component = await this.runtime.getComponent(
        dbCompat.formatUuid(entityId),
        componentType
      );

      if (!component) return null;

      return this.normalizeComponent(component);
    } catch (error) {
      logger.error("[ComponentService] Error getting component:", error);
      return null;
    }
  }

  /**
   * Create a component with database-compatible data
   */
  async createComponent(params: {
    entityId: UUID;
    agentId: UUID;
    type: string;
    data: any;
    roomId: UUID;
    worldId: UUID;
    sourceEntityId: UUID;
  }): Promise<boolean> {
    try {
      // Pass params directly to runtime - it handles database-specific formatting internally
      const result = await this.runtime.createComponent(params as any);
      return !!result;
    } catch (error) {
      logger.error("[ComponentService] Error creating component:", error);
      return false;
    }
  }

  /**
   * Update a component with database-compatible data
   */
  async updateComponent(params: {
    id: UUID;
    entityId: UUID;
    agentId: UUID;
    roomId: UUID;
    worldId: UUID;
    sourceEntityId: UUID;
    type: string;
    data: any;
  }): Promise<boolean> {
    try {
      // Pass params directly to runtime - it handles database-specific formatting internally
      await this.runtime.updateComponent(params as any);
      return true;
    } catch (error) {
      logger.error("[ComponentService] Error updating component:", error);
      return false;
    }
  }

  /**
   * Normalize a component from the database
   */
  private normalizeComponent(component: Component): Component {
    // Parse the data field
    if (component.data) {
      component.data = dbCompat.parseJson(component.data as any) || {};
    }

    // Normalize any boolean fields in data
    if (component.data && typeof component.data === "object") {
      this.normalizeBooleans(component.data);
    }

    // Normalize UUIDs to ensure consistent format
    if (component.id) {
      component.id = component.id.toLowerCase() as UUID;
    }
    if (component.entityId) {
      component.entityId = component.entityId.toLowerCase() as UUID;
    }
    if (component.agentId) {
      component.agentId = component.agentId.toLowerCase() as UUID;
    }
    if (component.roomId) {
      component.roomId = component.roomId.toLowerCase() as UUID;
    }
    if (component.worldId) {
      component.worldId = component.worldId.toLowerCase() as UUID;
    }
    if (component.sourceEntityId) {
      component.sourceEntityId = component.sourceEntityId.toLowerCase() as UUID;
    }

    return component;
  }

  /**
   * Recursively normalize boolean values in an object
   */
  private normalizeBooleans(obj: any): void {
    if (!obj || typeof obj !== "object") return;

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === "number" && (value === 0 || value === 1)) {
          // Likely a boolean stored as 0/1
          obj[key] = dbCompat.parseBoolean(value);
        } else if (typeof value === "object") {
          this.normalizeBooleans(value);
        }
      }
    }
  }
}

/**
 * Create a component service instance for the runtime
 */
export function createComponentService(runtime: IAgentRuntime): ComponentService {
  return new ComponentService(runtime);
} 