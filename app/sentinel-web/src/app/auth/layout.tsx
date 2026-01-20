import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
    title: "Sentinel | Main Application",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-[#0f0f10] relative">
            {/* Glass Back Button - Visible on all screens */}
            <div className="absolute top-6 left-6 z-50">
                <Button asChild variant="ghost" className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 hover:text-white backdrop-blur-sm transition-all rounded-full px-4">
                    <Link href="/" className="flex items-center gap-2 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" />
                        Back to website
                    </Link>
                </Button>
            </div>

            {/* Left Column - Decorative/Branding (Hidden on mobile) */}
            <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-[#131315] border-r border-white/5 relative overflow-hidden">
                {/* Background Gradients/Visuals */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size:40px_40px mask-linear-gradient(to_bottom,black_40%,transparent_100%) pointer-events-none opacity-50"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* Centered Content */}
                <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
                    <div className="relative w-[340px] h-[120px] mb-2">
                        <Image
                            src="/icons/sentinel-logo.svg"
                            alt="Sentinel Logo"
                            fill
                            className="object-contain"
                        />
                    </div>

                    <h1 className="text-5xl md:text-6xl font-medium bg-clip-text text-transparent bg-linear-to-b from-gray-400 to-blue-200 mb-8 animate-slide-up leading-tight tracking-tight font-sans">
                        Secure your next <br />
                        Examination
                    </h1>
                    <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-md mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        Ensure integrity in every assessment with our gaze tracking and audio analysis technology.
                    </p>
                </div>
            </div>

            {/* Right Column - Form Content */}
            <div className="flex flex-col justify-start lg:justify-center items-center w-full p-4 sm:p-12 lg:p-24 overflow-y-auto lg:h-screen">
                <div className="w-full max-w-[440px] mx-auto py-12 lg:py-0 flex flex-col items-center">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 flex justify-center w-full">
                        <div className="relative w-[min(260px,80vw)] h-[min(90px,28vw)]">
                            <Image
                                src="/icons/sentinel-logo.svg"
                                alt="Sentinel Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    <div className="w-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
