'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MAX_FILE_SIZE_MB } from './constants';

export function useFileValidator() {
    const [files, setFiles] = useState<File[]>([]);

    const handleFileChange = (selectedFiles: File[] | null) => {
        if (!selectedFiles?.length) {
            setFiles([]);
            return;
        }

        const allowedExtensions = ['.pdf'];
        const invalidFile = selectedFiles.find((selectedFile) => {
            const extension = selectedFile.name
                .substring(selectedFile.name.lastIndexOf('.'))
                .toLowerCase();

            return !allowedExtensions.includes(extension);
        });

        if (invalidFile) {
            toast.error('Invalid file type', {
                description: 'Only PDF lesson files are supported for AI analysis.',
            });
            return;
        }

        const oversizedFile = selectedFiles.find(
            (selectedFile) => selectedFile.size / (1024 * 1024) > MAX_FILE_SIZE_MB,
        );

        if (oversizedFile) {
            const sizeInMB = oversizedFile.size / (1024 * 1024);
            toast.error('File too large', {
                description: `Max file size is ${MAX_FILE_SIZE_MB}MB per file. ${oversizedFile.name} is ${sizeInMB.toFixed(2)}MB.`,
            });
            return;
        }

        const mergedFiles = [...files, ...selectedFiles];
        const uniqueFiles = mergedFiles.filter(
            (file, index, collection) =>
                collection.findIndex(
                    (candidate) =>
                        candidate.name === file.name &&
                        candidate.size === file.size &&
                        candidate.lastModified === file.lastModified,
                ) === index,
        );

        const totalSizeMB = uniqueFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024);
        if (totalSizeMB > MAX_FILE_SIZE_MB) {
            toast.error('Combined files too large', {
                description: `Max combined size for AI analysis is ${MAX_FILE_SIZE_MB}MB. Selected files total ${totalSizeMB.toFixed(2)}MB.`,
            });
            return;
        }

        setFiles(uniqueFiles);
        toast.success(`${uniqueFiles.length} file${uniqueFiles.length === 1 ? '' : 's'} ready`, {
            description:
                uniqueFiles.length === 1
                    ? `${uniqueFiles[0].name} is ready for AI analysis.`
                    : 'Your lesson files are ready for AI analysis.',
        });

    };

    return {
        files,
        setFiles,
        handleFileChange,
    };
}
