import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Proxy for subdomain routing.
 * - In production: Redirects auth pages to app.sentinelph.tech
 * - In development: Works normally on localhost
 */
export function proxy(request: NextRequest) {
    const url = request.nextUrl.clone();
    const hostname = request.headers.get('host') || '';

    // Production domain configuration
    const PRODUCTION_DOMAIN = 'sentinelph.tech';
    const APP_SUBDOMAIN = `app.${PRODUCTION_DOMAIN}`;

    // Check if we're in production (not localhost)
    const isProduction = !hostname.includes('localhost') && !hostname.includes('127.0.0.1');

    if (isProduction) {
        // If user is on the root domain (www or naked) and accessing auth pages
        // Redirect them to the app subdomain
        const isRootDomain = hostname === PRODUCTION_DOMAIN ||
            hostname === `www.${PRODUCTION_DOMAIN}`;

        if (isRootDomain && url.pathname.startsWith('/auth')) {
            const redirectUrl = `https://${APP_SUBDOMAIN}${url.pathname}${url.search}`;
            return NextResponse.redirect(redirectUrl);
        }

        // If user is on the root domain and accessing protected routes
        // Redirect them to the app subdomain
        if (isRootDomain && (
            url.pathname.startsWith('/admin') ||
            url.pathname.startsWith('/proctor') ||
            url.pathname.startsWith('/student')
        )) {
            const redirectUrl = `https://${APP_SUBDOMAIN}${url.pathname}${url.search}`;
            return NextResponse.redirect(redirectUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/auth/:path*',
        '/admin/:path*',
        '/proctor/:path*',
        '/student/:path*',
    ],
};
