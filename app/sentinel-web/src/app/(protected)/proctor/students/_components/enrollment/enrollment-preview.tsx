"use client";

import { ParsedStudent } from "@/app/(protected)/proctor/students/_types";

type EnrollmentPreviewProps = {
    students: ParsedStudent[];
};

export function EnrollmentPreview({ students }: EnrollmentPreviewProps) {
    if (students.length === 0) return null;

    return (
        <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                    <tr>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                            Student No.
                        </th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground hidden sm:table-cell">
                            Section
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {students.slice(0, 10).map((student, index) => (
                        <tr key={index}>
                            <td className="py-2 px-3 font-mono text-foreground">
                                {student.studentNo}
                            </td>
                            <td className="py-2 px-3 text-foreground">
                                {student.firstName} {student.lastName}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground hidden sm:table-cell">
                                {student.section}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {students.length > 10 && (
                <div className="py-2 px-3 bg-muted/50 text-center text-sm text-muted-foreground">
                    ... and {students.length - 10} more students
                </div>
            )}
        </div>
    );
}
