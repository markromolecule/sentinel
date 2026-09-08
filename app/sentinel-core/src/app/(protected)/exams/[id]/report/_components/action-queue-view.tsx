'use client';

import { useState } from 'react';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import { Button, Separator } from '@sentinel/ui';
import { ShieldAlert, ClipboardList, RotateCcw } from 'lucide-react';
import { ActionQueuePanel } from './action-queue-panel';
import { RemediationGrantDialog } from './remediation-grant-dialog';

type ActionQueueType = 'review' | 'makeup' | 'retake';

type ActionQueueViewProps = {
    actionQueues: {
        review: ExamReportActionItem[];
        makeup: ExamReportActionItem[];
        retake: ExamReportActionItem[];
    };
    activeActionId: string | null;
    examId: string;
    sectionOptions: readonly (readonly [string, string])[];
    onGrantOverride: (
        itemOrItems: ExamReportActionItem | ExamReportActionItem[],
        type: 'MAKEUP' | 'RETAKE',
        availableFrom: string,
        availableUntil: string,
        notes: string | null,
    ) => Promise<void>;
};

/**
 * Renders the dedicated Action Queue view in sentinel-core (/exams/[id]/report?section=queue).
 * Features tabs for Review, Makeup, and Retake, alongside multi-select and batch remediation.
 */
export function ActionQueueView({
    actionQueues,
    activeActionId,
    examId,
    sectionOptions,
    onGrantOverride,
}: ActionQueueViewProps) {
    const [activeQueue, setActiveQueue] = useState<ActionQueueType>('makeup');
    const [actionPages, setActionPages] = useState<Record<ActionQueueType, number>>({
        review: 1,
        makeup: 1,
        retake: 1,
    });
    const [remediationTarget, setRemediationTarget] = useState<{
        items: ExamReportActionItem[];
        type: 'MAKEUP' | 'RETAKE';
    } | null>(null);

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-xl font-semibold">Action Queue</h2>
                <p className="text-muted-foreground text-sm">
                    Review, makeup, and retake queues stay on one page and paginate cleanly for
                    large classes.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    variant={activeQueue === 'review' ? 'default' : 'outline'}
                    onClick={() => setActiveQueue('review')}
                    className="gap-2"
                >
                    <ShieldAlert className="h-4 w-4" />
                    Needs Review ({actionQueues.review.length})
                </Button>
                <Button
                    variant={activeQueue === 'makeup' ? 'default' : 'outline'}
                    onClick={() => setActiveQueue('makeup')}
                    className="gap-2"
                >
                    <ClipboardList className="h-4 w-4" />
                    Needs Makeup ({actionQueues.makeup.length})
                </Button>
                <Button
                    variant={activeQueue === 'retake' ? 'default' : 'outline'}
                    onClick={() => setActiveQueue('retake')}
                    className="gap-2"
                >
                    <RotateCcw className="h-4 w-4" />
                    Needs Retake ({actionQueues.retake.length})
                </Button>
            </div>

            <Separator />

            {activeQueue === 'review' && (
                <ActionQueuePanel
                    key="review"
                    title="Needs Review"
                    description="Use this queue for students with unresolved or high-severity incidents."
                    icon={<ShieldAlert className="h-5 w-5 text-red-500" />}
                    items={actionQueues.review}
                    page={actionPages.review}
                    onPageChange={(page) =>
                        setActionPages((current) => ({ ...current, review: page }))
                    }
                    activeActionId={activeActionId}
                    examId={examId}
                    sectionOptions={sectionOptions}
                    isSelectable={false}
                />
            )}

            {activeQueue === 'makeup' && (
                <ActionQueuePanel
                    key="makeup"
                    title="Needs Makeup"
                    description="Absent students remain here until a makeup window is granted."
                    icon={<ClipboardList className="h-5 w-5 text-amber-500" />}
                    items={actionQueues.makeup}
                    actionLabel="Grant Makeup"
                    onAction={(item) => {
                        setRemediationTarget({ items: [item], type: 'MAKEUP' });
                    }}
                    onBatchAction={(items) => {
                        setRemediationTarget({ items, type: 'MAKEUP' });
                    }}
                    page={actionPages.makeup}
                    onPageChange={(page) =>
                        setActionPages((current) => ({ ...current, makeup: page }))
                    }
                    activeActionId={activeActionId}
                    examId={examId}
                    sectionOptions={sectionOptions}
                    isSelectable={true}
                />
            )}

            {activeQueue === 'retake' && (
                <ActionQueuePanel
                    key="retake"
                    title="Needs Retake"
                    description="Students below the passing score stay here until the instructor grants a retake."
                    icon={<RotateCcw className="h-5 w-5 text-blue-500" />}
                    items={actionQueues.retake}
                    actionLabel="Grant Retake"
                    onAction={(item) => {
                        setRemediationTarget({ items: [item], type: 'RETAKE' });
                    }}
                    onBatchAction={(items) => {
                        setRemediationTarget({ items, type: 'RETAKE' });
                    }}
                    page={actionPages.retake}
                    onPageChange={(page) =>
                        setActionPages((current) => ({ ...current, retake: page }))
                    }
                    activeActionId={activeActionId}
                    examId={examId}
                    sectionOptions={sectionOptions}
                    isSelectable={true}
                />
            )}

            <RemediationGrantDialog
                isOpen={remediationTarget !== null}
                onClose={() => setRemediationTarget(null)}
                items={remediationTarget?.items ?? []}
                item={remediationTarget?.items?.[0] ?? null}
                overrideType={remediationTarget?.type ?? null}
                onConfirm={onGrantOverride}
                isLoading={activeActionId !== null}
            />
        </div>
    );
}
