import { logger } from "@elizaos/core";

/**
 * Database compatibility service to handle differences between SQLite and PostgreSQL
 */
export class DatabaseCompatibilityService {
  private databaseType: "sqlite" | "postgres" | "unknown" = "unknown";

  constructor() {
    this.detectDatabaseType();
  }

  /**
   * Detect the current database type from environment or connection
   */
  private detectDatabaseType(): void {
    // Check common environment variables
    const dbUrl = process.env.DATABASE_URL || process.env.DB_URL || "";
    
    if (dbUrl.includes("postgres") || dbUrl.includes("pg://")) {
      this.databaseType = "postgres";
    } else if (dbUrl.includes("sqlite") || dbUrl.includes(".db")) {
      this.databaseType = "sqlite";
    } else {
      // Default to sqlite for local development
      this.databaseType = "sqlite";
      logger.warn("Database type not detected, defaulting to sqlite");
    }
    
    logger.info(`Database compatibility mode: ${this.databaseType}`);
  }

  /**
   * Convert UUID for database storage
   */
  formatUuid(uuid: string): string | any {
    if (this.databaseType === "postgres") {
      // PostgreSQL can handle UUID type directly
      return uuid;
    }
    // SQLite stores as TEXT
    return uuid.toLowerCase();
  }

  /**
   * Convert boolean for database storage
   */
  formatBoolean(value: boolean): boolean | number {
    if (this.databaseType === "sqlite") {
      // SQLite stores booleans as 0/1
      return value ? 1 : 0;
    }
    // PostgreSQL has native boolean
    return value;
  }

  /**
   * Parse boolean from database
   */
  parseBoolean(value: any): boolean {
    if (this.databaseType === "sqlite") {
      // SQLite returns 0/1
      return value === 1 || value === "1" || value === true;
    }
    // PostgreSQL returns native boolean
    return value === true;
  }

  /**
   * Format date for database storage
   */
  formatDate(date: Date | string): string {
    if (typeof date === "string") {
      date = new Date(date);
    }
    
    if (this.databaseType === "sqlite") {
      // SQLite prefers ISO string format
      return date.toISOString();
    }
    // PostgreSQL can handle both but prefers ISO format
    return date.toISOString();
  }

  /**
   * Parse date from database
   */
  parseDate(value: any): Date | null {
    if (!value) return null;
    
    try {
      if (this.databaseType === "sqlite" && typeof value === "number") {
        // SQLite might store as Unix timestamp
        return new Date(value * 1000);
      }
      return new Date(value);
    } catch (error) {
      logger.error("Failed to parse date:", error);
      return null;
    }
  }

  /**
   * Format JSON for database storage
   */
  formatJson(obj: any): string | any {
    if (this.databaseType === "sqlite") {
      // SQLite stores JSON as TEXT
      return JSON.stringify(obj);
    }
    // PostgreSQL JSONB can accept objects directly
    return obj;
  }

  /**
   * Parse JSON from database
   */
  parseJson(value: any): any {
    if (!value) return null;
    
    if (this.databaseType === "sqlite" && typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (error) {
        logger.error("Failed to parse JSON:", error);
        return null;
      }
    }
    // PostgreSQL returns parsed object
    return value;
  }

  /**
   * Format array for database storage (for tags)
   */
  formatArray(arr: string[]): string | string[] {
    if (this.databaseType === "sqlite") {
      // SQLite stores arrays as JSON
      return JSON.stringify(arr);
    }
    // PostgreSQL can use native arrays or JSONB
    return arr;
  }

  /**
   * Parse array from database
   */
  parseArray(value: any): string[] {
    if (!value) return [];
    
    if (this.databaseType === "sqlite" && typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch (error) {
        logger.error("Failed to parse array:", error);
        return [];
      }
    }
    // PostgreSQL returns native array
    return Array.isArray(value) ? value : [];
  }

  /**
   * Build case-insensitive search condition
   */
  buildCaseInsensitiveSearch(column: string, value: string): string {
    if (this.databaseType === "postgres") {
      // PostgreSQL needs ILIKE for case-insensitive
      return `${column} ILIKE '%${value}%'`;
    }
    // SQLite LIKE is case-insensitive by default
    return `${column} LIKE '%${value}%'`;
  }

  /**
   * Get current database type
   */
  getDatabaseType(): "sqlite" | "postgres" | "unknown" {
    return this.databaseType;
  }
}

// Export singleton instance
export const dbCompat = new DatabaseCompatibilityService(); 