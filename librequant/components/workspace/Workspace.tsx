"use client";

import { useCallback, useState } from "react";
import NotebookCell from "../cells/NotebookCell";
import type { WorkspaceCell } from "../../lib/workspace-cell";

const DEFAULT_CODE = `def on_bar(ctx):
    return ctx.close > ctx.open * (momentum + 1)
`;

export default function Workspace() {
  const [cells, setCells] = useState<WorkspaceCell[]>(() => [
    {
      id: "1",
      type: "code",
      content: DEFAULT_CODE,
      hasRun: false,
    },
  ]);

  const updateContent = useCallback((id: string, content: string) => {
    setCells((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content } : c))
    );
  }, []);

  const runCell = useCallback((id: string) => {
    setCells((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, hasRun: true, lastLog: "Success" } : c
      )
    );
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {cells.map((cell, index) => (
        <NotebookCell
          key={cell.id}
          cellId={cell.id}
          cellIndex={index + 1}
          content={cell.content}
          hasRun={cell.hasRun}
          lastLog={cell.lastLog}
          onChangeContent={updateContent}
          onRun={runCell}
        />
      ))}
    </div>
  );
}
