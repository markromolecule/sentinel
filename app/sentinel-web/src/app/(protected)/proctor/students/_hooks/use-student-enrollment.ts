"use client";

import { useState, useCallback } from "react";
import { ParseResult, ParsedStudent } from "../_types";

export function useStudentEnrollment() {
    const [file, setFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const resetState = useCallback(() => {
        setFile(null);
        setParseResult(null);
    }, []);

    const parseCSV = (text: string): ParseResult => {
        const lines = text.trim().split("\n");
        if (lines.length < 2) {
            return { students: [], errors: ["File must have at least a header row and one data row"] };
        }

        const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/['"]/g, ""));
        const students: ParsedStudent[] = [];
        const errors: string[] = [];

        // Column mapping - support various naming conventions
        const columnMap: Record<string, keyof ParsedStudent> = {};
        headers.forEach((header, index) => {
            if (
                header.includes("student") &&
                (header.includes("no") || header.includes("number") || header.includes("id"))
            ) {
                columnMap[index.toString()] = "studentNo";
            } else if (
                (header.includes("first") && header.includes("name")) ||
                header === "firstname" ||
                header === "first_name"
            ) {
                columnMap[index.toString()] = "firstName";
            } else if (
                (header.includes("last") && header.includes("name")) ||
                header === "lastname" ||
                header === "last_name"
            ) {
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
        const requiredColumns: (keyof ParsedStudent)[] = [
            "studentNo",
            "firstName",
            "lastName",
            "section",
            "subject",
            "term",
        ];
        const missingColumns = requiredColumns.filter((col) => !mappedColumns.includes(col));

        if (missingColumns.length > 0) {
            errors.push(`Missing required columns: ${missingColumns.join(", ")}`);
            return { students: [], errors };
        }

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v) => v.trim().replace(/['"]/g, ""));

            if (values.length < headers.length || values.every((v) => !v)) {
                continue; // Skip empty rows
            }

            const student: Partial<ParsedStudent> = {};
            Object.entries(columnMap).forEach(([index, key]) => {
                student[key] = values[parseInt(index)] || "";
            });

            // Validate required fields
            if (!student.studentNo || !student.firstName || !student.lastName) {
                errors.push(
                    `Row ${i + 1}: Missing required fields (student number, first name, or last name)`
                );
                continue;
            }

            students.push(student as ParsedStudent);
        }

        return { students, errors };
    };

    const processFile = useCallback(async (selectedFile: File) => {
        setFile(selectedFile);
        setIsLoading(true);

        try {
            const text = await selectedFile.text();
            const result = parseCSV(text);
            setParseResult(result);
        } catch (_error) {
            setParseResult({
                students: [],
                errors: ["Failed to parse file. Please ensure it's a valid CSV file."],
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        file,
        parseResult,
        isLoading,
        processFile,
        resetState,
    };
}
