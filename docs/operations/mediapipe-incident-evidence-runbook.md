# MediaPipe Incident Evidence Runbook

This runbook covers operational setup, safe rollout, retention behavior, cleanup, and recovery for
MediaPipe incident evidence in Sentinel.

## 1. Scope

Use this runbook when managing private evidence frames captured for reviewable MediaPipe incidents.
These frames are not continuous recordings. They are created only when an enabled camera rule emits
an accepted reviewable signal.

## 2. Required Configuration

Set these server-side environment variables before enabling capture:

| Variable | Default | Purpose |
| --- | --- | --- |
| `TELEMETRY_EVIDENCE_ENABLED` | `false` | Global feature gate |
| `TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST` | empty | Comma-separated institution UUID allowlist |
| `TELEMETRY_EVIDENCE_BUCKET` | `sentinel-proctoring-evidence` | Private storage bucket |
| `TELEMETRY_EVIDENCE_RETENTION_DAYS` | `7` | Retention window after the effective attempt date |
| `TELEMETRY_EVIDENCE_MAX_DIMENSION` | `1280` | Max browser-side frame dimension |
| `TELEMETRY_EVIDENCE_MAX_BYTES` | `524288` | Max encoded upload size |
| `TELEMETRY_EVIDENCE_MAX_PER_EVENT_TYPE` | `10` | Per-attempt per-event quota |
| `TELEMETRY_EVIDENCE_MAX_PER_ATTEMPT` | `30` | Per-attempt total quota |
| `TELEMETRY_EVIDENCE_UPLOAD_TTL_SECONDS` | `120` | Signed upload TTL |
| `TELEMETRY_EVIDENCE_VIEW_TTL_SECONDS` | `300` | Signed view TTL |
| `TELEMETRY_CRON_SECRET` or `CRON_SECRET` | none | Required for reconcile cron |

## 3. Bucket Setup

Create the private Supabase bucket `sentinel-proctoring-evidence`.

Bucket requirements:
- Private visibility only
- MIME allowlist limited to `image/webp` and `image/jpeg`
- Object-size guard aligned with `TELEMETRY_EVIDENCE_MAX_BYTES`
- No direct client listing or read access

Verification steps:
1. Confirm signed upload URL creation succeeds from the API.
2. Confirm signed view URLs work only for short-lived reviewer access.
3. Confirm raw bucket paths cannot be listed or opened by non-service clients.

## 4. Enable / Disable Sequence

Enable sequence:
1. Keep `TELEMETRY_EVIDENCE_ENABLED=false`.
2. Deploy database migration and API code.
3. Create and verify the private bucket.
4. Deploy web changes including privacy disclosure.
5. Configure the daily reconcile cron.
6. Add one test institution to `TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST`.
7. Validate one end-to-end evidence event before broader rollout.

Disable sequence:
1. Set `TELEMETRY_EVIDENCE_ENABLED=false`.
2. Leave reconciliation enabled until pending cleanup converges.
3. Confirm no lingering `DELETE_PENDING`, `FAILED`, or stale `PENDING_UPLOAD` rows remain.
4. Remove institutions from the allowlist only after cleanup is complete.

## 5. Retention Calculation

Evidence retention uses:

`max(exam.end_date_time, attempt.started_at, attempt.completed_at, captured_at) + TELEMETRY_EVIDENCE_RETENTION_DAYS`

Operational notes:
- Reconciliation recomputes this deadline before expiring apparently old rows.
- If an attempt completes later than the original capture-time calculation, `expires_at` is
  extended instead of deleting the object early.
- Reviewer deletion is immediate and does not wait for the retention deadline.

## 6. Reconciliation Behavior

The `/telemetry/internal/evidence/reconcile` job runs daily and converges bounded batches of:
- stale `PENDING_UPLOAD`
- expired `AVAILABLE`
- lingering `DELETE_PENDING`
- `FAILED` rows that still need object cleanup
- `AVAILABLE` rows whose storage object is missing
- older unlinked `AVAILABLE` rows after correlation timeout

Result counters:
- `staleUploadsPurged`
- `retentionExpiredPurged`
- `deletedConverged`
- `unlinkedPurged`

The controller and system logs must never include:
- storage paths
- signed URLs
- upload tokens
- hashes
- image bytes
- landmark data

## 7. Quota Tuning

Tune quotas cautiously and only after observing false positives and storage growth:
- Raise `TELEMETRY_EVIDENCE_MAX_PER_EVENT_TYPE` only when repeated rule escalation needs more
  visual context.
- Raise `TELEMETRY_EVIDENCE_MAX_PER_ATTEMPT` only after confirming storage budget and cleanup
  backlog remain healthy.
- Keep `TELEMETRY_EVIDENCE_MAX_BYTES` aligned with low-bandwidth client behavior to avoid upload
  churn.

## 8. Stuck-State Recovery

