import { fileURLToPath } from "node:url";
import importPlugin from "eslint-plugin-import";
import vitest from "@vitest/eslint-plugin";
import tseslint from "typescript-eslint";

const tsconfigPath = "./tsconfig.eslint.json";
const tsconfigRootDir = fileURLToPath(new URL(".", import.meta.url));

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map(
  (config) => ({
    ...config,
    files: ["**/*.ts"],
  }),
);

const stylisticConfigs = tseslint.configs.stylisticTypeChecked.map(
  (config) => ({
    ...config,
    files: ["**/*.ts"],
  }),
);

export default tseslint.config(
  {
    ignores: [
      "dist/",
      "node_modules/",
      "**/*.d.ts",
      "resources/",
      "**/tsconfig*.json",
    ],
  },
  ...typeCheckedConfigs,
  ...stylisticConfigs,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: tsconfigPath,
        tsconfigRootDir,
        sourceType: "module",
        ecmaVersion: "latest",
      },
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
        structuredClone: "readonly",
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: tsconfigPath,
        },
      },
    },
    rules: {
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      "import/extensions": ["error", "ignorePackages", { ts: "never" }],
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "**/*.test.ts",
            "**/__tests__/**/*.ts",
            "vitest.config.ts",
            "eslint.config.js",
          ],
        },
      ],
      "import/order": [
        "warn",
        {
          groups: [
            ["builtin", "external"],
            ["internal"],
            ["parent", "sibling", "index"],
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "class-methods-use-this": "off",
      "no-console": "off",
      "no-await-in-loop": "off",
      "no-restricted-syntax": "off",
      "key-spacing": ["error", { beforeColon: false, afterColon: true }],
      "no-multi-spaces": [
        "error",
        {
          exceptions: {
            VariableDeclarator: true,
            PropertyAssignment: true,
            AssignmentExpression: true,
          },
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/__tests__/**/*.ts"],
    plugins: {
      vitest,
    },
    languageOptions: {
      globals: vitest.environments.env.globals,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
  },
  {
    files: ["eslint.config.js", "vitest.config.ts", "tsconfig*.json"],
    languageOptions: {
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
      },
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "import/no-extraneous-dependencies": "off",
    },
  },
);
