export function isPublicPreview(): boolean { return process.env.SITE_PREVIEW_MODE === "true"; }
/** Fail closed: this milestone is a test-only preview, never a production sale. */
export function isBookingTestPreviewEnabled(): boolean {
  return !isPublicPreview() && process.env.BOOKING_TEST_MODE === 'true';
}
export const BOOKING_LAUNCH_MESSAGE = 'Online booking is not open yet. Payment setup and calendar synchronization are being verified. Please contact Casa Pacifica about your dates.';
