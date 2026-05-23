const js = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");
const angular = require("@angular-eslint/eslint-plugin");
const angularTemplateParser = require("@angular-eslint/template-parser");

const browserGlobals = {
  window: "readonly",
  localStorage: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  confirm: "readonly",
  navigator: "readonly",
  crypto: "readonly",
  document: "readonly",
  XMLHttpRequest: "readonly",
  fetch: "readonly",
  Request: "readonly",
  Response: "readonly",
  FormData: "readonly",
};

const vitestGlobals = {
  describe: "readonly",
  it: "readonly",
  test: "readonly",
  expect: "readonly",
  vi: "readonly",
  beforeEach: "readonly",
  afterEach: "readonly",
  beforeAll: "readonly",
  afterAll: "readonly",
};

module.exports = [
  { ignores: ["dist/**", "node_modules/**", ".angular/**"] },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: ["tsconfig.json", "tsconfig.app.json", "tsconfig.spec.json"],
        createDefaultProgram: true,
      },
      globals: {
        ...browserGlobals,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "@angular-eslint": angular,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...angular.configs.recommended.rules,
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "app", style: "kebab-case" },
      ],
      "max-len": [
        "warn",
        {
          code: 200,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
        },
      ],
    },
  },
  {
    files: ["**/*.spec.ts"],
    languageOptions: {
      globals: {
        ...vitestGlobals,
      },
    },
  },
  {
    files: ["**/*.html"],
    languageOptions: {
      parser: angularTemplateParser,
    },
    plugins: {
      "@angular-eslint": angular,
    },
    rules: {
      ...angular.configs.recommended.rules,
    },
  },
];
