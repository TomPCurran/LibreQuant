export type WorkspaceCell = {
  id: string;
  type: "code";
  content: string;
  hasRun: boolean;
  lastLog?: string;
};
