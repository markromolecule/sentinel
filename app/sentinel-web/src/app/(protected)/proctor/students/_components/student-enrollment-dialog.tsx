"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type StudentEnrollmentDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type ParsedStudent = {
    studentNo: string;
    firstName: string;
    lastName: string;
    section: string;
    subject: string;
    term: string;
};

type ParseResult = {
    students: ParsedStudent[];
    errors: string[];
};

export function StudentEnrollmentDialog({ open, onOpenChange }: StudentEnrollmentDialogProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const resetState = () => {
        setFile(null);
        setParseResult(null);
        setIsDragging(false);
    };

    const handleClose = () => {
        resetState();
        onOpenChange(false);
    };

    const parseCSV = (text: string): ParseResult => {
        const lines = text.trim().split("\n");
        if (lines.length < 2) {
            return { students: [], errors: ["File must have at least a header row and one data row"] };
        }

        const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/['"]/g, ""));
        const students: ParsedStudent[] = [];
        const errors: string[] = [];

        // Column mapping - support various naming conventions
        const columnMap: Record<string, keyof ParsedStudent> = {};
        headers.forEach((header, index) => {
            if (header.includes("student") && (header.includes("no") || header.includes("number") || header.includes("id"))) {
                columnMap[index.toString()] = "studentNo";
            } else if (header.includes("first") && header.includes("name") || header === "firstname" || header === "first_name") {
                columnMap[index.toString()] = "firstName";
            } else if (header.includes("last") && header.includes("name") || header === "lastname" || header === "last_name") {
                columnMap[index.toString()] = "lastName";
            } else if (header === "section" || header.includes("section")) {
                columnMap[index.toString()] = "section";
            } else if (header === "subject" || header.includes("subject") || header.includes("course")) {
                columnMap[index.toString()] = "subject";
            } else if (header === "term" || header.includes("term") || header.includes("semester")) {
                columnMap[index.toString()] = "term";
            }
        });

        // Check for required columns
        const mappedColumns = Object.values(columnMap);
        const requiredColumns: (keyof ParsedStudent)[] = ["studentNo", "firstName", "lastName", "section", "subject", "term"];
        const missingColumns = requiredColumns.filter(col => !mappedColumns.includes(col));

        if (missingColumns.length > 0) {
            errors.push(`Missing required columns: ${missingColumns.join(", ")}`);
            return { students: [], errors };
        }

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map(v => v.trim().replace(/['"]/g, ""));

            if (values.length < headers.length || values.every(v => !v)) {
                continue; // Skip empty rows
            }

            const student: Partial<ParsedStudent> = {};
            Object.entries(columnMap).forEach(([index, key]) => {
                student[key] = values[parseInt(index)] || "";
            });

            // Validate required fields
            if (!student.studentNo || !student.firstName || !student.lastName) {
                errors.push(`Row ${i + 1}: Missing required fields (student number, first name, or last name)`);
                continue;
            }

            students.push(student as ParsedStudent);
        }

        return { students, errors };
    };

    const handleFile = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        setIsLoading(true);

        try {
            const text = await selectedFile.text();
            const result = parseCSV(text);
            setParseResult(result);
        } catch (error) {
            setParseResult({ students: [], errors: ["Failed to parse file. Please ensure it's a valid CSV file."] });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
            handleFile(droppedFile);
        }
    }, [handleFile]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFile(selectedFile);
        }
    };

    const handleImport = () => {
        // In a real implementation, this would send the data to the backend
        console.log("Importing students:", parseResult?.students);
        handleClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add Students</DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file with student information. The file should contain columns for
                        student number, first name, last name, section, subject, and term.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!file ? (
                        /* Drop Zone */
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
                                    <p className="text-sm text-muted-foreground mt-1">
                                        or click to browse
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <Button asChild variant="outline">
                                    <label htmlFor="file-upload" className="cursor-pointer">
                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                        Select File
                                    </label>
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Supported formats: CSV, XLSX, XLS
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* File Preview */
                        <div className="space-y-4">
                            {/* Selected File */}
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet className="w-5 h-5 text-[#323d8f]" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={resetState}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {isLoading ? (
                                <div className="text-center py-4">
                                    <p className="text-sm text-muted-foreground">Parsing file...</p>
                                </div>
                            ) : parseResult && (
                                <>
                                    {/* Errors */}
                                    {parseResult.errors.length > 0 && (
                                        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                                <div className="space-y-1">
                                                    {parseResult.errors.map((error, index) => (
                                                        <p key={index} className="text-sm text-red-600">{error}</p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Success Message */}
                                    {parseResult.students.length > 0 && (
                                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                <p className="text-sm text-emerald-600">
                                                    Found {parseResult.students.length} student{parseResult.students.length !== 1 ? "s" : ""} ready to import
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Preview Table */}
                                    {parseResult.students.length > 0 && (
                                        <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/50 sticky top-0">
                                                    <tr>
                                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Student No.</th>
                                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th>
                                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">Section</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {parseResult.students.slice(0, 10).map((student, index) => (
                                                        <tr key={index}>
                                                            <td className="py-2 px-3 font-mono text-foreground">{student.studentNo}</td>
                                                            <td className="py-2 px-3 text-foreground">{student.firstName} {student.lastName}</td>
                                                            <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell">{student.section}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {parseResult.students.length > 10 && (
                                                <div className="py-2 px-3 bg-muted/50 text-center text-sm text-muted-foreground">
                                                    ... and {parseResult.students.length - 10} more students
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!parseResult || parseResult.students.length === 0}
                        className="bg-[#323d8f] hover:bg-[#323d8f]/90"
                    >
                        Import {parseResult?.students.length || 0} Students
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
