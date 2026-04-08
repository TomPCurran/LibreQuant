"use client";

import "./jupyter-webpack-globals";
import "./jupyter-theme-bridge.css";
import JupyterWorkbench from "./JupyterWorkbench";

export default function NotebookShell() {
  return (
    <div className="w-full min-w-0 max-w-7xl">
      <div className="glass rounded-xl p-2 sm:p-3">
        <div className="jupyter-lq-bridge w-full min-w-0">
          <JupyterWorkbench />
        </div>
      </div>
    </div>
  );
}
