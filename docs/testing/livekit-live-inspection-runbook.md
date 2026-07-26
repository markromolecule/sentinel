# LiveKit Live Inspection Runbook

Use this runbook only against a dedicated non-production LiveKit Cloud project. Do not enable real institutions until the evidence fields below are complete and reviewed.

## Prerequisites

- `LIVE_INSPECTION_ENABLED=true` only in staging or a local provider smoke environment.
- `LIVE_INSPECTION_INSTITUTION_ALLOWLIST` contains only the synthetic/internal institution UUID under test.
- Managed LiveKit credentials are server-only in `app/sentinel-api`; no `NEXT_PUBLIC_LIVEKIT_*`, AWS, Egress, recording, or screenshot variables are present.
- Test caps remain bounded: `LIVEKIT_GLOBAL_ACTIVE_INSPECTION_LIMIT=20`, `LIVEKIT_INSTITUTION_ACTIVE_INSPECTION_LIMIT=10`, `LIVEKIT_MAX_INSPECTION_DURATION_SECONDS=300`.
- Synthetic accounts exist for one student and one allowed staff viewer with `examinations:monitor_live_video`.

## Provider smoke

Run only when intentional provider usage is approved:

```bash
LIVEKIT_SMOKE_TEST_ENABLED=true pnpm --dir app/sentinel-api exec vitest run src/modules/infrastructure/livekit/services/livekit-managed.smoke.test.ts
```

Expected evidence:

- one room named `sentinel-smoke-live-inspection-*`;
- `maxParticipants` equals `2`;
- publisher identity is `live-inspection:publisher:<leaseId>`;
- viewer identity is `live-inspection:viewer:<leaseId>`;
- room is deleted in `finally`;
- provider dashboard shows zero participants after cleanup.

## Two-browser inspection scenario

> [!WARNING]
> **Single-Device Isolation Rule:**
> When testing Student and Instructor roles on the **same physical device**, you MUST run them in **completely isolated browser contexts** (e.g., standard browser window for Student, and an Incognito/separate profile/different browser for Instructor).
> Testing both roles in two tabs of the same browser profile will share cookies/localStorage, overwriting the Supabase authentication JWT, which violates RLS and breaks Realtime signaling and API authorization.
>
> **Valid Same-Device Setups:**
>
> - Setup A: Chrome Normal Window (Student) + Chrome Incognito Window (Instructor)
> - Setup B: Chrome Profile 1 (Student) + Chrome Profile 2 (Instructor)
> - Setup C: Chrome (Student) + Safari/Firefox/Edge (Instructor)

1. Sign in as the synthetic student and enter an active exam attempt.
2. Confirm MediaPipe/checkup continues before any live inspection starts.
3. Sign in as the allowed staff viewer in a second browser/session.
4. Start live inspection for the active attempt.
5. Confirm LiveKit shows the subscribe-only viewer immediately while Sentinel waits for the student.
6. Confirm the student publisher becomes the second participant and the student sees the live-camera disclosure.
7. Confirm the viewer portal shows `LIVE` only after the expected camera track is playing.
8. Confirm no audio, screen-share, recording, Egress, screenshot, thumbnail, or media persistence path appears in code/logs/provider dashboard.
9. Stop the inspection from the viewer portal.
10. Confirm student answering, saving, submission, MediaPipe telemetry, and attempt completion still work.
11. Confirm database lease reaches `ENDED`, provider room is gone, and LiveKit participant count is zero.

## Cleanup and failure drills

Record the result for each drill:

- viewer navigation away;
- student refresh;
- viewer tab crash/close;
- student tab crash/close;
- network disconnect and reconnect;
- duplicate start on the same attempt;
- one viewer opening two students;
- third participant attempt;
- global cap reached;
- institution cap reached;
- missed stop followed by reconciler expiry;
- duplicate/out-of-order webhook;
- API restart during active lease;
- global disable during active inspection.

## Operational playbooks

### Provider outage

1. Set `LIVE_INSPECTION_ENABLED=false` for the affected environment.
2. Confirm new start requests return the bounded disabled/unavailable response.
3. Leave exam answering, submission, and MediaPipe services running.
4. Use the stuck lease query below to identify active leases.
5. Stop or expire leases through the API/reconciler when the provider recovers.

### Quota or cap reached

1. Keep global and institution caps at the configured rollout values.
2. Confirm excess starts fail with a bounded capacity response.
3. Review `infrastructure.rtc_inspection_requested`, `failed`, `expired`, and `cleanup_failed` logs.
4. Do not raise caps until participant-minute and downstream-transfer evidence is reviewed.

### Secret rotation

1. Disable new live inspections.
2. Stop or expire current leases.
3. Rotate LiveKit API key/secret and webhook signing configuration in the secret manager.
4. Restart the API.
5. Run the opt-in smoke test and one two-browser synthetic inspection.
6. Confirm old webhook signatures fail and new signatures pass.

### Invalid webhook spike

1. Confirm the webhook controller is receiving raw request bodies.
2. Verify LiveKit webhook signing secret/key alignment.
3. Review only bounded webhook processing results; do not log raw webhook bodies.
4. Keep live inspection disabled if invalid signatures continue.

### Stuck lease query

Use read-only queries first:

```sql
select lease_id, attempt_id, exam_id, viewer_user_id, institution_id, state, requested_at, expires_at, ended_at, end_reason, last_error_code
from live_inspection_leases
where state not in ('ENDED', 'FAILED', 'EXPIRED')
order by requested_at asc;
```

Expected result after cleanup: zero rows.

### Forced global disable and room cleanup

1. Set `LIVE_INSPECTION_ENABLED=false`.
2. Confirm no new inspection lease can be started.
3. Allow active leases to stop, expire, or be reconciled.
4. Verify provider participant count returns to zero.
5. Verify no `exam_attempts` answers/status were changed by cleanup.

### Support-safe diagnostics

Support may collect lease ID, attempt ID, exam ID, institution ID, bounded state, bounded reason, timestamps, and provider participant counts. Support must not request or store LiveKit tokens, API secrets, SDP/ICE data, screenshots, thumbnails, recordings, audio, video, face landmarks, email, or student number.

## Evidence fields

- Date/time:
- Environment:
- LiveKit project:
- Institution UUID:
- Exam UUID:
- Attempt UUID:
- Lease UUID:
- Browser pair:
- Network profile:
- Time to publisher-ready:
- Time to first frame:
- Inspection duration:
- Participant minutes:
- Downstream transfer:
- Provider rooms after cleanup:
- Sentinel non-terminal leases after cleanup:
- Logs reviewed:
- Privacy/security reviewer:
- Product approval reference:
- Rollback rehearsal result:
- Operator:
