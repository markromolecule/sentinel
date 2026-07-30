import type {
    QuestionBankCollectionRecord,
    QuestionRecord,
    QuestionTypeDefinition,
    QuestionTypeCountRecord,
} from '@sentinel/services';
import type { ExamQuestion, QuestionType } from '@sentinel/shared/types';

export interface QuestionBankImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImport: (questions: ExamQuestion[]) => void;
    existingQuestions?: ExamQuestion[];
    allowedQuestionType?: QuestionType;
}

export interface QuestionBankImportModalState {
    questionRecords: QuestionRecord[];
    collections: QuestionBankCollectionRecord[];
    questionTypes: QuestionTypeDefinition[];
    typeCounts: QuestionTypeCountRecord[];
    selectedCollection: QuestionBankCollectionRecord | null;
    selectedCollectionId: string;
    selectedIds: string[];
    selectedIdSet: Set<string>;
    alreadyAddedIds: string[];
    alreadyAddedIdSet: Set<string>;
    searchQuery: string;
    selectedQuestionType: QuestionType | 'all';
    selectedImportableCount: number;
    totalQuestionCount: number;
    currentPage: number;
    totalPages: number;
    isQuestionsLoading: boolean;
    isFetchingMoreQuestions: boolean;
    isCollectionsLoading: boolean;
    isQuestionTypesLoading: boolean;
    isTypeCountsLoading: boolean;
    isSelectedCollectionLoading: boolean;
    setSearchQuery: (value: string) => void;
    setSelectedCollectionId: (value: string) => void;
    setSelectedQuestionType: (value: QuestionType | 'all') => void;
    setCurrentPage: (page: number) => void;
    toggleQuestion: (id: string) => void;
    toggleSelectAllFilteredQuestions: () => void;
    buildImportedQuestions: () => ExamQuestion[];
    resetState: (options?: { preserveAlreadyAddedIds?: string[] }) => void;
}
