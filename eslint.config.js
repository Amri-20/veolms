import eslint from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/build/**",
      "**/.react-router/**",
      "**/.turbo/**",
      "**/.tmp/**",
      "pnpm-lock.yaml",
      "s3-bucket/**",
      "**/s3-bucket/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    ...eslint.configs.recommended,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react,
      "react-hooks": reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
    settings: {
      react: { version: "19.2" },
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // The player keeps the latest selector and its controller in refs that
    // are read while rendering, and opens a menu from an effect. These are
    // the two rules the web app above already has off for the same patterns.
    // Rewriting them is a change to playback that has to be watched in a
    // browser, so it is not done to satisfy the linter.
    files: ["packages/video-player/src/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Type-aware linting for the API only. These three rules each map to a
    // class of defect that reached this codebase: untyped provider payloads,
    // a fire-and-forget send whose rejection could take the process down, and
    // service logging that bypassed the configured pino logger.
    files: ["apps/api/src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "no-console": "error",
    },
  },
];
