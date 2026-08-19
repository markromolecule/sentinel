import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileValidator } from './use-file-validator';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
    },
}));

describe('useFileValidator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with an empty files list', () => {
        const { result } = renderHook(() => useFileValidator());
        expect(result.current.files).toEqual([]);
    });

    it('accepts valid PDF files under 25MB', () => {
        const { result } = renderHook(() => useFileValidator());
        const validFile = new File(['dummy content'], 'lesson1.pdf', {
            type: 'application/pdf',
        });

        act(() => {
            result.current.handleFileChange([validFile]);
        });

        expect(result.current.files).toHaveLength(1);
        expect(result.current.files[0].name).toBe('lesson1.pdf');
        expect(toast.success).toHaveBeenCalled();
    });

    it('rejects non-PDF files', () => {
        const { result } = renderHook(() => useFileValidator());
        const invalidFile = new File(['text'], 'document.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        act(() => {
            result.current.handleFileChange([invalidFile]);
        });

        expect(result.current.files).toEqual([]);
        expect(toast.error).toHaveBeenCalledWith(
            'Invalid file type',
            expect.objectContaining({
                description: 'Only PDF lesson files are supported for AI analysis.',
            }),
        );
    });

    it('rejects single files exceeding 25MB', () => {
        const { result } = renderHook(() => useFileValidator());
        // 30MB file
        const largeFile = new File([new Uint8Array(30 * 1024 * 1024)], 'large.pdf', {
            type: 'application/pdf',
        });

        act(() => {
            result.current.handleFileChange([largeFile]);
        });

        expect(result.current.files).toEqual([]);
        expect(toast.error).toHaveBeenCalledWith(
            'File too large',
            expect.objectContaining({
                description: expect.stringContaining('Max file size is 25MB'),
            }),
        );
    });

    it('allows removing an individual file using handleRemoveFile', () => {
        const { result } = renderHook(() => useFileValidator());
        const fileA = new File(['content A'], 'lessonA.pdf', { type: 'application/pdf' });
        const fileB = new File(['content B'], 'lessonB.pdf', { type: 'application/pdf' });

        act(() => {
            result.current.handleFileChange([fileA, fileB]);
        });

        expect(result.current.files).toHaveLength(2);

        act(() => {
            result.current.handleRemoveFile(fileA);
        });

        expect(result.current.files).toHaveLength(1);
        expect(result.current.files[0].name).toBe('lessonB.pdf');
        expect(toast.info).toHaveBeenCalledWith(
            'File removed',
            expect.objectContaining({
                description: expect.stringContaining('lessonA.pdf'),
            }),
        );
    });
});
