import React from 'react';
import WhiteSentinelLogo from '@/assets/images/white-sentinel-logo.svg';
import LightSentinelLogo from '@/assets/images/light-sentinel-logo.svg';
import SentinelLogo from '@/assets/images/sentinel-logo.svg';

interface LogoProps {
     variant?: 'white' | 'light' | 'default';
     width?: number;
     height?: number;
}

export const Logo = ({ variant = 'white', width = 256, height = 61 }: LogoProps) => {
     const LogoComponent =
          variant === 'white' ? WhiteSentinelLogo :
               variant === 'light' ? LightSentinelLogo :
                    SentinelLogo;

     return <LogoComponent width={width} height={height} />;
};
