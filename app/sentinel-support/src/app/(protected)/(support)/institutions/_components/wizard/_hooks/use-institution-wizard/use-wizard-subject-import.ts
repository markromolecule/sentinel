import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import type { WizardDraft, SubjectImportPreview, SubjectImportRow } from '../../_types';
import { parseSubjectManualText, parseSubjectWorksheetRows, createClientId } from '../../_utils';

export type UseWizardSubjectImportArgs = {
    updateDraft: (updater: (current: WizardDraft) => WizardDraft) => void;
};

export function useWizardSubjectImport({ updateDraft }: UseWizardSubjectImportArgs) {
    const [subjectBulkInput, setSubjectBulkInput] = useState('');
    const [subjectFileName, setSubjectFileName] = useState('');
    const [subjectFilePreview, setSubjectFilePreview] = useState<SubjectImportPreview | null>(null);
    const [isParsingSubjects, setIsParsingSubjects] = useState(false);

    const manualSubjectPreview = useMemo(
        () => parseSubjectManualText(subjectBulkInput),
        [subjectBulkInput],
    );
    const activeSubjectPreview = subjectFilePreview ?? manualSubjectPreview;

    const handleSubjectFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        event.target.value = '';
        if (!selectedFile) return;

        setSubjectFileName(selectedFile.name);
        setIsParsingSubjects(true);

        try {
            const data = await selectedFile.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<
                string,
                unknown
            >[];

            setSubjectFilePreview(
                rows.length > 0
                    ? parseSubjectWorksheetRows(rows)
                    : {
                          rows: [],
                          errors: ['The selected file is empty or has no readable rows.'],
                      },
            );
        } catch {
            setSubjectFilePreview({
                rows: [],
                errors: ['Failed to parse file. Upload a valid CSV or Excel file.'],
            });
        } finally {
            setIsParsingSubjects(false);
        }
    }, []);

    const applySubjectBulkRows = useCallback(() => {
        const rows = activeSubjectPreview.rows;
        if (rows.length === 0) {
            toast.error('Add at least one valid subject before importing.');
            return;
        }
        updateDraft((current) => {
            const incomingByCode = new Map(
                rows.map((row: SubjectImportRow) => [row.code.trim().toUpperCase(), row]),
            );
            const existingCodes = new Set(
                current.subjects.map((subject) => subject.code.trim().toUpperCase()),
            );
            const updatedSubjects = current.subjects.map((subject) => {
                const incoming = incomingByCode.get(subject.code.trim().toUpperCase());
                return incoming
                    ? { ...subject, code: incoming.code, title: incoming.title }
                    : subject;
            });
            const newSubjects = rows
                .filter(
                    (row: SubjectImportRow) => !existingCodes.has(row.code.trim().toUpperCase()),
                )
                .map((row: SubjectImportRow) => ({
                    clientId: createClientId(),
                    code: row.code,
                    title: row.title,
                }));

            return {
                ...current,
                subjects: [...updatedSubjects, ...newSubjects],
            };
        });
        toast.success(`Added ${rows.length} subject${rows.length === 1 ? '' : 's'}.`);
    }, [activeSubjectPreview, updateDraft]);

    return {
        subjectBulkInput,
        setSubjectBulkInput,
        subjectFileName,
        setSubjectFileName,
        subjectFilePreview,
        setSubjectFilePreview,
        activeSubjectPreview,
        isParsingSubjects,
        handleSubjectFileChange,
        applySubjectBulkRows,
    };
}
