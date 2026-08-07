import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@sentinel/ui';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Main Application',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative grid min-h-screen bg-[#0f0f10] lg:grid-cols-2">
            {/* Glass Back Button - Visible on all screens */}
            <div className="absolute top-6 left-6 z-50">
                <Button
                    asChild
                    variant="ghost"
                    className="rounded-full border border-white/10 bg-white/5 px-4 text-gray-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                    <Link
                        href={process.env.NEXT_PUBLIC_LANDING_URL || 'https://sentinelph.tech'}
                        className="flex items-center gap-2 text-sm font-medium"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to website
                    </Link>
                </Button>
            </div>

            {/* Left Column - Decorative/Branding (Hidden on mobile) */}
            <div className="relative hidden flex-col items-center justify-center overflow-hidden border-r border-white/5 bg-[#131315] p-12 lg:flex">
                {/* Background Gradients/Visuals */}
                <div className="bg-size:40px_40px mask-linear-gradient(to_bottom,black_40%,transparent_100%) pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] opacity-50"></div>
                <div className="absolute top-1/4 left-1/4 h-96 w-96 animate-pulse rounded-full bg-blue-500/10 blur-3xl"></div>
                <div
                    className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-indigo-500/10 blur-3xl"
                    style={{ animationDelay: '2s' }}
                ></div>

                {/* Centered Content */}
                <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
                    <h1 className="animate-slide-up mb-8 bg-linear-to-b from-gray-400 to-blue-200 bg-clip-text font-sans text-5xl leading-tight font-medium tracking-tight text-transparent md:text-6xl">
                        Secure your next <br />
                        Examination
                    </h1>
                    <p
                        className="animate-slide-up mx-auto max-w-md text-lg leading-relaxed text-gray-400 md:text-xl"
                        style={{ animationDelay: '0.1s' }}
                    >
                        Ensure integrity in every assessment with our gaze tracking and audio
                        analysis technology.
                    </p>
                </div>
            </div>

            {/* Right Column - Form Content */}
            <div className="flex w-full flex-col items-center justify-start overflow-y-scroll p-4 sm:p-12 lg:h-screen lg:justify-center lg:p-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mx-auto flex w-full max-w-[440px] flex-col items-center py-12 lg:py-0">
                    {/* Mobile Logo */}
                    <div className="mb-8 flex w-full justify-center lg:hidden">
                        <div className="relative h-[min(90px,28vw)] w-[min(260px,80vw)]">
                            <Image
                                src="/icons/sentinel-logo.svg"
                                alt="Sentinel Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    <div className="w-full">{children}</div>
                </div>
            </div>
        </div>
    );
}
