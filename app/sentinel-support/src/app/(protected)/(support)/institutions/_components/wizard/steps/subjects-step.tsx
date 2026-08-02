import { Input } from '@sentinel/ui';
import type { WizardDraft } from '../_types';
import { RowActions, RowsSection } from '../rows-section';
import { WizardTableRow } from '../wizard-table';
import { createClientId } from '../_utils';

export function SubjectsStep({
    draft,
    summary,
    updateDraft,
}: {
    draft: WizardDraft;
    summary: { subjects: number };
    updateDraft: (updater: (current: WizardDraft) => WizardDraft) => void;
}) {
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
        >
            <div className="border-border flex h-[400px] flex-col rounded-md border bg-white xl:h-[500px]">
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
                                            i === index ? { ...s, code: event.target.value } : s,
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
                                            i === index ? { ...s, title: event.target.value } : s,
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
                    {draft.subjects.length === 0 ? (
                        <p className="text-muted-foreground px-4 py-6 text-sm">
                            Add a subject row to start configuring subjects.
                        </p>
                    ) : null}
                </div>
            </div>
        </RowsSection>
    );
}
