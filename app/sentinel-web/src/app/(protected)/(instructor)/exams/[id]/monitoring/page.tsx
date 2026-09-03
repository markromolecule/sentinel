'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { MonitoringHeader, MonitoringStats, StudentList, LockedStudentsPanel } from '@/features/exams';
import { Spinner } from '@sentinel/ui';
import { useMonitoring } from './_hooks/use-monitoring';
import { RuntimeAccessDialogs } from './_components/runtime-access-dialogs';

export default function ExamMonitoringPage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const examId = params.id as string;

    const {
        monitoring,
        isLoading,
        isFetching,
        isError,
        filteredStudents,
        searchQuery,
        filterStatus,
        page,
        pageSize,
        isUpdatingAccess,
        pendingAction,
        isReopenDialogOpen,
        reopenMinutes,
        overridingStudentId,
        activeLifecycleActionId,
        setPendingAction,
        setIsReopenDialogOpen,
        setReopenMinutes,
        setPage,
        handleSearchChange,
        handleFilterChange,
        handleConfirmAction,
        handleSubmitReopen,
        handleAuthorizeReentry,
        handleLifecycleAction,
        refetch,
    } = useMonitoring(examId);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner className="text-primary size-8" />
            </div>
        );
    }

    if (isError || !monitoring) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
                <h2 className="text-foreground text-2xl font-bold">Monitoring Unavailable</h2>
                <p className="text-muted-foreground max-w-md text-sm">
                    The real monitoring session could not be loaded for this exam.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="flex min-h-full flex-col space-y-6">
                <div className="flex flex-col gap-4">
                    <MonitoringHeader
                        examTitle={monitoring.exam.title}
                        examSubject={monitoring.exam.subject}
                        runtimeAccess={monitoring.exam.runtimeAccess}
                        onRefresh={() => {
                            void refetch();
                        }}
                        isRefreshing={isFetching}
                        onLock={() => setPendingAction('lock')}
                        onReopen={() => {
                            setReopenMinutes('30');
                            setIsReopenDialogOpen(true);
                        }}
                        onReset={() => setPendingAction('reset')}
                        onClose={() => setPendingAction('close')}
                        isUpdatingAccess={isUpdatingAccess}
                    />

                    <MonitoringStats
                        stats={monitoring.stats}
                        lobbyAdmissions={monitoring.lobbyAdmissions}
                    />

                    <LockedStudentsPanel
                        examId={examId}
                        students={monitoring.students}
                        maxReconnectAttempts={monitoring.exam.maxReconnectAttempts}
                        onRefresh={() => refetch()}
                    />
                </div>

                <StudentList

                    students={filteredStudents}
                    selectedId={null}
                    onSelect={(student) => {
                        router.push(`${pathname}/${student.id}`);
                    }}
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                    filterStatus={filterStatus}
                    onFilterChange={handleFilterChange}
                    page={page}
                    pageSize={pageSize}
                    totalCount={filteredStudents.length}
                    onPageChange={setPage}
                    maxReconnectAttempts={monitoring.exam.maxReconnectAttempts}
                    overridingStudentId={overridingStudentId}
                    activeLifecycleActionId={activeLifecycleActionId}
                    onOverrideReconnect={(student) => {
                        void handleAuthorizeReentry(student.id, student.studentRecordId);
                    }}
                    onLifecycleAction={(student, action) => {
                        void handleLifecycleAction(student, action);
                    }}
                />
            </div>

            <RuntimeAccessDialogs
                pendingAction={pendingAction}
                setPendingAction={setPendingAction}
                isUpdatingAccess={isUpdatingAccess}
                handleConfirmAction={handleConfirmAction}
                isReopenDialogOpen={isReopenDialogOpen}
                setIsReopenDialogOpen={setIsReopenDialogOpen}
                reopenMinutes={reopenMinutes}
                setReopenMinutes={setReopenMinutes}
                handleSubmitReopen={handleSubmitReopen}
            />
        </>
    );
}
