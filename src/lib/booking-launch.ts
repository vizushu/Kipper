import { getBookingPaymentMode } from './payment-mode';
export function isPublicPreview(): boolean { return process.env.SITE_PREVIEW_MODE === "true"; }
export function isBookingTestPreviewEnabled(): boolean { return getBookingPaymentMode() === 'test'; }
export function isBookingEnabled(): boolean { return getBookingPaymentMode() !== null; }
export const BOOKING_LAUNCH_MESSAGE = 'Online booking is not open yet. Payment setup and calendar synchronization are being verified. Please contact Casa Pacifica about your dates.';
