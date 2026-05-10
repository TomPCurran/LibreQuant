import { describe, it, expect } from "vitest";

import {
  assertPathUnderDataUploads,
  dataUploadsRootPath,
  parseRelativeUploadsDir,
  relativePathWithinDataUploads,
} from "./types";

describe("jupyter-contents/types", () => {
  it("dataUploadsRootPath joins library root and uploads prefix", () => {
    expect(dataUploadsRootPath("lib")).toBe("lib/data/uploads");
  });

  it("parseRelativeUploadsDir normalizes and rejects parent segments", () => {
    expect(parseRelativeUploadsDir("a/b")).toBe("a/b");
    expect(() => parseRelativeUploadsDir("../x")).toThrow("Invalid path.");
  });

  it("relativePathWithinDataUploads returns relative segment or empty at root", () => {
    expect(relativePathWithinDataUploads("lib", "lib/data/uploads/a.csv")).toBe("a.csv");
    expect(relativePathWithinDataUploads("lib", "lib/data/uploads")).toBe("");
  });

  it("assertPathUnderDataUploads throws when candidate is outside uploads", () => {
    expect(() => assertPathUnderDataUploads("lib", "lib/other/file")).toThrow(
      "outside data/uploads",
    );
  });

  it("relativePathWithinDataUploads throws when path is not under uploads", () => {
    expect(() => relativePathWithinDataUploads("lib", "lib/other")).toThrow(
      "not under data/uploads",
    );
  });
});
