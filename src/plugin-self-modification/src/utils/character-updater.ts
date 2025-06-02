import { JSONPath } from "jsonpath-plus";
import { type Character } from "@elizaos/core";
import { type ModificationOperation } from "../types";

export function applyOperationsToCharacter(
  character: Character,
  operations: ModificationOperation[],
): Character {
  // Deep clone to avoid mutating original
  const updatedCharacter = JSON.parse(JSON.stringify(character));

  for (const op of operations) {
    try {
      switch (op.type) {
        case "add":
          addValue(updatedCharacter, op.path, op.value);
          break;
        case "modify":
          modifyValue(updatedCharacter, op.path, op.value);
          break;
        case "delete":
          deleteValue(updatedCharacter, op.path);
          break;
      }
    } catch (error) {
      throw new Error(
        `Failed to apply operation ${op.type} at path ${op.path}: ${error.message}`,
      );
    }
  }

  return updatedCharacter;
}

function addValue(obj: any, path: string, value: any): void {
  // Convert JSONPath to property path
  const normalizedPath = path.startsWith("$") ? path : `$.${path}`;

  // Handle array append notation
  if (path.includes("[]")) {
    const arrayPath = path.replace("[]", "");
    const normalizedArrayPath = arrayPath.startsWith("$") ? arrayPath : `$.${arrayPath}`;
    
    // Try to get the existing array
    const results = JSONPath({ path: normalizedArrayPath, json: obj });

    if (results.length > 0 && Array.isArray(results[0])) {
      // Array exists, append to it
      results[0].push(value);
    } else {
      // Array doesn't exist, create it
      if (arrayPath.includes(".")) {
        // Nested path like "style.all[]"
        const parentPath = normalizedArrayPath.substring(0, normalizedArrayPath.lastIndexOf("."));
        const propertyName = arrayPath.substring(arrayPath.lastIndexOf(".") + 1);
        const parentResults = JSONPath({ path: parentPath, json: obj });
        
        if (parentResults.length > 0) {
          parentResults[0][propertyName] = [value];
        }
      } else {
        // Top-level path like "lore[]"
        obj[arrayPath] = [value];
      }
    }
  } else {
    // Regular property addition
    const parentPath = normalizedPath.substring(
      0,
      normalizedPath.lastIndexOf("."),
    );
    const propertyName = normalizedPath.substring(
      normalizedPath.lastIndexOf(".") + 1,
    );
    const parent = JSONPath({ path: parentPath, json: obj })[0];

    if (parent) {
      parent[propertyName] = value;
    }
  }
}

function modifyValue(obj: any, path: string, value: any): void {
  const normalizedPath = path.startsWith("$") ? path : `$.${path}`;
  let found = false;

  JSONPath({
    path: normalizedPath,
    json: obj,
    callback: function (val, type, payload) {
      if (payload && payload.parent && payload.parentProperty !== undefined) {
        payload.parent[payload.parentProperty] = value;
        found = true;
      }
    },
  });
  
  if (!found) {
    throw new Error(`Path ${path} does not exist`);
  }
}

function deleteValue(obj: any, path: string): void {
  const normalizedPath = path.startsWith("$") ? path : `$.${path}`;

  JSONPath({
    path: normalizedPath,
    json: obj,
    callback: function (val, type, payload) {
      if (payload && payload.parent) {
        if (Array.isArray(payload.parent)) {
          // For arrays, remove by index
          const index = parseInt(payload.parentProperty);
          if (!isNaN(index)) {
            payload.parent.splice(index, 1);
          }
        } else {
          // For objects, delete property
          delete payload.parent[payload.parentProperty];
        }
      }
    },
  });
}

export function validateCharacterStructure(character: any): boolean {
  // Basic validation to ensure required fields exist
  if (!character.name || typeof character.name !== "string") {
    return false;
  }

  // Ensure arrays are arrays
  const arrayFields = [
    "bio",
    "lore",
    "messageExamples",
    "postExamples",
    "topics",
    "adjectives",
  ];
  for (const field of arrayFields) {
    if (character[field] && !Array.isArray(character[field])) {
      // Special case: bio can be string or array
      if (field === "bio" && typeof character[field] === "string") {
        continue;
      }
      return false;
    }
  }

  // Validate style structure if present
  if (character.style) {
    if (typeof character.style !== "object") {
      return false;
    }
    const styleFields = ["all", "chat", "post"];
    for (const field of styleFields) {
      if (character.style[field] && !Array.isArray(character.style[field])) {
        return false;
      }
    }
  }

  return true;
}
