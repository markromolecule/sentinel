import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    getSubjectRecordData: vi.fn(),
    getTermRecordData: vi.fn(),
    createSubjectOfferingData: vi.fn(),
    deleteSubjectOfferingData: vi.fn(),
    validateEffectiveInstitutionScope: vi.fn(),
    assertSubjectOfferingAssignmentsVisible: vi.fn(),
    updateAll: vi.fn(),
    getSubjectOfferingById: vi.fn(),
}));

vi.mock('../data/get-subject-record', () => ({
    getSubjectRecordData: mocks.getSubjectRecordData,
}));

vi.mock('../data/get-term-record', () => ({
    getTermRecordData: mocks.getTermRecordData,
}));

vi.mock('../data/create-subject-offering', () => ({
    createSubjectOfferingData: mocks.createSubjectOfferingData,
}));

vi.mock('../data/delete-subject-offering', () => ({
    deleteSubjectOfferingData: mocks.deleteSubjectOfferingData,
}));

vi.mock('../helper/validate-institution-scope', () => ({
    validateEffectiveInstitutionScope: mocks.validateEffectiveInstitutionScope,
}));

vi.mock('./assignments-visibility-helper', () => ({
    assertSubjectOfferingAssignmentsVisible: mocks.assertSubjectOfferingAssignmentsVisible,
}));

vi.mock('./subject-offering-assignments.service', () => ({
    SubjectOfferingAssignmentsService: {
        updateAll: mocks.updateAll,
    },
}));

vi.mock('./get-subject-offerings.service', () => ({
    GetSubjectOfferingsService: {
        getSubjectOfferingById: mocks.getSubjectOfferingById,
    },
}));

import { CreateSubjectOfferingService } from './create-subject-offering.service';

describe('CreateSubjectOfferingService', () => {
    const dbClient = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getSubjectRecordData.mockResolvedValue({
            subject_id: 'subject-id',
            institution_id: 'institution-id',
        });
        mocks.getTermRecordData.mockResolvedValue({
            term_id: 'term-id',
            institution_id: 'institution-id',
            start_date: null,
            end_date: null,
        });
    });

    it('rejects subject offerings without any audience assignments before inserting', async () => {
        await expect(
            CreateSubjectOfferingService.createSubjectOffering(dbClient, {
                subject_id: 'subject-id',
                term_id: 'term-id',
                institution_id: 'institution-id',
                department_ids: [],
                course_ids: [],
                section_ids: [],
                year_levels: [],
            }),
        ).rejects.toMatchObject({
            code: 'INVALID_SUBJECT_OFFERING_PAYLOAD',
        });

        expect(mocks.createSubjectOfferingData).not.toHaveBeenCalled();
    });
});
