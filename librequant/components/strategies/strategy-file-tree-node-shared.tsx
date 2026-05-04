import { FileCode2, FileJson } from "lucide-react";

import type { StrategyFileItem } from "@/lib/types/strategy";

export const DRAG_MIME = "application/x-strategy-file-path";

export function fileIcon(name: string) {
  if (name.endsWith(".py"))
    return <FileCode2 className="size-4 shrink-0 text-alpha" aria-hidden />;
  if (name.endsWith(".json"))
    return <FileJson className="size-4 shrink-0 text-amber-500" aria-hidden />;
  return <FileCode2 className="size-4 shrink-0 text-text-secondary" aria-hidden />;
}

export function isEditable(item: StrategyFileItem): boolean {
  return (
    item.type === "directory" ||
    item.name.endsWith(".py") ||
    item.name.endsWith(".json")
  );
}
