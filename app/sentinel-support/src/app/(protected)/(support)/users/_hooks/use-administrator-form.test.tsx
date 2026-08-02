import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdministratorForm } from './use-administrator-form';

const { mockUseInviteUserMutation, mockUseUpdateUserMutation, mockUseUserQuery } = vi.hoisted(
    () => ({
        mockUseInviteUserMutation: vi.fn(),
        mockUseUpdateUserMutation: vi.fn(),
        mockUseUserQuery: vi.fn(),
    }),
);

vi.mock('@sentinel/hooks', () => ({
    useInviteUserMutation: mockUseInviteUserMutation,
    useUpdateUserMutation: mockUseUpdateUserMutation,
    useUserQuery: mockUseUserQuery,
}));

describe('useAdministratorForm', () => {
    const inviteMutateAsync = vi.fn();
    const updateMutateAsync = vi.fn();

    beforeEach(() => {
        inviteMutateAsync.mockReset();
        updateMutateAsync.mockReset();
        mockUseUserQuery.mockReturnValue({ data: undefined });
        mockUseInviteUserMutation.mockReturnValue({
            mutateAsync: inviteMutateAsync,
            isPending: false,
        });
        mockUseUpdateUserMutation.mockReturnValue({
            mutateAsync: updateMutateAsync,
            isPending: false,
        });
    });

    it('shapes superadmin invite payloads with the superadmin role', async () => {
        const { result } = renderHook(() =>
            useAdministratorForm({
                role: 'superadmin',
            }),
        );

        await act(async () => {
            await result.current.onSubmit({
                firstName: 'Ada',
                lastName: 'Lovelace',
                email: 'ada@example.com',
                role: 'superadmin',
                department: 'dept-1',
                course: 'course-1',
                courseIds: ['course-1'],
                studentNo: '2024000001',
                employeeNo: 'EMP-1',
                institution: 'inst-1',
            });
        });

        expect(inviteMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                role: 'superadmin',
                department: 'dept-1',
                course: '',
                courseIds: [],
                studentNo: undefined,
                employeeNo: undefined,
                institution: 'inst-1',
            }),
        );
    });

    it('shapes support invite payloads without a department while keeping institution scope', async () => {
        const { result } = renderHook(() =>
            useAdministratorForm({
                role: 'support',
            }),
        );

        await act(async () => {
            await result.current.onSubmit({
                firstName: 'Sam',
                lastName: 'Support',
                email: 'sam@example.com',
                role: 'support',
                department: '',
                course: 'course-1',
                courseIds: ['course-1'],
                studentNo: '2024000001',
                employeeNo: 'EMP-2',
                institution: 'inst-9',
            });
        });

        expect(inviteMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                role: 'support',
                department: '',
                course: '',
                courseIds: [],
                studentNo: undefined,
                employeeNo: undefined,
                institution: 'inst-9',
            }),
        );
    });

    it('requires a department for superadmin dean invites', async () => {
        const { result } = renderHook(() =>
            useAdministratorForm({
                role: 'superadmin',
            }),
        );

        await act(async () => {
            result.current.form.setValue('firstName', 'Ada');
            result.current.form.setValue('lastName', 'Lovelace');
            result.current.form.setValue('email', 'ada@example.com');
            result.current.form.setValue('institution', 'inst-1');
            result.current.form.setValue('department', '');
            const isValid = await result.current.form.trigger();
            expect(isValid).toBe(false);
        });

        expect(inviteMutateAsync).not.toHaveBeenCalled();
        expect(result.current.form.getFieldState('department').error?.message).toBe(
            'Department is required',
        );
    });
});
