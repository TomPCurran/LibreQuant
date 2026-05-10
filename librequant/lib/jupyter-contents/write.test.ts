import { describe, it, expect, vi } from "vitest";
import type { Contents } from "@jupyterlab/services";
import type { INotebookContent } from "@jupyterlab/nbformat";

import {
  createDataLibraryFolder,
  createNotebookFolder,
  createUntitledNotebook,
  deleteDataLibraryEntry,
  deleteNotebookPath,
  saveNotebookJson,
  uploadBinaryFile,
  uploadNotebookFile,
} from "./write";

function err404(): never {
  const e = new Error("Not found") as Error & { response: { status: number } };
  e.response = { status: 404 };
  throw e;
}

function createContentsManager(impl: {
  get?: ReturnType<typeof vi.fn>;
  save?: ReturnType<typeof vi.fn>;
  delete?: ReturnType<typeof vi.fn>;
  newUntitled?: ReturnType<typeof vi.fn>;
}): Contents.IManager {
  return {
    get: impl.get ?? vi.fn(),
    save: impl.save ?? vi.fn(),
    delete: impl.delete ?? vi.fn(),
    rename: vi.fn(),
    newUntitled: impl.newUntitled ?? vi.fn(),
  } as unknown as Contents.IManager;
}

const minimalNotebook: INotebookContent = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {},
  cells: [],
};

