import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { fetchMlflow } from "@/lib/mlflow-server";

describe("fetchMlflow", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it("aborts after timeout when fetch never settles", async () => {
    globalThis.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const sig = init?.signal;
          if (!sig) {
            reject(new Error("expected signal"));
            return;
          }
          let settled = false;
          const fail = () => {
            if (settled) return;
            settled = true;
            reject(new DOMException("Aborted", "AbortError"));
          };
          if (sig.aborted) {
            fail();
            return;
          }
          sig.addEventListener("abort", fail, { once: true });
        }),
    );

    const p = fetchMlflow("http://127.0.0.1:5000/api/2.0/mlflow/experiments/search");
    const errPromise = p.then(
      () => {
        throw new Error("expected fetchMlflow to reject");
      },
      (e: unknown) => e,
    );
    await vi.advanceTimersByTimeAsync(15_000);

    const thrown = await errPromise;
    expect(thrown).toMatchObject({ name: "AbortError" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const init = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as
      | RequestInit
      | undefined;
    expect(init?.signal).toBeDefined();
    expect(init?.signal?.aborted).toBe(true);
  });
});
