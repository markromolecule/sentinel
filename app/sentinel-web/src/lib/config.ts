/**
 * Environment configuration for the Sentinel application.
 * Automatically detects development vs production environment.
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Domain configuration
const PRODUCTION_DOMAIN = 'sentinelph.tech';
const APP_SUBDOMAIN = `app.${PRODUCTION_DOMAIN}`;

export const config = {
    // Frontend URLs
    appUrl: isDevelopment
        ? 'http://localhost:3000'
        : `https://${APP_SUBDOMAIN}`,

    // Backend API URLs
    apiUrl: isDevelopment
        ? 'http://localhost:3001'
        : process.env.NEXT_PUBLIC_API_URL || `https://api.${PRODUCTION_DOMAIN}`,

    // Domain info
    domain: PRODUCTION_DOMAIN,
    appSubdomain: APP_SUBDOMAIN,

    // Environment flags
    isDevelopment,
    isProduction: !isDevelopment,
};

export default config;
