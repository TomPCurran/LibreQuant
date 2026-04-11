export type NotebookListItem = {
  name: string;
  path: string;
  created: string;
  last_modified: string;
};

export type NotebookFolderItem = {
  name: string;
  path: string;
  notebooks: NotebookListItem[];
};
