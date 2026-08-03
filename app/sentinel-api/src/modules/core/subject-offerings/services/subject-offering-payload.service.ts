import { deriveSubjectOfferingStatus } from '../helper/subject-offering-status';
import { type Insertable, type Updateable } from 'kysely';
import { type DB } from '@sentinel/db';
import type { SubjectOfferingStatus } from '@sentinel/shared/types';
import type { SubjectOfferingAssignmentsPayload } from './subject-offering-assignments.service';
import { buildSubjectOfferingError } from '../helper/subject-offering-errors';

export type CreateSubjectOfferingPayload = SubjectOfferingAssignmentsPayload & {
    subject_id: string;
    term_id: string;
    created_by?: string | null;
    institution_id?: string | null;
};

export type UpdateSubjectOfferingPayload = SubjectOfferingAssignmentsPayload & {
    term_id?: string;
    status?: SubjectOfferingStatus;
    updated_by?: string | null;
    institution_id?: string | null;
};

type TermStatusInput = {
    start_date: Date | string | null;
    end_date: Date | string | null;
};

export function normalizeAssignments(payload: SubjectOfferingAssignmentsPayload) {
    return {
        department_ids: payload.department_ids,
        course_ids: payload.course_ids,
        section_ids: payload.section_ids,
        year_levels: payload.year_levels,
    };
}

export function hasSubjectOfferingAudience(payload: SubjectOfferingAssignmentsPayload) {
    return (
        (payload.department_ids?.length ?? 0) > 0 ||
        (payload.course_ids?.length ?? 0) > 0 ||
        (payload.section_ids?.length ?? 0) > 0 ||
        (payload.year_levels?.length ?? 0) > 0
    );
}

export function assertSubjectOfferingHasAudience(payload: SubjectOfferingAssignmentsPayload) {
    if (hasSubjectOfferingAudience(payload)) {
        return;
    }

    throw buildSubjectOfferingError(
        'Select at least one department, course, year level, or section before offering a subject',
        'INVALID_SUBJECT_OFFERING_PAYLOAD',
    );
}

export function resolveNextStatus(args: {
    term: TermStatusInput;
    existingStatus?: SubjectOfferingStatus | null;
    requestedStatus?: SubjectOfferingStatus;
    termChanged: boolean;
}) {
    const automaticStatus = deriveSubjectOfferingStatus(args.term);

    if (automaticStatus === 'CLOSED') {
        return 'CLOSED' as const;
    }

    if (args.requestedStatus === 'CLOSED' || args.requestedStatus === 'ARCHIVED') {
        return args.requestedStatus;
    }

    if (args.requestedStatus === 'OPEN' || args.requestedStatus === 'DRAFT') {
        return automaticStatus;
    }

    if (args.termChanged) {
        return automaticStatus;
    }

    return args.existingStatus ?? automaticStatus;
}

export function buildCreateSubjectOfferingValues(args: {
    payload: CreateSubjectOfferingPayload;
    subjectInstitutionId?: string | null;
    termInstitutionId?: string | null;
    term: TermStatusInput;
}): Insertable<DB['subject_offerings']> {
    const { payload, subjectInstitutionId, termInstitutionId, term } = args;

    return {
        subject_id: payload.subject_id,
        term_id: payload.term_id,
        status: deriveSubjectOfferingStatus(term),
        created_by: payload.created_by ?? null,
        updated_by: payload.created_by ?? null,
        institution_id: payload.institution_id ?? subjectInstitutionId ?? termInstitutionId ?? null,
    };
}

export function buildUpdateSubjectOfferingValues(args: {
    payload: UpdateSubjectOfferingPayload;
    nextTermId: string;
    term: TermStatusInput;
    existingStatus?: SubjectOfferingStatus | null;
    termChanged: boolean;
}): Updateable<DB['subject_offerings']> {
    const { payload, nextTermId, term, existingStatus, termChanged } = args;

    return {
        term_id: nextTermId,
        status: resolveNextStatus({
            term,
            existingStatus,
            requestedStatus: payload.status,
            termChanged,
        }),
        updated_by: payload.updated_by ?? null,
    };
}
