import { useState } from 'react';
import { useExamsQuery } from '@sentinel/hooks';
import { useAcademicScope } from '@/hooks/use-academic-scope';

export function useProctorExams() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { institutionId } = useAcademicScope();
    const { data: exams = [], isLoading } = useExamsQuery({
        institutionId: institutionId || undefined,
        limit: 100,
    });

    return {
        exams,
        isLoading,
        isCreateOpen,
        setIsCreateOpen,
    };
}
