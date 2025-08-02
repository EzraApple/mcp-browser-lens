import { FlatCompat } from "@eslint/eslintrc";
import tseslint from "typescript-eslint";

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "captured/**",
      "**/*.js",
      "**/*.d.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/no-explicit-any": "off", // Allow any types for CDP client
      "@typescript-eslint/no-var-requires": "off", // Allow require() for chrome-remote-interface
      "@typescript-eslint/no-unsafe-assignment": "off", // Allow unsafe assignments for CDP
      "@typescript-eslint/no-unsafe-call": "off", // Allow unsafe calls for CDP
      "@typescript-eslint/no-unsafe-member-access": "off", // Allow unsafe member access for CDP
      "@typescript-eslint/no-unsafe-return": "off", // Allow unsafe returns for CDP
      "@typescript-eslint/restrict-template-expressions": "off", // Allow any in template expressions
      "@typescript-eslint/prefer-nullish-coalescing": "warn", // Prefer ?? but only warn
      "@typescript-eslint/no-inferrable-types": "off", // Allow explicit type annotations
      "@typescript-eslint/consistent-generic-constructors": "off", // Allow flexibility
      "@typescript-eslint/no-require-imports": "off", // Allow require imports
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
);