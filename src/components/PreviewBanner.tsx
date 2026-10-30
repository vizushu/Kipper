/** Public previews never accept guest data or transactions. */
export default function PreviewBanner() {
  return <div role="status" className="fixed inset-x-0 top-0 z-[100] flex h-7 items-center justify-center bg-ink px-4 text-center text-[10px] font-medium leading-4 text-paper">
    Preview — bookings and payments are disabled
  </div>;
}
