import type { Contents } from "@jupyterlab/services";

import type { StrategyFileItem } from "@/lib/types/strategy";

export interface StrategyFileTreeProps {
  dirPath: string;
  files: StrategyFileItem[];
  activePath: string;
  contents: Contents.IManager;
  onRefresh: () => void;
}

export type StrategyContextMenuState = {
  x: number;
  y: number;
  path: string;
  type: "file" | "directory";
  name: string;
};

/** Avoid shadowing the DOM `ClipboardItem` global. */
export type StrategyClipboardItem = { path: string; name: string } | null;

export type NewItemRequest = {
  parentPath: string;
  mode: "file" | "folder";
} | null;

export type RenameState =
  | {
      path: string;
      currentName: string;
    }
  | null;