If evidence accumulates in `DELETE_PENDING`:
1. Check reconcile cron execution and cron secret configuration.
2. Inspect service logs for storage deletion failures.
3. Retry the reconcile endpoint manually with the cron bearer secret.
4. Confirm storage-provider errors are transient before repeating retries.

If evidence accumulates in `PENDING_UPLOAD`:
1. Confirm signed upload TTL and browser clock skew assumptions.
2. Review upload-failure patterns by institution and event type.
3. Run reconcile and confirm stale rows converge to terminal cleanup.

## 9. Orphan Inspection

Look for:
- `AVAILABLE` rows with `incident_id is null`
- `AVAILABLE` rows with missing storage coordinates
- `DELETE_PENDING` rows older than one reconcile interval

Do not paste bucket paths into tickets or chat threads. Refer only to internal evidence IDs and
incident IDs when escalating.

## 10. Deletion Verification

For reviewer-triggered or automated cleanup:
1. Confirm terminal state is `DELETED` or `EXPIRED`.
2. Confirm `storage_bucket` and `storage_path` are cleared.
3. Confirm `deleted_at` is populated.
4. Confirm the deletion reason matches the cleanup path.

For exam deletion:
1. Evidence cleanup must run before the exam row is deleted.
2. If any evidence object fails cleanup, abort exam deletion and retry after resolving storage
   failure.

## 11. Metrics and Alerts

### Required Metrics

Capture and review these metrics during rollout and steady-state operation:

| Metric | Meaning | Suggested breakdown |
| --- | --- | --- |
| `telemetry_evidence.encode_duration_ms` | Browser-side frame encode time | browser, device tier, institution |
| `telemetry_evidence.image_size_bytes` | Final encoded image size | mime type, institution |
| `telemetry_evidence.initialize_outcome_total` | Initialize success/failure count | outcome, institution, event type |
| `telemetry_evidence.upload_outcome_total` | Direct upload success/failure count | outcome, institution, event type |
| `telemetry_evidence.complete_outcome_total` | Complete success/failure count | outcome, institution, event type |
| `telemetry_evidence.per_attempt_count` | Evidence objects created per attempt | institution |
| `telemetry_evidence.per_event_type_count` | Evidence objects created per rule/event type | institution, event type |
| `telemetry_evidence.correlation_latency_ms` | Time from upload receipt to incident link | institution, event type |
| `telemetry_evidence.unlinked_rows` | Current count of `AVAILABLE` rows without incident links | institution |
| `telemetry_evidence.stale_pending_rows` | Current count of stale `PENDING_UPLOAD` rows | institution |
| `telemetry_evidence.delete_failure_total` | Storage/object deletion failures | institution, reason |
| `telemetry_evidence.expiry_backlog_count` | Rows that should already be expired but remain active | institution |
| `telemetry_evidence.expiry_backlog_age_ms` | Oldest overdue expiry age | institution |
| `telemetry_evidence.storage_usage_bytes` | Aggregate private storage footprint | institution, environment |
| `telemetry_evidence.signed_view_failure_total` | Signed URL generation failures for reviewers | institution |

### Review Cadence

- During first rollout week: review every day.
- During single-institution pilot: review after each evidence validation session.
- After general enablement: review weekly and after every proctoring-related release.

### Alert Definitions

Configure alerts for the following conditions:

| Alert | Trigger | Initial severity |
| --- | --- | --- |
| `telemetry_evidence.delete_pending_stuck` | `DELETE_PENDING` rows remain stuck for more than one reconcile interval | High |
| `telemetry_evidence.expiry_backlog_age` | oldest expiry backlog age exceeds 24 hours | High |
| `telemetry_evidence.upload_failure_spike` | initialize/upload/complete failures spike above the recent baseline after deploy | High |
| `telemetry_evidence.unlinked_growth` | unlinked evidence count grows across consecutive reconcile windows | Medium |
| `telemetry_evidence.storage_cost_threshold` | storage usage or projected cost crosses the agreed budget threshold | Medium |

### Suggested Threshold Notes

- Start with conservative thresholds during pilot and lower them only after false positives are
  understood.
- Treat `signed_view_failure_total` growth as reviewer-impacting even if capture is otherwise
  healthy.
- Revisit storage thresholds whenever `TELEMETRY_EVIDENCE_MAX_PER_ATTEMPT` or retention changes.

## 12. Rollback

Rollback order:
1. Disable capture globally.
2. Keep reconciliation active until non-terminal rows converge.
3. Verify no private evidence objects remain that are not represented by retryable metadata.
4. Only then remove bucket usage, cron schedule, and schema in a later controlled rollback.

Never drop evidence schema or bucket references before object cleanup has converged.

## 13. Incident Response

If sensitive evidence handling is suspected to be incorrect:
1. Disable capture with `TELEMETRY_EVIDENCE_ENABLED=false`.
2. Preserve audit logs and system logs referencing evidence IDs only.
3. Inspect affected evidence IDs through scoped internal tooling.
4. Avoid exporting or sharing signed URLs outside the response team.
5. Re-enable only after root cause, privacy impact, and cleanup state are confirmed.
