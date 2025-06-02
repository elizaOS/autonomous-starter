import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { type CharacterDiff, type ModificationOperation } from "../types";

// Configure parser with security settings
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: true,
  trimValues: true,
  // Security settings to prevent XXE attacks
  processEntities: false,
  stopNodes: ["*.script", "*.style"],
  parseTagValue: true,
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  format: true,
  indentBy: "  ",
  suppressEmptyNode: true,
  suppressBooleanAttributes: false,
});

// Sanitize XML input to prevent injection attacks
function sanitizeXml(xmlString: string): string {
  // Remove DOCTYPE declarations which could be used for XXE
  let sanitized = xmlString.replace(/<!DOCTYPE[^>]*>/gi, "");

  // Remove any entity declarations
  sanitized = sanitized.replace(/<!ENTITY[^>]*>/gi, "");

  // Remove processing instructions except xml declaration
  sanitized = sanitized.replace(/<\?(?!xml)[^>]*\?>/gi, "");

  // Remove CDATA sections that might contain malicious content
  sanitized = sanitized.replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, (match) => {
    // Extract content and escape it
    const content = match.slice(9, -3);
    return escapeXml(content);
  });

  return sanitized;
}

// Escape special XML characters
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Validate operation type
function isValidOperationType(
  type: string,
): type is "add" | "modify" | "delete" {
  return ["add", "modify", "delete"].includes(type);
}

export function parseCharacterDiff(xmlString: string): CharacterDiff {
  try {
    // Sanitize input first
    const sanitizedXml = sanitizeXml(xmlString);

    // Parse the sanitized XML
    const parsed = parser.parse(sanitizedXml);
    const root = parsed["character-modification"];

    if (!root) {
      throw new Error(
        "Invalid XML: missing character-modification root element",
      );
    }

    const operations: ModificationOperation[] = [];
    const opsRoot = root.operations;

    if (opsRoot) {
      // Handle single operation or array of operations
      const processOperation = (op: any, type: string) => {
        if (!isValidOperationType(type)) {
          throw new Error(`Invalid operation type: ${type}`);
        }

        const items = Array.isArray(op) ? op : [op];
        items.forEach((item: any) => {
          // Validate path format
          const path = item["@_path"];
          if (!path || typeof path !== "string") {
            throw new Error(`Invalid path in ${type} operation`);
          }

          // Basic path validation - should not contain dangerous patterns
          if (path.includes("..") || path.includes("//")) {
            throw new Error(`Dangerous path pattern detected: ${path}`);
          }

          const operation: ModificationOperation = {
            type,
            path,
          };
          
          // Only add value for add and modify operations
          if (type !== "delete") {
            operation.value = item["#text"] || item;
            operation.dataType = item["@_type"];
          }
          
          operations.push(operation);
        });
      };

      // Check for any unknown operation types
      const validOps = ["add", "modify", "delete"];
      const opsKeys = Object.keys(opsRoot);
      for (const key of opsKeys) {
        if (!validOps.includes(key)) {
          throw new Error(`Invalid operation type: ${key}`);
        }
      }

      if (opsRoot.add) processOperation(opsRoot.add, "add");
      if (opsRoot.modify) processOperation(opsRoot.modify, "modify");
      if (opsRoot.delete) processOperation(opsRoot.delete, "delete");
    }

    // Validate reasoning
    const reasoning = root.reasoning;
    if (
      !reasoning ||
      typeof reasoning !== "string" ||
      reasoning.trim().length === 0
    ) {
      throw new Error("Missing or empty reasoning in character modification");
    }

    return {
      operations,
      reasoning: reasoning.trim(),
      timestamp: root.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(
      `Failed to parse character diff XML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function buildCharacterDiffXml(diff: CharacterDiff): string {
  // Validate diff before building
  if (!diff.reasoning || diff.reasoning.trim().length === 0) {
    throw new Error("Reasoning is required for character modifications");
  }

  if (!Array.isArray(diff.operations)) {
    throw new Error("Operations must be an array");
  }

  // Validate each operation has a valid path
  for (const op of diff.operations) {
    if (!op.path || typeof op.path !== "string") {
      throw new Error(`Invalid path in operation: ${JSON.stringify(op)}`);
    }
  }

  const xmlObj = {
    "character-modification": {
      operations: {
        add: diff.operations
          .filter((op) => op.type === "add")
          .map((op) => ({
            "@_path": op.path,
            "@_type": op.dataType || "string",
            "#text": op.value,
          })),
        modify: diff.operations
          .filter((op) => op.type === "modify")
          .map((op) => ({
            "@_path": op.path,
            "@_type": op.dataType || "string",
            "#text": op.value,
          })),
        delete: diff.operations
          .filter((op) => op.type === "delete")
          .map((op) => ({
            "@_path": op.path,
          })),
      },
      reasoning: diff.reasoning,
      timestamp: diff.timestamp,
    },
  };

  // Remove empty operation arrays
  const ops = xmlObj["character-modification"].operations;
  if (ops.add.length === 0) delete ops.add;
  if (ops.modify.length === 0) delete ops.modify;
  if (ops.delete.length === 0) delete ops.delete;

  try {
    return builder.build(xmlObj);
  } catch (error) {
    throw new Error(
      `Failed to build character diff XML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
