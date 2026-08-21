'use client';

import { AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';
import type { StudentImportParseResult } from '@/app/(protected)/(instructor)/students/_types/enrollment-target';

type EnrollmentSummaryProps = {
    result: StudentImportParseResult;
};

export function EnrollmentSummary({ result }: EnrollmentSummaryProps) {
    if (result.errors.length === 0 && result.students.length === 0) return null;

    const readyStudents = result.students.filter(
        (student) =>
            student.claimStatus === 'CLAIMED' || student.claimStatus === 'UNCLAIMED',
    );
    const claimedStudents = result.students.filter((student) => student.claimStatus === 'CLAIMED');
    const unclaimedStudents = result.students.filter(
        (student) => student.claimStatus === 'UNCLAIMED',
    );
    const alreadyEnrolledStudents = result.students.filter(
        (student) => student.claimStatus === 'ALREADY_ENROLLED',
    );
    const notWhitelistedStudents = result.students.filter(
        (student) => student.claimStatus === 'NOT_WHITELISTED',
    );
    const unverifiedStudents = result.students.filter(
        (student) => student.claimStatus === 'UNKNOWN',
    );

    return (
        <>
            {/* Errors */}
            {result.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex min-w-0 items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <div className="min-w-0 space-y-1">
                            {result.errors.map((error, index) => (
                                <p key={index} className="text-sm break-words text-red-600">
                                    {error}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Ready to Import Message */}
            {readyStudents.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex min-w-0 items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <div className="min-w-0 text-sm text-emerald-700">
                            <p className="font-medium">
                                Found {readyStudents.length} whitelisted student
                                {readyStudents.length !== 1 ? 's' : ''} ready to import
                            </p>
                            <p className="text-xs text-emerald-600">
                                {claimedStudents.length} claimed account
                                {claimedStudents.length !== 1 ? 's' : ''} •{' '}
                                {unclaimedStudents.length} unclaimed account
                                {unclaimedStudents.length !== 1 ? 's' : ''} (will activate
                                automatically when students register)
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Already Enrolled */}
            {alreadyEnrolledStudents.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="flex min-w-0 items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <p className="min-w-0 text-sm break-words text-blue-700">
                            {alreadyEnrolledStudents.length} student
                            {alreadyEnrolledStudents.length !== 1 ? 's are' : ' is'} already
                            enrolled in this classroom and will be skipped
                        </p>
                    </div>
                </div>
            )}

            {/* Not in Whitelist */}
            {notWhitelistedStudents.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex min-w-0 items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <p className="min-w-0 text-sm break-words text-amber-700">
                            {notWhitelistedStudents.length} student
                            {notWhitelistedStudents.length !== 1 ? 's are' : ' is'} not found in the
                            institutional whitelist and will be skipped
                        </p>
                    </div>
                </div>
            )}

            {/* Unverified Preview */}
            {unverifiedStudents.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex min-w-0 items-start gap-2">
                        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                        <p className="min-w-0 text-sm break-words text-slate-700">
                            {unverifiedStudents.length} student
                            {unverifiedStudents.length !== 1 ? "s couldn't" : " couldn't"} be
                            verified yet because the claim-status preview service is unavailable
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
