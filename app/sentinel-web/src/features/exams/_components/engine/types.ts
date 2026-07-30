import type { ReactNode } from 'react';
import type {
    Exam,
    ExamAttemptAnswerValue,
    ExamConfiguration,
    ExamQuestion,
    ExamSettings,
} from '@sentinel/shared/types';

export type ExamEngineMode = 'preview' | 'runtime';

export type ExamAnswerValue = ExamAttemptAnswerValue;

type HardwareStatus = 'success' | 'pending' | 'optional';

export type HardwareReadinessItem = {
    key: string;
    title: string;
    description: string;
    icon: ReactNode;
    status: HardwareStatus;
};

export type ExamStageShellProps = {
    mode?: ExamEngineMode;
    eyebrow?: string;
    title: string;
    description?: string;
    main: ReactNode;
    aside?: ReactNode;
    footer?: ReactNode;
};

export type ExamInstructionStepProps = {
    exam: Pick<Exam, 'title' | 'description' | 'duration' | 'questionCount' | 'questions'>;
    settings?: ExamSettings;
    configuration?: ExamConfiguration;
    mode?: ExamEngineMode;
};

export type ExamPrivacyStepProps = {
    cameraRequired: boolean;
    micRequired: boolean;
    fullscreenRequired: boolean;
    monitoringEnabled: boolean;
    platform: 'desktop' | 'mobile';
    mode?: ExamEngineMode;
};

export type HardwareReadinessSummaryProps = {
    items: HardwareReadinessItem[];
    activeRules: string[];
    platform: 'desktop' | 'mobile';
    mode?: ExamEngineMode;
};

export type ExamLobbyPanelProps = {
    examTitle: string;
    canEnter: boolean;
    readyCount: number;
    totalChecks: number;
    reconnectLimit: number;
    mode?: ExamEngineMode;
};

export type ExamAttemptShellProps = {
    title: string;
    timerLabel: string;
    status?: ReactNode;
    toolbar?: ReactNode;
    questionRail: ReactNode;
    passagePanel?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    mode?: ExamEngineMode;
};

export type ExamQuestionRendererProps = {
    question: ExamQuestion;
    value: ExamAnswerValue;
    onChange: (value: ExamAnswerValue) => void;
    showCorrectAnswer?: boolean;
    crossOutEnabled?: boolean;
    crossedOutOptions?: number[];
    onToggleOptionCrossOut?: (optionIndex: number) => void;
    mode?: ExamEngineMode;
};
