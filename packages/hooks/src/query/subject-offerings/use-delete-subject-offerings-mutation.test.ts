import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeleteSubjectOfferingsMutation } from './use-delete-subject-offerings-mutation';
import { deleteSubjectOfferings } from '@sentinel/services';
import { SUBJECT_OFFERING_QUERY_KEYS, SUBJECT_QUERY_KEYS } from '@sentinel/shared/constants';

const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: vi.fn(() => ({
        invalidateQueries: mockInvalidateQueries,
    })),
    useMutation: vi.fn((options: any) => {
        const mutateAsync = async (variables: any) => {
            try {
                if (options.mutationFn) {
                    await options.mutationFn(variables);
                }
                if (options.onSuccess) {
                    await options.onSuccess(undefined, variables, null);
                }
            } catch (error) {
                if (options.onError) {
                    options.onError(error, variables, null);
                }
                throw error;
            }
        };
        return { mutateAsync };
    }),
}));

vi.mock('@sentinel/services', () => ({
    deleteSubjectOfferings: vi.fn(),
}));

vi.mock('../../api-provider', () => ({
    useApi: vi.fn(() => ({ mockClient: true })),
}));

describe('useDeleteSubjectOfferingsMutation Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls deleteSubjectOfferings and invalidates cache on success', async () => {
        const ids = ['offering-uuid-1', 'offering-uuid-2'];

        const mutation = useDeleteSubjectOfferingsMutation();
        await (mutation as any).mutateAsync(ids);

        expect(deleteSubjectOfferings).toHaveBeenCalledWith({ mockClient: true }, ids);
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: SUBJECT_OFFERING_QUERY_KEYS.all,
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
            queryKey: SUBJECT_QUERY_KEYS.all,
        });
    });

    it('passes institution-scoped delete payloads through to the service', async () => {
        const payload = {
            ids: ['offering-uuid-1'],
            institutionId: 'institution-uuid-1',
        };

        const mutation = useDeleteSubjectOfferingsMutation();
        await (mutation as any).mutateAsync(payload);

        expect(deleteSubjectOfferings).toHaveBeenCalledWith({ mockClient: true }, payload);
    });
});
