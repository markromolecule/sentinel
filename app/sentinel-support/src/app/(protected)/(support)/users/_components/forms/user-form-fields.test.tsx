import { fireEvent, render, screen } from '@testing-library/react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserFormFields } from './user-form-fields';
import type { UserFormValues } from '@sentinel/shared/schema';
import { useDepartmentsQuery, useInstitutionsQuery } from '@sentinel/hooks';

vi.mock('@sentinel/hooks', () => ({
    useDepartmentsQuery: vi.fn(),
    useInstitutionsQuery: vi.fn(),
}));

vi.mock('@sentinel/ui', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@sentinel/ui')>();

    return {
        ...actual,
        FormControl: ({ children }: { children: ReactNode }) => <>{children}</>,
        FormField: ({ control, name, render }: any) => (
            <Controller control={control} name={name} render={render} />
        ),
        FormItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
        FormLabel: ({ children }: { children: ReactNode }) => <label>{children}</label>,
        FormMessage: () => null,
        Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
        Select: ({ children, disabled, onValueChange, value }: any) => (
            <select
                disabled={disabled}
                onChange={(event) => onValueChange?.(event.target.value)}
                value={value}
            >
                {children}
            </select>
        ),
        SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
        SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
            <option value={value}>{children}</option>
        ),
        SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
        SelectValue: ({ placeholder }: { placeholder?: string }) => (
            <option value="">{placeholder}</option>
        ),
    };
});

function UserFormFieldsHarness() {
    const form = useForm<UserFormValues>({
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            role: 'superadmin',
            department: '',
            course: '',
            courseIds: [],
            studentNo: '',
            employeeNo: '',
            institution: '',
        },
    });

    return <UserFormFields form={form} role="superadmin" />;
}

describe('UserFormFields', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useInstitutionsQuery).mockReturnValue({
            data: [
                {
                    id: 'parent-inst',
                    name: 'National University',
                    institutionKind: 'PARENT',
                },
                {
                    id: 'child-inst',
                    name: 'NU Dasmarinas',
                    parentInstitutionId: 'parent-inst',
                    institutionKind: 'CHILD',
                },
            ],
        } as any);
        vi.mocked(useDepartmentsQuery).mockImplementation(({ institutionId }: any = {}) => ({
            data:
                institutionId === 'child-inst'
                    ? [
                          {
                              id: 'parent-dept',
                              name: 'Computer Studies',
                              code: 'CCS',
                              institutionId: 'parent-inst',
                              effectiveInstitutionId: 'child-inst',
                              isInherited: true,
                          },
                      ]
                    : [],
            isFetched: true,
        }));
    });

    it('fetches and renders inherited departments for the selected child institution', () => {
        render(<UserFormFieldsHarness />);

        expect(screen.getByText('Department')).toBeTruthy();

        fireEvent.change(screen.getByDisplayValue('Select institution'), {
            target: { value: 'child-inst' },
        });

        expect(useDepartmentsQuery).toHaveBeenLastCalledWith({
            institutionId: 'child-inst',
        });
        expect(screen.getByText('CCS')).toBeTruthy();
    });
});
