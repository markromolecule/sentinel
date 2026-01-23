'use client';

import { useEffect, useState } from 'react';
import { Splashscreen } from './splashscreen';

interface SplashscreenProviderProps {
    children: React.ReactNode;
}

export function SplashscreenProvider({ children }: SplashscreenProviderProps) {
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 2200);

        return () => clearTimeout(timer);
    }, []);

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
