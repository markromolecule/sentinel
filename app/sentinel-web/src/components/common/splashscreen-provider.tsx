'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Splashscreen } from './splashscreen';
import { SplashscreenProviderProps } from './_constants';

export function SplashscreenProvider({ children }: SplashscreenProviderProps) {
    const pathname = usePathname();
    const isAuthPage = pathname?.startsWith('/auth');
    const [showSplash, setShowSplash] = useState(!isAuthPage);

    useEffect(() => {
        if (isAuthPage) {
            setShowSplash(false);
            return;
        }

        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 2200);

        return () => clearTimeout(timer);
    }, [isAuthPage]);

    if (isAuthPage) {
        return <>{children}</>;
    }

    return (
        <>
            <Splashscreen isVisible={showSplash} />
            <div
                className={`transition-opacity duration-500 ${!showSplash ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                {children}
            </div>
        </>
    );
}
