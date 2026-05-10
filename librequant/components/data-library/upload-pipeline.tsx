"use client";

import type { ComponentProps, RefObject } from "react";
import { FolderPlus, FolderUp, RefreshCw, Upload } from "lucide-react";

type UploadPipelineProps = {
  uploadsPrefix: string;
  blocked: boolean;
  busy: boolean;
  rootLoading: boolean;
  dragOverRel: string | null;
  fileInputId: string;
  dirInputId: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  dirInputRef: RefObject<HTMLInputElement | null>;
  onPickFiles: (files: FileList | null) => void;
  onPickDirectory: (files: FileList | null) => void;
  onOpenInlineNewFolder: (parentRel: string) => void;
  onRefresh: () => void;
  onDragOverDropZone: (e: React.DragEvent, targetRel: string) => void;
  onDragLeaveZone: (e: React.DragEvent) => void;
  onDropTarget: (e: React.DragEvent, targetRel: string) => void;
};

export function DataLibraryUploadPipeline({
  uploadsPrefix,
  blocked,
  busy,
  rootLoading,
  dragOverRel,
  fileInputId,
  dirInputId,
  fileInputRef,
  dirInputRef,
  onPickFiles,
  onPickDirectory,
  onOpenInlineNewFolder,
  onRefresh,
  onDragOverDropZone,
  onDragLeaveZone,
  onDropTarget,
}: UploadPipelineProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <p className="max-w-xl text-sm font-light text-text-secondary">
          Drag files or folders onto a folder to move them. Expand folders in
          place to browse. Files can be dropped from your computer onto a
          folder or the library root.{" "}
          <strong className="font-medium text-text-primary">Upload folder</strong>{" "}
          adds the chosen directory at the top level of{" "}
          <code className="font-mono-code text-[12px]">{uploadsPrefix}/</code>{" "}
          (only{" "}
          <code className="font-mono-code text-[12px]">.csv</code>,{" "}
          <code className="font-mono-code text-[12px]">.xlsx</code>,{" "}
          <code className="font-mono-code text-[12px]">.tsv</code>,{" "}
          <code className="font-mono-code text-[12px]">.txt</code>,{" "}
          <code className="font-mono-code text-[12px]">.pdf</code>). Use{" "}
          <code className="font-mono-code text-[12px]">
            read_tabular(&quot;yourfile.csv&quot;)
          </code>{" "}
          with paths relative to{" "}
          <code className="font-mono-code text-[12px]">uploads</code>.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          multiple
          accept=".csv,.xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="sr-only"
          disabled={Boolean(busy || blocked)}
          onChange={(e) => void onPickFiles(e.target.files)}
        />
        <input
          ref={dirInputRef}
          id={dirInputId}
          type="file"
          multiple
          className="sr-only"
          disabled={Boolean(busy || blocked)}
          onChange={(e) => void onPickDirectory(e.target.files)}
          {...({
            webkitdirectory: "",
            directory: "",
            mozdirectory: "",
          } as ComponentProps<"input">)}
        />
        <button
          type="button"
          disabled={Boolean(busy || blocked)}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-alpha/35 bg-alpha/10 px-4 text-sm font-medium text-alpha transition hover:bg-alpha/15 disabled:opacity-50"
        >
          <Upload className="size-4" aria-hidden />
          Upload
        </button>
        <button
          type="button"
          disabled={Boolean(busy || blocked)}
          onClick={() => dirInputRef.current?.click()}
          aria-label="Upload folder from your computer into the data library"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-alpha/35 bg-alpha/10 px-4 text-sm font-medium text-alpha transition hover:bg-alpha/15 disabled:opacity-50"
        >
          <FolderUp className="size-4" aria-hidden />
          Upload folder
        </button>
        <button
          type="button"
          disabled={Boolean(busy || blocked)}
          onClick={() => onOpenInlineNewFolder("")}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 bg-foreground/5 px-4 text-sm font-medium text-text-primary transition hover:border-alpha/30 hover:text-alpha disabled:opacity-50"
        >
          <FolderPlus className="size-4" aria-hidden />
          New folder
        </button>
        <button
          type="button"
          disabled={Boolean(busy || blocked || rootLoading)}
          onClick={() => void onRefresh()}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/15 px-3 text-sm font-medium text-text-secondary transition hover:text-alpha disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${rootLoading ? "animate-spin" : ""}`}
            aria-hidden
          />
          Refresh
        </button>
      </div>
      </div>

      <div
        className={`flex min-h-12 flex-wrap items-center rounded-lg border border-dashed border-foreground/20 px-3 py-3 text-xs transition-colors ${
          dragOverRel === ""
            ? "border-alpha/50 bg-alpha/10 text-text-primary"
            : "text-text-secondary"
        }`}
        onDragOver={(e) => onDragOverDropZone(e, "")}
        onDragLeave={onDragLeaveZone}
        onDrop={(e) => void onDropTarget(e, "")}
      >
        <span className="font-mono-code text-alpha">{uploadsPrefix}</span>
        <span className="ml-2">
          — library root; or drop on a top-level file row
        </span>
      </div>
    </div>
  );
}
