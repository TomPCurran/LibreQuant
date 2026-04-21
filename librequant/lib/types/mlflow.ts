/**
 * Typed shapes for MLflow REST responses and LibreQuant UI projections.
 *
 * MLflow uses snake_case in JSON; we preserve that in raw types and expose camelCase on
 * {@link MlflowRun} for the app API.
 */

/** One row in the Experiments explorer runs table (mapped from an MLflow run). */
export type MlflowRun = {
  runId: string;
  /** Same as experiment name / strategy. */
  strategy: string;
  symbol: string;
  startDate: string;
  endDate: string;
  sharpe: number | null;
  maxDrawdown: number | null;
  cagr: number | null;
  winRate: number | null;
  status: string;
  /** Epoch ms from MLflow `RunInfo.start_time`. */
  startTime: number;
  /** Raw params for detail / diff panels. */
  params: Record<string, string>;
  /** Run tags (e.g. `oos_candidate`). */
  tags: Record<string, string>;
};

export type MlflowRunsSearchResponse = {
  runs: MlflowRun[];
};

export type MlflowExperimentSummary = {
  experimentId: string;
  name: string;
};

export type MlflowExperimentsSearchResponse = {
  experiments: MlflowExperimentSummary[];
};

/** MLflow `GetExperiment.Response` (partial). */
export type MlflowExperimentDetail = {
  experiment: {
    experiment_id: string;
    name: string;
  };
};

/** MLflow `Run` from search (partial). */
export type MlflowRestRun = {
  info: {
    run_id: string;
    experiment_id: string;
    status: string;
    start_time: number;
  };
  data: {
    metrics?: { key: string; value: number }[];
    params?: { key: string; value: string }[];
    tags?: { key: string; value: string }[];
  };
};

export type MlflowRunsSearchRestResponse = {
  runs?: MlflowRestRun[];
};

export type MlflowExperimentsSearchRestResponse = {
  experiments?: {
    experiment_id: string;
    name: string;
  }[];
};

export type MlflowArtifactsListRestResponse = {
  root_uri?: string;
  files?: {
    path: string;
    is_dir: boolean;
    file_size?: number;
  }[];
};
