'use client';

import { useParams } from 'next/navigation';
import { Button, Separator } from '@sentinel/ui';
import { RefreshCw } from 'lucide-react';
import { InstructorLobbyAdmissionPanel } from './_components/instructor-lobby-admission-panel';
import { useInstructorLobby } from './_hooks/use-instructor-lobby';

/**
 * InstructorLobbyPage renders the instructor controls for exam lobby admissions.
 */
export default function InstructorLobbyPage() {
    const params = useParams();
    const examId = params.id as string;
    const {
        lobbyAdmissionGroups,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        isUpdatingLobbyAdmissions,
        isFetching,
        refreshLobbyAdmissions,
        handleUpdateLobbyAdmissions,
    } = useInstructorLobby(examId);

    return (
        <div className="flex min-h-full flex-col space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {examId ? 'Exam Lobby' : 'Exam Lobby'}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Manage real-time student admissions and active attempts.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        void refreshLobbyAdmissions();
                    }}
                    disabled={isUpdatingLobbyAdmissions || isFetching}
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    {isFetching ? 'Refreshing...' : 'Refresh Lobby'}
                </Button>
            </div>
            <Separator />


            <InstructorLobbyAdmissionPanel
                lobbyAdmissionGroups={lobbyAdmissionGroups}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                isUpdatingLobbyAdmissions={isUpdatingLobbyAdmissions}
                onUpdateLobbyAdmissions={handleUpdateLobbyAdmissions}
            />
        </div>
    );
}
