import {
    buildClassificationError,
    INVALID_SUBJECT_CLASSIFICATION_PAYLOAD,
    SUBJECT_CLASSIFICATION_TYPES,
} from './subject-classification-errors';
import { toUniqueSubjectIds } from '../data/to-unique-subject-ids';

export type SubjectClassificationType = 'GENERAL' | 'CORE';

export type CreateSubjectClassificationPayload = {
    name: string;
    type: SubjectClassificationType;
    description?: string | null;
    subject_ids?: string[];
    department_id?: string | null;
    course_ids?: string[];
    year_levels?: number[];
    created_by?: string | null;
    institution_id?: string | null;
};

export type UpdateSubjectClassificationPayload = Partial<{
    name: string;
    type: SubjectClassificationType;
    description: string | null;
    subject_ids: string[];
    department_id: string | null;
    course_ids: string[];
    year_levels: number[];
    updated_by: string | null;
}>;

function normalizeYearLevels(value?: number[]) {
    if (value === undefined) {
        return undefined;
    }

    return [...new Set(value)]
        .map((yearLevel) => Number(yearLevel))
        .filter((yearLevel) => Number.isInteger(yearLevel) && yearLevel >= 1 && yearLevel <= 6)
        .sort((left, right) => left - right);
}

function normalizeDescription(value?: string | null) {
    if (value === undefined) {
        return undefined;
    }

    const normalized = value?.trim() ?? '';
    return normalized ? normalized : null;
}

function normalizeType(value?: string) {
    if (!value) {
        return undefined;
    }

    const normalized = value.trim().toUpperCase();

    if (!SUBJECT_CLASSIFICATION_TYPES.has(normalized)) {
        throw buildClassificationError(
            'Classification type must be GENERAL or CORE',
            INVALID_SUBJECT_CLASSIFICATION_PAYLOAD,
        );
    }

    return normalized as SubjectClassificationType;
}

export function normalizeCreatePayload(data: CreateSubjectClassificationPayload) {
    const name = data.name.trim();
    const type = normalizeType(data.type);
    const courseIds = data.course_ids ? [...new Set(data.course_ids)] : [];
    const yearLevels = normalizeYearLevels(data.year_levels) ?? [];

    if (!name) {
        throw buildClassificationError(
            'Classification group name is required',
            INVALID_SUBJECT_CLASSIFICATION_PAYLOAD,
        );
    }

    if (!type) {
        throw buildClassificationError(
            'Classification type is required',
            INVALID_SUBJECT_CLASSIFICATION_PAYLOAD,
        );
    }

    if (type === 'CORE' && courseIds.length === 0) {
        throw buildClassificationError(
            'Core classifications must be linked to at least one course',
            INVALID_SUBJECT_CLASSIFICATION_PAYLOAD,
        );
    }

    return {
        name,
        type,
        description: normalizeDescription(data.description),
        subject_ids: toUniqueSubjectIds(data.subject_ids),
        department_id: type === 'CORE' ? (data.department_id ?? null) : null,
        course_ids: type === 'CORE' ? courseIds : [],
        year_levels: yearLevels,
        created_by: data.created_by ?? null,
        institution_id: data.institution_id ?? null,
    };
}

export function normalizeUpdatePayload(data: UpdateSubjectClassificationPayload) {
    const name = data.name?.trim();
    const type = normalizeType(data.type);
    const courseIds = data.course_ids !== undefined ? [...new Set(data.course_ids)] : undefined;
    const yearLevels = normalizeYearLevels(data.year_levels);

    if (name !== undefined && !name) {
        throw buildClassificationError(
            'Classification group name is required',
            INVALID_SUBJECT_CLASSIFICATION_PAYLOAD,
        );
    }

    if (type === 'CORE' && courseIds !== undefined && courseIds.length === 0) {
        throw buildClassificationError(
            'Core classifications must be linked to at least one course',
            INVALID_SUBJECT_CLASSIFICATION_PAYLOAD,
        );
    }

    return {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(data.description !== undefined
            ? { description: normalizeDescription(data.description) }
            : {}),
        ...(data.subject_ids !== undefined
            ? { subject_ids: toUniqueSubjectIds(data.subject_ids) }
            : {}),
        ...(data.department_id !== undefined
            ? { department_id: type === 'GENERAL' ? null : data.department_id }
            : {}),
        ...(courseIds !== undefined ? { course_ids: type === 'GENERAL' ? [] : courseIds } : {}),
        ...(yearLevels !== undefined ? { year_levels: yearLevels } : {}),
        ...(data.updated_by !== undefined ? { updated_by: data.updated_by } : {}),
    };
}
