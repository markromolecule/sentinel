'use client';

import Image from 'next/image';
import { FEATURE_ITEMS } from '@/app/landing/_constants';
import type { FEATURE } from '@/app/landing/_constants';

// --- Main Component ---
export default function FeatureSection() {
    return (
        <section id="features" className="py-16 md:py-24 bg-[#0f0f10] relative overflow-hidden">
            <BackgroundGrid />

            <div className="container mx-auto px-6 relative z-10">
                <FeatureHeader />
                <FeatureGrid />
            </div>
        </section>
    );
}

// --- Sub Components ---
function FeatureHeader() {
    return (
        <div className="flex flex-col items-start text-left md:items-center md:text-center mb-12 md:mb-16 lg:sticky lg:top-24 lg:z-20 lg:bg-[#0f0f10] lg:py-6 lg:rounded-b-2xl lg:mb-24 lg:shadow-xl lg:border-b lg:border-white/5">
            <div className="inline-flex items-center gap-2 mb-6">
                <Image src="/icons/icon0.svg" alt="Sentinel" width={20} height={20} className="w-5 h-5" />
                <span className="text-base text-gray-400 font-medium">What you'll get</span>
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-5xl font-normal text-blue-200 mb-6 font-sans tracking-tight max-w-3xl leading-tight">
                We'll help you secure and monitor examinations with ease.
            </h2>
        </div>
    );
}

function FeatureGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURE_ITEMS.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
            ))}
        </div>
    );
}

function FeatureCard({ title, description, visual }: FEATURE) {
    return (
        <div className="group relative bg-[#131315] hover:bg-[#161619] border border-white/5 hover:border-white/10 rounded-3xl p-1 transition-all duration-300 overflow-hidden">
            <div className="relative h-64 bg-[#0f0f10] rounded-[20px] overflow-hidden border border-white/5 group-hover:border-white/10 transition-colors">
                <InnerGrid />
                {visual}
            </div>
            <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2 font-sans tracking-tight group-hover:text-blue-400 transition-colors">{title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                    {description}
                </p>
            </div>
        </div>
    );
}

// --- Background Components ---
function BackgroundGrid() {
    return (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size:40px_40px mask-linear-gradient(to_bottom,black_40%,transparent_100%) pointer-events-none"></div>
    );
}

function InnerGrid() {
    return (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-size:20px_20px opacity-20"></div>
    );
}
