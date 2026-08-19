import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GenerateQuestionPreviewResponse } from '@sentinel/shared';
import { useAiImportStore } from './use-ai-import-store';
import { useFileValidator } from './use-file-validator';
import { useTypeDistribution } from './use-type-distribution';
import { useImportSteps } from './use-import-steps';
import { useBloomSelection } from './use-bloom-selection';
import { useGenerateQuestionsMutation } from './query/use-generate-questions-mutation';
import { MAX_TOTAL_QUESTION_COUNT } from './constants';

export function useImportHandler(args: {
    onOpenChange: (open: boolean) => void;
    collectionId?: string;
    collectionName?: string;
}) {
    const router = useRouter();
    const { setPreviewData, setIsGenerating, reset, setSaveTarget } = useAiImportStore();

    const { files, handleFileChange, handleRemoveFile } = useFileValidator();
    const { questionTypeDistribution, questionCount, handleToggleType, handleTypeCountChange } =
        useTypeDistribution();

    const { currentStep, setCurrentStep, isTransitioning, handleAnalyze, handleBack } =
        useImportSteps();

    const { selectedBloomLevels, handleToggleBloomLevel } = useBloomSelection();

    const generateMutation = useGenerateQuestionsMutation({
        onSuccess: (data: GenerateQuestionPreviewResponse) => {
            setPreviewData(data);
            setIsGenerating(false);

            // Execute the route transition first for perceived snappiness
            router.push('/question/bank/import/preview');

            toast.success('Questions generated successfully!', {
                description: `Created ${data.questions?.length ?? 0} questions for preview.`,
            });

            // Ensure visual cleanup happens smoothly
            setTimeout(() => {
                args.onOpenChange(false);
            }, 100);
        },
        onError: (error: Error) => {
            setIsGenerating(false);
            setSaveTarget({
                mode: 'create_collection',
            });
            console.error('AI Generation Error:', error);
            toast.error('Unable to generate questions.', {
                description: error instanceof Error ? error.message : 'Please try again.',
            });
        },
    });

    const handleGenerate = async () => {
        if (generateMutation.isPending || isTransitioning) {
            return;
        }

        if (files.length === 0) {
            toast.error('Please select at least one PDF file first.');
            return;
        }

        if (questionTypeDistribution.length === 0) {
            toast.error('Select at least one question type.');
            return;
        }

        if (questionCount <= 0 || questionCount > MAX_TOTAL_QUESTION_COUNT) {
            toast.error('Invalid question count', {
                description: `The total number of questions must be between 1 and ${MAX_TOTAL_QUESTION_COUNT}.`,
            });
            return;
        }

        reset(); // Clear previous session
        setIsGenerating(true);

        const targetConfig = args.collectionId
            ? {
                  mode: 'append_to_collection' as const,
                  collectionId: args.collectionId,
                  collectionName: args.collectionName,
              }
            : {
                  mode: 'create_collection' as const,
              };

        setSaveTarget(targetConfig);

        // Prefetch the target route so that transitions are seamless once AI generation completes
        router.prefetch('/question/bank/import/preview');

        generateMutation.mutate({
            files,
            questionCount,
            questionTypeDistribution,
            bloomLevels: selectedBloomLevels,
        });
    };

    return {
        currentStep,
        setCurrentStep,
        files,
        isProcessing: isTransitioning || generateMutation.isPending,
        questionCount,
        questionTypeDistribution,
        selectedBloomLevels,
        handleToggleType,
        handleTypeCountChange,
        handleToggleBloomLevel,
        handleFileChange,
        handleRemoveFile,
        handleAnalyze: () => handleAnalyze(files.length),
        handleGenerate,
        handleBack,
    };
}
