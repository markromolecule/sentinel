# Reduce Idle Redis Commands from PDF Generation

## Status

Repository implementation complete; production rollout is pending. Trigger-only PDF generation
was selected for the current production deployment, while Redis worker mode remains available as
an explicit opt-in.

## Incident summary

The production Redis database reached its 500,000-command monthly allowance while the
`pdf-generation` queue had no jobs. Upstash Monitor showed a repeating BullMQ worker loop:

- approximately every 5 seconds, `BZPOPMIN` times out and BullMQ runs its `moveToActive`
  Lua script against the empty queue;
- approximately every 30 seconds, BullMQ runs its stalled-job check Lua script;
- Upstash counts the outer `EVALSHA` and the Redis commands executed by each script.

This is worker maintenance traffic, not application requests or unexpected PDF jobs.

## Root cause

BullMQ 5.73.5 defaults an idle `Worker` to `drainDelay: 5` seconds and
`stalledInterval: 30000` milliseconds. The PDF worker does not override either value.

The API also starts a PDF worker by default:

```ts
const shouldStartEmbeddedPdfWorker = process.env.ENABLE_EMBEDDED_PDF_WORKER !== 'false';
```

At the same time, the PDF operations runbook instructs production to start a dedicated
`start:pdf-worker` process. Therefore every API process/replica can start an embedded worker,
and a dedicated process can start another. Each worker adds its own idle polling loop.

Historically, production also defaulted `PDF_GENERATION_MODE` to `redis` when the variable was
absent, so an unset mode did not protect production from starting the worker.

## Command budget

For the empty queue shown in the incident trace, one worker performs approximately:

| Loop                                           |        Frequency | Commands per iteration | Commands per minute |
| ---------------------------------------------- | ---------------: | ---------------------: | ------------------: |
| Empty queue fetch (`EVALSHA` and Lua commands) |  every 5 seconds |                      7 |                  84 |
| Blocking marker wait (`BZPOPMIN`)              |  every 5 seconds |                      1 |                  12 |
| Stalled check (`EVALSHA` and Lua commands)     | every 30 seconds |                      7 |                  14 |
| **Estimated idle total**                       |                  |                        |             **110** |

One continuously running worker therefore uses approximately 158,400 commands per day and
4.75 million commands per 30 days. It reaches 500,000 commands in about 3.2 days without
processing a job. If the allowance was exhausted in about 24 hours, roughly three workers or
equivalent additional Redis traffic were active.

The two TCP source ports visible in the trace do not by themselves prove there are two workers.
BullMQ gives one worker a regular connection and a duplicated blocking connection. Deployment
replica/process count must be confirmed from the hosting platform and startup logs.

## Immediate containment

1. Confirm how many API replicas and dedicated PDF worker processes are running. Search each
   process's startup logs for `[PDFWorker] Background PDF Generation Worker started successfully.`
2. For the selected low-volume production topology, set `PDF_GENERATION_MODE=sync`, set
   `ENABLE_EMBEDDED_PDF_WORKER=false`, and stop the dedicated PDF worker service. This eliminates
   PDF queue polling and invokes rendering only after an export request.
3. Treat direct processing as an explicit availability trade-off: rendering is fire-and-forget
   inside the API process, so restarts can interrupt work. Monitor and retry exports stuck in
   `PENDING`.
4. If the 500,000-command plan must be retained temporarily, configure the single worker with a
   substantially longer idle wait and stalled scan. A starting candidate is
   `drainDelay: 120` seconds and `stalledInterval: 300000` milliseconds. On an empty queue this
   is approximately 233,000 commands per 30 days for one worker, leaving limited room for real
   jobs and other Redis users. Validate this against the actual monitor before release.
5. Do not use `skipStalledCheck` merely to reduce commands; it weakens recovery of abandoned
   active jobs.

## Implementation plan

### Phase 1: enable trigger-only production processing

