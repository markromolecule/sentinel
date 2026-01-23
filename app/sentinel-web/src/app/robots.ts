import { MetadataRoute } from 'next'

/**
 * Generate robots.txt for Google Search Console
 * This file is automatically picked up by Next.js and served at /robots.txt
 */
export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sentinelph.tech'

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/student/',
                    '/proctor/',
                    '/api/',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
