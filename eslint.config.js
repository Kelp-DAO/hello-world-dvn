import globals from "globals";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts}"] },
  { languageOptions: { globals: globals.browser } },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Manually include Prettier config
    files: ["**/*.{js,mjs,cjs,ts}"],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
      "linebreak-style": ["error", "unix"],
      quotes: 0,
      semi: ["error", "always"],
      "no-constant-condition": 0,
      // Disable ESLint rules that conflict with Prettier
      "arrow-body-style": "off",
      "prefer-arrow-callback": "off",
    },
  },
];
