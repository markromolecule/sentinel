---
title: "Optimize Production Gemini Question Generation & Dialog Payload UX"
type: context
status: approved
created: "2026-08-19"
tags: [context, ai, gemini, serverless, vercel, upload, cors, optimization]
feature: "gemini-question-generation"
---

# Optimize Production Gemini Question Generation & Dialog Payload UX Context Specification

## 1. Overview & Objective

- **Problem Statement:** 
  1. Instructors on production (`https://app.sentinelph.tech`) encounter network failures resulting in synthetic CORS errors (`net::ERR_FAILED` / missing `Access-Control-Allow-Origin`) during AI question preview generation even for small workloads (e.g., 10 Multiple Choice questions with a 955KB PDF file).
  2. The upload dialog (`UploadTab`) displays outdated text stating `"PDF lesson files up to 100MB each"`, conflicting with Vercel serverless platform constraints (4.5MB request body limit), and lacks an interactive remove/delete button for individual selected files in the file list.
  3. Generation pipeline latency on Vercel Serverless (Free/Hobby plan max execution duration of 60s) requires aggressive optimization to eliminate unnecessary LLM roundtrips (such as LLM-based PDF page counting and sequential critic evaluations) so that question generation reliably succeeds in production without edge timeout drops.
- **Business / User Value:** 
  - Instructors can reliably generate question previews from lesson materials directly within their browser without intermittent failures, cryptic CORS error modals, or inability to manage uploaded files before generation.
- **Success Criteria:** 
  - 10–80 question previews generate successfully within Vercel serverless execution limits (<25–35s total duration, well within the 60s platform ceiling).
  - All upload dialogs (`sentinel-web` and `sentinel-core`) reflect the 4.5MB–5.0MB single/aggregate PDF file limit with clear copy and validation.
  - An individual file removal action (trash/close icon) is accessible on every selected file in the upload list prior to proceeding to step 2.
  - Zero CORS dropped responses during generation errors or completions.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As an Instructor, I want to upload a PDF lesson file (<4.5MB) and configure 10–80 questions so that I receive a structured, leak-free question preview quickly without edge timeouts or connection drops.*
- *As an Instructor, I want to see accurate file size limits (4.5MB max) and have the ability to remove any accidentally selected file from the upload dialog before proceeding to generation settings.*
- *As an Instructor, if a generation attempt fails or encounters rate limits, I want to receive an actionable, clear status message with full HTTP headers rather than an unhandled browser CORS network error.*

### Functional Requirements

- [ ] **FR-01 (Upload Copy & Limit Alignment):** Update `UploadTab` copy across `sentinel-web` and `sentinel-core` from "up to 100MB each" to "up to 4.5MB each" (or combined 4.5MB max payload).
- [ ] **FR-02 (File Removal Action in Upload Dialog):** Add a remove button (e.g., `Trash2` / `X` icon button) on each selected file row in `UploadTab`, wired to `onFileRemove(index)` / `handleRemoveFile(file)` in `useFileValidator`.
- [ ] **FR-03 (Eliminate Redundant LLM Page Count Call):** Replace `resolvePageCountsStep`'s expensive Gemini model call (`generateStructuredJson`) with fast, deterministic, zero-latency in-memory PDF buffer page counting or lightweight metadata extraction.
- [ ] **FR-04 (Pipeline Latency & Concurrency Tuning):** Streamline prompt construction, model resolution (`gemini-2.0-flash` / `gemini-1.5-flash`), and critic concurrency so that a standard 10-question batch completes in under 6–10 seconds and 50–80 questions complete within 20–35 seconds.
- [ ] **FR-05 (Serverless Execution Budgeting & Edge CORS Preservation):** Ensure all failure modes, timeouts, and early returns explicitly emit standard HTTP error codes with full CORS headers (`applyCorsHeaders`) before Vercel edge terminates the worker.

### Edge Cases & Failure Modes

- **Edge Case 1: Multi-file combined payload exceeds 4.5MB:**
  - *Behavior:* Client-side `useFileValidator` intercepts and toasts an immediate warning before dispatch; the upload button remains disabled.
