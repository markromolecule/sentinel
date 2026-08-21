import { describe, expect, it } from 'vitest';
import {
    getImportableStudents,
    getClaimedStudents,
    getUnclaimedStudents,
    getNonClaimedStudents,
    buildPreviewParseResult,
} from './student-enrollment-result';
import type { StudentImportRow } from '@/app/(protected)/(instructor)/students/_types/enrollment-target';

describe('student-enrollment-result helpers', () => {
    const mockStudents: StudentImportRow[] = [
        {
            studentNo: '2026-0001',
            firstName: 'Alice',
            lastName: 'Smith',
            claimStatus: 'CLAIMED',
            reason: null,
        },
        {
            studentNo: '2026-0002',
            firstName: 'Bob',
            lastName: 'Jones',
            claimStatus: 'UNCLAIMED',
            reason: 'Account not yet claimed (ready to enroll).',
        },
        {
            studentNo: '2026-0003',
            firstName: 'Charlie',
            lastName: 'Brown',
            claimStatus: 'ALREADY_ENROLLED',
            reason: 'Already enrolled in selected classroom.',
        },
        {
            studentNo: '2026-0004',
            firstName: 'Diana',
            lastName: 'Prince',
            claimStatus: 'NOT_WHITELISTED',
            reason: 'Student not found in whitelist.',
        },
    ];

    it('getImportableStudents includes both CLAIMED and UNCLAIMED students', () => {
        const importable = getImportableStudents(mockStudents);
        expect(importable.map((s) => s.studentNo)).toEqual(['2026-0001', '2026-0002']);
    });

    it('getClaimedStudents filters only CLAIMED students', () => {
        const claimed = getClaimedStudents(mockStudents);
        expect(claimed.map((s) => s.studentNo)).toEqual(['2026-0001']);
    });

    it('getUnclaimedStudents filters only UNCLAIMED students', () => {
        const unclaimed = getUnclaimedStudents(mockStudents);
        expect(unclaimed.map((s) => s.studentNo)).toEqual(['2026-0002']);
    });

    it('getNonClaimedStudents filters all non-CLAIMED students', () => {
        const nonClaimed = getNonClaimedStudents(mockStudents);
        expect(nonClaimed.map((s) => s.studentNo)).toEqual([
            '2026-0002',
            '2026-0003',
            '2026-0004',
        ]);
    });

    it('buildPreviewParseResult accurately attaches claimStatus and reasons', () => {
        const parsedWorksheet = {
            errors: [],
            students: [
                { studentNo: '2026-0001', firstName: 'Alice', lastName: 'Smith' },
                { studentNo: '2026-0002', firstName: 'Bob', lastName: 'Jones' },
            ],
        };

        const previewResults = [
            {
                studentNumber: '2026-0001',
                claimStatus: 'CLAIMED' as const,
                reason: null,
            },
            {
                studentNumber: '2026-0002',
                claimStatus: 'UNCLAIMED' as const,
                reason: 'Account not yet claimed (ready to enroll).',
            },
        ];

        const result = buildPreviewParseResult(parsedWorksheet, previewResults);
        expect(result.students).toEqual([
            {
                studentNo: '2026-0001',
                firstName: 'Alice',
                lastName: 'Smith',
                claimStatus: 'CLAIMED',
                reason: null,
            },
            {
                studentNo: '2026-0002',
                firstName: 'Bob',
                lastName: 'Jones',
                claimStatus: 'UNCLAIMED',
                reason: 'Account not yet claimed (ready to enroll).',
            },
        ]);
    });
});
