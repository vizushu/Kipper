import type { MetadataRoute } from 'next';
import { isPublicPreview } from '@/lib/booking-launch';

// Evaluate runtime environment rather than caching a production policy in preview.
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  return isPublicPreview()
    ? { rules: { userAgent: '*', disallow: '/' } }
    : { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/checkout', '/booking', '/bookings'] } };
}
