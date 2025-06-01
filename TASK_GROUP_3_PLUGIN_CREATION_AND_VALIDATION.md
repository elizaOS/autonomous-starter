# Task Group 3: Plugin Creation, Testing, & Validation Loop

## Overview

This implementation enables ElizaOS agents to autonomously create new plugins using AI-driven development, automated testing, and iterative refinement. The system manages the entire lifecycle from specification to deployment, ensuring plugins meet quality standards before activation.

## Architecture

### Core Components

1. **Plugin Creation Service** - Orchestrates the plugin creation workflow
2. **AI Code Generator** - Interfaces with Claude for code generation
3. **Build & Test Pipeline** - Automated compilation, linting, and testing
4. **Validation Engine** - AI-powered code review and quality assurance
5. **Job Management** - Tracks creation progress and handles failures

### Data Flow

```
Specification → AI Generation → Build → Lint → Test → Validate → Iterate → Deploy
```

## Detailed Implementation

### 1. Plugin Creation Service

**File:** `packages/core/src/services/plugin-creation-service.ts`

```typescript
import { Service, type IAgentRuntime, logger } from '@elizaos/core';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';

export interface PluginSpecification {
  name: string;
  description: string;
  version: string;
  actions?: Array<{
    name: string;
    description: string;
    parameters?: Record<string, any>;
  }>;
  providers?: Array<{
    name: string;
    description: string;
    dataStructure?: Record<string, any>;
  }>;
  services?: Array<{
    name: string;
    description: string;
    methods?: string[];
  }>;
  evaluators?: Array<{
    name: string;
    description: string;
    triggers?: string[];
  }>;
  dependencies?: Record<string, string>;
  environmentVariables?: Array<{
    name: string;
    description: string;
    required: boolean;
    sensitive: boolean;
  }>;
}

export interface PluginCreationJob {
  jobId: string;
  pluginName: string;
  specification: PluginSpecification;
  status: 'queued' | 'generating' | 'building' | 'linting' | 'testing' | 
          'validating' | 'iterating' | 'success' | 'failed';
  currentIteration: number;
  maxIterations: number;
  outputPath: string;
  errors: Array<{
    iteration: number;
    phase: string;
    error: string;
    timestamp: Date;
  }>;
  testResults?: {
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    failures?: Array<{
      test: string;
      error: string;
    }>;
  };
  validationReport?: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  startedAt: Date;
  completedAt?: Date;
  childProcess?: ChildProcess;
}

export class PluginCreationService extends Service {
  private creationJobs: Map<string, PluginCreationJob> = new Map();
  private anthropic: Anthropic | null = null;
  private maxIterations = 5;
  
  static serviceName = 'pluginCreation';

  async initialize(): Promise<void> {
    logger.info('Initializing PluginCreationService');
    
    // Initialize Anthropic if API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    } else {
      logger.warn('ANTHROPIC_API_KEY not found, plugin creation will require manual coding');
    }
    
    // Ensure workspace directories exist
    await this.ensureWorkspaceDirs();
  }

  async start(): Promise<void> {
    logger.info('Starting PluginCreationService');
  }

  async stop(): Promise<void> {
    logger.info('Stopping PluginCreationService');
    
    // Terminate any running jobs
    for (const job of this.creationJobs.values()) {
      if (job.childProcess && !job.childProcess.killed) {
        job.childProcess.kill();
      }
    }
  }

  async createPlugin(specification: PluginSpecification): Promise<PluginCreationJob> {
    const jobId = uuidv4();
    const outputPath = path.join(
      this.runtime.getDataDir(),
      'plugin_dev_workspace',
      jobId
    );
    
    const job: PluginCreationJob = {
      jobId,
      pluginName: specification.name,
      specification,
      status: 'queued',
      currentIteration: 0,
      maxIterations: this.maxIterations,
      outputPath,
      errors: [],
      startedAt: new Date()
    };
    
    this.creationJobs.set(jobId, job);
    
    // Start creation process in background
    this.runCreationProcess(job).catch(error => {
      logger.error(`Plugin creation job ${jobId} failed:`, error);
      job.status = 'failed';
      job.errors.push({
        iteration: job.currentIteration,
        phase: 'process',
        error: error.message,
        timestamp: new Date()
      });
    });
    
    return job;
  }

  private async runCreationProcess(job: PluginCreationJob): Promise<void> {
    try {
      // Setup workspace
      await this.setupPluginWorkspace(job);
      
      // Run creation loop
      let success = false;
      while (job.currentIteration < job.maxIterations && !success) {
        job.currentIteration++;
        logger.info(`Plugin creation iteration ${job.currentIteration}/${job.maxIterations} for ${job.pluginName}`);
        
        success = await this.runSingleIteration(job);
        
        if (!success && job.currentIteration < job.maxIterations) {
          // Prepare for next iteration
          job.status = 'iterating';
          await this.prepareNextIteration(job);
        }
      }
      
      if (success) {
        job.status = 'success';
        job.completedAt = new Date();
        logger.success(`Plugin ${job.pluginName} created successfully!`);
        
        // Notify plugin management service
        await this.notifyPluginReady(job);
      } else {
        job.status = 'failed';
        job.completedAt = new Date();
        logger.error(`Plugin ${job.pluginName} creation failed after ${job.maxIterations} iterations`);
      }
    } catch (error) {
      logger.error(`Unexpected error in plugin creation:`, error);
      job.status = 'failed';
      job.errors.push({
        iteration: job.currentIteration,
        phase: 'process',
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  private async runSingleIteration(job: PluginCreationJob): Promise<boolean> {
    try {
      // Phase 1: Generate/update code
      job.status = 'generating';
      await this.generatePluginCode(job);
      
      // Phase 2: Build
      job.status = 'building';
      const buildSuccess = await this.buildPlugin(job);
      if (!buildSuccess) return false;
      
      // Phase 3: Lint
      job.status = 'linting';
      const lintSuccess = await this.lintPlugin(job);
      if (!lintSuccess) return false;
      
      // Phase 4: Test
      job.status = 'testing';
      const testSuccess = await this.testPlugin(job);
      if (!testSuccess) return false;
      
      // Phase 5: Validate
      job.status = 'validating';
      const validationSuccess = await this.validatePlugin(job);
      if (!validationSuccess) return false;
      
      return true;
    } catch (error) {
      job.errors.push({
        iteration: job.currentIteration,
        phase: job.status,
        error: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  private async setupPluginWorkspace(job: PluginCreationJob): Promise<void> {
    await fs.ensureDir(job.outputPath);
    
    // Create package.json
    const packageJson = {
      name: job.specification.name,
      version: job.specification.version,
      description: job.specification.description,
      main: "dist/index.js",
      types: "dist/index.d.ts",
      scripts: {
        build: "tsc",
        test: "vitest run",
        lint: "eslint src/**/*.ts",
        dev: "tsc --watch"
      },
      dependencies: {
        "@elizaos/core": "^1.0.0",
        ...job.specification.dependencies
      },
      devDependencies: {
        "@types/node": "^20.0.0",
        "typescript": "^5.0.0",
        "vitest": "^1.0.0",
        "eslint": "^8.0.0",
        "@typescript-eslint/parser": "^6.0.0",
        "@typescript-eslint/eslint-plugin": "^6.0.0"
      },
      elizaos: {
        environmentVariables: job.specification.environmentVariables || []
      }
    };
    
    await fs.writeJson(path.join(job.outputPath, 'package.json'), packageJson, { spaces: 2 });
    
    // Create tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: "ES2022",
        module: "commonjs",
        lib: ["ES2022"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        resolveJsonModule: true
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist", "**/*.test.ts"]
    };
    
    await fs.writeJson(path.join(job.outputPath, 'tsconfig.json'), tsConfig, { spaces: 2 });
    
    // Create src directory
    await fs.ensureDir(path.join(job.outputPath, 'src'));
    await fs.ensureDir(path.join(job.outputPath, 'src', '__tests__'));
    
    // Create .eslintrc
    const eslintConfig = {
      parser: "@typescript-eslint/parser",
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
      ],
      env: {
        node: true,
        es2022: true
      },
      rules: {
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
      }
    };
    
    await fs.writeJson(path.join(job.outputPath, '.eslintrc.json'), eslintConfig, { spaces: 2 });
    
    // Create vitest.config.ts
    const vitestConfig = `
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html']
    }
  }
});
`;
    
    await fs.writeFile(path.join(job.outputPath, 'vitest.config.ts'), vitestConfig.trim());
  }

  private async generatePluginCode(job: PluginCreationJob): Promise<void> {
    if (!this.anthropic) {
      throw new Error('AI code generation not available without ANTHROPIC_API_KEY');
    }
    
    const isFirstIteration = job.currentIteration === 1;
    const previousErrors = job.errors.filter(e => e.iteration === job.currentIteration - 1);
    
    let prompt = '';
    
    if (isFirstIteration) {
      prompt = this.generateInitialPrompt(job.specification);
    } else {
      prompt = this.generateIterationPrompt(job, previousErrors);
    }
    
    const message = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 8192,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    // Extract code from response
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    
    // Parse and write files
    await this.writeGeneratedCode(job, responseText);
  }

  private generateInitialPrompt(spec: PluginSpecification): string {
    return `You are creating an ElizaOS plugin with the following specification:

