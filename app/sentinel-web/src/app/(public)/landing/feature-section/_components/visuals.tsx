'use client';

export function GazeTrackingVisual() {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Abstract Eye Viz */}
            <div className="relative w-32 h-20 bg-blue-500/10 rounded-full border border-blue-500/20 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-blue-500/10 to-transparent animate-scan"></div>
                <div className="w-8 h-8 rounded-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse"></div>
            </div>
            {/* Scanning Lines */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-24 border-x border-blue-500/10 rounded-lg"></div>
            <div className="absolute top-8 right-12 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
        </div>
    );
}

export function AudioAnalysisVisual() {
    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Waveforms */}
            <div className="flex items-center gap-1 h-12">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="w-2 bg-linear-to-t from-blue-500/50 to-cyan-500/50 rounded-full animate-wave"
                        style={{
                            height: '40%',
                            animationDelay: `${i * 0.1}s`
                        }}
                    ></div>
                ))}
            </div>
        </div>
    );
}

export function AnalyticsVisual() {
    return (
        <div className="relative w-full h-full flex items-center justify-center px-8">
            {/* Chart Line */}
            <div className="absolute inset-0 flex items-center px-12">
                <svg className="w-full h-24 stroke-blue-500/50 fill-none stroke-2" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path d="M0,40 Q25,40 35,20 T70,30 T100,5" className="animate-draw-path" strokeDasharray="100" strokeDashoffset="100" />
                </svg>
            </div>
        </div>
    );
}
