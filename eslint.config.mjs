import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import testingLibraryPlugin from "eslint-plugin-testing-library";
import eslintConfigPrettier from "eslint-config-prettier";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsFiles = ["src/**/*.{ts,tsx}", "stories/**/*.{ts,tsx}"];
const testFiles = [
  "**/__tests__/**/*.{ts,tsx}",
  "**/*.test.{ts,tsx}",
  "**/*.spec.{ts,tsx}",
];
const nodeConfigFiles = [
  "*.config.{js,ts,mjs,cjs}",
  "*.config.*.{js,ts,mjs,cjs}",
  "*.rc.{js,ts,cjs,mjs}",
  "eslint.config.mjs",
  "prettier.config.cjs",
  "vitest.config.ts",
  "vitest.setup.ts",
  "tsup.config.ts",
  ".storybook/main.@(js|ts|mjs|cjs)",
];
const tsConfigFiles = [
  ".storybook/**/*.{ts,tsx}",
  "*.config.{ts}",
  "*.config.*.{ts}",
  "*.rc.{ts}",
  "vitest.config.ts",
  "vitest.setup.ts",
  "tsup.config.ts",
];


const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map((config) =>
  config.files ? config : { ...config, files: tsFiles }
);
const stylisticTypeCheckedConfigs = tseslint.configs.stylisticTypeChecked.map((config) =>
  config.files ? config : { ...config, files: tsFiles }
);

export default tseslint.config(
  {
    ignores: ["dist", "node_modules"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
  },
  js.configs.recommended,
  ...typeCheckedConfigs,
  ...stylisticTypeCheckedConfigs,
  {
    files: tsFiles,
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
      "testing-library": testingLibraryPlugin,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: tsConfigFiles,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: null,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: testFiles,
    ...testingLibraryPlugin.configs["flat/react"],
  },
  {
    files: nodeConfigFiles,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        project: null,
      },
    },
  },
  eslintConfigPrettier,
);