Name: ${spec.name}
Description: ${spec.description}
Version: ${spec.version}

${spec.actions ? `Actions:
${spec.actions.map(a => `- ${a.name}: ${a.description}`).join('\n')}` : ''}

${spec.providers ? `Providers:
${spec.providers.map(p => `- ${p.name}: ${p.description}`).join('\n')}` : ''}

${spec.services ? `Services:
${spec.services.map(s => `- ${s.name}: ${s.description}`).join('\n')}` : ''}

${spec.evaluators ? `Evaluators:
${spec.evaluators.map(e => `- ${e.name}: ${e.description}`).join('\n')}` : ''}

Create a complete ElizaOS plugin implementation following these requirements:

1. Create src/index.ts that exports the plugin object
2. Implement all specified components (actions, providers, services, evaluators)
3. Follow ElizaOS plugin structure and conventions
4. Include proper TypeScript types
5. Add comprehensive error handling
6. Create unit tests for each component in src/__tests__/
7. Ensure all imports use @elizaos/core
8. No stubs or incomplete implementations
9. All code must be production-ready

Provide the complete implementation with file paths clearly marked.`;
  }

  private generateIterationPrompt(job: PluginCreationJob, errors: any[]): string {
    const errorSummary = errors.map(e => `
Phase: ${e.phase}
Error: ${e.error}
`).join('\n');
    
    return `The ElizaOS plugin ${job.pluginName} has the following errors that need to be fixed:

