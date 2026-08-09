import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    executeTransaction: vi.fn(async (callback: any) => callback({ tx: true })),
    getTermRecordData: vi.fn(),
    getSubjectRecordsByIdsData: vi.fn(),
    getExistingSubjectOfferingsBySubjectsData: vi.fn(),
    createSubjectOfferingsData: vi.fn(),
    createAllForOfferings: vi.fn(),
    updateAll: vi.fn(),
    getSubjectClassification: vi.fn(),
    assertSubjectOfferingAssignmentsVisible: vi.fn(),
}));

vi.mock('@sentinel/db', () => ({
    executeTransaction: mocks.executeTransaction,
}));

vi.mock('../data/get-term-record', () => ({
    getTermRecordData: mocks.getTermRecordData,
}));

vi.mock('../data/get-subject-records-by-ids', () => ({
    getSubjectRecordsByIdsData: mocks.getSubjectRecordsByIdsData,
}));

vi.mock('../data/get-existing-subject-offerings-by-subjects', () => ({
    getExistingSubjectOfferingsBySubjectsData: mocks.getExistingSubjectOfferingsBySubjectsData,
}));

vi.mock('../data/create-subject-offering', () => ({
    createSubjectOfferingsData: mocks.createSubjectOfferingsData,
}));

vi.mock('./subject-offering-assignments.service', () => ({
    SubjectOfferingAssignmentsService: {
        createAllForOfferings: mocks.createAllForOfferings,
        updateAll: mocks.updateAll,
    },
}));

vi.mock('./assignments-visibility-helper', () => ({
    assertSubjectOfferingAssignmentsVisible: mocks.assertSubjectOfferingAssignmentsVisible,
}));

vi.mock('../../subject-classification/subject-classification.service', () => ({
    SubjectClassificationService: {
        getSubjectClassification: mocks.getSubjectClassification,
    },
}));

vi.mock('../../inheritance/inheritance-resolver.helper', () => ({
    resolveParentScope: vi.fn().mockResolvedValue({
        institutionId: 'institution-a',
        parentInstitutionId: null,
        institutionKind: 'STANDALONE',
    }),
}));

import { SubjectOfferingsService } from '../subject-offerings.service';
import { GetSubjectOfferingsService } from './get-subject-offerings.service';

