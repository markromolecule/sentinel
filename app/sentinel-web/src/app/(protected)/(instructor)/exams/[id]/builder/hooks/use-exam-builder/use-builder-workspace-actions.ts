import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
    useSaveBuilderWorkspaceMutation,
    useUpdateExamMutation,
} from '@sentinel/hooks';
import { toast } from 'sonner';
import { BUILDER_QUERY_KEYS } from '@sentinel/shared/constants';
import {
    buildBuilderWorkspacePayload,
    useExamStore,
} from '@/features/exams/builder/_stores/use-exam-store';
import type { ExamSettings } from '@sentinel/shared/types';

import { type BuilderWorkspace } from '@sentinel/services';

interface UseBuilderWorkspaceActionsProps {
    id: string;
    builderWorkspace?: BuilderWorkspace;
}

export function useBuilderWorkspaceActions({
    id,
    builderWorkspace,
}: UseBuilderWorkspaceActionsProps) {
    const router = useRouter();
    const queryClient = useQueryClient();

    const saveBuilderWorkspaceMutation = useSaveBuilderWorkspaceMutation();
    const updateExamMutation = useUpdateExamMutation({
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: BUILDER_QUERY_KEYS.workspace(id),
            });
        },
    });

    const { hydrateExam, setTitle, updateSetting, updateConfiguration, markClean } = useExamStore();

    // Hydration logic
    useEffect(() => {
        if (builderWorkspace?.exam) {
            hydrateExam(builderWorkspace.exam);
        }
    }, [builderWorkspace?.exam, hydrateExam]);

    const handleToggleExamSetting = (key: keyof ExamSettings, value: boolean) => {
        updateSetting(key, value);
    };

    const handleToggleLobbyAdmissionMode = (enabled: boolean) => {
        updateConfiguration('lobbyAdmissionMode', enabled ? 'INSTRUCTOR_GATED' : 'AUTOMATIC');
    };

    const handleToggleReleaseScoreMode = (enabled: boolean) => {
        updateConfiguration('releaseScoreMode', enabled ? 'AUTO_RELEASE' : 'MANUAL_RELEASE');
    };

    const handleToggleStrictMode = (enabled: boolean) => {
        updateConfiguration('strictMode', enabled);
    };

    const handleUpdateTitle = async (nextTitle: string) => {
        const examId = useExamStore.getState().examId ?? id;
        const trimmedTitle = nextTitle.trim();
        const currentTitle = useExamStore.getState().title;

        if (!examId) {
            toast.error('Exam not found.');
            return false;
        }

        if (!trimmedTitle) {
            toast.error('Exam title is required.');
            return false;
        }

        if (trimmedTitle.length < 4 || trimmedTitle.length > 100) {
            toast.error('Exam title must be between 4 and 100 characters.');
            return false;
        }

        if (trimmedTitle === currentTitle) {
            return true;
        }

        setTitle(trimmedTitle);

        try {
            await updateExamMutation.mutateAsync({
                id: examId,
                payload: {
                    title: trimmedTitle,
                },
            });
            return true;
        } catch {
            setTitle(currentTitle);
            return false;
        }
    };

    const handleSave = async () => {
        const examId = useExamStore.getState().examId ?? id;

        if (!examId) {
            toast.error('Exam not found.');
            return;
        }

        await saveBuilderWorkspaceMutation.mutateAsync({
            id: examId,
            payload: buildBuilderWorkspacePayload(useExamStore.getState()),
        });
        markClean();
        router.push('/exams');
    };

    return {
        isSaving: saveBuilderWorkspaceMutation.isPending,
        isUpdatingTitle: updateExamMutation.isPending,
        handleToggleExamSetting,
        handleToggleLobbyAdmissionMode,
        handleToggleReleaseScoreMode,
        handleToggleStrictMode,
        handleUpdateTitle,
        handleSave,
    };
}
