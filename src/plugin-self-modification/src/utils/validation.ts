import { type CharacterDiff, type ValidationResult } from "../types";

const IMMUTABLE_FIELDS = ["name", "id"];
const MAX_BIO_LENGTH = 1000;
const MAX_ARRAY_ITEMS = 50;
const MAX_SYSTEM_PROMPT_LENGTH = 2000;

export function validateCharacterDiff(diff: CharacterDiff): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate operations
  for (const op of diff.operations) {
    // Check immutable fields
    for (const field of IMMUTABLE_FIELDS) {
      if (op.path.includes(field)) {
        errors.push(`Cannot modify immutable field: ${field}`);
      }
    }

    // Validate specific paths
    if (op.path.includes("bio") && op.type !== "delete") {
      if (typeof op.value === "string" && op.value.length > MAX_BIO_LENGTH) {
        errors.push(`Bio entry too long (max ${MAX_BIO_LENGTH} characters)`);
      }
    }

    if (op.path.includes("system") && op.type === "modify") {
      if (
        typeof op.value === "string" &&
        op.value.length > MAX_SYSTEM_PROMPT_LENGTH
      ) {
        errors.push(
          `System prompt too long (max ${MAX_SYSTEM_PROMPT_LENGTH} characters)`,
        );
      }
      if (!op.value || op.value.trim().length === 0) {
        errors.push("System prompt cannot be empty");
      }
    }

    // Validate array operations
    if (op.path.includes("[]") && op.type === "add") {
      const arrayPath = op.path.split("[")[0];
      if (arrayPath.includes("messageExamples")) {
        warnings.push(
          "Modifying message examples may affect agent behavior consistency",
        );
      }
    }

    // Type validation
    if (op.dataType) {
      if (!validateDataType(op.value, op.dataType)) {
        errors.push(
          `Invalid value type for ${op.path}: expected ${op.dataType}`,
        );
      }
    }
  }

  // Validate reasoning
  if (!diff.reasoning || diff.reasoning.trim().length === 0) {
    errors.push("Modification must include reasoning");
  }

  // Check for potentially dangerous changes
  const systemModifications = diff.operations.filter(
    (op) => op.path.includes("system") && op.type === "modify",
  );

  if (systemModifications.length > 0) {
    warnings.push(
      "System prompt modifications can significantly alter agent behavior",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateDataType(value: any, expectedType: string): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    default:
      return true;
  }
}

export function validateModificationRate(
  recentModifications: { timestamp: Date }[],
  maxPerHour: number = 5,
  maxPerDay: number = 20,
): boolean {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const modificationsInLastHour = recentModifications.filter(
    (mod) => mod.timestamp > oneHourAgo,
  ).length;

  const modificationsInLastDay = recentModifications.filter(
    (mod) => mod.timestamp > oneDayAgo,
  ).length;

  return (
    modificationsInLastHour < maxPerHour && modificationsInLastDay < maxPerDay
  );
}
