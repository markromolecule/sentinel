'use client';

import type { ReactNode } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup, ScrollArea, cn } from '@sentinel/ui';
import { ExamAttemptDesktopQuestionNavigationRail } from './exam-attempt-desktop-question-navigation-rail';
import { ExamAttemptMobileQuestionNavigation } from './exam-attempt-mobile-question-navigation';
import { ExamAttemptScrollableContentPane } from './exam-attempt-scrollable-content-pane';

type ExamAttemptWorkspaceProps = {
    questionRail: ReactNode;
    passagePanel?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
};

export function ExamAttemptWorkspace({
    questionRail,
    passagePanel,
    children,
    footer,
}: ExamAttemptWorkspaceProps) {
    const questionContentPane = (paddingClassName: string) => (
        <ExamAttemptScrollableContentPane
            paddingClassName={paddingClassName}
            hasFooter={Boolean(footer)}
        >
            {children}
        </ExamAttemptScrollableContentPane>
    );

    const passageContentPane = (paddingClassName: string) => (
        <ScrollArea className="h-full w-full" type="always">
            <div className={cn('min-w-0', paddingClassName)}>{passagePanel}</div>
        </ScrollArea>
    );

    return (
        <>
            <ExamAttemptMobileQuestionNavigation questionRail={questionRail} />

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <ExamAttemptDesktopQuestionNavigationRail questionRail={questionRail} />

                <div className="min-w-0 flex-1">
                    {passagePanel ? (
                        <>
                            {/* Phones: keep the passage out of the workspace and open it in a sheet. */}
                            <div className="flex h-full min-h-0 flex-col md:hidden">
                                <div className="min-h-0 flex-1">
                                    {questionContentPane('min-h-full px-4 py-4 sm:px-6 sm:py-5')}
                                </div>
                            </div>

                            {/* Tablets and larger screens: show the resizable passage and question panes. */}
                            <div className="hidden h-full min-h-0 min-w-0 md:block">
                                <ResizablePanelGroup
                                    id="exam-attempt-layout"
                                    orientation="horizontal"
                                    className="h-full min-h-0 min-w-0"
                                    resizeTargetMinimumSize={{ fine: 24, coarse: 36 }}
                                >
                                    <ResizablePanel
                                        id="exam-attempt-passage-panel"
                                        defaultSize="50%"
                                        minSize="25%"
                                        maxSize="65%"
                                        className="min-w-0 overflow-hidden"
                                    >
                                        <div className="border-border/60 h-full min-h-0 min-w-0 overflow-hidden border-r">
                                            {passageContentPane(
                                                'min-h-full min-w-0 px-6 py-5 lg:px-8',
                                            )}
                                        </div>
                                    </ResizablePanel>
                                    <ResizableHandle withHandle />
                                    <ResizablePanel
                                        id="exam-attempt-question-panel"
                                        defaultSize="50%"
                                        minSize="35%"
                                        className="min-w-0 overflow-hidden"
                                    >
                                        <div className="h-full min-h-0 min-w-0 overflow-hidden">
                                            {questionContentPane('min-h-full px-6 py-5 lg:px-8')}
                                        </div>
                                    </ResizablePanel>
                                </ResizablePanelGroup>
                            </div>
                        </>
                    ) : (
                        questionContentPane('min-h-full px-4 py-4 sm:px-6 sm:py-5 lg:px-8')
                    )}
                </div>
            </div>

            {footer ? (
                <div className="border-border/60 border-t px-4 py-4 sm:px-6 lg:px-8">{footer}</div>
            ) : null}
        </>
    );
}
