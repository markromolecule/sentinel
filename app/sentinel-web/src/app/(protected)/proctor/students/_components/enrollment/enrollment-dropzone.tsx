"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EnrollmentDropzoneProps = {
    onFileSelect: (file: File) => void;
};

export function EnrollmentDropzone({ onFileSelect }: EnrollmentDropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);

            const droppedFile = e.dataTransfer.files[0];
            if (
                droppedFile &&
                (droppedFile.name.endsWith(".csv") ||
                    droppedFile.name.endsWith(".xlsx") ||
                    droppedFile.name.endsWith(".xls"))
            ) {
                onFileSelect(droppedFile);
            }
        },
        [onFileSelect]
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            onFileSelect(selectedFile);
        }
    };

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                isDragging
                    ? "border-[#323d8f] bg-[#323d8f]/5"
                    : "border-border hover:border-[#323d8f]/50"
            )}
        >
            <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">
                        Drag and drop your file here
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                </div>
                <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                />
                <Button asChild variant="outline">
                    <label htmlFor="file-upload" className="cursor-pointer">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Select File
                    </label>
                </Button>
                <p className="text-xs text-muted-foreground">Supported formats: CSV, XLSX, XLS</p>
            </div>
        </div>
    );
}
