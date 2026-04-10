import { Suspense } from "react";
import { HomeWorkspace } from "@/components/home-workspace";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm font-light text-text-secondary">
          Loading…
        </div>
      }
    >
      <HomeWorkspace />
    </Suspense>
  );
}
