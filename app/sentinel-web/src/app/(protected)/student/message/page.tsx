'use client';

import { MessagingPageClient, MessagingPageSkeleton } from '@/features/messaging';
import { Suspense } from 'react';

export default function StudentMessagePage() {
    return (
        <Suspense fallback={<MessagingPageSkeleton />}>
            <MessagingPageClient />
        </Suspense>
    );
}