describe("jupyter-contents/write", () => {
  it("saveNotebookJson calls save with notebook json options", async () => {
    const save = vi.fn(async () => undefined);
    const contents = createContentsManager({ save });
    await saveNotebookJson(contents, "lib", "lib/x.ipynb", minimalNotebook);
    expect(save).toHaveBeenCalledWith("lib/x.ipynb", {
      type: "notebook",
      format: "json",
      content: minimalNotebook,
    });
  });

  it("createUntitledNotebook creates then saves notebook content", async () => {
    const created = new Set<string>();
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      if (path === "lib" && opts?.content === false) {
        if (!created.has("lib")) throw err404();
        return { path: "lib", type: "directory" };
      }
      if (path === "lib" && opts?.content === true) {
        return { path: "lib", type: "directory", content: [] };
      }
      throw new Error(`unexpected get ${path}`);
    });
    const save = vi.fn(async (path: string, model?: Contents.IModel) => {
      if (model?.type === "directory") created.add(path);
    });
    const newUntitled = vi.fn(async () => ({
      path: "lib/Untitled.ipynb",
      type: "notebook",
      name: "Untitled.ipynb",
    }));
    const contents = createContentsManager({ get, save, newUntitled });
    const p = await createUntitledNotebook(contents, "lib", minimalNotebook);
    expect(p).toBe("lib/Untitled.ipynb");
    expect(newUntitled).toHaveBeenCalledWith({
      path: "lib",
      type: "notebook",
    });
    expect(save).toHaveBeenCalledWith(
      "lib/Untitled.ipynb",
      expect.objectContaining({
        type: "notebook",
        format: "json",
        content: minimalNotebook,
      }),
    );
  });

  it("uploadNotebookFile lists root, picks unique name, saves notebook", async () => {
    const created = new Set<string>();
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      if (path === "lib" && opts?.content === false) {
        if (!created.has("lib")) throw err404();
        return { path: "lib", type: "directory" };
      }
      if (path === "lib" && opts?.content === true) {
        return {
          path: "lib",
          type: "directory",
          content: [{ name: "foo.ipynb", path: "lib/foo.ipynb", type: "notebook" }],
        };
      }
      throw new Error(`unexpected get ${path}`);
    });
    const save = vi.fn(async (path: string, model?: Contents.IModel) => {
      if (model?.type === "directory") created.add(path);
    });
    const contents = createContentsManager({ get, save });
    const path = await uploadNotebookFile(contents, "lib", "foo.ipynb", minimalNotebook);
    expect(path).toMatch(/foo-\d+\.ipynb$/);
    expect(save).toHaveBeenCalledWith(
      expect.stringMatching(/lib\/foo-\d+\.ipynb$/),
      expect.objectContaining({ type: "notebook", format: "json", content: minimalNotebook }),
    );
  });

  it("deleteNotebookPath deletes after failed directory listing on file", async () => {
    const get = vi.fn(
      async (path: string, opts?: { content?: boolean; type?: string }) => {
        if (path === "lib/x.ipynb" && opts?.type === "directory") {
          throw new Error("not a directory");
        }
        throw new Error("unexpected");
      },
    );
    const del = vi.fn(async () => undefined);
    const contents = createContentsManager({ get, delete: del });
    await deleteNotebookPath(contents, "lib", "lib/x.ipynb");
    expect(del).toHaveBeenCalledWith("lib/x.ipynb");
  });

  it("rejects when save throws", async () => {
    const save = vi.fn(async () => {
      throw new Error("write failed");
    });
    const contents = createContentsManager({ save });
    await expect(
      saveNotebookJson(contents, "lib", "lib/x.ipynb", minimalNotebook),
    ).rejects.toThrow("write failed");
  });

  it("createNotebookFolder ensures directory and returns path", async () => {
    const existing = new Set<string>(["lib"]);
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      if (opts?.content === false) {
        if (!existing.has(path)) throw err404();
        return { path, type: "directory" };
      }
      throw new Error(`unexpected get ${path}`);
    });
    const save = vi.fn(async (path: string, model?: { type?: string }) => {
      if (model?.type === "directory") existing.add(path);
      return { path, type: "directory" };
    });
    const contents = createContentsManager({ get, save });
    const dir = await createNotebookFolder(contents, "lib", "MyDir");
    expect(dir).toBe("lib/MyDir");
  });

  it("uploadBinaryFile saves base64 file under uploads", async () => {
    const existing = new Set<string>(["lib", "lib/data", "lib/data/uploads"]);
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      if (opts?.content === false) {
        if (!existing.has(path)) throw err404();
        return { path, type: "directory" };
      }
      return { path, type: "directory", content: [] };
    });
    const save = vi.fn(async (path: string, model?: { type?: string }) => {
      if (model?.type === "directory") existing.add(path);
      return { path, type: model?.type ?? "file" };
    });
    const contents = createContentsManager({ get, save });
    const p = await uploadBinaryFile(
      contents,
      "lib",
      "data/uploads/x.bin",
      new Uint8Array([1, 2, 3]),
    );
    expect(p).toBe("lib/data/uploads/x.bin");
    const fileSave = save.mock.calls.find((c) => c[1]?.type === "file");
    expect(fileSave?.[1]).toMatchObject({ type: "file", format: "base64" });
  });

  it("deleteRecursive deletes children before parent directory", async () => {
    const del = vi.fn(async () => undefined);
    const get = vi.fn(async (path: string, opts?: { content?: boolean; type?: string }) => {
      if (path === "lib/p" && opts?.type === "directory" && opts?.content === true) {
        return {
          type: "directory",
          path: "lib/p",
          content: [{ name: "c.ipynb", path: "lib/p/c.ipynb", type: "notebook" }],
        };
      }
      if (path === "lib/p/c.ipynb" && opts?.type === "directory") {
        throw new Error("not dir");
      }
      throw new Error("unexpected");
    });
    const contents = createContentsManager({ get, delete: del });
    await deleteNotebookPath(contents, "lib", "lib/p");
    expect(del).toHaveBeenNthCalledWith(1, "lib/p/c.ipynb");
    expect(del).toHaveBeenNthCalledWith(2, "lib/p");
  });

  it("deleteDataLibraryEntry refuses uploads root", async () => {
    const contents = createContentsManager({});
    await expect(
      deleteDataLibraryEntry(contents, "lib", "lib/data/uploads"),
    ).rejects.toThrow("Cannot delete the uploads root.");
  });

  it("createDataLibraryFolder creates nested folder under uploads", async () => {
    const existing = new Set<string>(["lib", "lib/data", "lib/data/uploads", "lib/data/uploads/nest"]);
    const uploads = "lib/data/uploads";
    const get = vi.fn(async (path: string, opts?: { content?: boolean }) => {
      if (opts?.content === false) {
        if (!existing.has(path)) throw err404();
        return { path, type: "directory" };
      }
      if (path === `${uploads}/nest` && opts?.content === true) {
        return { path: `${uploads}/nest`, type: "directory", content: [] };
      }
      if (path === uploads && opts?.content === true) {
        return { path: uploads, type: "directory", content: [] };
      }
      if (opts?.content === true) {
        return { path, type: "directory", content: [] };
      }
      return { path, type: "directory" };
    });
    const save = vi.fn(async (path: string, model?: { type?: string }) => {
      if (model?.type === "directory") existing.add(path);
      return { path, type: "directory" };
    });
    const contents = createContentsManager({ get, save });
    const p = await createDataLibraryFolder(contents, "lib", "nest", "My Lib");
    expect(p).toBe(`${uploads}/nest/My_Lib`);
  });
});
