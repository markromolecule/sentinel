'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

export default function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0f0f10]">
            {/* Abstract Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Static Gradient Circle 1 */}
                <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-(--sentinel-primary)/10 rounded-full blur-[120px] mix-blend-screen"></div>
                {/* Static Gradient Circle 2 */}
                <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
                {/* Center Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-(--sentinel-primary)/5 rounded-full blur-[100px] opacity-30"></div>

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size:40px_40px mask-linear-gradient(to_bottom,black_40%,transparent_100%)"></div>
            </div>

            {/* Content Container */}
            <div className="container mx-auto px-6 py-20 relative z-10">
                <div className="max-w-5xl mx-auto text-center mt-24">
                    {/* Headline */}
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium bg-clip-text text-transparent bg-linear-to-b from-gray-400 to-blue-200 mb-8 animate-slide-up leading-tight tracking-tight font-sans">
                        Secure your next <br className="hidden md:block" />
                        Examination
                    </h1>

                    {/* Subtext */}
                    <p className="text-lg md:text-xl text-gray-400 mb-16 max-w-2xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
                        A mobile and web-based examination security system with gaze and audio monitoring.
                        <span className="border-b border-gray-400/50 mx-2">Built for educators,</span>
                        ensuring fair testing everywhere.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <Button
                            asChild
                            size="lg"
                            variant="premium-3d"
                            className="h-14 px-8 text-base font-semibold group"
                        >
                            <Link href="#download" className="flex items-center gap-2">
                                Download Sentinel
                                <ArrowUpRight className="w-5 h-5 ml-1 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                            </Link>
                        </Button>

                        <Button
                            asChild
                            size="lg"
                            variant="premium-dark"
                            className="h-14 px-8 text-base font-medium backdrop-blur-sm group"
                        >
                            <Link href="#features" className="flex items-center gap-2">
                                View Features
                                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </div>

                    {/* Trust Indicators */}
                    <div className="mt-16 pt-8 border-t border-white/5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                        <p className="text-sm text-gray-500 font-medium">
                            Trusted by educational institutions • Real-time monitoring • Secure
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-[#0f0f10] to-transparent pointer-events-none"></div>
        </section>
    );
}
