import { useState } from 'react';
import { useExamsQuery } from '@sentinel/hooks';

export function useProctorExams() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const { data: exams = [], isLoading } = useExamsQuery({ limit: 100 });

    return {
        exams,
        isLoading,
        isCreateOpen,
        setIsCreateOpen,
    };
}
