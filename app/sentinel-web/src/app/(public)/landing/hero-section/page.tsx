'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Smartphone } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

function DownloadButton({
    href,
    icon,
    label,
    inverted = false,
}: {
    href: string;
    icon?: ReactNode;
    label: string;
    inverted?: boolean;
}) {
    return (
        <Link
            href={href}
            className={[
                'group inline-flex min-h-16 items-center rounded-none border px-5 py-4 transition-all duration-200',
                icon ? 'gap-3' : 'gap-0',
                inverted
                    ? 'border-white/20 bg-transparent text-white hover:border-white/40 hover:bg-white/[0.06]'
                    : 'border-[var(--sentinel-primary)] bg-[var(--sentinel-primary)] text-white hover:bg-[var(--sentinel-primary-dark)]',
            ].join(' ')}
        >
            {icon ? (
                <span className="text-current transition-transform duration-300 group-hover:scale-105">
                    {icon}
                </span>
            ) : null}
            <span className="text-base font-semibold">{label}</span>
        </Link>
    );
}

export default function HeroSection() {
    const reduceMotion = useReducedMotion();
    const isProduction =
        process.env.NODE_ENV === 'production' &&
        Boolean(
            process.env.NEXT_PUBLIC_APP_URL &&
                !process.env.NEXT_PUBLIC_APP_URL.includes('localhost') &&
                !process.env.NEXT_PUBLIC_APP_URL.includes('127.0.0.1'),
        );

    const getAuthUrl = (path: string) => {
        if (isProduction && process.env.NEXT_PUBLIC_APP_URL) {
            return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
        }

        return path;
    };

    return (
        <section className="relative flex min-h-[100svh] overflow-hidden bg-[#050505] px-4 pt-28 pb-16 text-[#f5f7fb] md:px-6 md:pb-20 lg:px-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_34%,rgba(63,89,210,0.18),transparent_24%),radial-gradient(circle_at_68%_72%,rgba(35,48,112,0.16),transparent_22%),linear-gradient(180deg,#07070a_0%,#050505_55%,#030303_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050505] via-[#050505]/92 to-transparent" />
            <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.95, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute right-0 bottom-[-1px] left-0 z-20 h-32 overflow-hidden md:h-40"
            >
                <svg
                    viewBox="0 0 1440 260"
                    preserveAspectRatio="none"
                    className="h-full w-full"
                    aria-hidden="true"
                >
                    <defs>
                        <linearGradient id="hero-to-feature-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#0d111c" />
                            <stop offset="100%" stopColor="#11182a" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M0,122 C152,164 318,104 490,94 C676,84 774,168 976,168 C1170,168 1266,104 1440,84 L1440,260 L0,260 Z"
                        fill="url(#hero-to-feature-grad)"
                    />
                    <path
                        d="M0,148 C166,116 334,144 518,140 C706,136 854,108 1016,120 C1168,132 1288,144 1440,122"
                        fill="none"
                        stroke="rgba(17,24,42,0.28)"
                        strokeWidth="2"
                    />
                </svg>
            </motion.div>

            <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-end px-4 pb-10 md:px-6 md:pb-14 lg:px-8 lg:pb-16">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)] lg:items-end lg:gap-28">
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
                        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="flex min-h-[18rem] max-w-[42rem] flex-col justify-end"
                    >
                        <div className="space-y-4">
                            <p className="text-[clamp(1.9rem,3.4vw,3rem)] leading-[0.96] font-medium tracking-[-0.06em] whitespace-nowrap text-white/40">
                                Take your exam with
                            </p>
                            <p className="text-[clamp(4rem,7.6vw,7.2rem)] leading-[0.9] font-semibold tracking-[-0.09em] text-white">
                                SENTINEL
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0, y: 32 }}
                        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.82, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                        className="flex max-w-[34rem] flex-col gap-5 lg:ml-auto lg:justify-end"
                    >
                        <p className="max-w-[32rem] text-[1rem] leading-7 text-white/[0.86] md:text-[1.05rem]">
                            A mobile and web-based examination security system. Built for educators,
                            ensuring fair testing everywhere.
                        </p>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <DownloadButton
                                href="/download"
                                icon={<Smartphone className="size-5" />}
                                label="Download Sentinel"
                            />
                            <DownloadButton href="#features" label="View Features" inverted />
                        </div>

                        <Link
                            href={getAuthUrl('/auth/login')}
                            className="inline-flex items-center gap-2 text-sm font-medium text-white/[0.62] transition-colors hover:text-white"
                        >
                            Explore the system
                            <ArrowRight className="size-4" />
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
