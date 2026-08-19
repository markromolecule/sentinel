'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Trash2 } from 'lucide-react';

interface UploadTabProps {
    files: File[];
    onFileChange: (files: File[] | null) => void;
    onRemoveFile?: (file: File) => void;
}

function formatFileSize(size: number) {
    const sizeInMb = size / (1024 * 1024);

    if (sizeInMb >= 1) {
        return `${sizeInMb.toFixed(1)} MB`;
    }

    return `${(size / 1024).toFixed(0)} KB`;
}

export function UploadTab({ files, onFileChange, onRemoveFile }: UploadTabProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);

            const droppedFiles = Array.from(e.dataTransfer.files);
            if (droppedFiles.length > 0) {
                onFileChange(droppedFiles);
            }
        },
        [onFileChange],
    );

    return (
        <div className="space-y-4 py-2">
            <div
                className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-all ${
                    files.length > 0 || isDragging
                        ? 'border-[#323d8f] bg-[#323d8f]/5'
                        : 'border-border hover:border-[#323d8f]/50 hover:bg-zinc-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => onFileChange(Array.from(e.target.files ?? []))}
                    accept=".pdf,application/pdf"
                    multiple
                    className="hidden"
                />
                <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full transition-transform ${
                        files.length > 0
                            ? 'scale-110 bg-[#323d8f] text-white shadow-lg'
                            : 'bg-primary/10 text-[#323d8f]'
                    }`}
                >
                    {files.length > 0 ? (
                        <FileText className="h-8 w-8" />
                    ) : (
                        <Upload className="h-8 w-8" />
                    )}
                </div>
                <div className="text-center">
                    <p
                        className={`text-base font-bold ${files.length > 0 ? 'text-[#323d8f]' : 'text-foreground'}`}
                    >
                        {files.length > 0
                            ? `${files.length} PDF file${files.length === 1 ? '' : 's'} selected`
                            : 'Choose PDF files or drag them here'}
                    </p>
                    <p className="text-muted-foreground mx-auto mt-2 max-w-[250px] text-xs leading-relaxed">
                        Upload one or more{' '}
                        <span className="text-foreground font-medium">PDF lesson files</span> up to
                        4.5MB total.
                    </p>
                </div>
            </div>

            {files.length > 0 ? (
                <div className="space-y-3">
                    <div className="rounded-xl border border-[#323d8f]/20 bg-[#323d8f]/10 p-4">
                        <div className="flex items-center gap-3 text-sm text-[#323d8f]">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <p className="font-medium">
                                {files.length === 1
                                    ? 'Your lesson file is ready. Continue to generation settings.'
                                    : 'Your lesson files are ready. Continue to set the question mix.'}
                            </p>
                        </div>
                    </div>
                    <div className="bg-background rounded-xl border">
                        <div className="border-b px-4 py-3 text-sm font-medium">Selected files</div>
                        <div className="divide-y">
                            {files.map((file) => (
                                <div
                                    key={`${file.name}-${file.lastModified}-${file.size}`}
                                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">{file.name}</p>
                                            <p className="text-muted-foreground text-xs">
                                                {formatFileSize(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                    {onRemoveFile && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemoveFile(file);
                                            }}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md p-1.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            aria-label={`Remove ${file.name}`}
                                            title="Remove file"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 flex items-center gap-3 rounded-xl border border-[#323d8f]/20 bg-[#323d8f]/10 p-4 text-sm text-[#323d8f] duration-300">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <p className="font-medium">
                        Only PDF lesson files are supported for AI question generation.
                    </p>
                </div>
            )}
        </div>
    );
}
