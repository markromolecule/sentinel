import { MetadataRoute } from 'next'

/**
 * Generate sitemap for Google Search Console
 * This file is automatically picked up by Next.js and served at /sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.sentinelph.tech'
  
  // Current date for lastModified
  const currentDate = new Date()
  
  return [
    // Home/Landing page
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    // Auth pages
    {
      url: `${baseUrl}/auth/login`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/register`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Note: Protected pages (admin, student, proctor dashboards) are intentionally
    // excluded from the sitemap as they require authentication and should not be
    // indexed by search engines
  ]
}
