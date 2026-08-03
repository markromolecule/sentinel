'use client';

import { useState, useCallback } from 'react';
import { useStableValue, useUnenrollSubjectMutation } from '@sentinel/hooks';
import { type Subject } from '@sentinel/shared/types';
import { toast } from 'sonner';

export interface SectionOption {
    id: string;
    name: string;
}

export interface UseUnenrollmentProps {
    subject: Subject;
    onSuccess?: () => void;
}

export function useUnenrollment({ subject, onSuccess }: UseUnenrollmentProps) {
    const [open, setOpen] = useState(false);
    const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

    // Normalize sections to handle multiple formats (string[], {id, name}[], etc.)
    const allSections = useStableValue((): SectionOption[] => {
        return (subject.sections || []).map((s) => {
            if (typeof s === 'string') return { id: s, name: s };
            const section = s as {
                id?: string;
                section_id?: string;
                name?: string;
                section_name?: string;
                class_group_id?: string;
            };
            return {
                id: section.class_group_id || section.id || section.section_id || 'unknown',
                name: section.name || section.section_name || 'Unknown',
            };
        });
    }, [subject.sections]);

    const unenrollMutation = useUnenrollSubjectMutation({
        onSuccess: () => {
            setOpen(false);
            toast.success(`Unenrolled from ${subject.code} successfully`);
            onSuccess?.();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const toggleSection = useCallback((id: string) => {
        setSelectedSectionIds((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
        );
    }, []);

    const toggleAll = useCallback(() => {
        setSelectedSectionIds((prev) =>
            prev.length === allSections.length ? [] : allSections.map((s) => s.id),
        );
    }, [allSections]);

    const handleUnenroll = useCallback(() => {
        if (selectedSectionIds.length === 0) {
            toast.error('Please select at least one section to unenroll');
            return;
        }

        unenrollMutation.mutate({
            id: subject.subjectOfferingId || subject.id,
            status: subject.status,
            classGroupIds: selectedSectionIds,
        });
    }, [
        subject.id,
        subject.status,
        subject.subjectOfferingId,
        selectedSectionIds,
        unenrollMutation,
    ]);

    const handleOpenChange = useCallback((newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen) {
            // Initialize as empty - user must select what to unenroll
            setSelectedSectionIds([]);
        }
    }, []);

    return {
        open,
        allSections,
        selectedSectionIds,
        isPending: unenrollMutation.isPending,
        toggleSection,
        toggleAll,
        handleUnenroll,
        handleOpenChange,
    };
}
