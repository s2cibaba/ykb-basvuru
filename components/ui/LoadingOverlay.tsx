interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({
  message = "Lütfen bekleyiniz...",
}: LoadingOverlayProps) {
  return (
    <div className="loading-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="loading-card mx-4 w-full max-w-sm rounded-lg bg-white px-6 py-5 text-center shadow-xl sm:mx-0 sm:max-w-md sm:px-8 sm:py-6">
        <div
          className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-[3px] border-ykb-primary border-t-transparent"
          aria-hidden
        />
        <p className="text-sm font-medium text-[#333]">{message}</p>
      </div>
    </div>
  );
}
