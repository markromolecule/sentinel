'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@sentinel/hooks';
import { createSubject } from '@sentinel/services';
import { SUBJECT_QUERY_KEYS } from '@sentinel/shared/constants';
import { subjectFormSchema, type SubjectFormValues } from '@sentinel/shared/schema';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export type ParsedSubjectRow = SubjectFormValues & {
    sourceLabel: string;
};

export type SubjectBulkParseResult = {
    rows: ParsedSubjectRow[];
    errors: string[];
};

const HEADER_TOKENS = new Set(['code', 'subject code', 'subject_code', 'title', 'subject title']);

function normalizeCell(value: unknown) {
    return String(value ?? '').trim();
}

function getRowValue(row: Record<string, unknown>, candidates: string[]) {
    for (const candidate of candidates) {
        const exactMatch = Object.entries(row).find(
            ([key]) => normalizeCell(key).toLowerCase() === candidate,
        );

        if (exactMatch) {
            return normalizeCell(exactMatch[1]);
        }
    }

    return '';
}

function parseRows(
    candidates: Array<{ code: string; title: string; sourceLabel: string }>,
): SubjectBulkParseResult {
    const rows: ParsedSubjectRow[] = [];
    const errors: string[] = [];
    const seenCodes = new Set<string>();

    for (const candidate of candidates) {
        const normalized = {
            code: candidate.code.trim(),
            title: candidate.title.trim(),
        };

        const hasHeaderTokens =
            HEADER_TOKENS.has(normalized.code.toLowerCase()) &&
            HEADER_TOKENS.has(normalized.title.toLowerCase());

        if (hasHeaderTokens) {
            continue;
        }

        const parsed = subjectFormSchema.safeParse(normalized);

        if (!parsed.success) {
            const message = parsed.error.issues[0]?.message ?? 'Invalid subject row';
            errors.push(`${candidate.sourceLabel}: ${message}`);
            continue;
        }

        const normalizedCodeKey = parsed.data.code.toLowerCase();

        if (seenCodes.has(normalizedCodeKey)) {
            errors.push(`${candidate.sourceLabel}: Duplicate subject code "${parsed.data.code}"`);
            continue;
        }

        seenCodes.add(normalizedCodeKey);
        rows.push({
            ...parsed.data,
            sourceLabel: candidate.sourceLabel,
        });
    }

    return { rows, errors };
}

export function parseSubjectManualText(input: string): SubjectBulkParseResult {
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

    return parseRows(candidates);
}

function parseSubjectWorksheetRows(rows: Record<string, unknown>[]) {
    const candidates = rows.map((row, index) => {
        const rowValues = Object.values(row).map(normalizeCell);
        const fallbackCode = rowValues[0] ?? '';
        const fallbackTitle = rowValues.slice(1).join(' ').trim();

        return {
            code:
                getRowValue(row, ['code', 'subject code', 'subject_code', 'subject']) ||
                fallbackCode,
            title:
                getRowValue(row, ['title', 'subject title', 'subject_title', 'description']) ||
                fallbackTitle,
            sourceLabel: `Row ${index + 2}`,
        };
    });

    return parseRows(candidates);
}

export function useSubjectBulkUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<SubjectBulkParseResult | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const queryClient = useQueryClient();
    const apiClient = useApi();

    const resetState = useCallback(() => {
        setFile(null);
        setParseResult(null);
        setIsParsing(false);
        setIsImporting(false);
    }, []);

    const parseFile = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        setIsParsing(true);

        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                defval: '',
            }) as Record<string, unknown>[];

            if (jsonData.length === 0) {
                setParseResult({
                    rows: [],
                    errors: ['The selected file is empty or has no readable rows.'],
                });
                return;
            }

            setParseResult(parseSubjectWorksheetRows(jsonData));
        } catch (error) {
            console.error('Subject bulk upload parse error:', error);
            setParseResult({
                rows: [],
                errors: ['Failed to parse file. Please upload a valid CSV or Excel file.'],
            });
        } finally {
            setIsParsing(false);
        }
    }, []);

    const importRows = useCallback(
        async (rows: ParsedSubjectRow[], institutionId: string) => {
            if (rows.length === 0) {
                toast.error('Add at least one valid subject before importing.');
                return { successCount: 0, failCount: 0 };
            }

            if (!institutionId) {
                toast.error('Please select an institution for importing subjects.');
                return { successCount: 0, failCount: 0 };
            }

            setIsImporting(true);

            try {
                const results = await Promise.allSettled(
                    rows.map((row) =>
                        createSubject(apiClient, {
                            code: row.code,
                            title: row.title,
                            institution_id: institutionId,
                        }),
                    ),
                );

                let successCount = 0;
                let failCount = 0;

                for (const result of results) {
                    if (result.status === 'fulfilled') {
                        successCount += 1;
                    } else {
                        failCount += 1;
                    }
                }

                await queryClient.invalidateQueries({ queryKey: SUBJECT_QUERY_KEYS.all });

                if (successCount > 0) {
                    toast.success(
                        `Imported ${successCount} subject${successCount === 1 ? '' : 's'}.`,
                    );
                }

                if (failCount > 0) {
                    toast.error(
                        `${failCount} subject${failCount === 1 ? '' : 's'} could not be imported. Check for duplicates or invalid rows.`,
                    );
                }

                return { successCount, failCount };
            } finally {
                setIsImporting(false);
            }
        },
        [apiClient, queryClient],
    );

    return {
        file,
        parseResult,
        isParsing,
        isImporting,
        parseFile,
        importRows,
        resetState,
    };
}
