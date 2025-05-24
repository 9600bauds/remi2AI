// eslint.config.js
import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // --- Global Ignores ---
  // Standard directories and files to exclude from linting.
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '.turbo/**',
      '.*.tmp/**', // Common temp file pattern
      '*.config.js', // Ignore JavaScript config files like postcss.config.js
      '.prettierrc.json', // Prettier config itself
      'LICENSE',
      // Note: vite.config.ts and other root .ts configs are handled specifically below, not globally ignored here.
    ],
  },

  // --- Base ESLint and TypeScript ESLint Configurations ---
  // 1. ESLint's recommended JavaScript rules.
  eslintJs.configs.recommended,

  // 2. TypeScript-ESLint's recommended type-checked rules.
  // This enables rules that leverage TypeScript's type information for more robust linting.
  ...tseslint.configs.recommendedTypeChecked,

  // --- Specific Configuration for Application Source Code (src/**) ---
  // Applies type-aware linting and React rules to files within the 'src' directory.
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json'], // Use tsconfig.app.json for src files
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
      'jsx-a11y': eslintPluginJsxA11y,
    },
    rules: {
      // Type-aware rules for application code
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false, // Allow void-returning async functions in JSX event handlers
          },
        },
      ],

      'linebreak-style': ['error', 'windows'],

      // React specific rules
      ...eslintPluginReact.configs.recommended.rules,
      ...eslintPluginReact.configs['jsx-runtime'].rules, // For the new JSX transform
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginJsxA11y.configs.recommended.rules,
      'react/prop-types': 'off', // Not necessary with TypeScript
      'react/react-in-jsx-scope': 'off', // Not necessary with the new JSX transform

      // User specific
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
    settings: {
      react: {
        version: 'detect', // Automatically detect React version
      },
    },
  },

  // --- Specific Configuration for Root TypeScript Configuration Files ---
  // Applies type-aware linting to root-level .ts files like vite.config.ts.
  {
    files: ['vite.config.ts', '*.config.ts'], // Target vite.config.ts and other root .config.ts files
    // Ensure this doesn't unintentionally match something in `src`
    // (though `src` specific config above should take precedence for those)
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json'], // Use tsconfig.node.json for these files
        tsconfigRootDir: import.meta.dirname,
      },
      // These files are typically Node.js modules
      // globals: {
      //   process: 'readonly',
      //   __dirname: 'readonly',
      // },
    },
    rules: {
      // Relax or adjust rules as needed for configuration files
      '@typescript-eslint/no-var-requires': 'off', // Allow require if used in CJS style config
      // Example: 'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },

  // --- Prettier Configuration (Must be Last) ---
  // Disables ESLint formatting rules that conflict with Prettier.
  // Prettier handles all code formatting.
  eslintConfigPrettier
);

