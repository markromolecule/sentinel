import { HTTPException } from 'hono/http-exception';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersistableProctoringEvent } from '../ingestion.dto';
import {
    buildTelemetryJobLogContext,
    processQueuedTelemetryEvent,
} from './telemetry-job-processor.service';
import { TelemetryStorageService } from '../../storage/storage.service';

vi.mock('../../storage/storage.service', () => ({
    TelemetryStorageService: {
        appendEvent: vi.fn(),
    },
}));

const appendEventMock = vi.mocked(TelemetryStorageService.appendEvent);

const payload: PersistableProctoringEvent = {
    examSessionId: '123e4567-e89b-12d3-a456-426614174000',
    studentId: '123e4567-e89b-12d3-a456-426614174001',
    timestamp: '2026-04-20T12:32:08.451Z',
    platform: 'WEB',
    source: 'WEB_SECURITY',
    ruleKey: 'tab_switching_monitor',
    eventType: 'TAB_SWITCH',
};

describe('processQueuedTelemetryEvent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('marks successfully stored new jobs as inserted', async () => {
        appendEventMock.mockResolvedValueOnce({ isNew: true, disposition: 'inserted' } as any);

        await expect(processQueuedTelemetryEvent({} as never, payload)).resolves.toBe('inserted');
    });

    it('marks successfully stored existing jobs as aggregated', async () => {
        appendEventMock.mockResolvedValueOnce({ isNew: false, disposition: 'aggregated' } as any);

        await expect(processQueuedTelemetryEvent({} as never, payload)).resolves.toBe('aggregated');
    });

    it('marks duplicate enqueued jobs as duplicate-ignored', async () => {
        appendEventMock.mockResolvedValueOnce({
            isNew: false,
            disposition: 'duplicate-ignored',
        } as any);

        await expect(processQueuedTelemetryEvent({} as never, payload)).resolves.toBe('duplicate-ignored');
    });

    it('drops terminal not-found storage errors without retrying the queue job', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        appendEventMock.mockRejectedValueOnce(
            new HTTPException(404, {
                message: 'Exam session not found for telemetry ingestion.',
            }),
        );

        await expect(processQueuedTelemetryEvent({} as never, payload)).resolves.toBe('dropped');
        expect(warnSpy).toHaveBeenCalledWith('[TelemetryWorker] Dropping terminal telemetry job.', {
            status: 404,
            message: 'Exam session not found for telemetry ingestion.',
            attemptId: payload.examSessionId,
            studentId: payload.studentId,
            eventType: payload.eventType,
            ruleKey: payload.ruleKey,
            timestamp: payload.timestamp,
            eventId: null,
            dedupeKey: null,
        });
    });

    it('drops terminal completed-session storage errors without retrying the queue job', async () => {
        appendEventMock.mockRejectedValueOnce(
            new HTTPException(409, {
                message: 'Cannot ingest telemetry for a completed exam session.',
            }),
        );

        await expect(processQueuedTelemetryEvent({} as never, payload)).resolves.toBe('dropped');
    });

    it('rethrows unexpected storage failures so the worker still surfaces real problems', async () => {
        const error = new Error('database unavailable');
        appendEventMock.mockRejectedValueOnce(error);

        await expect(processQueuedTelemetryEvent({} as never, payload)).rejects.toThrow(error);
    });
});

describe('buildTelemetryJobLogContext', () => {
    it('returns the identifiers needed to reconcile a telemetry job to an attempt and event', () => {
        expect(
            buildTelemetryJobLogContext({
                ...payload,
                metadata: {
                    eventId: '123e4567-e89b-12d3-a456-426614174999',
                    dedupeKey: 'attempt-1:TAB_SWITCH:bucket-1',
                },
            }),
        ).toEqual({
            attemptId: payload.examSessionId,
            studentId: payload.studentId,
            eventType: payload.eventType,
            ruleKey: payload.ruleKey,
            timestamp: payload.timestamp,
            eventId: '123e4567-e89b-12d3-a456-426614174999',
            dedupeKey: 'attempt-1:TAB_SWITCH:bucket-1',
        });
    });
});
