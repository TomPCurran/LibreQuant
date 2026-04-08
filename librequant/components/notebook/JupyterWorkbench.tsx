"use client";

import "./jupyter-webpack-globals";
import { useJupyter } from "@datalayer/jupyter-react/jupyter";
import { Notebook } from "@datalayer/jupyter-react/notebook";
import {
  JupyterReactTheme,
  type Colormode,
} from "@datalayer/jupyter-react/theme";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import {
  buildUseJupyterProps,
  DEFAULT_NOTEBOOK_CONTENT,
} from "./jupyter-config";

function resolveColormode(resolvedTheme: string | undefined): Colormode {
  if (resolvedTheme === "dark") {
    return "dark";
  }
  if (resolvedTheme === "light") {
    return "light";
  }
  return "light";
}

export default function JupyterWorkbench() {
  const { resolvedTheme } = useTheme();
  const jupyterProps = useMemo(() => buildUseJupyterProps(), []);
  const { defaultKernel, serviceManager, kernelIsLoading } =
    useJupyter(jupyterProps);

  const colorMode = resolveColormode(resolvedTheme);

  if (!serviceManager || !defaultKernel) {
    return (
      <div
        className="flex min-h-112 w-full items-center justify-center rounded-xl border border-black/6 bg-background/50 px-4 py-12 text-sm text-brand-gray dark:border-white/10"
        role="status"
        aria-live="polite"
      >
        {kernelIsLoading ? "Starting kernel…" : "Connecting to Jupyter…"}
      </div>
    );
  }

  return (
    <JupyterReactTheme
      colormode={colorMode}
      loadJupyterLabCss
      backgroundColor="transparent"
    >
      <Notebook
        id="librequant-notebook-workbench"
        serviceManager={serviceManager}
        kernel={defaultKernel}
        nbformat={DEFAULT_NOTEBOOK_CONTENT}
        height="min(70vh, 640px)"
        maxHeight="70vh"
      />
    </JupyterReactTheme>
  );
}
