> [!NOTE]
> **Canonical location:** [.agents/docs/architecture/system-overview.md](../../../.agents/docs/architecture/system-overview.md)

# System Overview

The Sentinel platform is a robust, full-stack monorepo system. The architecture implements a clear separation of concerns, separating the client-side presentation layers from backend API capabilities, united through a shared set of typings and utilities.

## Core Stack

### Frontend Applications

- **Web Client (`sentinel-web`)**: Built on strictly-typed **Next.js**. Employs **Zustand** for simple client state management and `@packages/shared` for standardized interactions. Features tailored user interfaces grouped into dedicated app domains.
- **Mobile Client (`sentinel-mobile`)**: Powered by **Expo** and **React Native**. Reuses queries, types, and logic structures to mirror Web client behavior on mobile operating systems natively.

### API Layer

- **Backend API (`sentinel-api`)**: Powered by **Hono** indicating an Edge and fast-execution friendly REST server. Controllers handle routing while a dedicated Service layer contains core business logic.
- **Data Access Layer**: Features **Kysely** as a type-safe SQL query builder ensuring correct data retrieval directly.

### Database & Persistence

- **Database Engine**: Powered by **Supabase** acting as the highly scalable PostgreSQL database host.
- **Schema Management**: **Prisma** is used to define the schema modeling and auto-generate complex TS structures, which are directly utilized by Kysely.

## Request Flow

1. Interactions from **Next.js** or **Expo** trigger fetching actions using React hooks.
2. The clients execute typed query/mutation hooks pointing toward `sentinel-api` endpoints.
3. The `Hono` router intercepts the HTTP requests and directs them to corresponding Controllers.
4. Controllers invoke specific services, enforcing business standards via `Zod` validation out of the `shared` repository.
5. In the Data Access Layer, queries run using heavily typed `Kysely` statements connected to `Supabase`.
6. Successful payloads reflect the structures globally defined in `packages/shared`.

## Essay Rubric Lifecycle & Resolution

The platform supports a flexible grading basis for essay questions, featuring support-managed global baselines and course-instructor customized overrides:

1. **Resolution Chain**: When determining which rubric applies to an exam:
    - If an active **Exam Override** (scope `EXAM_OVERRIDE`) is configured for the specific exam, it is used.
    - Otherwise, the system falls back to the current active **Support Baseline** (scope `BASELINE`).
    - If no persisted baseline exists, the system uses the hardcoded **Legacy Standard Rubric** (`legacy-standard-v1` / `LEGACY_ESSAY_RUBRIC`) as a safety fallback.
2. **Attempt Freeze/Snapshotting**: To ensure grading integrity, the resolved rubric is locked and serialized directly into the attempt's `assessment_snapshot` (as a v2 schema) at the moment a student starts an exam attempt. In-progress edits to baselines or overrides never alter started, completed, or graded attempts.
3. **Grading & Reports**: Both AI-assisted grading and manual instructor evaluations retrieve the rubric criteria, weights, and scoring levels from the attempt's captured snapshot rather than looking up current configuration.
4. **Legacy Compatibility**: Attempt records predating the introduction of custom rubrics (v1 snapshots) lack stored rubric definition JSON. The grading and reporting pipelines automatically detect these instances and fall back to the five legacy criteria keys (`legacy-standard-v1`).
