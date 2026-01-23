import Image from 'next/image';

interface SplashscreenProps {
    isVisible: boolean;
}

export function Splashscreen({ isVisible }: SplashscreenProps) {
    // Component stays mounted to allow for fade-out transition using styles

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f10] transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Animated Gradient Circles */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#323d8f]/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '0.5s' }}></div>

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size:40px_40px"></div>
            </div>

            {/* Logo Container */}
            <div className="relative z-10 flex flex-col items-center gap-8">
                {/* Logo with Animation */}
                <div className="relative animate-fade-in">
                    <div className="absolute inset-0 bg-[#323d8f]/30 blur-xl rounded-full animate-pulse"></div>
                    <Image
                        src="/icons/sentinel-logo.svg"
                        alt="Sentinel Logo"
                        width={280}
                        height={80}
                        priority
                        className="relative animate-slide-up"
                    />
                </div>

                {/* Loading Animation */}
                <div className="flex gap-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <div className="w-2 h-2 bg-[#323d8f] rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-[#323d8f] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-[#323d8f] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>

                {/* Tagline */}
                <p className="text-gray-400 text-sm font-medium animate-fade-in tracking-wide" style={{ animationDelay: '0.5s' }}>
                    Smart Proctoring for Academic Integrity
                </p>
            </div>

            {/* Scanning Line Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#323d8f] to-transparent animate-scan"></div>
            </div>
        </div>
    );
}
