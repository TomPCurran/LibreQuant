import eslintConfigNext from "eslint-config-next";
import tseslint from "typescript-eslint";

export default tseslint.config(
  ...eslintConfigNext,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["lib/jupyter-dev-noise.ts"],
    rules: {
      "no-console": "off",
    },
  },
);
