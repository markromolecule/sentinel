import type {
    ExamQuestion,
    ExamQuestionContent,
    ExamQuestionSection,
    QuestionDifficulty,
    PassageType,
    QuestionType,
} from '@sentinel/shared/types';
import type { QuestionTypeDefinition } from '@sentinel/services';

export interface QuestionBucketTableProps {
    sections?: ExamQuestionSection[];
    questions: ExamQuestion[];
    questionTypes?: QuestionTypeDefinition[];
    onEdit: (questionId: string) => void;
    onDelete: (questionId: string) => void;
    onAddToBank?: (questionId: string) => void | Promise<void>;
    onReorder?: (startIndex: number, endIndex: number) => void;
    onReorderInSection?: (sectionId: string, startIndex: number, endIndex: number) => void;
    onReorderSections?: (startIndex: number, endIndex: number) => void;
    onAdd: (sectionId?: string) => void;
    onAddSection?: () => void;
    onImport: (sectionId?: string) => void;
    onUpdateSection?: (sectionId: string, updates: Partial<ExamQuestionSection>) => void;
    onDeleteSection?: (sectionId: string) => void;
    onToggleSectionCollapse?: (sectionId: string) => void;
}

export interface QuestionBuilderFormProps {
    type: QuestionType;
    initialData?: ExamQuestion;
    questionTypeDefinition?: QuestionTypeDefinition;
    onBack: () => void;
    onCreate: (question: QuestionBuilderPayload) => void | Promise<void>;
    onUpdate?: (id: string, question: QuestionBuilderPayload) => void | Promise<void>;
    onDuplicate?: (question: QuestionBuilderPayload) => void | Promise<void>;
    builderMode?: boolean;
}

export interface QuestionTypeSelectorDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    questionTypes?: QuestionTypeDefinition[];
    isLoading?: boolean;
    onSelect: (type: QuestionType) => void;
}

export type QuestionBuilderPayload = {
    type: QuestionType;
    content: ExamQuestionContent;
    difficulty: QuestionDifficulty;
    points: number;
    tags: string[];
    passageContent?: string | null;
    passageType?: PassageType | null;
};
