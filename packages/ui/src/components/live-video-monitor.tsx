'use client';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '../lib/utils';

export type LiveVideoMonitorState =
    | 'idle'
    | 'requesting'
    | 'waiting_for_student'
    | 'connecting'
    | 'live'
    | 'reconnecting'
    | 'stopping'
    | 'ended'
    | 'failed';

export type LiveVideoMonitorProps = {
    state: LiveVideoMonitorState;
    reason?: string | null;
    connectionQuality?: string | null;
    videoRef: (element: HTMLVideoElement | null) => void;
    onStart: () => void;
    onStop: () => void;
    onRetry: () => void;
    disabledExplanation?: string | null;
    waitingProgress?: string | null;
    className?: string;
};

function getStatusLabel(state: LiveVideoMonitorState, reason?: string | null) {
    if (state === 'idle') return 'Ready for live camera inspection';
    if (state === 'requesting') return 'Requesting live inspection';
    if (state === 'waiting_for_student') return 'Waiting for student camera';
    if (state === 'connecting') return 'Connecting to live camera';
    if (state === 'live') return 'LIVE';
    if (state === 'reconnecting') return 'Reconnecting live camera';
    if (state === 'stopping') return 'Stopping live view';
    if (state === 'ended') return 'Live view ended';

    // Bounded reason codes
    if (reason === 'PERMISSION_DENIED') return 'Live view denied';
    if (reason === 'CAPACITY_REACHED') return 'Live view capacity reached';
    if (reason === 'CONFLICT') return 'Student is currently under live inspection by another proctor';
    if (reason === 'TIMEOUT') return 'Student connection timed out';
    if (reason === 'NO_LIVE_CAMERA_TRACK') return 'Student camera not ready';
    if (reason === 'LIVEKIT_CONNECT_FAILED') return 'Student live connection failed';
    if (reason === 'LIVEKIT_PUBLISH_FAILED') return 'Student camera publication failed';
    if (reason === 'LIVEKIT_RUNTIME_LOST') return 'Student connection lost';
    if (reason === 'CONNECT_FAILED') return 'Failed to connect viewer';
    if (reason === 'UNEXPECTED_TRACK') return 'Unexpected track received';

    return 'Live view unavailable';
}

/**
 * Accessible, provider-neutral live video monitor presentation.
 */
export function LiveVideoMonitor({
    state,
    reason,
    connectionQuality,
    videoRef,
    onStart,
    onStop,
    onRetry,
    disabledExplanation,
    waitingProgress,
    className,
}: LiveVideoMonitorProps) {
    const isBusy = [
        'requesting',
        'waiting_for_student',
        'connecting',
        'reconnecting',
        'stopping',
    ].includes(state);
    const canStart = state === 'idle' && !disabledExplanation;
    const canStop = ['waiting_for_student', 'connecting', 'live', 'reconnecting'].includes(state);
    const canRetry = state === 'failed' || state === 'ended';
    const statusLabel = getStatusLabel(state, reason);
    const displayText = waitingProgress ?? disabledExplanation ?? statusLabel;

    return (
        <Card
            className={cn(
                'border-border/50 flex flex-col gap-3 rounded-xl p-4 shadow-sm',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold">Live Feed Monitor</h3>
                <Badge
                    variant={state === 'live' ? 'default' : 'outline'}
                    className={cn(
                        'h-6 px-2 text-[11px]',
                        state === 'live' ? 'bg-red-600 text-white' : 'text-muted-foreground',
                    )}
                >
                    {statusLabel}
                </Badge>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-lg border bg-neutral-950">
                <video
                    ref={videoRef}
                    muted
                    autoPlay
                    playsInline
                    className={cn('h-full w-full object-cover', state !== 'live' && 'opacity-40')}
                    aria-label="Authorized live camera view"
                />
                {state !== 'live' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4 text-center text-sm text-white/80">
                        {displayText}
                    </div>
                ) : null}
            </div>

            <div role="status" aria-live="polite" className="text-muted-foreground text-xs">
                {state === 'live' ? 'Live camera view is active.' : displayText}
            </div>

            {state === 'live' && connectionQuality ? (
                <p className="text-muted-foreground text-xs">
                    Connection quality: {connectionQuality}
                </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
                {canStart ? (
                    <Button type="button" onClick={onStart} disabled={isBusy}>
                        Start live view
                    </Button>
                ) : null}
                {canStop ? (
                    <Button type="button" variant="outline" onClick={onStop}>
                        Stop live view
                    </Button>
                ) : null}
                {canRetry ? (
                    <Button type="button" variant="outline" onClick={onRetry}>
                        Retry live view
                    </Button>
                ) : null}
            </div>
        </Card>
    );
}
