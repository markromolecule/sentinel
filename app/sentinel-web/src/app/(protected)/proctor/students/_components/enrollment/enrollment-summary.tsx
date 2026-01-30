"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import { ParseResult } from "@/app/(protected)/proctor/students/_types";

type EnrollmentSummaryProps = {
    result: ParseResult;
};

export function EnrollmentSummary({ result }: EnrollmentSummaryProps) {
    if (result.errors.length === 0 && result.students.length === 0) return null;

    return (
        <>
            {/* Errors */}
            {result.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            {result.errors.map((error, index) => (
                                <p key={index} className="text-sm text-red-600">
                                    {error}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {result.students.length > 0 && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <p className="text-sm text-emerald-600">
                            Found {result.students.length} student
                            {result.students.length !== 1 ? "s" : ""} ready to import
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
