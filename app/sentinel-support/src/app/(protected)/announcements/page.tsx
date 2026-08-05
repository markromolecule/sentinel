'use client';

import { useActivePermissions } from '@sentinel/hooks';
import { Separator } from '@sentinel/ui';
import { AddAnnouncementDialog } from './_components/add-announcement-dialog';
import { AnnouncementsContainer } from './_components/announcements-container';
import { PageHeader } from '@sentinel/ui';

export default function AnnouncementsPage() {
    const { hasPermission } = useActivePermissions();
    const canCreateAnnouncement = hasPermission('announcement:create');

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6">
            <PageHeader
                title="Announcements"
                description="Manage system-wide announcements and notifications."
            >
                {canCreateAnnouncement ? <AddAnnouncementDialog /> : null}
            </PageHeader>

            <Separator />

            <AnnouncementsContainer />
        </div>
    );
}
