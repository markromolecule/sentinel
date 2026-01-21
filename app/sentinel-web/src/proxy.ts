import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const url = request.nextUrl.clone();
    const hostname = request.headers.get('host');

    // In production, handle subdomain redirects
    if (process.env.NODE_ENV === 'production') {
        // If someone hits sentinel.com/auth, redirect to app.sentinel.com/auth
        if (hostname === 'sentinel.com' && url.pathname.startsWith('/auth')) {
            return NextResponse.redirect(`https://app.sentinel-ph.com${url.pathname}`);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/auth/:path*'],
};