describe('SubjectOfferingsService.createSubjectOfferingsFromClassification', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mocks.getTermRecordData.mockResolvedValue({
            term_id: 'term-a',
            institution_id: 'institution-a',
            start_date: null,
            end_date: null,
        });
        mocks.getExistingSubjectOfferingsBySubjectsData.mockResolvedValue([]);
        mocks.getSubjectRecordsByIdsData.mockResolvedValue([
            {
                subject_id: 'subject-a',
                institution_id: 'institution-a',
            },
        ]);
        mocks.createSubjectOfferingsData.mockResolvedValue([
            {
                subject_offering_id: 'offering-a',
            },
        ]);
        vi.spyOn(GetSubjectOfferingsService, 'getSubjectOfferingById').mockResolvedValue({
            subject_offering_id: 'offering-a',
            subject_id: 'subject-a',
        } as any);
    });

    it('rejects an empty classification before creating offerings', async () => {
        mocks.getSubjectClassification.mockResolvedValue({
            id: 'classification-a',
            name: 'General Education',
            subjects: [],
        });

        await expect(
            SubjectOfferingsService.createSubjectOfferingsFromClassification({} as any, {
                subject_classification_id: 'classification-a',
                term_id: 'term-a',
                institution_id: 'institution-a',
            }),
        ).rejects.toMatchObject({
            code: 'EMPTY_SUBJECT_CLASSIFICATION',
        });

        expect(mocks.executeTransaction).not.toHaveBeenCalled();
    });

    it('rejects a classification outside the scoped institution', async () => {
        mocks.getSubjectClassification.mockResolvedValue(null);

        await expect(
            SubjectOfferingsService.createSubjectOfferingsFromClassification({} as any, {
                subject_classification_id: 'classification-b',
                term_id: 'term-a',
                institution_id: 'institution-a',
            }),
        ).rejects.toMatchObject({
            code: 'P2025',
        });
    });

    it('rejects a term outside the scoped institution', async () => {
        mocks.getSubjectClassification.mockResolvedValue({
            id: 'classification-a',
            name: 'General Education',
            subjects: [
                {
                    id: 'subject-a',
                    code: 'GE101',
                    title: 'Understanding the Self',
                },
            ],
        });
        mocks.getTermRecordData.mockResolvedValue({
            term_id: 'term-b',
            institution_id: 'institution-b',
            start_date: null,
            end_date: null,
        });

        await expect(
            SubjectOfferingsService.createSubjectOfferingsFromClassification({} as any, {
                subject_classification_id: 'classification-a',
                term_id: 'term-b',
                institution_id: 'institution-a',
            }),
        ).rejects.toMatchObject({
            code: '23503',
        });
    });

    it('rejects duplicate offerings when duplicate strategy is fail_existing', async () => {
        mocks.getSubjectClassification.mockResolvedValue({
            id: 'classification-a',
            name: 'General Education',
            subjects: [
                {
                    id: 'subject-a',
                    code: 'GE101',
                    title: 'Understanding the Self',
                },
            ],
        });
        mocks.getExistingSubjectOfferingsBySubjectsData.mockResolvedValue([
            {
                subject_offering_id: 'offering-a',
                subject_id: 'subject-a',
                subject_code: 'GE101',
                subject_title: 'Understanding the Self',
            },
        ]);

        await expect(
            SubjectOfferingsService.createSubjectOfferingsFromClassification({} as any, {
                subject_classification_id: 'classification-a',
                term_id: 'term-a',
                institution_id: 'institution-a',
                department_ids: ['department-a'],
                course_ids: ['course-a'],
                duplicate_strategy: 'fail_existing',
            }),
        ).rejects.toMatchObject({
            code: 'P2002',
        });
    });

    it('rejects classification offerings without any audience assignments before inserting', async () => {
        mocks.getSubjectClassification.mockResolvedValue({
            id: 'classification-a',
            name: 'General Education',
            subjects: [
                {
                    id: 'subject-a',
                    code: 'GE101',
                    title: 'Understanding the Self',
                },
            ],
        });

        await expect(
            SubjectOfferingsService.createSubjectOfferingsFromClassification({} as any, {
                subject_classification_id: 'classification-a',
                term_id: 'term-a',
                institution_id: 'institution-a',
                department_ids: [],
                course_ids: [],
                section_ids: [],
                year_levels: [],
            }),
        ).rejects.toMatchObject({
            code: 'INVALID_SUBJECT_OFFERING_PAYLOAD',
        });

        expect(mocks.executeTransaction).not.toHaveBeenCalled();
        expect(mocks.createSubjectOfferingsData).not.toHaveBeenCalled();
    });

    it('creates missing offerings and reports skipped duplicates', async () => {
        mocks.getSubjectClassification.mockResolvedValue({
            id: 'classification-a',
            name: 'General Education',
            subjects: [
                {
                    id: 'subject-a',
                    code: 'GE101',
                    title: 'Understanding the Self',
                },
                {
                    id: 'subject-b',
                    code: 'GE102',
                    title: 'Readings in Philippine History',
                },
            ],
        });
        mocks.getExistingSubjectOfferingsBySubjectsData.mockResolvedValue([
            {
                subject_offering_id: 'offering-b',
                subject_id: 'subject-b',
                subject_code: 'GE102',
                subject_title: 'Readings in Philippine History',
            },
        ]);

        const result = await SubjectOfferingsService.createSubjectOfferingsFromClassification(
            {} as any,
            {
                subject_classification_id: 'classification-a',
                term_id: 'term-a',
                institution_id: 'institution-a',
                created_by: 'user-a',
                department_ids: ['department-a'],
                course_ids: ['course-a'],
                section_ids: ['section-a'],
                year_levels: [1],
                duplicate_strategy: 'skip_existing',
            },
        );

        expect(mocks.createSubjectOfferingsData).toHaveBeenCalledTimes(1);
        expect(mocks.createSubjectOfferingsData.mock.calls[0]?.[0].values[0].subject_id).toBe(
            'subject-a',
        );
        expect(result.created_count).toBe(1);
        expect(result.skipped_count).toBe(1);
        expect(mocks.updateAll).toHaveBeenCalledWith({ tx: true }, 'offering-b', {
            department_ids: ['department-a'],
            course_ids: ['course-a'],
            section_ids: ['section-a'],
            year_levels: [1],
        });
        expect(result.skipped).toEqual([
            {
                subject_id: 'subject-b',
                subject_code: 'GE102',
                subject_title: 'Readings in Philippine History',
                existing_subject_offering_id: 'offering-b',
                reason: 'already_offered',
            },
        ]);
    });
});
