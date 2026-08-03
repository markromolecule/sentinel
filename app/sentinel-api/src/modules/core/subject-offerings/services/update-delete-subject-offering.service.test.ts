import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSubjectOfferingBaseRecordData } from '../data/get-subject-offering-base-record';
import { deleteSubjectOfferingData } from '../data/delete-subject-offering';
import { hideInheritedRecord } from '../../inheritance/inheritable-write-helper';
import { UpdateDeleteSubjectOfferingService } from './update-delete-subject-offering.service';

vi.mock('../data/get-subject-offering-base-record', () => ({
    getSubjectOfferingBaseRecordData: vi.fn(),
}));

vi.mock('../data/delete-subject-offering', () => ({
    deleteSubjectOfferingData: vi.fn(),
}));

vi.mock('../../inheritance/inheritable-write-helper', () => ({
    hideInheritedRecord: vi.fn(),
}));

describe('UpdateDeleteSubjectOfferingService', () => {
    const dbClient = {} as any;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('hides inherited subject offerings instead of physically deleting them', async () => {
        vi.mocked(hideInheritedRecord).mockResolvedValue({
            subject_offering_id: 'child-hidden-offering-id',
        });

        await UpdateDeleteSubjectOfferingService.deleteSubjectOffering(
            dbClient,
            'parent-offering-id',
            'child-institution-id',
            'actor-user-id',
        );

        expect(hideInheritedRecord).toHaveBeenCalledWith(
            expect.objectContaining({
                dbClient,
                id: 'parent-offering-id',
                institutionId: 'child-institution-id',
                actorId: 'actor-user-id',
            }),
        );
        expect(getSubjectOfferingBaseRecordData).not.toHaveBeenCalled();
        expect(deleteSubjectOfferingData).not.toHaveBeenCalled();
    });

    it('deduplicates bulk delete IDs before deleting local offerings', async () => {
        vi.mocked(hideInheritedRecord).mockResolvedValue(null);
        vi.mocked(getSubjectOfferingBaseRecordData).mockResolvedValue({
            subject_offering_id: 'offering-id',
            subject_id: 'subject-id',
            term_id: 'term-id',
            institution_id: 'institution-id',
            status: 'OPEN',
        } as any);

        await UpdateDeleteSubjectOfferingService.deleteSubjectOfferings(
            dbClient,
            ['offering-id', 'offering-id'],
            'institution-id',
            'actor-user-id',
        );

        expect(deleteSubjectOfferingData).toHaveBeenCalledTimes(1);
        expect(deleteSubjectOfferingData).toHaveBeenCalledWith(
            dbClient,
            'offering-id',
            'institution-id',
        );
    });
});
