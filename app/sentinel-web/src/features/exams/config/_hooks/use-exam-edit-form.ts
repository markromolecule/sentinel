import { useEffect } from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateExamMutation } from '@sentinel/hooks';
import { type UpdateExamPayload } from '@sentinel/services';
import { examCreateFormSchema, type ExamCreateFormValues } from '@sentinel/shared/schema';
import { DEFAULT_EXAMINATION_GLOBAL_SETTINGS } from '@sentinel/shared/constants';
import type { ProctorExam } from '@sentinel/shared/types';
import {
    DEFAULT_EXAM_DURATION_MINUTES,
    getDurationMinutes,
    getEndDateTimeFromDuration,
    serializeDateTimeForApi,
    toDateTimeLocal,
} from '@/features/exams/config/_lib/exam-schedule';

function buildEditFormValues(exam: ProctorExam): ExamCreateFormValues {
    const startDateTime = toDateTimeLocal(exam.scheduledDate);
    const endDateTime =
        toDateTimeLocal(exam.endDateTime) ||
        (startDateTime
            ? getEndDateTimeFromDuration(
                  startDateTime,
                  exam.duration || DEFAULT_EXAM_DURATION_MINUTES,
              )
            : '');

    return {
        title: exam.title || '',
        description: exam.description || '',
        subjectId: exam.subjectId || '',
        classroomIds: [],
        roomId: undefined,
        startDateTime,
        endDateTime,
        durationMinutes:
            exam.duration ??
            getDurationMinutes(startDateTime, endDateTime) ??
            DEFAULT_EXAM_DURATION_MINUTES,
        passingScore:
            exam.passingScore ?? DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultPassingScore,
        shuffleQuestions:
            exam.settings?.shuffleQuestions ??
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultShuffleQuestions,
        showCorrectAnswers:
            exam.settings?.showCorrectAnswers ??
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultShowCorrectAnswers,
        allowReview:
            exam.settings?.allowReview ?? DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultAllowReview,
        randomizeChoices:
            exam.settings?.randomizeChoices ??
            DEFAULT_EXAMINATION_GLOBAL_SETTINGS.defaultRandomizeChoices,
        isPublic: exam.isPublic ?? false,
    };
}

export function useExamEditForm(
    exam: ProctorExam,
    onClose: () => void,
): {
    form: UseFormReturn<ExamCreateFormValues>;
    onSubmit: (data: ExamCreateFormValues) => Promise<void>;
    handleClose: () => void;
    isPending: boolean;
} {
    const updateExamMutation = useUpdateExamMutation();
    const form = useForm<ExamCreateFormValues>({
        resolver: zodResolver(examCreateFormSchema),
        defaultValues: buildEditFormValues(exam),
    });

    const startDateTime = useWatch({ control: form.control, name: 'startDateTime' });
    const endDateTime = useWatch({ control: form.control, name: 'endDateTime' });

    useEffect(() => {
        form.reset(buildEditFormValues(exam));
    }, [exam, form]);

    useEffect(() => {
        if (!startDateTime) {
            return;
        }

        const currentDuration = getDurationMinutes(startDateTime, endDateTime);

        if (!endDateTime || !currentDuration) {
            form.setValue(
                'endDateTime',
                getEndDateTimeFromDuration(startDateTime, DEFAULT_EXAM_DURATION_MINUTES),
                { shouldDirty: !endDateTime, shouldValidate: true },
            );
            form.setValue('durationMinutes', DEFAULT_EXAM_DURATION_MINUTES, {
                shouldValidate: true,
            });
            return;
        }

        form.setValue('durationMinutes', currentDuration, { shouldValidate: true });
    }, [endDateTime, form, startDateTime]);

    const onSubmit = async (data: ExamCreateFormValues) => {
        const startDateTime = serializeDateTimeForApi(data.startDateTime);
        const endDateTime = serializeDateTimeForApi(data.endDateTime);
        const payload: UpdateExamPayload = {
            title: data.title,
            description: data.description,
            subjectId: data.subjectId,
            classroomId: null,
            sectionIds: [],
            roomId: null,
            startDateTime,
            endDateTime,
            durationMinutes: data.durationMinutes,
            passingScore: data.passingScore,
            shuffleQuestions: data.shuffleQuestions,
            showCorrectAnswers: data.showCorrectAnswers,
            allowReview: data.allowReview,
            randomizeChoices: data.randomizeChoices,
            isPublic: data.isPublic,
        };

        if (exam.status === 'archived') {
            payload.status = 'draft';
        }

        await updateExamMutation.mutateAsync({
            id: exam.id,
            payload,
        });

        onClose();
    };

    const handleClose = () => {
        form.reset(buildEditFormValues(exam));
        onClose();
    };

    return {
        form,
        onSubmit,
        handleClose,
        isPending: updateExamMutation.isPending,
    };
}
