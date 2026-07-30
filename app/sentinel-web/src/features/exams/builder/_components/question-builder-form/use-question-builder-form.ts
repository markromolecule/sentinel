'use client';

import { useMemo, useState } from 'react';
import { apiClient } from '@/data/api/client';
import { uploadPassageImage } from '@sentinel/services';
import { renderPlainPassage, renderPassage } from '@sentinel/shared';
import { htmlToPlainText } from '@sentinel/ui';
import type { PassageType, QuestionDifficulty } from '@sentinel/shared/types';
import type { QuestionBuilderFormProps } from '../_types';
import { getDefaultQuestionContent, isQuestionComplete } from '../question-forms/utils';
import { DEFAULT_DIFFICULTY, DEFAULT_POINTS } from './constants';
import { normalizePassagePayload } from './utils';

export function useQuestionBuilderForm({
    type,
    initialData,
    questionTypeDefinition,
    onCreate,
    onDuplicate,
    onUpdate,
}: Pick<
    QuestionBuilderFormProps,
    'type' | 'initialData' | 'questionTypeDefinition' | 'onCreate' | 'onUpdate' | 'onDuplicate'
>) {
    const defaultContent = getDefaultQuestionContent(type, questionTypeDefinition);
    const [content, setContent] = useState(() =>
        initialData ? initialData.content : defaultContent,
    );
    const [difficulty, setDifficulty] = useState<QuestionDifficulty>(
        initialData?.difficulty ?? DEFAULT_DIFFICULTY,
    );
    const [points, setPoints] = useState(initialData ? initialData.points : DEFAULT_POINTS);
    const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
    const [tagInput, setTagInput] = useState('');
    const [passageType, setPassageType] = useState<PassageType>(
        initialData?.passageType ?? 'plain',
    );
    const [passageContent, setPassageContent] = useState(initialData?.passageContent ?? '');
    const [isPassagePreviewOpen, setIsPassagePreviewOpen] = useState(false);

    const isComplete = useMemo(() => isQuestionComplete(type, content), [content, type]);
    const normalizedPassage = normalizePassagePayload({ passageContent, passageType });
    const passagePreview = renderPassage(normalizedPassage);

    const handlePassageTypeChange = (nextPassageType: PassageType) => {
        if (nextPassageType === passageType) {
            return;
        }

        setPassageContent((currentContent) =>
            nextPassageType === 'html'
                ? renderPlainPassage(htmlToPlainText(currentContent))
                : htmlToPlainText(currentContent),
        );
        setPassageType(nextPassageType);
    };

    const handlePassageImageUpload = async (file: File) => {
        const uploadedImage = await uploadPassageImage(apiClient, file);
        return uploadedImage.url;
    };

    const handleAddTag = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            const newTag = tagInput.trim().toLowerCase();

            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }

            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };

    const buildPayload = () => ({
        type,
        content,
        difficulty,
        points,
        tags,
        ...normalizePassagePayload({
            passageContent,
            passageType,
        }),
    });

    const resetForm = () => {
        setContent(defaultContent);
        setDifficulty(DEFAULT_DIFFICULTY);
        setPoints(DEFAULT_POINTS);
        setTags([]);
        setTagInput('');
        setPassageType('plain');
        setPassageContent('');
    };

    const handleCreateOrUpdate = () => {
        if (!isComplete) return;

        const payload = buildPayload();

        if (initialData && onUpdate) {
            void onUpdate(initialData.id, payload);
            return;
        }

        void onCreate(payload);
    };

    const handleDuplicate = () => {
        if (!isComplete || !onDuplicate) return;

        void onDuplicate(buildPayload());
        resetForm();
    };

    return {
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
    };
}