- **Edge Case 2: Upstream Gemini API responds with 429 Rate Limit:**
  - *Behavior:* Retries are bounded to a single 2s retry or returned as a 429 JSON response with `Retry-After` header and CORS headers attached.
- **Edge Case 3: Vercel Free Plan 60s hard ceiling under heavy load:**
  - *Behavior:* The backend orchestrator enforces a 45s hard budget guard, returning the best available normalized questions or a clean 502/504 JSON response with CORS headers before the 60s Vercel proxy kill.
- **Edge Case 4: Corrupted or unparseable PDF file:**
  - *Behavior:* Local page counter falls back to 1 page or questions' cited page numbers without throwing unhandled exceptions.

---

## 3. Technical & Architectural Context

- **Affected Domains / Layers:**
  - Frontend Web (`app/sentinel-web`, `app/sentinel-core`): `UploadTab.tsx`, `use-file-validator.ts`, `use-import-handler.ts`, `constants.ts`.
  - Backend API (`app/sentinel-api`): `QuestionGeneratorService` (`orchestrator.ts`), `resolve-page-counts.ts`, `GeminiProvider` (`gemini.provider.ts`), `generate-batches.ts`, `assess-passage-quality.ts`.
  - Shared Packages (`packages/services`, `packages/shared`): `api-client.ts`, constants.
- **Existing Files & Reference Symbols:**
  - `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_components/upload-tab.tsx`
  - `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.ts`
  - `app/sentinel-web/src/app/(protected)/(instructor)/question/bank/_components/dialogs/import-modal/_hooks/constants.ts`
  - `app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_components/upload-tab.tsx`
  - `app/sentinel-core/src/app/(protected)/question/bank/_components/dialogs/import-modal/_hooks/use-file-validator.ts`
  - `app/sentinel-api/src/lib/gemini/services/question-generator/orchestrator.ts`
  - `app/sentinel-api/src/lib/gemini/services/question-generator/steps/resolve-page-counts.ts`
  - `app/sentinel-api/src/lib/gemini/gemini.provider.ts`
  - `packages/services/src/api-client.ts`
- **Data Model & Schema Changes:**
  - No database schema migrations required.
  - DTO and multipart payload schemas remain backward compatible.
- **Security & Authorization:**
  - Maintains `ai:generate_questions` and `assessments:manage` RBAC permission checks via `requireActivePermission`.
  - Retains Gemini Files API ephemeral upload and automatic cleanup in `deleteUploadedFilesStep`.

---

## 4. UI/UX & Interaction Guidelines

- **Layout & Visual Design:**
  - File list rows in `UploadTab` maintain existing typography and spacing, augmented with a subtle, accessible icon button (e.g. `Trash2` or `X` with `hover:text-destructive` and `hover:bg-destructive/10`) on the right side.
  - Dropzone text updated to: `"Upload one or more PDF lesson files up to 4.5MB total."`
- **State Management & Feedback:**
  - Removing a file recalculates total payload size, updates file count badge, and clears the file if the list becomes empty.
  - Sonner toasts provide feedback when files are added or removed.

---

## 5. Scope & Boundaries

- **In Scope:**
  - Updating upload dialog text to 4.5MB limit across web and core apps.
  - Adding file removal button to `UploadTab` and hook integration.
  - Replacing the LLM-based `resolvePageCountsStep` with deterministic fast PDF page count resolution.
  - Optimizing `GeminiProvider` and `orchestrator.ts` execution time and budget guards for Vercel Free plan.
  - Verifying all test suites pass.
- **Out of Scope / Non-Goals:**
  - Rewriting the passage quality validator deterministic rules.
  - Modifying database schemas or question persistence routes.
  - Migrating backend off Vercel Serverless to long-running container instances in this task.

---

## 6. References & External Context

- [[docs/task/2026-08-18/fix-001-persistent-cors-issue-analysis/README|CORS Analysis]]
- [[docs/task/2026-08-17/fix-001-cors-gemini-generation/README|High-Volume AI Generation Task]]
- [[context-factory/docs/templates/Context.md|Context Template]]
- [[context-factory/skills/grill-with-docs/SKILL.md|Grill with Docs Skill]]
