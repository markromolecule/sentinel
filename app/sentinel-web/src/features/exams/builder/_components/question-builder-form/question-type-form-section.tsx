import type { ExamQuestionContent, QuestionType } from '@sentinel/shared/types';
import {
    EssayForm,
    FillBlankForm,
    IdentificationForm,
    MatchingForm,
    MultipleChoiceForm,
    TrueFalseForm,
} from '@/features/exams/builder/_components/question-forms';

type QuestionTypeFormSectionProps = {
    content: ExamQuestionContent;
    onChange: (content: ExamQuestionContent) => void;
    type: QuestionType;
};

export function QuestionTypeFormSection({ content, onChange, type }: QuestionTypeFormSectionProps) {
    if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_RESPONSE') {
        return (
            <MultipleChoiceForm
                content={content}
                onChange={onChange}
                mode={type === 'MULTIPLE_RESPONSE' ? 'multiple' : 'single'}
            />
        );
    }

    if (type === 'TRUE_FALSE') {
        return <TrueFalseForm content={content} onChange={onChange} />;
    }

    if (type === 'IDENTIFICATION' || type === 'ENUMERATION') {
        return <IdentificationForm type={type} content={content} onChange={onChange} />;
    }

    if (type === 'MATCHING') {
        return <MatchingForm content={content} onChange={onChange} />;
    }

    if (type === 'FILL_BLANK') {
        return <FillBlankForm content={content} onChange={onChange} />;
    }

    if (type === 'ESSAY') {
        return <EssayForm content={content} onChange={onChange} />;
    }

    return null;
}
