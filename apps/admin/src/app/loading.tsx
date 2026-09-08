export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        role="status"
        aria-label="Chargement"
        className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
      />
    </div>
  );
}
