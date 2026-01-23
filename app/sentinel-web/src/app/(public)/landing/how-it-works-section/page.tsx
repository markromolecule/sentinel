'use client';

import Image from 'next/image';
import { UserPlus, Smartphone, Shield, BarChart3, ChevronRight } from 'lucide-react';

const STEPS = [
    {
        number: '01',
        icon: UserPlus,
        title: 'Create Exam Session',
        description: 'Proctors set up exams for their institution and configure session details.',
    },
    {
        number: '02',
        icon: Smartphone,
        title: 'Assign Students',
        description: 'Enroll students into the session or import a masterlist for seamless participation.',
    },
    {
        number: '03',
        icon: Shield,
        title: 'Start Monitoring',
        description: 'Real-time gaze tracking, audio analysis, and flagging activate automatically during exams.',
    },
    {
        number: '04',
        icon: BarChart3,
        title: 'Review Results',
        description: 'Proctors review detailed reports, analytics, and flagged behaviors after each session.',
    },
];

export default function HowItWorksSection() {
    return (
        <section id="how-it-works" className="py-20 md:py-28 bg-[#0f0f10] relative overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size:40px_40px mask-linear-gradient(to_bottom,black_40%,transparent_100%) pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                {/* Section Header */}
                <div className="flex flex-col items-start text-left md:items-center md:text-center mb-16">
                    <div className="inline-flex items-center gap-2 mb-6">
                        <Image src="/icons/icon0.svg" alt="Sentinel" width={20} height={20} className="w-5 h-5" />
                        <span className="text-base text-gray-400 font-medium">How it works</span>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-normal text-blue-200 mb-6 font-sans tracking-tight max-w-3xl leading-tight">
                        Get started in minutes, not hours.
                    </h2>
                    <p className="text-lg text-gray-400 max-w-2xl">
                        Setting up Sentinel is quick and easy. Follow these simple steps to secure your examinations.
                    </p>
                </div>

                {/* Steps Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-12 max-w-6xl mx-auto">
                    {STEPS.map((step, index) => (
                        <StepCard key={index} {...step} isLast={index === STEPS.length - 1} />
                    ))}
                </div>

                {/* Connection Line (Desktop only) */}
                <div className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-px bg-linear-to-r from-transparent via-white/10 to-transparent -translate-y-20 pointer-events-none"></div>
            </div>
        </section>
    );
}

interface StepCardProps {
    number: string;
    icon: React.ElementType;
    title: string;
    description: string;
    isLast: boolean;
}

function StepCard({ number, icon: Icon, title, description, isLast }: StepCardProps) {
    return (
        <div className="group relative">
            {/* Card */}
            <div className="relative bg-[#131315] hover:bg-[#161619] border border-white/5 hover:border-white/10 rounded-3xl p-6 transition-all duration-300 h-full">
                {/* Number Badge */}
                <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-bold text-white/10 group-hover:text-white/20 transition-colors">
                        {number}
                    </span>
                    <div className="w-12 h-12 rounded-2xl bg-(--sentinel-primary)/10 border border-(--sentinel-primary)/20 flex items-center justify-center group-hover:bg-(--sentinel-primary)/20 transition-colors">
                        <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-3 font-sans tracking-tight group-hover:text-blue-400 transition-colors">
                    {title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Arrow connector (hidden on mobile, shown on desktop except last) */}
            {!isLast && (
                <div className="hidden lg:flex absolute -right-10 top-1/2 -translate-y-1/2 z-10">
                    <ChevronRight className="w-8 h-8 text-blue-500/40" strokeWidth={1} />
                </div>
            )}
        </div>
    );
}
