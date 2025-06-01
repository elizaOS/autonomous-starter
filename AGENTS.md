# Repository Guide

This project is a TypeScript implementation of an autonomous agent built on the ElizaOS framework.  Plugins live under `src/plugin-*` and each exposes actions, providers and services using the core types from `@elizaos/core`.

When adding functionality:

- New plugins should follow the existing pattern (`src/plugin-shell` or others).
- Register plugins for the default agent in `src/index.ts`.
- Unit tests are defined in `src/tests.ts` and executed with `npm test` (vitest).
- Run `npm test` after making changes. Tests may fail if dependencies are not installed in this environment.

Coding style loosely mirrors the existing code base and uses TypeScript with ES modules.
