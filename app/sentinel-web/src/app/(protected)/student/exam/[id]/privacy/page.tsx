'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Checkbox, Label } from '@sentinel/ui';
import { Camera, Eye, Mic, Monitor } from 'lucide-react';
import { StudentExamLoadingState } from '../_components/student-exam-loading-state';
import { StudentFlowShell } from '../_components/student-flow-shell';
import { useStudentExamStageGuard } from '../_hooks/use-student-exam-stage-guard';
import {
    buildStudentExamHref,
    patchStoredStudentExamFlow,
    readStoredStudentExamFlow,
} from '../_lib/student-exam-flow';
import {
    StudentFlowDisclosureList,
    StudentFlowFooterActions,
    StudentFlowPageHeader,
    StudentFlowPanel,
} from '../../_components/student-flow-primitives';
import { PRIVACY_POLICIES } from '@/app/(protected)/(instructor)/exams/[id]/preview/[sessionId]/_constants/preview-constants';

export default function StudentExamPrivacyPage() {
    const router = useRouter();
    const { examId, blockedState, configuration, isResolving } =
        useStudentExamStageGuard('privacy');
    const [hasConsented, setHasConsented] = useState(
        () => readStoredStudentExamFlow(examId).privacyAccepted,
    );

    if (isResolving) {
        return <StudentExamLoadingState />;
    }

    if (blockedState.isBlocked) {
        return (
            <StudentFlowShell
                maxWidthClassName="max-w-5xl"
                mainClassName="py-6 sm:py-8"
                contentClassName="my-auto"
            >
                <div className="flex min-h-full flex-col justify-center gap-6">
                    <StudentFlowPageHeader
                        title={blockedState.title ?? 'Exam Unavailable'}
                        description={
                            blockedState.message ?? 'This exam cannot be entered right now.'
                        }
                    />
                </div>
            </StudentFlowShell>
        );
    }

    const disclosures = [
        {
            label: 'Gaze Monitoring',
            icon: Eye,
            desc:
                configuration.aiRules.gaze_tracking || configuration.aiRules.face_detection
                    ? 'Active gaze tracking and identity verification will be used during this session.'
                    : 'Limited facial analysis is active for basic presence detection only.',
        },
        {
            label: 'Audio Environment',
            icon: Mic,
            desc: configuration.micRequired
                ? 'Room audio is monitored for unauthorized communication or prohibited voices.'
                : 'Microphone access is not required by the current proctoring policy.',
        },
        {
            label: 'Authorized Live Camera Inspection',
            icon: Camera,
            desc: configuration.cameraRequired
                ? 'During an active camera-required exam, an authorized proctor may view your camera live. This does not enable microphone publishing or recording.'
                : 'Live camera inspection is not active because this exam does not require a camera. Microphone publishing and recording remain excluded from this feature.',
        },
        {
            label: 'Flagged Frame Evidence',
            icon: Camera,
            desc: configuration.cameraRequired
                ? 'If a configured camera rule produces a reviewable signal, the system may capture one frame for reviewer context, retain it for up to seven days, and allow immediate reviewer deletion. This is not continuous audio or video recording.'
                : 'Automatic frame capture is inactive unless this exam enables a reviewable camera rule. Continuous audio or video recording is not used by this feature.',
        },
        {
            label: 'Platform Security',
            icon: Monitor,
            desc: configuration.webSecurity.full_screen_required
                ? 'Browser-level locks and tab-switching monitors are strictly enforced.'
                : 'Standard monitoring is active without browser lock enforcement.',
        },
    ];
    return (
        <StudentFlowShell
            maxWidthClassName="max-w-5xl"
            mainClassName="py-6 sm:py-8"
            contentClassName="my-auto"
        >
            <div className="flex min-h-full flex-col justify-center gap-6">
                <section className="space-y-4 border-b pb-5 sm:space-y-5 sm:pb-6">
                    <div className="flex items-center justify-end">
                        <span className="text-primary text-[11px] font-semibold tracking-[0.22em] uppercase">
                            Step 2 of 4
                        </span>
                    </div>

                    <StudentFlowPageHeader
                        title="Privacy & Consent"
                        description="Review what may be monitored, how it is protected, and confirm before the device checkup."
                    />
                </section>

                <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-start">
                    <StudentFlowPanel className="space-y-4">
                        <div className="space-y-2">
                            <h2 className="text-base font-semibold sm:text-lg">
                                Monitored signals
                            </h2>
                            <p className="text-muted-foreground text-sm leading-6 sm:text-[15px]">
                                Only the signals required by your institution are requested for this
                                exam session.
                            </p>
                        </div>

                        <StudentFlowDisclosureList items={disclosures} />

                        <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
                            <p className="text-blue-800/80 dark:text-blue-200/80">
                                <span className="font-semibold">Note:</span> Consent is required
                                before you can continue to the device readiness step.
                            </p>
                        </div>
                    </StudentFlowPanel>

                    <StudentFlowPanel className="space-y-4">
                        <div className="space-y-2">
                            <h2 className="text-base font-semibold sm:text-lg">Policies & terms</h2>
                            <p className="text-muted-foreground text-sm leading-6 sm:text-[15px]">
                                Review the key policies before confirming your consent.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {PRIVACY_POLICIES.map((policy) => (
                                <div
                                    key={policy.title}
                                    className="border-border/60 bg-muted/20 rounded-2xl border px-4 py-3"
                                >
                                    <p className="text-primary text-sm font-semibold">
                                        {policy.title}
                                    </p>
                                    <div className="text-muted-foreground mt-1.5 text-sm leading-6">
                                        {policy.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="border-border/60 bg-muted/20 rounded-2xl border p-4">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="student-privacy-consent"
                                    checked={hasConsented}
                                    onCheckedChange={(checked) => {
                                        const accepted = checked === true;
                                        setHasConsented(accepted);
                                        if (!accepted) {
                                            patchStoredStudentExamFlow(examId, {
                                                privacyAccepted: false,
                                                checkupCompleted: false,
                                                mediaPipeActivatedAt: null,
                                                mediaPipeCalibrationCompletedAt: null,
                                                mediaPipeActivationSource: null,
                                                mediaPipeCalibrationProfile: null,
                                            });
                                        } else {
                                            patchStoredStudentExamFlow(examId, {
                                                privacyAccepted: true,
                                            });
                                        }
                                    }}
                                    className="mt-1"
                                />
                                <Label
                                    htmlFor="student-privacy-consent"
                                    className="text-muted-foreground cursor-pointer text-sm leading-6 font-normal sm:text-[15px]"
                                >
                                    I agree to this exam&apos;s{' '}
                                    <Link
                                        href="/terms-of-service"
                                        className="text-primary font-semibold underline underline-offset-4"
                                    >
                                        policies and terms
                                    </Link>
                                    .
                                </Label>
                            </div>
                        </div>
                    </StudentFlowPanel>
                </section>

                <StudentFlowFooterActions
                    primaryLabel="Continue to Checkup"
                    primaryDisabled={!hasConsented}
                    primaryOnClick={() => router.push(buildStudentExamHref(examId, 'checkup'))}
                    secondaryLabel="Previous Step"
                    secondaryHref={buildStudentExamHref(examId, 'instruction')}
                />
            </div>
        </StudentFlowShell>
    );
}
