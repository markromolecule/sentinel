'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Smartphone, QrCode } from 'lucide-react';

export default function DownloadSection() {
    return (
        <section id="download" className="py-24 md:py-32 bg-[#0f0f10] relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-(--sentinel-primary)/15 rounded-full blur-[150px]"></div>
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size:40px_40px opacity-50"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 mb-8 bg-white/5 border border-white/10 rounded-full px-4 py-2 animate-fade-in">
                        <Smartphone className="w-4 h-4 text-blue-400" />
                        <span className="text-sm text-gray-400">Available on Android Devices</span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium bg-clip-text text-transparent bg-linear-to-b from-gray-300 to-blue-200 mb-6 animate-slide-up leading-tight tracking-tight">
                        Download Sentinel
                    </h2>

                    {/* Description */}
                    <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
                        Get started with secure exam monitoring. Scan the QR code below to download the app directly to your device.
                    </p>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center justify-center gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <div className="group relative bg-white p-4 rounded-3xl shadow-2xl transition-transform duration-300 hover:scale-105">
                            <div className="absolute inset-0 rounded-3xl bg-blue-500/20 blur-xl group-hover:blur-2xl transition-all opacity-50"></div>
                            <div className="relative bg-white rounded-2xl p-4 border border-gray-100">
                                <QrCode className="w-48 h-48 text-[#0f0f10]" strokeWidth={1.5} />
                            </div>

                            {/* Scanning Animation overlay */}
                            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan"></div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-400 font-medium">
                            Scan to install
                        </p>
                    </div>

                    {/* Trust Note */}
                    <p className="mt-10 text-sm text-gray-500 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                        Free to download • Secure installation
                    </p>
                </div>
            </div>
        </section>
    );
}
