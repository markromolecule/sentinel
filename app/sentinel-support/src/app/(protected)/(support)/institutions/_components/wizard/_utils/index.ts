import type { SubjectImportPreview, WizardDraft, SubjectImportRow } from '../_types';
import { SUBJECT_HEADER_TOKENS } from '../_constants';

export function createClientId() {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

export function createEmptyDraft(): WizardDraft {
    return {
        identity: {
            name: '',
            code: '',
            institutionKind: 'PARENT',
            parentInstitutionId: '',
        },
        departments: [{ clientId: createClientId(), name: '', code: '' }],
        courses: [
            {
                clientId: createClientId(),
                title: '',
                code: '',
                departmentClientId: '',
            },
        ],
        terms: [
            {
                clientId: createClientId(),
                academicYear: '',
                semester: '',
                isActive: true,
                startDate: '',
                endDate: '',
            },
        ],
        subjects: [],
        naming: {
            room: {
                label: 'Room',
                prefix: 'RM',
                virtualPrefix: 'VR',
            },
            sectionRulesByCourseClientId: {},
        },
    };
}

export function countCompleteRows<T>(rows: T[], predicate: (row: T) => boolean) {
    return rows.filter(predicate).length;
}

export function asErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return 'Publish failed. Review the setup and try again.';
}

export function normalizeSubjectCell(value: unknown) {
    return String(value ?? '').trim();
}

export function getSubjectRowValue(row: Record<string, unknown>, candidates: string[]) {
    for (const candidate of candidates) {
        const exactMatch = Object.entries(row).find(
            ([key]) => normalizeSubjectCell(key).toLowerCase() === candidate,
        );

        if (exactMatch) {
            return normalizeSubjectCell(exactMatch[1]);
        }
    }

    return '';
}

export function parseSubjectRows(
    candidates: Array<{ code: string; title: string; sourceLabel: string }>,
): SubjectImportPreview {
    const rows: SubjectImportRow[] = [];
    const errors: string[] = [];
    const seenCodes = new Set<string>();

    for (const candidate of candidates) {
        const code = candidate.code.trim();
        const title = candidate.title.trim();
        const isHeader =
            SUBJECT_HEADER_TOKENS.has(code.toLowerCase()) &&
            SUBJECT_HEADER_TOKENS.has(title.toLowerCase());

        if (isHeader) {
            continue;
        }

        if (!code || !title) {
            errors.push(`${candidate.sourceLabel}: Code and subject are required.`);
            continue;
        }

        if (code.length > 50) {
            errors.push(`${candidate.sourceLabel}: Subject code must be 50 characters or less.`);
            continue;
        }

        if (title.length > 255) {
            errors.push(`${candidate.sourceLabel}: Subject title must be 255 characters or less.`);
            continue;
        }

        const codeKey = code.toLowerCase();

        if (seenCodes.has(codeKey)) {
            errors.push(`${candidate.sourceLabel}: Duplicate subject code "${code}".`);
            continue;
        }

        seenCodes.add(codeKey);
        rows.push({ code, title, sourceLabel: candidate.sourceLabel });
    }

    return { rows, errors };
}

export function parseSubjectManualText(input: string): SubjectImportPreview {
    const candidates = input
        .split(/\r?\n/)
        .map((line, index) => ({ line: line.trim(), index }))
        .filter(({ line }) => Boolean(line))
        .map(({ line, index }) => {
            const delimiter = line.includes('\t') ? '\t' : ',';
            const [code, ...titleParts] = line.split(delimiter);

            return {
                code: code ?? '',
                title: titleParts.join(delimiter),
                sourceLabel: `Line ${index + 1}`,
            };
        });

    return parseSubjectRows(candidates);
}

export function parseSubjectWorksheetRows(rows: Record<string, unknown>[]): SubjectImportPreview {
    const candidates = rows.map((row, index) => {
        const rowValues = Object.values(row).map(normalizeSubjectCell);
        const fallbackCode = rowValues[0] ?? '';
        const fallbackTitle = rowValues.slice(1).join(' ').trim();

        return {
            code:
                getSubjectRowValue(row, ['code', 'subject code', 'subject_code', 'subject']) ||
                fallbackCode,
            title:
                getSubjectRowValue(row, [
                    'title',
                    'subject title',
                    'subject_title',
                    'description',
                    'subject',
                ]) || fallbackTitle,
            sourceLabel: `Row ${index + 2}`,
        };
    });

    return parseSubjectRows(candidates);
}
