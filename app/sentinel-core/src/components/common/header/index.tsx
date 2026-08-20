'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@sentinel/ui';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@sentinel/ui';
import { CORE_NAV_ITEMS } from '@sentinel/shared/constants';

interface NavItem {
    name: string;
    href: string;
}

export function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Configure URLs for production subdomain routing
    const isProduction =
        process.env.NODE_ENV === 'production' &&
        Boolean(
            process.env.NEXT_PUBLIC_CORE_URL &&
                !process.env.NEXT_PUBLIC_CORE_URL.includes('localhost') &&
                !process.env.NEXT_PUBLIC_CORE_URL.includes('127.0.0.1'),
        );

    const getAuthUrl = (path: string) => {
        if (isProduction && process.env.NEXT_PUBLIC_CORE_URL) {
            return `${process.env.NEXT_PUBLIC_CORE_URL}${path}`;
        }
        return path;
    };

    return (
        <header className="animate-fade-in absolute top-0 right-0 left-0 z-50 pt-4 md:pt-6 lg:pt-10">
            <div className="container mx-auto px-6 lg:px-8">
                <div className="flex w-full items-center justify-between">
                    {/* Logo (Left side) */}
                    <div className="flex flex-1 justify-start lg:flex-none">
                        <Link href="/" className="group -ml-5 flex items-center">
                            <div className="relative aspect-120/60 h-20 w-auto transition-all duration-300 md:h-26 lg:h-32">
                                <Image
                                    src="/icons/sentinel-logo.svg"
                                    alt="Sentinel Logo"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </Link>
                    </div>

                    {/* Right Side Actions */}
                    <div className="hidden lg:flex lg:justify-self-end">
                        <div className="flex shrink-0 items-center gap-3 rounded-full border border-white/8 bg-white/3 px-4 py-3 shadow-lg backdrop-blur-md">
                            <Button
                                asChild
                                variant="ghost"
                                className="rounded-full text-gray-300 hover:bg-white/5 hover:text-white"
                            >
                                <Link href={getAuthUrl('/auth/login')}>Administrator</Link>
                            </Button>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <button className="p-2 text-white lg:hidden" aria-label="Toggle menu">
                                <Menu size={24} />
                            </button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="w-[300px] border-white/10 bg-[#0f0f10]/95 text-white backdrop-blur-xl"
                        >
                            <SheetTitle className="sr-only">Administration Menu</SheetTitle>
                            <nav className="mt-8 flex flex-col gap-2">
                                {CORE_NAV_ITEMS.map((item: NavItem) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className="rounded-xl px-4 py-3 text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        {item.name}
                                    </Link>
                                ))}
                                <div className="my-6 h-px bg-white/10" />
                                <div className="flex flex-col gap-4">
                                    <Button
                                        asChild
                                        className="h-12 w-full rounded-xl bg-[#323d8f] font-medium text-white hover:bg-[#323d8f]/90"
                                    >
                                        <Link
                                            href={getAuthUrl('/auth/login')}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                            Administrator Login
                                        </Link>
                                    </Button>
                                </div>
                            </nav>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
