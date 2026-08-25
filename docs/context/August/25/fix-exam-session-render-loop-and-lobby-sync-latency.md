---
title: "Fix Mobile Exam Session Crash and Align Mobile Lobby Realtime Sync with Web"
type: context
status: ready
created: "2026-08-25"
tags: [context, fix, mobile, realtime, lobby, mediapipe]
feature: "exam-lobby-and-session-fixes"
---

# Fix Mobile Exam Session Crash and Align Mobile Lobby Realtime Sync with Web Context Specification

## 1. Overview & Objective

- **Problem Statement:**
  1. **Mobile Exam Session Crash:** In `sentinel-mobile`, entering an active exam session crashes with `[Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate]`.
  2. **Mobile Lobby Realtime Delay:** While `sentinel-web` student lobby is real-time and responsive, `sentinel-mobile` student lobby takes too long to enter, does not immediately reflect check-in, and takes excessive time to unlock when the instructor approves the admission request from `sentinel-web`.
- **Business / User Value:**
  - Prevents fatal crashes during mobile exam sessions.
  - Aligns `sentinel-mobile` lobby architecture directly with `sentinel-web`, providing instant (< 500ms) realtime admission unlocking and smooth checkup transitions.
- **Success Criteria:**
  - Zero "Maximum update depth exceeded" errors when taking an exam on mobile.
  - Mobile lobby readiness is evaluated synchronously on mount.
  - Student lobby check-in reflects instantly on instructor web queue.
  - Mobile student UI transitions from "Waiting for Approval" to "Enter Exam" instantly (< 500ms) upon instructor admission via optimistic Realtime cache mutation.

---

## 2. Requirements & User Stories

### User Stories / Scenarios

- *As a student taking an exam on mobile,* I want to start my exam session smoothly without the app crashing into an infinite update loop.
- *As a student entering the mobile exam lobby,* I want my system checkup readiness and check-in to be evaluated instantly without a 1-second interval delay.
- *As a student in the mobile lobby,* I want instructor approval to unlock my exam entry button in real-time (matching the web student experience) with an active fallback if the socket drops.

### Functional Requirements

- [ ] **FR-01 (Session Render Loop Fix):** Stabilize `useMobileMediaPipeMonitoring` and `ExamSessionScreen` by:
  - Memoizing `handleAnomaly` with `useCallback`.
  - Holding `onAnomalyDetected` in a mutable ref inside `useMobileMediaPipeMonitoring` to decouple it from the main frame-processing `useEffect`.
  - Guarding `setWarningStatus` and `setAnalysis` against emitting duplicate state values.
- [ ] **FR-02 (Immediate Mobile Readiness Initialization):** In `useExamLobby`, evaluate `isMediaPipeCalibrated` and `isAudioReady` synchronously and on immediate mount before setting up polling intervals.
- [ ] **FR-03 (Align Mobile Lobby with Shared Realtime Pattern):**
  - Migrate `useExamLobby` to use `useExamLobbyAdmissionStatusQuery` and `useLobbyRealtime` from `@sentinel/hooks` (just like `sentinel-web`).
  - Leverage optimistic `queryClient.setQueryData` on `postgres_changes` payloads so the admission state updates in memory within 0ms of receiving the WebSocket frame.
  - Parallelize check-in promises (`checkIntoExamLobby` + query cache invalidation).
- [ ] **FR-04 (Resilient Adaptive Polling Fallback):**
  - Replace the 30s–45s mobile background poll with an adaptive 2.5s–3s fallback poll while in `WAITING` status, automatically stopped when `APPROVED` or unmounted.

### Edge Cases & Failure Modes

- **WebSocket Disconnection:** If Supabase Realtime channel is reconnecting, the 2.5s adaptive poll guarantees approval within at most 2.5 seconds.
- **MediaPipe Frame Detection with Unchanged Face Count:** The hook skips calling `setAnalysis` and `setWarningStatus` if previous values are identical, preventing unnecessary renders.

---

## 3. Technical & Architectural Context

### Affected Files

- **Mobile App (`app/sentinel-mobile`):**
  - [`features/exam/components/session/exam-session-screen.tsx`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/components/session/exam-session-screen.tsx)
  - [`features/exam/hooks/use-mobile-mediapipe-monitoring.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-mobile-mediapipe-monitoring.ts)
  - [`features/exam/hooks/use-exam-lobby.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-mobile/features/exam/hooks/use-exam-lobby.ts)
- **Shared Packages (`packages/hooks`):**
  - [`packages/hooks/src/use-lobby-realtime.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/use-lobby-realtime.ts)
  - [`packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.ts`](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/packages/hooks/src/query/exams/use-exam-lobby-admission-status-query.ts)

### Root Cause Comparison: `sentinel-web` vs `sentinel-mobile`

| Aspect | `sentinel-web` (Working Real-Time) | `sentinel-mobile` (Experiencing Latency) |
| :--- | :--- | :--- |
| **Admission State Source** | TanStack Query cache (`useExamLobbyAdmissionStatusQuery`) | Isolated local `useState<LobbyAdmissionStatus>(null)` |
| **Realtime Event Handling** | `useLobbyRealtime` writes payload status directly into query cache (`setQueryData`) $\rightarrow$ **0ms UI update** | Ignores payload, triggers async HTTP fetch waterfall (`getExamLobbyAdmissionStatus` $\rightarrow$ `refetchExam` $\rightarrow$ `refetchLobbyCount`) |
| **Fallback Polling** | Query invalidation + active refetch | 30s–45s randomized interval (`jitterMs = 30_000 + ...`) |
| **Readiness Check** | Synchronous hook state | Starts as `false`, waits for 1-second `setInterval` to read `AsyncStorage` |

---

## 4. Decision Ledger & Scenarios

| ID | Topic | Decision | Rationale | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | MediaPipe Hook Render Stability | Decouple callbacks with `useRef` and guard `setState` calls in `useMobileMediaPipeMonitoring` | Prevents `Maximum update depth exceeded` crash on exam session screen | Approved |
| **DEC-02** | Align Mobile Lobby to Shared Realtime Hooks | Adopt `useLobbyRealtime` and `useExamLobbyAdmissionStatusQuery` with optimistic cache updating in `sentinel-mobile` | Matches the instant real-time performance proven in `sentinel-web` | Approved |
| **DEC-03** | Adaptive 2.5s Polling Fallback | Reduce mobile fallback poll from 30–45s to 2.5s while waiting for approval | Guarantees fast recovery if mobile network drops WebSocket connection | Approved |
