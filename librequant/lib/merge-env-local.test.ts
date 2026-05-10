import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fsMocks = vi.hoisted(() => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: fsMocks,
}));

import * as mergeMod from "./merge-env-local";

describe("mergeEnvLocal", () => {
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp");
    fsMocks.readFile.mockReset();
    fsMocks.writeFile.mockReset();
    fsMocks.readFile.mockResolvedValue("");
    fsMocks.writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it("merges a new managed key into an empty file with managed block headers", async () => {
    fsMocks.readFile.mockResolvedValue("");
    await mergeMod.mergeEnvLocal({ POLYGON_API_KEY: "pk_test" });
    expect(fsMocks.writeFile).toHaveBeenCalledTimes(1);
    const [p, body, opts] = fsMocks.writeFile.mock.calls[0]!;
    expect(p).toBe("/tmp/.env.local");
    expect(opts).toMatchObject({ mode: 0o600, encoding: "utf8" });
    expect(body).toContain("# Data sources (managed by LibreQuant UI)");
    expect(body).toContain("POLYGON_API_KEY=pk_test");
  });

  it("preserves unrelated lines and appends managed block", async () => {
    fsMocks.readFile.mockResolvedValue("FOO=bar\n# user comment\n");
    await mergeMod.mergeEnvLocal({ TIINGO_API_KEY: "t1" });
    const body = fsMocks.writeFile.mock.calls[0]![1] as string;
    expect(body).toContain("FOO=bar");
    expect(body).toContain("# user comment");
    expect(body).toContain("TIINGO_API_KEY=t1");
    expect(body).toContain("# Data sources (managed by LibreQuant UI)");
  });

  it("updates an existing managed key and preserves other keys", async () => {
    fsMocks.readFile.mockResolvedValue(
      [
        "ALPACA_API_KEY=old",
        "POLYGON_API_KEY=keep",
        "# Data sources (managed by LibreQuant UI)",
        "ALPACA_SECRET_KEY=sec",
      ].join("\n"),
    );
    await mergeMod.mergeEnvLocal({ ALPACA_API_KEY: "newkey" });
    const body = fsMocks.writeFile.mock.calls[0]![1] as string;
    expect(body).toContain("ALPACA_API_KEY=newkey");
    expect(body).toContain("POLYGON_API_KEY=keep");
    expect(body).toContain("ALPACA_SECRET_KEY=sec");
    expect(body.split("ALPACA_API_KEY=").length).toBe(2);
  });

  it("quotes values that contain whitespace or quotes per quoteForEnv", async () => {
    fsMocks.readFile.mockResolvedValue("");
    await mergeMod.mergeEnvLocal({ POLYGON_API_KEY: "a b" });
    let body = fsMocks.writeFile.mock.calls[0]![1] as string;
    expect(body).toContain('POLYGON_API_KEY="a b"');

    fsMocks.writeFile.mockClear();
    const tricky = 'a"b\\';
    await mergeMod.mergeEnvLocal({ POLYGON_API_KEY: tricky });
    body = fsMocks.writeFile.mock.calls[0]![1] as string;
    expect(body).toContain('POLYGON_API_KEY="a\\"b\\\\"');
  });

  it("removes a managed key when value is empty string", async () => {
    fsMocks.readFile.mockResolvedValue(
      ["TIINGO_API_KEY=gone", "# Data sources (managed by LibreQuant UI)", "TIINGO_API_KEY=gone"].join(
        "\n",
      ),
    );
    await mergeMod.mergeEnvLocal({ TIINGO_API_KEY: "" });
    const body = fsMocks.writeFile.mock.calls[0]![1] as string;
    expect(body).not.toMatch(/^TIINGO_API_KEY=/m);
  });

  it("merges custom keys and strips prior custom UI lines from raw", async () => {
    fsMocks.readFile.mockResolvedValue(
      ["X=1", "# Custom API keys (managed by LibreQuant UI)", "MYBACKEND_KEY=old"].join("\n"),
    );
    await mergeMod.mergeEnvLocal({}, { MYBACKEND_KEY: "newval" });
    const body = fsMocks.writeFile.mock.calls[0]![1] as string;
    expect(body).toContain("X=1");
    expect(body).toContain("MYBACKEND_KEY=newval");
  });

  it("throws when a managed value exceeds max length", async () => {
    fsMocks.readFile.mockResolvedValue("");
    await expect(
      mergeMod.mergeEnvLocal({ POLYGON_API_KEY: "x".repeat(4097) }),
    ).rejects.toThrow(/too long/);
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });

  it("writes mode 0o600 and utf8", async () => {
    fsMocks.readFile.mockResolvedValue("");
    await mergeMod.mergeEnvLocal({ POLYGON_API_KEY: "k" });
    expect(fsMocks.writeFile).toHaveBeenCalledWith(
      "/tmp/.env.local",
      expect.any(String),
      { mode: 0o600, encoding: "utf8" },
    );
  });
});

describe("readEnvLocalMap", () => {
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue("/tmp");
    fsMocks.readFile.mockReset();
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it("parses keys from disk content", async () => {
    fsMocks.readFile.mockResolvedValue('FOO=1\nBAR="x y"\n');
    const m = await mergeMod.readEnvLocalMap();
    expect(m.get("FOO")).toBe("1");
    expect(m.get("BAR")).toBe("x y");
  });

  it("returns an empty map when read fails", async () => {
    fsMocks.readFile.mockRejectedValue(new Error("ENOENT"));
    const m = await mergeMod.readEnvLocalMap();
    expect(m.size).toBe(0);
  });
});

describe("listCustomEnvKeyNames", () => {
  it("returns sorted names for valid custom keys with non-empty values", () => {
    const map = new Map<string, string>([
      ["MYB", "1"],
      ["MYA", "2"],
      ["POLYGON_API_KEY", "x"],
    ]);
    expect(mergeMod.listCustomEnvKeyNames(map)).toEqual(["MYA", "MYB"]);
  });
});

describe("buildDataSourceSecretsEnvString", () => {
  it("returns placeholder when no secrets are set", () => {
    const s = mergeMod.buildDataSourceSecretsEnvString(new Map());
    expect(s).toContain("none set yet");
  });

  it("includes managed, extra sync, and custom keys", () => {
    const map = new Map<string, string>([
      ["POLYGON_API_KEY", "p"],
      ["ALPACA_DATA_FEED", "sip"],
      ["MYBACKEND_KEY", "c"],
    ]);
    const s = mergeMod.buildDataSourceSecretsEnvString(map);
    expect(s).toContain("POLYGON_API_KEY=");
    expect(s).toContain("ALPACA_DATA_FEED=");
    expect(s).toContain("MYBACKEND_KEY=");
  });
});

describe("presenceForStatus", () => {
  it("marks presence booleans from the map", () => {
    const map = new Map<string, string>([["POLYGON_API_KEY", "x"]]);
    const p = mergeMod.presenceForStatus(mergeMod.MANAGED_SECRET_KEYS, map);
    expect(p.POLYGON_API_KEY).toBe(true);
    expect(p.TIINGO_API_KEY).toBe(false);
  });
});
