import { NotebookLoadingState } from "@/components/notebook/notebook-loading-state";

type Props = {
  baseUrl: string;
  /** Whether we are still opening the Jupyter session or already starting the kernel. */
  variant: "connecting_jupyter" | "starting_kernel";
};

/** Thin wrapper over {@link NotebookLoadingState} for the two pre-kernel phases. */
export function JupyterConnectingPanel({ baseUrl, variant }: Props) {
  return <NotebookLoadingState phase={variant} baseUrl={baseUrl} />;
}
