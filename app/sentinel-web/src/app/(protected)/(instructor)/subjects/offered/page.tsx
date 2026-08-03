'use client';

import {
    findPermissionDeniedError,
    useDebounce,
    useEnrolledSubjectsQuery,
    useEnrollmentRequestsQuery,
    useServerPagination,
    useStableValue,
    useSubjectOfferingsQuery,
} from '@sentinel/hooks';
import { useState } from 'react';
import { PermissionDeniedState } from '@sentinel/ui';
import { createInstructorOfferedSubjectColumns } from './_components/instructor-offered-subject-columns';
import { InstructorOfferedSubjectsList } from './_components/instructor-offered-subjects-list';
import { SubjectPageShell } from '../_components/layout';

/**
 * InstructorOfferedSubjectsPage renders the offered subjects page for instructors,
 * wrapped in the SubjectPageShell layout.
 */
export default function InstructorOfferedSubjectsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);
    const { pagination, setPagination } = useServerPagination([debouncedSearch]);

    const {
        data: offeringsResponse,
        isLoading,
        isError,
        error: offeringsError,
    } = useSubjectOfferingsQuery({
        search: debouncedSearch,
        visibility: 'requestable',
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
    });
    const { data: enrolledSubjects = [], error: enrolledSubjectsError } =
        useEnrolledSubjectsQuery();
    const { data: enrollmentRequests = [], error: enrollmentRequestsError } =
        useEnrollmentRequestsQuery();

    const deniedError = findPermissionDeniedError([
        offeringsError,
        enrolledSubjectsError,
        enrollmentRequestsError,
    ]);
    const isViewDenied = Boolean(deniedError);
    const existingRequestStatusMap = useStableValue(() => {
        const next = new Map<string, 'APPROVED' | 'PENDING'>();

        enrolledSubjects.forEach((subject) => {
            next.set(subject.subject_offering_id, 'APPROVED');
        });

        enrollmentRequests.forEach((request) => {
            if (request.status === 'REJECTED' || next.has(request.subject_offering_id)) {
                return;
            }

            next.set(request.subject_offering_id, request.status);
        });

        return next;
    }, [enrolledSubjects, enrollmentRequests]);

    const columns = useStableValue(
        () =>
            createInstructorOfferedSubjectColumns({
                existingRequestStatusMap,
            }),
        [existingRequestStatusMap],
    );
    const offerings = Array.isArray(offeringsResponse)
        ? offeringsResponse
        : (offeringsResponse?.items ?? []);
    const totalCount = Array.isArray(offeringsResponse)
        ? offeringsResponse.length
        : (offeringsResponse?.pagination?.total ?? 0);
    const pageCount = Array.isArray(offeringsResponse)
        ? 1
        : (offeringsResponse?.pagination?.totalPages ?? 1);

    return (
        <SubjectPageShell
            title="Offered Subjects"
            description="Browse subjects offered for the active term and request assignment for your classes."
        >
            {isViewDenied ? (
                <PermissionDeniedState resourceName="subject offerings" className="h-[360px]" />
            ) : (
                <div className="relative">
                    <InstructorOfferedSubjectsList
                        offerings={offerings}
                        columns={columns}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        isLoading={isLoading}
                        pagination={pagination}
                        onPaginationChange={setPagination}
                        pageCount={pageCount}
                        totalCount={totalCount}
                        manualPagination
                    />

                    {isError && (
                        <div className="text-destructive bg-destructive/5 border-destructive/20 mt-4 flex h-32 items-center justify-center rounded-md border">
                            Error loading offered subjects. Contact support if this continues.
                        </div>
                    )}
                </div>
            )}
        </SubjectPageShell>
    );
}
