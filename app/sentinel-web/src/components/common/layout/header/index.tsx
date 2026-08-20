'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@sentinel/ui';
import { NAV_ITEMS } from '@sentinel/shared/constants';
import { cn } from '@sentinel/ui';

export function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { scrollYProgress } = useScroll();

    useMotionValueEvent(scrollYProgress, 'change', (latest) => {
        setScrolled(latest > 0.02);
    });

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

    const getHomeUrl = () => {
        if (isProduction && process.env.NEXT_PUBLIC_LANDING_URL) {
            return process.env.NEXT_PUBLIC_LANDING_URL;
        }

        return '/';
    };

    return (
        <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed top-0 right-0 left-0 z-[70] w-full px-4 pt-3 text-white md:px-6 lg:px-8"
        >
            <div
                className={cn(
                    'mx-auto flex h-[4.5rem] w-full max-w-[90rem] items-center justify-between rounded-2xl border px-4 transition-all duration-300 md:px-6 lg:px-7',
                    scrolled
                        ? 'border-white/10 bg-[#080807]/88 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl'
                        : 'border-white/6 bg-black/30 backdrop-blur-md',
                )}
            >
                <Link href={getHomeUrl()} className="flex items-center" aria-label="Sentinel home">
                    <Image
                        src="/icons/sentinel-logo.svg"
                        alt="Sentinel Logo"
                        width={164}
                        height={34}
                        className="h-8 w-auto md:h-9"
                    />
                </Link>

                <nav className="hidden items-center gap-8 lg:flex">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                        >
                            {item.name}
                        </Link>
                    ))}
                    <Link
                        href="#faq"
                        className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                    >
                        FAQ
                    </Link>
                </nav>

                <div className="hidden items-center gap-4 lg:flex">
                    <Link
                        href={getAuthUrl('/auth/login')}
                        className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                    >
                        Login
                    </Link>
                    <Link
                        href={getAuthUrl('/auth/register')}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--sentinel-primary)] bg-[var(--sentinel-primary)] px-5 text-sm font-semibold text-white transition-all hover:bg-[var(--sentinel-primary-dark)]"
                    >
                        Register
                    </Link>
                </div>

                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <button
                            type="button"
                            className="flex size-10 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white lg:hidden"
                            aria-label="Open menu"
                        >
                            <Menu className="size-5" />
                        </button>
                    </SheetTrigger>
                    <SheetContent
                        side="right"
                        className="w-full border-white/5 bg-[#080807] p-6 text-white sm:max-w-sm"
                    >
                        <SheetTitle className="sr-only">Navigation</SheetTitle>
                        <div className="flex items-center justify-between">
                            <Image
                                src="/icons/sentinel-logo.svg"
                                alt="Sentinel Logo"
                                width={164}
                                height={34}
                                className="h-8 w-auto"
                            />
                            <button
                                type="button"
                                className="flex size-10 items-center justify-center rounded-lg border border-white/10"
                                onClick={() => setMobileMenuOpen(false)}
                                aria-label="Close menu"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <nav className="mt-12 grid gap-2">
                            {[...NAV_ITEMS, { name: 'FAQ', href: '#faq' }].map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-4 text-2xl font-black"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                        <div className="mt-8 grid gap-3">
                            <Link
                                href={getAuthUrl('/auth/login')}
                                className="rounded-lg border border-white/10 px-5 py-3 text-center font-bold"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                href={getAuthUrl('/auth/register')}
                                className="rounded-lg bg-[#323d8f] px-5 py-3 text-center font-black text-white transition-colors hover:bg-[#2a34a4]"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Register
                            </Link>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </motion.header>
    );
}
