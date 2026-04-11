export interface StrategyMeta {
  name: string;
  tags: string[];
  author: string;
  created: string;
  last_run: string | null;
}

export interface StrategyFileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  last_modified: string;
  children?: StrategyFileItem[];
}

export interface StrategyDirectoryItem {
  name: string;
  path: string;
  last_modified: string;
  meta: StrategyMeta | null;
  files: StrategyFileItem[];
}
