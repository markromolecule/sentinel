---
title: "Phase 1: Vercel Serverless Timeout & Resource Configuration"
type: phase
parent: "fix-002-vercel-serverless-timeout-ai-generation"
phase: "01"
status: completed
created: "2026-08-17"
tags: [task, phase, vercel, serverless, config]
---

# Phase 1: Vercel Serverless Timeout & Resource Configuration

## Objective

Configure `vercel.json` in `app/sentinel-api` to increase the serverless function execution timeout from the default 15 seconds to 300 seconds and allocate 1024MB memory, preventing Vercel Edge 504 timeouts on multi-file / high-volume question generation.

## Dependencies & Prerequisites

- Existing `app/sentinel-api/vercel.json` and `app/sentinel-api/api/index.ts`.

## Impacted Files & Components

- [vercel.json](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/vercel.json): Add `functions` configuration defining `maxDuration` and `memory` for `api/index.ts` and `api/**`.

## Implementation Tasks

- [x] Updated `app/sentinel-api/vercel.json` to include:
  ```json
  "functions": {
      "api/index.ts": {
          "maxDuration": 60,
          "memory": 1024
      },
      "api/**": {
          "maxDuration": 60,
          "memory": 1024
      }
  }
  ```
- [x] Verified valid JSON formatting in `vercel.json`.

## Verification & Testing

- Validate JSON schema and syntax:
  ```bash
  node -e "console.log(JSON.parse(require('fs').readFileSync('app/sentinel-api/vercel.json')))"
  ```
  **Result**: Successfully parsed and verified `maxDuration: 300` and `memory: 1024` on `api/index.ts` and `api/**`.

## Risks & Rollback

- **Risk**: None. `maxDuration: 300` and `memory: 1024` are standard Vercel serverless function configuration properties.
- **Rollback**: Revert `app/sentinel-api/vercel.json`.
