import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GradingStudent } from '@sentinel/shared/types';
import { useExportGrades } from './use-export-grades';

const { mockJsonToSheet, mockBookNew, mockBookAppendSheet, mockWriteFile } = vi.hoisted(() => ({
    mockJsonToSheet: vi.fn((rows) => rows),
    mockBookNew: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    mockBookAppendSheet: vi.fn(),
    mockWriteFile: vi.fn(),
}));

vi.mock('xlsx', () => ({
    utils: {
        json_to_sheet: mockJsonToSheet,
        book_new: mockBookNew,
        book_append_sheet: mockBookAppendSheet,
    },
    writeFile: mockWriteFile,
}));

describe('useExportGrades', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        mockJsonToSheet.mockClear();
        mockBookNew.mockClear();
        mockBookAppendSheet.mockClear();
        mockWriteFile.mockClear();
    });

    it('exports the provided grading rows as a sorted xlsx workbook with the active section in the filename', () => {
        const { result } = renderHook(() => useExportGrades());
        const students: GradingStudent[] = [
            {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'Zara Student',
                studentId: '2026-0002',
                sectionId: '33333333-3333-3333-3333-333333333333',
                sectionName: 'BSCS 3B',
                submissionDate: '2026-04-18T09:30:00.000Z',
                score: 92,
                maxScore: 100,
                status: 'GRADED',
                attemptId: '44444444-4444-4444-4444-444444444444',
            },
            {
                id: '22222222-2222-2222-2222-222222222222',
                name: 'Alice Student',
                studentId: '2026-0001',
                sectionId: '33333333-3333-3333-3333-333333333333',
                sectionName: 'BSCS 3A',
                submissionDate: '2026-04-18T09:00:00.000Z',
                score: 95,
                maxScore: 100,
                status: 'GRADED',
                attemptId: '55555555-5555-5555-5555-555555555555',
            },
        ];

        result.current.exportToExcel(students, 'Midterm Exam', 'BSCS 3A');

        expect(mockJsonToSheet).toHaveBeenCalledTimes(1);
        expect(mockBookNew).toHaveBeenCalledTimes(1);
        expect(mockBookAppendSheet).toHaveBeenCalledTimes(1);
        expect(mockWriteFile).toHaveBeenCalledTimes(1);

        const exportedRows = mockJsonToSheet.mock.calls[0]?.[0] as Record<string, unknown>[];
        expect(exportedRows.map((row) => row.Name)).toEqual(['Alice Student', 'Zara Student']);
        expect(exportedRows.map((row) => row.Section)).toEqual(['BSCS 3A', 'BSCS 3B']);
        expect(exportedRows[0]?.Section).not.toBe('N/A');
        expect(exportedRows[0]?.['Student ID']).toBe('2026-0001');
        expect(mockBookAppendSheet).toHaveBeenCalledWith(
            mockBookNew.mock.results[0]?.value,
            exportedRows,
            'Grades',
        );
        expect(mockWriteFile).toHaveBeenCalledWith(
            mockBookNew.mock.results[0]?.value,
            'Midterm_Exam_BSCS_3A_Grades.xlsx',
        );
    });
});
