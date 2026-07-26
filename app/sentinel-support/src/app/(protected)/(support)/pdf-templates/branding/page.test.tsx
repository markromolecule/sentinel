import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PdfTemplateBrandingPage from './page';

const mockUseInstitutionsQuery = vi.fn();
const mockUseInstitutionPdfBrandingQuery = vi.fn();
const mockUploadBracityMutateAsync = vi.fn();
const mockDeleteBrandingMutateAsync = vi.fn();
const mockHasPermission = vi.fn().mockReturnValue(true);
const mockHasAnyPermission = vi.fn().mockReturnValue(true);

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@sentinel/ui', () => ({
    Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
    PermissionDeniedState: ({ resourceName }: any) => <div>{resourceName} access unavailable</div>,
    Select: ({ children, value, onValueChange }: any) => (
        <select value={value} onChange={(e) => onValueChange(e.target.value)}>
            {children}
        </select>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectTrigger: () => null,
    SelectValue: () => null,
}));

vi.mock('@/data', () => ({
    useActivePermissions: () => ({
        hasAnyPermission: mockHasAnyPermission,
        hasPermission: mockHasPermission,
    }),
    useInstitutionsQuery: (...args: any[]) => mockUseInstitutionsQuery(...args),
    useInstitutionPdfBrandingQuery: (...args: any[]) => mockUseInstitutionPdfBrandingQuery(...args),
    useUploadInstitutionPdfBrandingMutation: () => ({
        mutateAsync: mockUploadBracityMutateAsync,
        isPending: false,
    }),
    useDeleteInstitutionPdfBrandingMutation: () => ({
        mutateAsync: mockDeleteBrandingMutateAsync,
        isPending: false,
    }),
}));

vi.mock('../_components', () => ({
    PdfTemplatePageShell: ({ title, description, children }: any) => (
        <div>
            <h1>{title}</h1>
            <p>{description}</p>
            <div>{children}</div>
        </div>
    ),
    BrandingUploadCard: ({ branding, disabled, onUpload, onRemove, globalMessage }: any) => (
        <div>
            <div>{globalMessage ?? 'branding-upload-active'}</div>
            {branding ? (
                <div>
                    <span>{branding.logo_original_name}</span>
                    <button onClick={onRemove} disabled={disabled}>Remove logo</button>
                </div>
            ) : (
                <div>
                    <span>No logo</span>
                    <input
                        type="file"
                        data-testid="logo-input"
                        disabled={disabled}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onUpload(file);
                        }}
                    />
                </div>
            )}
        </div>
    ),
}));

describe('PdfTemplateBrandingPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockHasPermission.mockReturnValue(true);
        mockHasAnyPermission.mockReturnValue(true);
        mockUseInstitutionsQuery.mockReturnValue({
            data: [
                { id: 'parent-1', name: 'Parent One', institutionKind: 'PARENT' },
                { id: 'parent-2', name: 'Parent Two', institutionKind: 'PARENT' },
            ],
            isLoading: false,
            isError: false,
            error: null,
        });
        mockUseInstitutionPdfBrandingQuery.mockReturnValue({ data: null });
        mockUploadBracityMutateAsync.mockResolvedValue(undefined);
        mockDeleteBrandingMutateAsync.mockResolvedValue(undefined);
    });

    it('denies access if permissions are missing', () => {
        mockHasAnyPermission.mockReturnValue(false);
        render(<PdfTemplateBrandingPage />);
        expect(screen.getByText('institution branding access unavailable')).toBeTruthy();
    });

    it('renders global scope selection and displays global message', () => {
        render(<PdfTemplateBrandingPage />);
        expect(screen.getByText('Global (Sentinel)')).toBeTruthy();
        expect(
            screen.getByText(/Branding is available only for parent-institution overrides/i),
        ).toBeTruthy();
    });

    it('fetches institution branding and supports upload when a parent is selected', async () => {
        render(<PdfTemplateBrandingPage />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'parent-1' } });

        expect(mockUseInstitutionPdfBrandingQuery).toHaveBeenCalledWith('parent-1', expect.any(Object));

        await waitFor(() => {
            expect(screen.queryByText(/Branding is available only for parent-institution overrides/i)).toBeNull();
        });

        const file = new File(['dummy content'], 'logo.png', { type: 'image/png' });
        const input = screen.getByTestId('logo-input');
        fireEvent.change(input, { target: { files: [file] } });

        expect(mockUploadBracityMutateAsync).toHaveBeenCalledWith({
            institutionId: 'parent-1',
            logo: file,
        });
    });

    it('allows deleting existing logo when brand is present', async () => {
        mockUseInstitutionPdfBrandingQuery.mockReturnValue({
            data: {
                logo_original_name: 'test-logo.png',
                logo_mime_type: 'image/png',
                logo_size_bytes: 1024,
            },
        });

        render(<PdfTemplateBrandingPage />);

        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'parent-1' } });

        await waitFor(() => {
            expect(screen.getByText('test-logo.png')).toBeTruthy();
        });

        fireEvent.click(screen.getByRole('button', { name: /Remove logo/i }));

        expect(mockDeleteBrandingMutateAsync).toHaveBeenCalledWith('parent-1');
    });
});