${errorSummary}

Current plugin specification:
${JSON.stringify(job.specification, null, 2)}

Please fix all the errors by:
1. Addressing each specific error mentioned
2. Ensuring the code compiles (TypeScript)
3. Fixing any linting issues
4. Making sure all tests pass
5. Following ElizaOS conventions

Provide the updated code with file paths clearly marked.`;
  }

  private async writeGeneratedCode(job: PluginCreationJob, responseText: string): Promise<void> {
    // Parse response for file blocks
    const fileRegex = /```(?:typescript|ts|javascript|js)?\s*\n(?:\/\/\s*)?(?:File:\s*)?(.+?)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = fileRegex.exec(responseText)) !== null) {
      const filePath = match[1].trim();
      const fileContent = match[2].trim();
      
      // Ensure file path is relative to src/
      const normalizedPath = filePath.startsWith('src/') ? filePath : `src/${filePath}`;
      const fullPath = path.join(job.outputPath, normalizedPath);
      
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, fileContent);
    }
    
    // If no files were parsed, try to extract the main index.ts
    if (!responseText.includes('File:') && !responseText.includes('```')) {
      // Assume the entire response is the index.ts content
      const indexPath = path.join(job.outputPath, 'src', 'index.ts');
      await fs.writeFile(indexPath, responseText);
    }
  }

  private async buildPlugin(job: PluginCreationJob): Promise<boolean> {
    try {
      // Install dependencies first
      await this.runCommand(job, 'npm', ['install'], 'Installing dependencies');
      
      // Run TypeScript compilation
      const { success, output } = await this.runCommand(job, 'npm', ['run', 'build'], 'Building plugin');
      
      if (!success) {
        job.errors.push({
          iteration: job.currentIteration,
          phase: 'building',
          error: output,
          timestamp: new Date()
        });
        return false;
      }
      
      return true;
    } catch (error) {
      job.errors.push({
        iteration: job.currentIteration,
        phase: 'building',
        error: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  private async lintPlugin(job: PluginCreationJob): Promise<boolean> {
    try {
      const { success, output } = await this.runCommand(job, 'npm', ['run', 'lint'], 'Linting plugin');
      
      if (!success) {
        job.errors.push({
          iteration: job.currentIteration,
          phase: 'linting',
          error: output,
          timestamp: new Date()
        });
        return false;
      }
      
      return true;
    } catch (error) {
      job.errors.push({
        iteration: job.currentIteration,
        phase: 'linting',
        error: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  private async testPlugin(job: PluginCreationJob): Promise<boolean> {
    try {
      const { success, output } = await this.runCommand(job, 'npm', ['test'], 'Running tests');
      
      // Parse test results
      const testResults = this.parseTestResults(output);
      job.testResults = testResults;
      
      if (!success || testResults.failed > 0) {
        job.errors.push({
          iteration: job.currentIteration,
          phase: 'testing',
          error: `${testResults.failed} tests failed`,
          timestamp: new Date()
        });
        return false;
      }
      
      return true;
    } catch (error) {
      job.errors.push({
        iteration: job.currentIteration,
        phase: 'testing',
        error: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  private async validatePlugin(job: PluginCreationJob): Promise<boolean> {
    if (!this.anthropic) {
      // Skip AI validation if no API key
      logger.warn('Skipping AI validation - no ANTHROPIC_API_KEY');
      return true;
    }
    
    try {
      // Collect all generated code
      const codeFiles = await this.collectCodeFiles(job.outputPath);
      
      const validationPrompt = `Review this ElizaOS plugin for production readiness:

Plugin: ${job.pluginName}
Specification: ${JSON.stringify(job.specification, null, 2)}

Generated Code:
${codeFiles.map(f => `
File: ${f.path}
\`\`\`typescript
${f.content}
\`\`\`
`).join('\n')}

Evaluate:
1. Does it implement all specified features?
2. Is the code complete without stubs?
3. Does it follow ElizaOS conventions?
4. Is error handling comprehensive?
5. Are the tests adequate?
6. Is it production ready?

Respond with JSON:
{
  "score": 0-100,
  "production_ready": boolean,
  "issues": ["list of issues"],
  "suggestions": ["list of improvements"]
}`;
      
      const message = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: validationPrompt
          }
        ]
      });
      
      const responseText = message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
      
      const validation = JSON.parse(responseText);
      job.validationReport = validation;
      
      if (!validation.production_ready) {
        job.errors.push({
          iteration: job.currentIteration,
          phase: 'validating',
          error: `Score: ${validation.score}/100. Issues: ${validation.issues.join(', ')}`,
          timestamp: new Date()
        });
        return false;
      }
      
      return true;
    } catch (error) {
      job.errors.push({
        iteration: job.currentIteration,
        phase: 'validating',
        error: error.message,
        timestamp: new Date()
      });
      return false;
    }
  }

  private async runCommand(
    job: PluginCreationJob,
    command: string,
    args: string[],
    description: string
  ): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      logger.info(`${description} for ${job.pluginName}`);
      
      let output = '';
      const child = spawn(command, args, {
        cwd: job.outputPath,
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output
        });
      });
      
      // Store process reference
      job.childProcess = child;
    });
  }

  private parseTestResults(output: string): any {
    // Parse vitest output
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);
    const durationMatch = output.match(/Duration (\d+\.?\d*)s/);
    
    const results = {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      duration: durationMatch ? parseFloat(durationMatch[1]) : 0,
      failures: [] as any[]
    };
    
    // Extract failure details if any
    if (results.failed > 0) {
      const failureRegex = /FAIL\s+(.+?)\s+›\s+(.+?)(?:\n|$)/g;
      let match;
      while ((match = failureRegex.exec(output)) !== null) {
        results.failures.push({
          test: `${match[1]} › ${match[2]}`,
          error: 'See full output for details'
        });
      }
    }
    
    return results;
  }

  private async collectCodeFiles(dirPath: string): Promise<Array<{ path: string; content: string }>> {
    const files: Array<{ path: string; content: string }> = [];
    
    const collectRecursive = async (currentPath: string, basePath: string) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        if (entry.isDirectory()) {
          if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
            await collectRecursive(fullPath, basePath);
          }
        } else if (entry.isFile() && /\.(ts|js|json)$/.test(entry.name)) {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({ path: relativePath, content });
        }
      }
    };
    
    await collectRecursive(dirPath, dirPath);
    return files;
  }

  private async prepareNextIteration(job: PluginCreationJob): Promise<void> {
    // Clean up failed build artifacts
    const distPath = path.join(job.outputPath, 'dist');
    if (await fs.pathExists(distPath)) {
      await fs.remove(distPath);
    }
    
    // Log iteration summary
    logger.info(`Iteration ${job.currentIteration} summary for ${job.pluginName}:`);
    const iterationErrors = job.errors.filter(e => e.iteration === job.currentIteration);
    iterationErrors.forEach(e => {
      logger.error(`  - ${e.phase}: ${e.error}`);
    });
  }

  private async notifyPluginReady(job: PluginCreationJob): Promise<void> {
    // Notify plugin management service
    const pluginService = this.runtime.getService('pluginManagement') as any;
    if (pluginService) {
      try {
        // Install the newly created plugin
        await pluginService.installPlugin(job.outputPath);
        logger.success(`Plugin ${job.pluginName} installed from ${job.outputPath}`);
      } catch (error) {
        logger.error(`Failed to install newly created plugin:`, error);
      }
    }
  }

  private async ensureWorkspaceDirs(): Promise<void> {
    const workspaceDir = path.join(this.runtime.getDataDir(), 'plugin_dev_workspace');
    await fs.ensureDir(workspaceDir);
  }

  // Public API methods

  getJob(jobId: string): PluginCreationJob | undefined {
    return this.creationJobs.get(jobId);
  }

  listJobs(): PluginCreationJob[] {
    return Array.from(this.creationJobs.values());
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.creationJobs.get(jobId);
    if (!job) return false;
    
    if (job.childProcess && !job.childProcess.killed) {
      job.childProcess.kill();
    }
    
    job.status = 'failed';
    job.errors.push({
      iteration: job.currentIteration,
      phase: 'cancelled',
      error: 'Job cancelled by user',
      timestamp: new Date()
    });
    
    return true;
  }
}
```

### 2. Plugin Creation Providers

**File:** `packages/core/src/providers/plugin-creation-providers.ts`

```typescript
import { type IProvider, type IAgentRuntime } from '@elizaos/core';
import { PluginCreationService } from '../services/plugin-creation-service';

export const pluginCreationJobsProvider: IProvider = {
  name: 'pluginCreationJobs',
  description: 'Provides status of active plugin creation jobs',
  
  async getContext(runtime: IAgentRuntime): Promise<string> {
    const creationService = runtime.getService(PluginCreationService.serviceName) as PluginCreationService;
    
    if (!creationService) {
      return 'Plugin creation service not available';
    }
    
    const jobs = creationService.listJobs();
    
    const jobSummaries = jobs.map(job => ({
      id: job.jobId,
      plugin: job.pluginName,
      status: job.status,
      iteration: `${job.currentIteration}/${job.maxIterations}`,
      errors: job.errors.length,
      testResults: job.testResults ? {
        passed: job.testResults.passed,
        failed: job.testResults.failed
      } : null,
      validationScore: job.validationReport?.score || null,
      duration: job.completedAt ? 
        `${Math.round((job.completedAt.getTime() - job.startedAt.getTime()) / 1000)}s` : 
        'in progress'
    }));
    
    return JSON.stringify(jobSummaries, null, 2);
  }
};

export const pluginCreationCapabilitiesProvider: IProvider = {
  name: 'pluginCreationCapabilities',
  description: 'Provides information about plugin creation capabilities',
  
  async getContext(runtime: IAgentRuntime): Promise<string> {
    const hasAI = !!process.env.ANTHROPIC_API_KEY;
    
    return JSON.stringify({
      aiCodeGeneration: hasAI,
      supportedComponents: ['actions', 'providers', 'services', 'evaluators', 'tasks'],
      buildTools: ['typescript', 'vitest', 'eslint'],
      maxIterations: 5,
      testFramework: 'vitest',
      codeStandards: 'ElizaOS conventions',
      outputFormat: 'TypeScript ES modules'
    }, null, 2);
  }
};
```

### 3. Plugin Creation Actions

**File:** `packages/core/src/actions/plugin-creation-actions.ts`

```typescript
import { type Action, type IAgentRuntime, type ActionInput, logger } from '@elizaos/core';
import { PluginCreationService, type PluginSpecification } from '../services/plugin-creation-service';
import { z } from 'zod';

export const createPluginAction: Action = {
  name: 'createPlugin',
  description: 'Create a new ElizaOS plugin from specification',
  
  similes: [
    'create new plugin',
    'generate plugin',
    'build custom plugin'
  ],
  
  inputSchema: z.object({
    name: z.string().describe('Plugin name (e.g., @elizaos/plugin-example)'),
    description: z.string().describe('Plugin description'),
    version: z.string().default('1.0.0').describe('Plugin version'),
    actions: z.array(z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.any()).optional()
    })).optional().describe('Actions to implement'),
    providers: z.array(z.object({
      name: z.string(),
      description: z.string(),
      dataStructure: z.record(z.any()).optional()
    })).optional().describe('Providers to implement'),
    services: z.array(z.object({
      name: z.string(),
      description: z.string(),
      methods: z.array(z.string()).optional()
    })).optional().describe('Services to implement'),
    evaluators: z.array(z.object({
      name: z.string(),
      description: z.string(),
      triggers: z.array(z.string()).optional()
    })).optional().describe('Evaluators to implement'),
    dependencies: z.record(z.string()).optional().describe('Additional npm dependencies'),
    environmentVariables: z.array(z.object({
      name: z.string(),
      description: z.string(),
      required: z.boolean(),
      sensitive: z.boolean()
    })).optional().describe('Required environment variables')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const specification = input as PluginSpecification;
    
    const creationService = runtime.getService(PluginCreationService.serviceName) as PluginCreationService;
    
    if (!creationService) {
      return 'Plugin creation service not available';
    }
    
    try {
      const job = await creationService.createPlugin(specification);
      
      return `Plugin creation job started!
      
Job ID: ${job.jobId}
Plugin: ${job.pluginName}
Status: ${job.status}
Output Path: ${job.outputPath}

The plugin is being created with the following components:
${specification.actions ? `- ${specification.actions.length} actions` : ''}
${specification.providers ? `- ${specification.providers.length} providers` : ''}
${specification.services ? `- ${specification.services.length} services` : ''}
${specification.evaluators ? `- ${specification.evaluators.length} evaluators` : ''}

You can check the progress using the checkPluginCreationStatus action with jobId: ${job.jobId}`;
      
    } catch (error) {
      logger.error('Failed to create plugin:', error);
      return `Failed to create plugin: ${error.message}`;
    }
  }
};

export const checkPluginCreationStatusAction: Action = {
  name: 'checkPluginCreationStatus',
  description: 'Check the status of a plugin creation job',
  
  similes: [
    'check plugin creation',
    'plugin creation status',
    'how is plugin creation going'
  ],
  
  inputSchema: z.object({
    jobId: z.string().describe('Plugin creation job ID')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { jobId } = input as { jobId: string };
    
    const creationService = runtime.getService(PluginCreationService.serviceName) as PluginCreationService;
    
    if (!creationService) {
      return 'Plugin creation service not available';
    }
    
    const job = creationService.getJob(jobId);
    
    if (!job) {
      return `No job found with ID: ${jobId}`;
    }
    
    let response = `Plugin Creation Status:
    
Plugin: ${job.pluginName}
Status: ${job.status}
Iteration: ${job.currentIteration}/${job.maxIterations}
Started: ${job.startedAt.toISOString()}`;
    
    if (job.completedAt) {
      response += `\nCompleted: ${job.completedAt.toISOString()}`;
    }
    
    if (job.testResults) {
      response += `\n\nTest Results:
- Passed: ${job.testResults.passed}
- Failed: ${job.testResults.failed}
- Duration: ${job.testResults.duration}s`;
    }
    
    if (job.validationReport) {
      response += `\n\nValidation:
- Score: ${job.validationReport.score}/100
- Issues: ${job.validationReport.issues.length}`;
    }
    
    if (job.errors.length > 0) {
      response += `\n\nRecent Errors:`;
      const recentErrors = job.errors.slice(-3);
      for (const error of recentErrors) {
        response += `\n- [${error.phase}] ${error.error}`;
      }
    }
    
    if (job.status === 'success') {
      response += `\n\n✅ Plugin created successfully at: ${job.outputPath}`;
    } else if (job.status === 'failed') {
      response += `\n\n❌ Plugin creation failed after ${job.currentIteration} iterations`;
    }
    
    return response;
  }
};

export const cancelPluginCreationAction: Action = {
  name: 'cancelPluginCreation',
  description: 'Cancel an active plugin creation job',
  
  similes: [
    'stop plugin creation',
    'cancel plugin generation',
    'abort plugin creation'
  ],
  
  inputSchema: z.object({
    jobId: z.string().describe('Plugin creation job ID to cancel')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { jobId } = input as { jobId: string };
    
    const creationService = runtime.getService(PluginCreationService.serviceName) as PluginCreationService;
    
    if (!creationService) {
      return 'Plugin creation service not available';
    }
    
    const success = await creationService.cancelJob(jobId);
    
    if (success) {
      return `Plugin creation job ${jobId} has been cancelled`;
    } else {
      return `Failed to cancel job ${jobId} - it may not exist or already be completed`;
    }
  }
};

export const createPluginFromDescriptionAction: Action = {
  name: 'createPluginFromDescription',
  description: 'Create a plugin from a natural language description',
  
  similes: [
    'I need a plugin that',
    'create a plugin to',
    'build me a plugin for'
  ],
  
  inputSchema: z.object({
    description: z.string().describe('Natural language description of what the plugin should do')
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    const { description } = input as { description: string };
    
    // Parse description to create specification
    const specification = await parsePluginDescription(description, runtime);
    
    const creationService = runtime.getService(PluginCreationService.serviceName) as PluginCreationService;
    
    if (!creationService) {
      return 'Plugin creation service not available';
    }
    
    try {
      const job = await creationService.createPlugin(specification);
      
      return `I understand you want a plugin that: "${description}"
      
I've started creating a plugin with the following specification:
- Name: ${specification.name}
- Description: ${specification.description}

Job ID: ${job.jobId}

I'll implement the necessary components to achieve this functionality. You can check the progress using jobId: ${job.jobId}`;
      
    } catch (error) {
      logger.error('Failed to create plugin from description:', error);
      return `Failed to create plugin: ${error.message}`;
    }
  }
};

// Helper function to parse natural language description
async function parsePluginDescription(
  description: string,
  runtime: IAgentRuntime
): Promise<PluginSpecification> {
  // This is a simplified parser - in production, could use AI to parse
  const words = description.toLowerCase().split(' ');
  
  // Extract potential plugin name
  let name = '@elizaos/plugin-custom';
  if (words.includes('weather')) name = '@elizaos/plugin-weather';
  else if (words.includes('database')) name = '@elizaos/plugin-database';
  else if (words.includes('api')) name = '@elizaos/plugin-api';
  
  // Detect components needed
  const specification: PluginSpecification = {
    name,
    description: description,
    version: '1.0.0'
  };
  
  // Detect if actions are needed
  if (description.includes('action') || description.includes('command') || description.includes('do')) {
    specification.actions = [{
      name: 'executeTask',
      description: 'Execute the main task of this plugin'
    }];
  }
  
  // Detect if providers are needed
  if (description.includes('provide') || description.includes('information') || description.includes('data')) {
    specification.providers = [{
      name: 'dataProvider',
      description: 'Provide data for the plugin functionality'
    }];
  }
  
  // Detect if services are needed
  if (description.includes('service') || description.includes('background') || description.includes('monitor')) {
    specification.services = [{
      name: 'backgroundService',
      description: 'Background service for plugin operations'
    }];
  }
  
  return specification;
}
```

### 4. Plugin Template Generator

**File:** `packages/core/src/utils/plugin-templates.ts`

```typescript
export const actionTemplate = (name: string, description: string): string => `
import { type Action, type IAgentRuntime, type ActionInput, logger } from '@elizaos/core';
import { z } from 'zod';

export const ${name}Action: Action = {
  name: '${name}',
  description: '${description}',
  
  similes: [
    // Add similar phrases that might trigger this action
  ],
  
  inputSchema: z.object({
    // Define input parameters
  }),
  
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    try {
      // Implement action logic here
      
      return 'Action completed successfully';
    } catch (error) {
      logger.error('Action failed:', error);
      throw error;
    }
  }
};
`;

export const providerTemplate = (name: string, description: string): string => `
import { type IProvider, type IAgentRuntime } from '@elizaos/core';

export const ${name}Provider: IProvider = {
  name: '${name}',
  description: '${description}',
  
  async getContext(runtime: IAgentRuntime): Promise<string> {
    try {
      // Implement provider logic here
      const data = {
        // Collect relevant data
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return 'Provider data unavailable';
    }
  }
};
`;

export const serviceTemplate = (name: string, description: string): string => `
import { Service, type IAgentRuntime, logger } from '@elizaos/core';

export class ${name}Service extends Service {
  static serviceName = '${name}';
  
  async initialize(): Promise<void> {
    logger.info('Initializing ${name}Service');
    // Initialize service resources
  }
  
  async start(): Promise<void> {
    logger.info('Starting ${name}Service');
    // Start service operations
  }
  
  async stop(): Promise<void> {
    logger.info('Stopping ${name}Service');
    // Clean up resources
  }
  
  // Add custom service methods here
}
`;

export const evaluatorTemplate = (name: string, description: string): string => `
import { type Evaluator, type IAgentRuntime, type Memory, logger } from '@elizaos/core';

export const ${name}Evaluator: Evaluator = {
  name: '${name}',
  description: '${description}',
  
  async evaluate(runtime: IAgentRuntime, memory: Memory): Promise<void> {
    try {
      // Analyze the memory/conversation
      const content = memory.content.text;
      
      // Perform evaluation logic
      
      // Create new memories or trigger actions if needed
      
    } catch (error) {
      logger.error('Evaluator error:', error);
    }
  }
};
`;

export const pluginIndexTemplate = (pluginName: string, components: any): string => `
import { type Plugin } from '@elizaos/core';
${components.actions?.map(a => `import { ${a.name}Action } from './actions/${a.name}';`).join('\n')}
${components.providers?.map(p => `import { ${p.name}Provider } from './providers/${p.name}';`).join('\n')}
${components.services?.map(s => `import { ${s.name}Service } from './services/${s.name}';`).join('\n')}
${components.evaluators?.map(e => `import { ${e.name}Evaluator } from './evaluators/${e.name}';`).join('\n')}

export const ${pluginName.replace('@elizaos/', '').replace(/-/g, '')}Plugin: Plugin = {
  name: '${pluginName}',
  description: '${components.description}',
  
  ${components.actions ? `actions: [${components.actions.map(a => `${a.name}Action`).join(', ')}],` : ''}
  ${components.providers ? `providers: [${components.providers.map(p => `${p.name}Provider`).join(', ')}],` : ''}
  ${components.services ? `services: [${components.services.map(s => `${s.name}Service`).join(', ')}],` : ''}
  ${components.evaluators ? `evaluators: [${components.evaluators.map(e => `${e.name}Evaluator`).join(', ')}],` : ''}
};

export default ${pluginName.replace('@elizaos/', '').replace(/-/g, '')}Plugin;
`;

export const testTemplate = (componentName: string, componentType: string): string => `
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ${componentName}${componentType} } from '../${componentType.toLowerCase()}s/${componentName}';
import { createMockRuntime } from '@elizaos/test-utils';

describe('${componentName}${componentType}', () => {
  let mockRuntime;
  
  beforeEach(() => {
    mockRuntime = createMockRuntime();
  });
  
  it('should be properly defined', () => {
    expect(${componentName}${componentType}).toBeDefined();
    expect(${componentName}${componentType}.name).toBe('${componentName}');
  });
  
  // Add more specific tests here
});
`;
```

### 5. Integration with Dynamic Plugin System

**File:** `packages/core/src/services/plugin-creation-integration.ts`

```typescript
import { type IAgentRuntime, logger } from '@elizaos/core';
import { PluginManagementService } from './plugin-management-service';
import { PluginCreationService, type PluginCreationJob } from './plugin-creation-service';

export class PluginCreationIntegrationService {
  private runtime: IAgentRuntime;
  private pluginManagement: PluginManagementService;
  private pluginCreation: PluginCreationService;

  constructor(
    runtime: IAgentRuntime,
    pluginManagement: PluginManagementService,
    pluginCreation: PluginCreationService
  ) {
    this.runtime = runtime;
    this.pluginManagement = pluginManagement;
    this.pluginCreation = pluginCreation;
    
    // Listen for successful plugin creation
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Monitor job completions
    setInterval(() => this.checkCompletedJobs(), 5000);
  }

  private async checkCompletedJobs(): Promise<void> {
    const jobs = this.pluginCreation.listJobs();
    
    for (const job of jobs) {
      if (job.status === 'success' && !this.isPluginInstalled(job)) {
        await this.installCreatedPlugin(job);
      }
    }
  }

  private isPluginInstalled(job: PluginCreationJob): boolean {
    const installedPlugins = this.pluginManagement.listInstalledPlugins();
    return installedPlugins.some(p => p.name === job.pluginName);
  }

  private async installCreatedPlugin(job: PluginCreationJob): Promise<void> {
    try {
      logger.info(`Installing newly created plugin: ${job.pluginName}`);
      
      // Install from local path
      const pluginInfo = await this.pluginManagement.installPlugin(
        job.outputPath,
        job.specification.version
      );
      
      logger.success(`Plugin ${job.pluginName} installed successfully`);
      
      // Emit event for agent awareness
      this.runtime.emit('plugin:created', {
        jobId: job.jobId,
        pluginName: job.pluginName,
        pluginInfo
      });
      
    } catch (error) {
      logger.error(`Failed to install created plugin ${job.pluginName}:`, error);
    }
  }

  async createAndInstallPlugin(specification: any): Promise<{
    job: PluginCreationJob;
    installPromise: Promise<any>;
  }> {
    // Start creation
    const job = await this.pluginCreation.createPlugin(specification);
    
    // Return promise that resolves when plugin is installed
    const installPromise = new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        const currentJob = this.pluginCreation.getJob(job.jobId);
        
        if (currentJob?.status === 'success') {
          clearInterval(checkInterval);
          try {
            const pluginInfo = await this.pluginManagement.installPlugin(
              currentJob.outputPath,
              currentJob.specification.version
            );
            resolve(pluginInfo);
          } catch (error) {
            reject(error);
          }
        } else if (currentJob?.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error('Plugin creation failed'));
        }
      }, 1000);
      
      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Plugin creation timeout'));
      }, 600000);
    });
    
    return { job, installPromise };
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// packages/plugin-dynamic-plugins/src/__tests__/plugin-creation-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginCreationService } from '../services/plugin-creation-service';
import { createMockRuntime } from '@elizaos/test-utils';

describe('PluginCreationService', () => {
  let service: PluginCreationService;
  let mockRuntime: IAgentRuntime;
  
  beforeEach(() => {
    mockRuntime = createMockRuntime();
    service = new PluginCreationService();
    service.runtime = mockRuntime;
  });
  
  describe('createPlugin', () => {
    it('should create a plugin creation job', async () => {
      const specification = {
        name: '@elizaos/plugin-test',
        description: 'Test plugin',
        version: '1.0.0',
        actions: [{
          name: 'testAction',
          description: 'A test action'
        }]
      };
      
      const job = await service.createPlugin(specification);
      
      expect(job).toBeDefined();
      expect(job.pluginName).toBe('@elizaos/plugin-test');
      expect(job.status).toBe('queued');
      expect(job.currentIteration).toBe(0);
    });
  });
  
  describe('job management', () => {
    it('should track multiple jobs', async () => {
      const job1 = await service.createPlugin({
        name: '@elizaos/plugin-test1',
        description: 'Test plugin 1',
        version: '1.0.0'
      });
      
      const job2 = await service.createPlugin({
        name: '@elizaos/plugin-test2',
        description: 'Test plugin 2',
        version: '1.0.0'
      });
      
      const jobs = service.listJobs();
      expect(jobs).toHaveLength(2);
      expect(jobs).toContainEqual(expect.objectContaining({ jobId: job1.jobId }));
      expect(jobs).toContainEqual(expect.objectContaining({ jobId: job2.jobId }));
    });
    
    it('should cancel jobs', async () => {
      const job = await service.createPlugin({
        name: '@elizaos/plugin-test',
        description: 'Test plugin',
        version: '1.0.0'
      });
      
      const success = await service.cancelJob(job.jobId);
      expect(success).toBe(true);
      
      const updatedJob = service.getJob(job.jobId);
      expect(updatedJob?.status).toBe('failed');
    });
  });
});
```

### Integration Tests

```typescript
// packages/plugin-dynamic-plugins/src/__tests__/plugin-creation-integration.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AgentRuntime } from '@elizaos/core';
import { dynamicPluginsPlugin } from '../index';

describe('Plugin Creation Integration', () => {
  it('should create and validate a simple plugin', async () => {
    // Mock Anthropic API
    vi.mock('@anthropic-ai/sdk', () => ({
      default: class {
        messages = {
          create: vi.fn().mockResolvedValue({
            content: [{
              type: 'text',
              text: generateMockPluginCode()
            }]
          })
        };
      }
    }));
    
    const runtime = new AgentRuntime({
      character: { name: 'Test Agent' },
      plugins: [dynamicPluginsPlugin]
    });
    
    await runtime.initialize();
    
    // Create plugin
    const createResult = await runtime.executeAction('createPlugin', {
      name: '@elizaos/plugin-example',
      description: 'Example plugin for testing',
      version: '1.0.0',
      actions: [{
        name: 'exampleAction',
        description: 'An example action'
      }]
    });
    
    expect(createResult).toContain('Plugin creation job started');
    
    // Extract job ID
    const jobId = createResult.match(/jobId: ([a-f0-9-]+)/)?.[1];
    
    // Wait for completion (mocked to be fast)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check status
    const statusResult = await runtime.executeAction('checkPluginCreationStatus', {
      jobId
    });
    
    expect(statusResult).toContain('Plugin created successfully');
  });
});

function generateMockPluginCode(): string {
  return `
File: src/index.ts
\`\`\`typescript
import { type Plugin } from '@elizaos/core';
import { exampleActionAction } from './actions/exampleAction';

export const examplePlugin: Plugin = {
  name: '@elizaos/plugin-example',
  description: 'Example plugin for testing',
  actions: [exampleActionAction]
};

export default examplePlugin;
\`\`\`

File: src/actions/exampleAction.ts
\`\`\`typescript
import { type Action, type IAgentRuntime, type ActionInput } from '@elizaos/core';
import { z } from 'zod';

export const exampleActionAction: Action = {
  name: 'exampleAction',
  description: 'An example action',
  inputSchema: z.object({}),
  async handler(input: ActionInput, runtime: IAgentRuntime): Promise<string> {
    return 'Example action executed';
  }
};
\`\`\`

File: src/__tests__/exampleAction.test.ts
\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { exampleActionAction } from '../actions/exampleAction';

describe('exampleAction', () => {
  it('should be defined', () => {
    expect(exampleActionAction).toBeDefined();
  });
});
\`\`\`
`;
}
```

## Error Handling

1. **Generation Failures**: Fallback to template-based generation
2. **Build Errors**: Detailed TypeScript error reporting
3. **Test Failures**: Capture and report specific test failures
4. **Validation Rejections**: Clear feedback on what needs fixing
5. **Process Crashes**: Graceful cleanup and job status updates

## Performance Considerations

1. **Background Processing**: Plugin creation runs in child processes
2. **Resource Limits**: CPU and memory limits for creation jobs
3. **Parallel Jobs**: Support multiple creation jobs concurrently
4. **Caching**: Cache common dependencies between iterations
5. **Cleanup**: Automatic cleanup of failed job artifacts

## Security Measures

1. **Sandboxed Execution**: Plugin code runs in isolated environment
2. **Code Review**: AI validation checks for malicious patterns
3. **Dependency Scanning**: Check for known vulnerabilities
4. **Resource Limits**: Prevent resource exhaustion attacks
5. **Access Control**: Plugins can't access host system directly

## Agent Integration

1. **Natural Language**: Agent can create plugins from descriptions
2. **Progress Updates**: Agent provides creation status updates
3. **Error Assistance**: Agent helps resolve creation errors
4. **Testing Feedback**: Agent explains test failures
5. **Success Notification**: Agent celebrates successful creation

## Future Enhancements

1. **Visual Plugin Builder**: Web UI for plugin creation
2. **Plugin Templates**: Pre-built templates for common use cases
3. **Collaborative Creation**: Multiple agents working on one plugin
4. **Version Control**: Git integration for plugin development
5. **Plugin Marketplace**: Share created plugins with community 