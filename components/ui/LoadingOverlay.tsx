interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({
  message = "Lütfen bekleyiniz...",
}: LoadingOverlayProps) {
  return (
    <div className="loading-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="loading-card rounded-lg bg-white px-8 py-6 text-center shadow-xl">
        <div
          className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-[3px] border-ykb-primary border-t-transparent"
          aria-hidden
        />
        <p className="text-sm font-medium text-[#333]">{message}</p>
      </div>
    </div>
  );
}
