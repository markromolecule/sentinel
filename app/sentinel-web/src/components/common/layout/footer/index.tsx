import Image from 'next/image';
import Link from 'next/link';
import { SOCIAL_LINKS } from '@sentinel/shared/constants';

const FOOTER_COLUMNS = [
    {
        title: 'Product',
        links: [
            { name: 'Features', href: '#features' },
            { name: 'How it Works', href: '#features' },
            { name: 'Download', href: '/download' },
        ],
    },
    {
        title: 'Resources',
        links: [
            { name: 'Documentation', href: '/guide' },
            { name: 'Guides', href: '/guide/rubric' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { name: 'Privacy Policy', href: '/privacy-policy' },
            { name: 'Terms of Service', href: '/terms-of-service' },
        ],
    },
];

export function Footer() {
    return (
        <footer className="relative isolate border-t border-white/8 bg-[#080807] pt-16 pb-8 text-[#f6f4ee]">
            <div className="mx-auto w-full max-w-[90rem] px-4 md:px-6 lg:px-8">
                {/* Main row */}
                <div className="grid gap-12 pb-14 lg:grid-cols-[1fr_2fr]">
                    {/* Brand */}
                    <div className="flex flex-col items-start gap-5">
                        <Link
                            href="/"
                            aria-label="Sentinel home"
                            className="inline-flex items-start"
                        >
                            <Image
                                src="/icons/dark-sentinel-logo.svg"
                                alt="Sentinel"
                                width={384}
                                height={92}
                                className="-ml-3 block h-10 w-auto"
                            />
                        </Link>
                        <p className="max-w-[18rem] text-sm leading-6 text-white/40">
                            A mobile and web-based examination security system with gaze and audio
                            monitoring. Built for educators.
                        </p>
                        <div className="flex gap-2.5">
                            {SOCIAL_LINKS.map((social) => (
                                <Link
                                    key={social.name}
                                    href={social.href}
                                    aria-label={social.name}
                                    className="flex size-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition-colors hover:border-white/20 hover:text-white"
                                >
                                    <social.icon className="size-4" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    <div className="grid grid-cols-3 gap-8">
                        {FOOTER_COLUMNS.map((col) => (
                            <div key={col.title}>
                                <h3 className="mb-5 text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">
                                    {col.title}
                                </h3>
                                <ul className="grid gap-3.5">
                                    {col.links.map((link) => (
                                        <li key={link.name}>
                                            <Link
                                                href={link.href}
                                                className="text-sm text-white/50 transition-colors hover:text-white"
                                            >
                                                {link.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="flex flex-col gap-2 border-t border-white/8 pt-6 text-sm text-white/30 md:flex-row md:items-center md:justify-between">
                    <p>© {new Date().getFullYear()} Sentinel. All rights reserved.</p>
                    <p>Stay secure with Sentinel.</p>
                </div>
            </div>
        </footer>
    );
}
