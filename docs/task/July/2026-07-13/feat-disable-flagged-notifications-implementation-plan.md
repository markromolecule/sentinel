# Disable Flagged Incident Notifications Implementation Plan

## 1. The Context

Currently, every new proctoring incident (e.g. window blur, tab switch) triggers an activity notification:

- Title: "Proctoring incident flagged"
- Action: `flag-incident`

Because these flags occur frequently during examinations, they flood the user's notifications popover (showing hundreds of unread alerts). The user wants to remove notifications for initial proctoring incident flagging, so notifications can focus on critical changes across the system.

We will:

1. Skip sending notifications via `ActivityNotificationService.notifyInstitutionActivityCreated` when a new incident is created (`result.isNew === true`).
2. Keep sending notifications when an incident is escalated (`result.isNew === false`).
3. Keep the backend audit log (`LogsService.createLog`) unchanged to maintain security audit compliance in the database.
4. Fix a mock issue in the Vitest suite `cross-cutting-notifications.test.ts` where `db.transaction` was undefined.
5. Update the test case in `cross-cutting-notifications.test.ts` to assert that no notification is dispatched on initial flagging.

---

## 2. Proposed Changes

### Telemetry Storage Service (`sentinel-api`)

#### [MODIFY] [incident-side-effects.service.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/telemetry/storage/services/incident-side-effects.service.ts)

- Wrap the `ActivityNotificationService.notifyInstitutionActivityCreated` call in an `if (!result.isNew)` check so notifications are only dispatched when an incident is escalated, not when it is initially flagged:
    ```typescript
    if (!result.isNew) {
        await ActivityNotificationService.notifyInstitutionActivityCreated({
            dbClient: db,
            actorUserId: result.studentUserId,
            institutionId: result.institutionId,
            targetType: 'TELEMETRY_INCIDENT',
            targetId: result.incidentId,
            targetLabel: payload.ruleKey || 'Incident',
            title: 'Proctoring incident escalated',
            message: `Proctoring incident escalated for student attempt. Rule: ${payload.ruleKey}. Severity escalated from ${result.previousSeverity} to ${result.finalSeverity}`,
            sourceModule: 'telemetry',
            sourceAction: 'escalate-incident',
            metadata: {
                attemptId: payload.examSessionId,
                incidentId: result.incidentId,
                ruleKey: payload.ruleKey,
                severity: result.finalSeverity,
                previousSeverity: result.previousSeverity,
            },
        });
    }
    ```

---

### Tests (`sentinel-api`)

#### [MODIFY] [cross-cutting-notifications.test.ts](file:///Applications/XAMPP/xamppfiles/htdocs/sentinel/app/sentinel-api/src/modules/general/tests/cross-cutting-notifications.test.ts)

- Add `mock.transaction = vi.fn().mockReturnValue(mock);` to `dbMockChain` (around line 18) to fix the `TypeError: db.transaction is not a function` test failure.
- Update the test `'IncidentPersistenceService.appendEvent dispatches notification on proctoring incident'` to verify that:
    - Initial flagging does **not** call `notifyInstitutionActivityCreated`.
    - Escalation **does** call `notifyInstitutionActivityCreated` with `'Proctoring incident escalated'`.

---

## 3. Verification Plan

### Automated Tests

- Run the cross-cutting notifications test:
    ```bash
    pnpm --dir app/sentinel-api test cross-cutting-notifications.test.ts
    ```

### Manual Verification

- Verify that triggering a new proctoring incident does not dispatch a notification dropdown alert, but that escalations are correctly notified.