- Change embedded-worker startup to opt in (`ENABLE_EMBEDDED_PDF_WORKER === 'true'`) instead of
  opt out.
- Default `PDF_GENERATION_MODE` to `sync` in every environment unless Redis mode is explicitly
  requested.
- Stop the dedicated PDF worker in the current production deployment.
- Document interrupted-job monitoring and retry as the trade-off for eliminating idle commands.

### Phase 2: preserve a budgeted Redis worker option

- If Redis mode is restored later, run exactly one dedicated production worker and explicitly set
  `PDF_GENERATION_MODE=redis` while keeping embedded workers disabled on API replicas.
- Add startup telemetry containing a non-secret worker instance identifier, hostname/process ID,
  queue name, concurrency, drain delay, and stalled interval.
- Make `pdf-worker-process.ts` call `stopPdfGenerationWorker()` before exiting so deployments
  shut down both BullMQ connections cleanly.
- Reconcile the runbook and `.env.example` with the actual supported topology.

- Add validated environment settings for `PDF_WORKER_DRAIN_DELAY_SECONDS` and
  `PDF_WORKER_STALLED_INTERVAL_MS`.
- Wire the already documented `PDF_WORKER_CONCURRENCY` and `PDF_GENERATION_QUEUE_NAME` settings
  into the worker and producer instead of using hard-coded values.
- Start conservatively with one worker, a 120-second drain delay, and a 5-minute stalled interval.
- Document that increasing the stalled interval increases worst-case recovery time after a worker
  loses a job lock. Keep lock renewal enabled.
- Define a monthly command budget for PDF jobs and leave capacity for telemetry or future queues.

### Phase 3: select a durable long-term production model if needed

Choose one of these based on expected PDF volume:

- **Always-on worker:** move Redis to an Upstash Fixed plan or another fixed-cost Redis service.
  Upstash explicitly warns that BullMQ accesses Redis while idle and recommends Fixed plans for
  BullMQ workloads. This is the simplest reliable option for prompt job processing.
- **Low-volume/on-demand worker:** start a worker on a schedule or platform job, drain the queue,
  and close it after a race-safe idle grace period. This preserves the free command budget but
  adds queue latency and requires careful shutdown/retry handling.
- **Remove Redis from this workflow:** dispatch PDF generation through a platform-native task or
  durable database job mechanism. This is a larger architecture change but avoids BullMQ's
  always-on Redis maintenance traffic.

Do not treat a higher Upstash limit alone as the root-cause fix; the current default topology can
multiply indefinitely with API replicas.

## Verification plan

- Unit test that the API does not construct a worker unless embedded mode is explicitly enabled.
- Unit test the resolved queue name, concurrency, drain delay, and stalled interval, including
  rejection of unsafe or invalid values.
- Unit test that both API and dedicated worker shutdown paths await `Worker.close()` and close the
  supplied Redis connection.
- Deploy one worker to staging, leave the queue empty for at least 30 minutes, and use Upstash
  Monitor/Usage to measure the actual per-minute read and write counts.
- Submit representative analytics and answer-key jobs and verify that the marker wakes the worker
  promptly despite the longer drain delay.
- Terminate the worker during an active test job and verify stalled-job recovery within the chosen
  interval, without producing duplicate artifacts.
- Confirm production has exactly one worker-start log per intended worker replica and no worker
  startup logs in API replicas.
- Add alerts at 50%, 75%, and 90% of the monthly Redis command allowance.

## Acceptance criteria

- Exactly one production PDF worker is active unless scaling is intentionally configured and
  budgeted.
- API replicas do not start PDF workers by default.
- Measured empty-queue usage matches the documented command budget and projects below the plan
  allowance with operational headroom.
- New PDF jobs still start within the agreed latency target.
- A terminated active job is recovered within the agreed stalled-job recovery target.
- Worker ownership, settings, shutdown behavior, and Redis capacity assumptions are documented.
