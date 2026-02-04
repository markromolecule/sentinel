import { Github, Mail } from 'lucide-react';

// Header Navigation Items
export const NAV_ITEMS = [
    { name: 'Features', href: '#features' },
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'Compare', href: '#compare' },
    { name: 'Download', href: '#download' },
] as const;

// Footer
export const FOOTER_LINKS = {
    product: [
        { name: 'Features', href: '#features' },
        { name: 'How it Works', href: '#how-it-works' },
        { name: 'Download', href: '#download' },
    ],
    resources: [
        { name: 'Documentation', href: '#' },
        { name: 'Guides', href: '#guides' },
    ],
    legal: [
        { name: 'Privacy Policy', href: '#' },
        { name: 'Terms of Service', href: '#' },
    ],
};

export const SOCIAL_LINKS = [
    { name: 'GitHub', icon: Github, href: '#' },
    { name: 'Email', icon: Mail, href: 'mailto:hello@sentinelph.tech' },
];


// Splashscreen
export interface SplashscreenProviderProps {
    children: React.ReactNode;
}