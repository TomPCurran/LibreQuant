import type { NextConfig } from "next";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";

const require = createRequire(import.meta.url);
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** CJS build: Jupyter/JupyterLab use `import * as json5` expecting `parse`. Turbopack must not use nested json5@2 `dist/index.mjs`. */
const json5Cjs = require.resolve("json5/lib/index.js");
/** Turbopack `resolveAlias` must be project-relative (absolute paths are mishandled). */
const json5CjsRelative = `./${path
  .relative(projectRoot, json5Cjs)
  .replace(/\\/g, "/")}`;

const nextConfig: NextConfig = {
  // Lumino/Jupyter widgets can break under React Strict Mode double-mount in dev
  reactStrictMode: false,
  transpilePackages: ["@jupyterlab/settingregistry"],
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      json5: json5CjsRelative,
    },
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      buffer: require.resolve("buffer/"),
    };
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      }),
    );
    const reactToastifyRoot = path.dirname(
      require.resolve("react-toastify/package.json"),
    );
    const jupyterlabRoot = path.join(projectRoot, "node_modules/@jupyterlab");
    const luminoRoot = path.join(projectRoot, "node_modules/@lumino");
    config.resolve.alias = {
      ...config.resolve.alias,
      json5: json5Cjs,
      // JupyterLab CSS uses `~react-toastify/...`; map prefix to package root
      "~react-toastify": reactToastifyRoot,
      "~@lumino": luminoRoot,
      "~@jupyterlab": jupyterlabRoot,
    };
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^~(.*)/, (resource) => {
        resource.request = resource.request.replace(/^~/, "");
      }),
    );
    config.module.rules.push(
      { test: /\.js.map$/, type: "asset/resource" },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.css$/,
        use: {
          loader: require.resolve("svg-url-loader"),
          options: { encoding: "none", limit: 10000 },
        },
      },
      {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        issuer: /\.js$/,
        type: "asset/source",
      },
      {
        resourceQuery: /text/,
        type: "asset/resource",
        generator: {
          filename: "[name][ext]",
        },
      },
      {
        test: /pypi\/.*/,
        type: "asset/resource",
        generator: {
          filename: "pypi/[name][ext][query]",
        },
      },
      {
        test: /\.whl$/,
        type: "asset/resource",
        generator: {
          filename: "pypi/[name][ext][query]",
        },
      },
      {
        test: /pyodide-kernel-extension\/schema\/.*/,
        type: "asset/resource",
        generator: {
          filename: "schema/[name][ext][query]",
        },
      },
    );
    return config;
  },
};

export default nextConfig;
