import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    supportsSubjectOfferingTables: vi.fn(),
    ensureClassGroupsForSubjectOfferings: vi.fn(),
    deleteEmptyDuplicateSubjectOfferingsData: vi.fn(),
    getSubjectOfferingsData: vi.fn(),
    loadEffectiveRows: vi.fn(),
    paginateItems: vi.fn(),
}));

vi.mock('../helper/subject-offering-compat', () => ({
    supportsSubjectOfferingTables: mocks.supportsSubjectOfferingTables,
    isMissingSubjectOfferingTableError: vi.fn(() => false),
}));

vi.mock('./class-groups-helper', () => ({
    ensureClassGroupsForSubjectOfferings: mocks.ensureClassGroupsForSubjectOfferings,
}));

vi.mock('../data/delete-empty-duplicate-subject-offerings', () => ({
    deleteEmptyDuplicateSubjectOfferingsData: mocks.deleteEmptyDuplicateSubjectOfferingsData,
}));

vi.mock('../data/get-subject-offerings', () => ({
    getSubjectOfferingsData: mocks.getSubjectOfferingsData,
}));

vi.mock('../../inheritance/effective-row-loader', () => ({
    loadEffectiveRows: mocks.loadEffectiveRows,
}));

vi.mock('../../../../lib/pagination', () => ({
    paginateItems: mocks.paginateItems,
}));

import { GetSubjectOfferingsService } from './get-subject-offerings.service';

describe('GetSubjectOfferingsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.supportsSubjectOfferingTables.mockResolvedValue(true);
        mocks.loadEffectiveRows.mockResolvedValue([]);
        mocks.paginateItems.mockReturnValue({ items: [], pagination: { total: 0 } });
    });

    it('cleans empty duplicate subject offerings before loading the list', async () => {
        await GetSubjectOfferingsService.getSubjectOfferings({} as any, {
            institutionId: 'institution-id',
            page: 1,
            limit: 10,
        });

        expect(mocks.deleteEmptyDuplicateSubjectOfferingsData).toHaveBeenCalledWith({
            dbClient: {},
            institutionId: 'institution-id',
        });
        expect(mocks.loadEffectiveRows).toHaveBeenCalled();
    });
});
