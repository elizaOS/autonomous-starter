export interface EnvVarConfig {
  value?: string;
  type:
    | "api_key"
    | "private_key"
    | "public_key"
    | "url"
    | "credential"
    | "config"
    | "secret";
  required: boolean;
  description: string;
  canGenerate: boolean;
  validationMethod?: string;
  status: "missing" | "generating" | "validating" | "invalid" | "valid";
  lastError?: string;
  attempts: number;
  createdAt?: number;
  validatedAt?: number;
  plugin: string;
}

export interface EnvVarMetadata {
  [pluginName: string]: {
    [varName: string]: EnvVarConfig;
  };
}

export interface GenerationScript {
  variableName: string;
  pluginName: string;
  script: string;
  dependencies: string[];
  attempts: number;
  output?: string;
  error?: string;
  status: "pending" | "running" | "success" | "failed";
  createdAt: number;
}

export interface GenerationScriptMetadata {
  [scriptId: string]: GenerationScript;
}

export interface EnvVarUpdate {
  pluginName: string;
  variableName: string;
  value: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: string;
}
