import { describe, it, expect, vi } from "vitest";
import type { Contents } from "@jupyterlab/services";
import type { INotebookContent } from "@jupyterlab/nbformat";

import {
  getNotebookJson,
  listDataLibraryDirectory,
  listDataUploadFiles,
  listDataUploadFilesRecursive,
  listDataUploadsSubfolders,
  listNotebookFolders,
  listNotebooksInLibrary,
} from "./read";

function err404(): never {
  const e = new Error("Not found") as Error & { response: { status: number } };
  e.response = { status: 404 };
  throw e;
}

function createContentsManager(impl: {
  get?: ReturnType<typeof vi.fn>;
  save?: ReturnType<typeof vi.fn>;
}): Contents.IManager {
  return {
    get: impl.get ?? vi.fn(),
    save: impl.save ?? vi.fn(),
    delete: vi.fn(),
    rename: vi.fn(),
    newUntitled: vi.fn(),
  } as unknown as Contents.IManager;
}

const minimalNotebook: INotebookContent = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {},
  cells: [],
};

describe("jupyter-contents/read", () => {
  it("listNotebooksInLibrary returns sorted notebooks by last_modified desc", async () => {
    const createdDirs = new Set<string>();
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      if (path === "lib" && opts?.content === false) {
        if (!createdDirs.has("lib")) throw err404();
        return { path: "lib", name: "lib", type: "directory" };
      }
      if (path === "lib" && opts?.content === true) {
        return {
          path: "lib",
          type: "directory",
          content: [
            {
              name: "a.ipynb",
              path: "lib/a.ipynb",
              type: "notebook",
              last_modified: "2020-01-02T00:00:00Z",
              created: "2020-01-01T00:00:00Z",
            },
            {
              name: "b.ipynb",
              path: "lib/b.ipynb",
              type: "notebook",
              last_modified: "2020-01-03T00:00:00Z",
              created: "2020-01-01T00:00:00Z",
            },
          ],
        };
      }
      throw new Error(`unexpected get ${path}`);
    });
    const save = vi.fn(async (path: string, model?: Contents.IModel) => {
      if (model?.type === "directory") createdDirs.add(path);
    });
    const contents = createContentsManager({ get, save });
    const items = await listNotebooksInLibrary(contents, "lib");
    expect(items.map((x) => x.name)).toEqual(["b.ipynb", "a.ipynb"]);
  });

  it("getNotebookJson returns notebook JSON", async () => {
    const get = vi.fn(async () => ({
      type: "notebook",
      content: minimalNotebook,
    }));
    const contents = createContentsManager({ get });
    const json = await getNotebookJson(contents, "lib", "lib/x.ipynb");
    expect(json.cells).toEqual([]);
    expect(get).toHaveBeenCalledWith("lib/x.ipynb", {
      type: "notebook",
      format: "json",
      content: true,
    });
  });

  it("propagates when get rejects", async () => {
    const get = vi.fn(async () => {
      throw new Error("upstream");
    });
    const contents = createContentsManager({ get });
    await expect(listNotebooksInLibrary(contents, "lib")).rejects.toThrow("upstream");
  });

  it("getNotebookJson throws when cells are invalid", async () => {
    const get = vi.fn(async () => ({
      type: "notebook",
      content: { nbformat: 4, cells: "nope" },
    }));
    const contents = createContentsManager({ get });
    await expect(getNotebookJson(contents, "lib", "lib/x.ipynb")).rejects.toThrow(
      "Invalid notebook file.",
    );
  });

  it("listDataUploadFiles lists csv and xlsx under data/uploads", async () => {
    const uploads = "lib/data/uploads";
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      const c = opts?.content;
      if (c === false) {
        return { path, type: "directory" };
      }
      if (path === uploads && c === true) {
        return {
          path: uploads,
          type: "directory",
          content: [
            {
              name: "a.csv",
              path: `${uploads}/a.csv`,
              type: "file",
              last_modified: "2020-01-02T00:00:00Z",
            },
            {
              name: "b.txt",
              path: `${uploads}/b.txt`,
              type: "file",
              last_modified: "2020-01-01T00:00:00Z",
            },
          ],
        };
      }
      if (c === true) {
        return { path, type: "directory", content: [] };
      }
      return { path, type: "directory" };
    });
    const save = vi.fn(async () => undefined);
    const contents = createContentsManager({ get, save });
    const files = await listDataUploadFiles(contents, "lib");
    expect(files.map((f) => f.name)).toEqual(["a.csv"]);
  });

  it("listNotebookFolders excludes strategies and nests subdirectory notebooks", async () => {
    const uploads = "lib/data/uploads";
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      const c = opts?.content;
      if (c === false) {
        return { path, type: "directory" };
      }
      if (path === "lib" && c === true) {
        return {
          path: "lib",
          type: "directory",
          content: [
            {
              name: "root.ipynb",
              path: "lib/root.ipynb",
              type: "notebook",
              last_modified: "2020-01-01T00:00:00Z",
              created: "",
            },
            {
              name: "sub",
              path: "lib/sub",
              type: "directory",
              last_modified: "",
            },
            {
              name: "strategies",
              path: "lib/strategies",
              type: "directory",
              last_modified: "",
            },
          ],
        };
      }
      if (path === "lib/sub" && c === true) {
        return {
          path: "lib/sub",
          type: "directory",
          content: [
            {
              name: "in.ipynb",
              path: "lib/sub/in.ipynb",
              type: "notebook",
              last_modified: "2020-01-02T00:00:00Z",
              created: "",
            },
          ],
        };
      }
      if (path === uploads && c === true) {
        return { path: uploads, type: "directory", content: [] };
      }
      if (c === true) {
        return { path, type: "directory", content: [] };
      }
      return { path, type: "directory" };
    });
    const save = vi.fn(async () => undefined);
    const contents = createContentsManager({ get, save });
    const folders = await listNotebookFolders(contents, "lib");
    const names = folders.map((f) => f.name);
    expect(names).not.toContain("strategies");
    const sub = folders.find((f) => f.name === "sub");
    expect(sub?.notebooks).toHaveLength(1);
    expect(sub?.notebooks[0]?.name).toBe("in.ipynb");
  });

  it("listDataLibraryDirectory lists files and directories under uploads", async () => {
    const uploads = "lib/data/uploads";
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      const c = opts?.content;
      if (c === false) return { path, type: "directory" };
      if (path === `${uploads}/nest` && c === true) {
        return {
          path: `${uploads}/nest`,
          type: "directory",
          content: [
            {
              name: "f.csv",
              path: `${uploads}/nest/f.csv`,
              type: "file",
              last_modified: "2020-01-01T00:00:00Z",
            },
            {
              name: "d",
              path: `${uploads}/nest/d`,
              type: "directory",
              last_modified: "2020-01-02T00:00:00Z",
            },
          ],
        };
      }
      if (path === uploads && c === true) {
        return { path: uploads, type: "directory", content: [] };
      }
      if (c === true) return { path, type: "directory", content: [] };
      return { path, type: "directory" };
    });
    const save = vi.fn(async () => undefined);
    const contents = createContentsManager({ get, save });
    const entries = await listDataLibraryDirectory(contents, "lib", "nest");
    expect(entries.map((e) => `${e.type}:${e.name}`).sort()).toEqual([
      "directory:d",
      "file:f.csv",
    ]);
  });

  it("listDataUploadsSubfolders walks nested directories", async () => {
    const uploads = "lib/data/uploads";
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      const c = opts?.content;
      if (c === false) return { path, type: "directory" };
      if (path === uploads && c === true) {
        return {
          path: uploads,
          type: "directory",
          content: [
            {
              name: "nest",
              path: `${uploads}/nest`,
              type: "directory",
              last_modified: "",
            },
          ],
        };
      }
      if (path === `${uploads}/nest` && c === true) {
        return {
          path: `${uploads}/nest`,
          type: "directory",
          content: [
            {
              name: "deep",
              path: `${uploads}/nest/deep`,
              type: "directory",
              last_modified: "",
            },
          ],
        };
      }
      if (path === `${uploads}/nest/deep` && c === true) {
        return { path: `${uploads}/nest/deep`, type: "directory", content: [] };
      }
      if (c === true) return { path, type: "directory", content: [] };
      return { path, type: "directory" };
    });
    const save = vi.fn(async () => undefined);
    const contents = createContentsManager({ get, save });
    const opts = await listDataUploadsSubfolders(contents, "lib");
    expect(opts.map((o) => o.relative)).toEqual(["", "nest", "nest/deep"]);
  });

  it("listDataUploadFilesRecursive collects csv under nested dirs", async () => {
    const uploads = "lib/data/uploads";
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      const c = opts?.content;
      if (c === false) return { path, type: "directory" };
      if (path === uploads && c === true) {
        return {
          path: uploads,
          type: "directory",
          content: [
            {
              name: "nest",
              path: `${uploads}/nest`,
              type: "directory",
              last_modified: "",
            },
          ],
        };
      }
      if (path === `${uploads}/nest` && c === true) {
        return {
          path: `${uploads}/nest`,
          type: "directory",
          content: [
            {
              name: "a.csv",
              path: `${uploads}/nest/a.csv`,
              type: "file",
              last_modified: "2020-01-02T00:00:00Z",
            },
          ],
        };
      }
      if (c === true) return { path, type: "directory", content: [] };
      return { path, type: "directory" };
    });
    const save = vi.fn(async () => undefined);
    const contents = createContentsManager({ get, save });
    const files = await listDataUploadFilesRecursive(contents, "lib");
    expect(files.map((f) => f.name)).toEqual(["a.csv"]);
  });

  it("listDataLibraryDirectory rejects invalid relative paths", async () => {
    const get = vi.fn(async () => ({ path: "lib", type: "directory" }));
    const contents = createContentsManager({ get });
    await expect(listDataLibraryDirectory(contents, "lib", "../evil")).rejects.toThrow(
      "Invalid path.",
    );
  });
});
