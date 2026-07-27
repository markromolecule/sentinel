'use client';

import { Button } from '@sentinel/ui';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function StudentDetailHeader() {
    const router = useRouter();

    return (
        <div className="flex items-center justify-between">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-muted-foreground hover:text-foreground h-9"
            >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Monitoring
            </Button>
        </div>
    );
}
