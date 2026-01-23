'use client';

import Image from 'next/image';

interface SplashscreenProps {
    isVisible: boolean;
}

export function Splashscreen({ isVisible }: SplashscreenProps) {
    // Component stays mounted to allow for fade-out transition using styles

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f10] transition-all duration-700 ease-in-out ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none blur-xl'
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
            <div className="relative z-10 flex flex-col items-center gap-8 transform transition-transform duration-700">
                {/* Logo with Animation */}
                <div className="relative animate-fade-in group">
                    <div className="absolute inset-0 bg-[#323d8f]/30 blur-xl rounded-full animate-pulse group-hover:bg-[#323d8f]/50 transition-colors duration-500"></div>
                    <Image
                        src="/icons/sentinel-logo.svg"
                        alt="Sentinel Logo"
                        width={280}
                        height={80}
                        priority
                        className="relative animate-slide-up drop-shadow-2xl"
                    />
                </div>

                {/* Loading Animation - Brighter and Glowy */}
                <div className="flex gap-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ animationDelay: '0.2s' }}></div>
                </div>

                {/* Tagline */}
                <p className="text-gray-400 text-sm font-medium animate-slide-up tracking-wide opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
                    Smart Proctoring for Academic Integrity
                </p>
            </div>

            {/* Scanning Line Effect - Faster */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#323d8f] to-transparent animate-scan" style={{ animationDuration: '1.5s' }}></div>
            </div>
        </div>
    );
}
