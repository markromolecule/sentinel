'use client';

import { Separator } from '@sentinel/ui';
import { getQuestionTypeMeta } from '@/features/exams/builder/_constants/question-type-meta';
import type { QuestionBuilderFormProps } from './_types';
import { PassageEditorPanel } from './question-builder-form/passage-editor-panel';
import { PassagePreviewDialog } from './question-builder-form/passage-preview-dialog';
import { QuestionBuilderHeader } from './question-builder-form/question-builder-header';
import { QuestionSettingsSection } from './question-builder-form/question-settings-section';
import { QuestionTypeFormSection } from './question-builder-form/question-type-form-section';
import { useQuestionBuilderForm } from './question-builder-form/use-question-builder-form';

export function QuestionBuilderForm({
    type,
    initialData,
    questionTypeDefinition,
    onBack,
    onCreate,
    onUpdate,
    onDuplicate,
    builderMode = false,
}: QuestionBuilderFormProps) {
    const meta = getQuestionTypeMeta(type, questionTypeDefinition);
    const Icon = meta.icon;
    const {
        content,
        difficulty,
        handleAddTag,
        handleCreateOrUpdate,
        handleDuplicate,
        handlePassageImageUpload,
        handlePassageTypeChange,
        handleRemoveTag,
        isComplete,
        isPassagePreviewOpen,
        passageContent,
        passagePreview,
        passageType,
        points,
        setContent,
        setDifficulty,
        setIsPassagePreviewOpen,
        setPassageContent,
        setPoints,
        setTagInput,
        tagInput,
        tags,
    } = useQuestionBuilderForm({
        type,
        initialData,
        questionTypeDefinition,
        onCreate,
        onDuplicate,
        onUpdate,
    });

    return (
        <div className={builderMode ? 'w-full space-y-8' : 'mx-auto max-w-7xl space-y-6'}>
            <QuestionBuilderHeader
                builderMode={builderMode}
                description={meta.description}
                icon={Icon}
                isComplete={isComplete}
                isEditing={Boolean(initialData)}
                label={meta.label}
                onBack={onBack}
                onDuplicate={handleDuplicate}
                onSave={handleCreateOrUpdate}
                showDuplicateAction={Boolean(onDuplicate)}
            />

            {builderMode ? <Separator /> : null}

            <div className="grid gap-8 xl:grid-cols-2 xl:items-stretch">
                <div className="flex h-full min-w-0 flex-col gap-6">
                    <QuestionSettingsSection
                        builderMode={builderMode}
                        content={content}
                        difficulty={difficulty}
                        onDifficultyChange={setDifficulty}
                        onPointsChange={setPoints}
                        onPromptChange={(prompt) => setContent((prev) => ({ ...prev, prompt }))}
                        onRemoveTag={handleRemoveTag}
                        onTagInputChange={setTagInput}
                        onTagKeyDown={handleAddTag}
                        points={points}
                        tagInput={tagInput}
                        tags={tags}
                    />

                    <QuestionTypeFormSection content={content} onChange={setContent} type={type} />
                </div>

                <aside className="flex h-full min-w-0 flex-col">
                    <PassageEditorPanel
                        builderMode={builderMode}
                        onOpenPreview={() => setIsPassagePreviewOpen(true)}
                        onPassageContentChange={setPassageContent}
                        onPassageImageUpload={handlePassageImageUpload}
                        onPassageTypeChange={handlePassageTypeChange}
                        passageContent={passageContent}
                        passagePreviewAvailable={Boolean(passagePreview)}
                        passageType={passageType}
                    />
                </aside>
            </div>

            <PassagePreviewDialog
                open={isPassagePreviewOpen}
                onOpenChange={setIsPassagePreviewOpen}
                previewHtml={passagePreview?.html}
            />
        </div>
    );
}
