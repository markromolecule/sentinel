import { Input, Button } from '@sentinel/ui';
import type { SubjectImportPreview, WizardDraft } from '../../_types';
import { RowActions, RowsSection } from '../rows-section';
import { WizardTableRow } from '../wizard-table';
import { SubjectBulkUploadPanel } from '../subject-bulk-upload-panel';
import { createClientId } from '../../_utils';

export function SubjectsStep({
    draft,
    summary,
    subjectBulkInput,
    subjectFileName,
    activeSubjectPreview,
    isParsingSubjects,
    updateDraft,
    setSubjectBulkInput,
    handleSubjectFileChange,
    setSubjectFilePreview,
    setSubjectFileName,
    applySubjectBulkRows,
}: {
    draft: WizardDraft;
    summary: { subjects: number };
    subjectBulkInput: string;
    subjectFileName: string;
    activeSubjectPreview: SubjectImportPreview;
    isParsingSubjects: boolean;
    updateDraft: (updater: (current: WizardDraft) => WizardDraft) => void;
    setSubjectBulkInput: (val: string) => void;
    handleSubjectFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setSubjectFilePreview: (val: SubjectImportPreview | null) => void;
    setSubjectFileName: (name: string) => void;
    applySubjectBulkRows: () => void;
}) {
    const hasSubjects = draft.subjects.length > 0;
    const clearSubjects = () => updateDraft((current) => ({ ...current, subjects: [] }));
    const addSubject = () =>
        updateDraft((current) => ({
            ...current,
            subjects: [{ clientId: createClientId(), code: '', title: '' }, ...current.subjects],
        }));

    return (
        <RowsSection
            title="Subjects"
            countLabel={`${summary.subjects} configured`}
            onAdd={addSubject}
            secondaryAction={
                hasSubjects ? (
                    <Button variant="outline" size="sm" onClick={clearSubjects}>
                        Clear Subjects
                    </Button>
                ) : null
            }
        >
            {hasSubjects ? (
                <div className="space-y-4">
                    <div className="border-border flex h-[320px] flex-col rounded-md border bg-white xl:h-[400px]">
                        <div
                            className="bg-muted/40 text-muted-foreground border-border grid shrink-0 items-center gap-3 border-b px-4 py-3 text-xs font-medium"
                            style={{ gridTemplateColumns: '160px minmax(300px, 1fr) 48px' }}
                        >
                            <div>Subject code</div>
                            <div>Full title</div>
                            <div />
                        </div>
                        <div className="min-h-0 flex-1 divide-y overflow-x-hidden overflow-y-auto">
                            {draft.subjects.map((subject, index) => (
                                <WizardTableRow
                                    key={subject.clientId}
                                    templateColumns="160px_minmax(300px,1fr)_48px"
                                >
                                    <Input
                                        value={subject.code}
                                        placeholder="IT101"
                                        onChange={(event) =>
                                            updateDraft((current) => ({
                                                ...current,
                                                subjects: current.subjects.map((s, i) =>
                                                    i === index
                                                        ? { ...s, code: event.target.value }
                                                        : s,
                                                ),
                                            }))
                                        }
                                    />
                                    <Input
                                        value={subject.title}
                                        placeholder="Introduction to Computing"
                                        onChange={(event) =>
                                            updateDraft((current) => ({
                                                ...current,
                                                subjects: current.subjects.map((s, i) =>
                                                    i === index
                                                        ? { ...s, title: event.target.value }
                                                        : s,
                                                ),
                                            }))
                                        }
                                    />
                                    <RowActions
                                        onRemove={() =>
                                            updateDraft((current) => ({
                                                ...current,
                                                subjects: current.subjects.filter(
                                                    (_, rowIndex) => rowIndex !== index,
                                                ),
                                            }))
                                        }
                                    />
                                </WizardTableRow>
                            ))}
                        </div>
                    </div>
                    <SubjectBulkUploadPanel
                        input={subjectBulkInput}
                        fileName={subjectFileName}
                        preview={activeSubjectPreview}
                        isParsing={isParsingSubjects}
                        onInputChange={setSubjectBulkInput}
                        onFileChange={handleSubjectFileChange}
                        onClearFile={() => {
                            setSubjectFilePreview(null);
                            setSubjectFileName('');
                        }}
                        onApply={applySubjectBulkRows}
                    />
                </div>
            ) : (
                <SubjectBulkUploadPanel
                    input={subjectBulkInput}
                    fileName={subjectFileName}
                    preview={activeSubjectPreview}
                    isParsing={isParsingSubjects}
                    onInputChange={setSubjectBulkInput}
                    onFileChange={handleSubjectFileChange}
                    onClearFile={() => {
                        setSubjectFilePreview(null);
                        setSubjectFileName('');
                    }}
                    onApply={applySubjectBulkRows}
                />
            )}
        </RowsSection>
    );
}
