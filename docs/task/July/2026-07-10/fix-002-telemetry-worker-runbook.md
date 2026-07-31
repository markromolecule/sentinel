# Fix 002 Telemetry Worker Runbook

This note covers the production contract for the Redis-backed telemetry ingestion path used by Fix 002.

## When the worker must run

Run the dedicated worker whenever `TELEMETRY_INGESTION_MODE=redis`.

Start command:

- `pnpm --dir app/sentinel-api start:telemetry-worker`

Development/watch command:

- `pnpm --dir app/sentinel-api dev:telemetry-worker`

If ingestion mode is not `redis`, the worker exits gracefully and sync ingestion remains the effective fallback.

## Required environment alignment

The API process and the telemetry worker must share the same values for:

- `DATABASE_URL`
- `REDIS_URL`
- `TELEMETRY_INGESTION_MODE`
- `TELEMETRY_REDIS_QUEUE_NAME`
- `TELEMETRY_REDIS_JOB_NAME`
- `TELEMETRY_REDIS_BUFFER_NAME`
- `TELEMETRY_INGESTION_WORKER_CONCURRENCY`
- `TELEMETRY_INGESTION_ATTEMPTS`
- `TELEMETRY_INGESTION_BACKOFF_MS`
- `TELEMETRY_INGESTION_KEEP_COMPLETED`
- `TELEMETRY_INGESTION_KEEP_FAILED`

The flush endpoint also depends on one of:

- `TELEMETRY_CRON_SECRET`
- `CRON_SECRET`

The current `.env.example` defaults and contracts are:

- queue name default: `telemetry-ingestion`
- job name default: `append-proctoring-event`
- buffer name default: `telemetry-buffer`
- worker concurrency default: `5`
- retry attempts default: `3`
- retry backoff default: `1000ms`

## Startup checks

Before considering the worker healthy:

1. Confirm the API health surface reports Redis ingestion:
    - `curl http://localhost:3001/telemetry/health`
2. Confirm the response includes:
    - `ingestion.mode = "redis"`
    - the expected `queueName`
    - the expected `bufferName`
3. Start the worker and verify the logs include:
    - `Validating Redis configuration...`
    - Redis config validation output
    - `Worker ready`

## Flush path and recovery contract

Buffered ingestion uses the Redis list named by `TELEMETRY_REDIS_BUFFER_NAME`.

The internal flush route is:

- `GET /telemetry/internal/flush`

Authorization:

- `Authorization: Bearer $TELEMETRY_CRON_SECRET`
- or `Authorization: Bearer $CRON_SECRET`

The queue service uses a snapshot flow:

1. Read current buffer length.
2. Atomically rename the live buffer list to a timestamped snapshot key.
3. Read the snapshot contents.
4. Bulk-insert the telemetry events into Postgres.
5. Delete the snapshot only after a successful database write.

If the database write fails after the rename, the snapshot is intentionally preserved for manual recovery. That snapshot must not be deleted until the buffered events have been replayed or otherwise reconciled.

## Restart policy

Use a supervisor that restarts the worker on crash and on host reboot. The worker should not be a one-shot shell process in production.

Recommended behavior:

- restart automatically on non-zero exit
- restart on machine/container restart
- keep stdout/stderr logs
- surface failed/stalled worker logs to central monitoring

## Alert thresholds

Treat the following as actionable:

- `telemetry/health` not reachable
- `ingestion.mode` unexpectedly falling back from `redis` to `sync`
- `waiting > 0` for more than 5 minutes during active exams
- `active` stuck without `completed` movement for more than 5 minutes
- `failed > 0`
- `buffered > 0` persisting beyond one flush window during active exams
- worker logs containing `Worker connection or runtime error`
- worker logs containing `Job stalled`

## Manual recovery checklist

If telemetry events are accepted but not appearing in monitoring:

1. Check `GET /telemetry/health`.
2. Confirm API and worker environment values match exactly.
3. Confirm the worker is running and has emitted `Worker ready`.
4. Inspect queue counts (`waiting`, `active`, `failed`, `completed`, `buffered`).
5. If `buffered > 0`, run the protected flush endpoint.
6. If the flush fails, inspect the Redis snapshot key before any cleanup.
7. Re-run reconciliation only after the underlying database or Redis issue is resolved.
