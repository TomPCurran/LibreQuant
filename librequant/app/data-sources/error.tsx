"use client";

export default function DataSourcesError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-risk/30 bg-risk/10 px-6 py-8 text-center">
      <p className="text-sm font-medium text-text-primary">Something went wrong.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-alpha px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
