"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[librequant] Route error:", error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen px-4 py-10 text-foreground">
      <div className="glass mx-auto flex max-w-lg flex-col gap-4 rounded-4xl p-8">
        <div>
          <h1 className="heading-brand text-lg text-foreground">
            Something went wrong
          </h1>
          <p className="mt-1 text-sm font-light leading-relaxed text-text-secondary">
            The workbench hit an unexpected error. You can try again, or refresh
            the page if the problem persists.
          </p>
        </div>
        {isDev ? (
          <p className="font-mono-code text-xs text-risk wrap-break-word">
            {error.message}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex w-fit items-center justify-center rounded-full bg-alpha px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-alpha/20 transition hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
