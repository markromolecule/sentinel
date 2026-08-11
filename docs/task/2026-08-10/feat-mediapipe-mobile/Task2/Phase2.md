# Task 2 - Phase 2: Network Reconnection Guardrails, Exam Turn-In & Post-Exam Feedback Page Redirection

**Goal:** Implement network disconnection handling with auto-reconnection flow back to lobby, turn-in exam submission, and automatic redirection to the post-exam Feedback/Result page matching `sentinel-web`.

---

## 1. Context & Architecture Strategy

In `sentinel-web`:

1. When connection drops or an unexpected disconnection occurs during an active attempt, the application detects offline state, attempts automatic socket/session reconnection, and if reconnection fails or session is interrupted, redirects student safely to the lobby with preserved attempt state (`storedStudentExamFlow` & `syncExamProgress`).
2. When the student clicks Turn In / Submit, answers are submitted via API (`submitExamAttempt`), local preview is calculated, and the student is navigated to the post-exam Feedback page (`/student/exam/[id]/feedback` or `/result`), which displays total score, performance breakdown per topic, time spent, and proctoring summary.

In `sentinel-mobile`:

1. Network disconnection handling currently alerts without providing an automatic reconnection attempt flow back to the lobby.
2. Turn-in flow (`handleNext` on last question) writes local preview to storage without calling server attempt submission API or handling submission errors.
3. The result page (`app/exam/[id]/result/index.tsx`) does not match `sentinel-web` feedback page design, missing detailed category breakdown, instructor notes, and verified submission status.

---

## 2. Tasks & Implementation Steps

### Reconnection Guardrails & State Recovery

- [x] **Create** `app/sentinel-mobile/features/exam/lib/mobile-exam-reconnection.ts`
    - Implement network connectivity listener (`@react-native-community/netinfo` or `AppState`).
    - Handle reconnection retries (3 attempts with exponential backoff).
    - Redirect safely to `/exam/[id]/lobby` with `isResumed: true` state on session disruption.
- [x] **Write unit tests** at `app/sentinel-mobile/features/exam/lib/mobile-exam-reconnection.test.ts`
    - Test offline detection, retry counter, and lobby redirect trigger.

### Turn-In & Server Submission Handler

- [x] **Update** `app/sentinel-mobile/features/exam/hooks/use-exam-session.ts`
    - Call `submitExamAttempt` service API upon confirmation.
    - Send structured answers payload (`buildSessionAnswerPayload`).
    - Clear stored session token on successful turn-in.
    - Redirect to `/exam/[id]/result` with attempt response data.
- [x] **Update unit tests** at `app/sentinel-mobile/features/exam/hooks/use-exam-session.test.ts`
    - Test turn-in submit flow, payload creation, and submission failure fallback.

### Post-Exam Feedback / Result Screen 1:1 UI

- [x] **Update** `app/sentinel-mobile/app/exam/[id]/result/index.tsx` & `features/exam/components/detail/result-view.tsx`
    - Display score percentage badge, pass/fail status, total points, and completion timestamp matching `sentinel-web`.
    - Render section/topic breakdown bars.
    - Display proctoring verification indicator ("Exam verified under security policy").
    - Provide "Return to Dashboard" action button.
- [x] **Write component tests** at `app/sentinel-mobile/features/exam/components/detail/result-view.test.tsx`
    - Test score summary rendering, pass/fail status colors, and navigation button.

---

## 3. Technical Verification & Constraints

- **Migration required:** No.
- **Breaking changes:** No.
- **Verification Commands:**
    - `pnpm --dir app/sentinel-mobile test`
