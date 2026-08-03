'use client';

import { Button } from '@sentinel/ui';
import { FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { BulkUploadPreview } from './bulk-upload-preview';

interface FileUploadTabProps {
    file: File | null;
    isParsing: boolean;
    isImporting: boolean;
    parseResult: {
        rows: Array<{ code: string; title: string; sourceLabel: string }>;
        errors: string[];
    } | null;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onReset: () => void;
}

export function FileUploadTab({
    file,
    isParsing,
    isImporting,
    parseResult,
    onFileChange,
    onReset,
}: FileUploadTabProps) {
    if (!file) {
        return (
            <div className="border-border bg-muted/30 flex min-h-[360px] flex-1 items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors hover:border-[#323d8f]/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-background border-border rounded-full border p-4 shadow-sm">
                        <Upload className="h-8 w-8 text-[#323d8f]" />
                    </div>
                    <div>
                        <p className="text-foreground text-sm font-medium">
                            Click to browse a spreadsheet
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                            CSV, XLSX, or XLS files are supported
                        </p>
                    </div>
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={onFileChange}
                        className="hidden"
                        id="subject-bulk-upload"
                        disabled={isImporting}
                    />
                    <Button
                        asChild
                        size="sm"
                        className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                        disabled={isImporting}
                    >
                        <label htmlFor="subject-bulk-upload" className="cursor-pointer">
                            Select File
                        </label>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-[#323d8f]/20 bg-[#323d8f]/5 p-3">
                <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-[#323d8f]" />
                    <div>
                        <p className="text-foreground max-w-[320px] truncate text-sm font-medium">
                            {file.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                            {(file.size / 1024).toFixed(1)} KB
                        </p>
                    </div>
                </div>
                <button
                    onClick={onReset}
                    disabled={isImporting}
                    className="hover:bg-muted rounded-md p-1 transition-colors disabled:opacity-50"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            {isParsing ? (
                <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#323d8f]" />
                    <p className="text-sm">Analyzing file content...</p>
                </div>
            ) : (
                <BulkUploadPreview
                    rows={parseResult?.rows ?? []}
                    errors={parseResult?.errors ?? []}
                    emptyMessage="Upload a CSV or Excel file to preview subject rows here."
                />
            )}
        </div>
    );
}
