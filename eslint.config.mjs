// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import eslint from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [{
  ignores: ["dist/**", "node_modules/**", "*.d.ts"],
}, {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      ecmaFeatures: {
        jsx: true,
      },
    },
    globals: {
      React: "readonly",
      JSX: "readonly",
      console: "readonly",
      process: "readonly",
      module: "readonly",
      require: "readonly",
      __dirname: "readonly",
      __filename: "readonly",
      // DOM globals
      HTMLElement: "readonly",
      HTMLButtonElement: "readonly",
      HTMLDivElement: "readonly",
      DOMRect: "readonly",
      requestAnimationFrame: "readonly",
      cancelAnimationFrame: "readonly",
      document: "readonly",
      window: "readonly",
    },
  },
  plugins: {
    "@typescript-eslint": tseslint,
    react: react,
    "react-hooks": reactHooks,
    prettier: prettier,
  },
  rules: {
    // ESLint recommended rules
    ...eslint.configs.recommended.rules,

    // TypeScript rules
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",

    // React rules
    "react/react-in-jsx-scope": "off", // React 17+ doesn't need React import
    "react/prop-types": "off", // Using TypeScript for prop validation
    "react/jsx-uses-react": "error",
    "react/jsx-uses-vars": "error",

    // React Hooks rules
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",

    // Prettier integration
    "prettier/prettier": "error",

    // Best practices
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error",
    eqeqeq: ["error", "always"],
    "no-undef": "off", // TypeScript handles this
    "no-unused-vars": "off", // Use @typescript-eslint/no-unused-vars instead
  },
  settings: {
    react: {
      version: "detect",
    },
  },
}, // Prettier config should come last to override other formatting rules
prettierConfig, ...storybook.configs["flat/recommended"]];
