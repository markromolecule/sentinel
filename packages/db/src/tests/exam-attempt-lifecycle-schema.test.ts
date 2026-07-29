import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Selectable } from 'kysely';
import {
    exam_attempt_lifecycle_event_type,
    exam_attempt_lifecycle_state,
    exam_attempt_score_state,
    type DB,
    type exam_attempt_lifecycle_events,
    type exam_attempts,
} from '../generated/types';

describe('exam attempt lifecycle schema types', () => {
    it('exposes the lifecycle enums in generated DB types', () => {
        expect(exam_attempt_lifecycle_state.IN_PROGRESS).toBe('IN_PROGRESS');
        expect(exam_attempt_lifecycle_state.LOCKED).toBe('LOCKED');
        expect(exam_attempt_lifecycle_event_type.REOPENED).toBe('REOPENED');
        expect(exam_attempt_lifecycle_event_type.FINALIZED).toBe('FINALIZED');
        expect(exam_attempt_score_state.DRAFT).toBe('DRAFT');
        expect(exam_attempt_score_state.REVISION_REQUIRED).toBe('REVISION_REQUIRED');
    });

    it('includes lifecycle columns on exam_attempts', () => {
        const record: Selectable<exam_attempts> = {
            attempt_id: 'fcb4774e-698b-4aa9-863b-a50f1062bf4a',
            exam_id: '1fd52d94-e6d9-4519-b38a-b17b6ccddf74',
            student_id: '2d519509-537d-4bfd-af39-76118cbad154',
            started_at: new Date(),
            completed_at: null,
            score: null,
            total_score: null,
            initial_score: null,
            status: 'IN_PROGRESS',
            time_spent_minutes: 0,
            is_verified: false,
            created_at: new Date(),
            answered_question_count: 0,
            answer_snapshot: null,
            assessment_snapshot: null,
            score_snapshot: null,
            scoring_version: null,
            last_synced_at: null,
            reconnect_attempt_count: 0,
            lifecycle_state: 'LOCKED',
            lifecycle_reason: 'PROCTOR_LOCK',
            lifecycle_note: 'Paused pending review.',
            locked_at: new Date(),
            locked_by: '6d854648-305e-4eff-82d4-b64458284eeb',
            reopened_until: null,
            closed_at: null,
            closed_by: null,
            closed_reason: null,
            superseded_by_attempt_id: null,
            superseded_at: null,
            superseded_by: null,
            finalized_at: null,
            finalized_by: null,
            score_state: 'DRAFT',
            last_reconnect_request_id: null,
        };

        expect(record.lifecycle_state).toBe('LOCKED');
        expect(record.score_state).toBe('DRAFT');
    });

    it('includes the lifecycle event table in the DB mapping', () => {
        const event: Selectable<exam_attempt_lifecycle_events> = {
            event_id: '5c4d4890-c32d-4891-82af-1be9d0f41570',
            attempt_id: 'fcb4774e-698b-4aa9-863b-a50f1062bf4a',
            exam_id: '1fd52d94-e6d9-4519-b38a-b17b6ccddf74',
            student_id: '2d519509-537d-4bfd-af39-76118cbad154',
            event_type: 'LOCKED',
            previous_state: 'IN_PROGRESS',
            next_state: 'LOCKED',
            actor_user_id: '6d854648-305e-4eff-82d4-b64458284eeb',
            reason_code: 'PROCTOR_LOCK',
            notes: 'Paused pending review.',
            related_incident_ids: ['af8797ec-2151-4454-918c-b5343f9198e7'],
            related_override_id: null,
            metadata: { source: 'manual' },
            created_at: new Date(),
        };

        expect(event.event_type).toBe('LOCKED');
        expectTypeOf<
            DB['exam_attempt_lifecycle_events']
        >().toEqualTypeOf<exam_attempt_lifecycle_events>();
    });
});
