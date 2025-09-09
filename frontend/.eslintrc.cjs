module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:svelte/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    extraFileExtensions: ['.svelte']
  },
  env: {
    browser: true,
    es2017: true,
    node: true
  },
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser'
      },
      rules: {
        // Svelte-specific rules
        'svelte/no-at-html-tags': 'error',
        'svelte/no-dom-manipulating': 'error',
        'svelte/no-dupe-else-if-blocks': 'error',
        'svelte/no-duplicate-style-properties': 'error',
        'svelte/no-dynamic-slot-name': 'error',
        'svelte/no-export-load-in-svelte-module-in-kit-pages': 'error',
        'svelte/no-not-function-handler': 'error',
        'svelte/no-object-in-text-mustaches': 'error',
        'svelte/no-reactive-functions': 'error',
        'svelte/no-reactive-literals': 'error',
        'svelte/no-shorthand-style-property-overrides': 'error',
        'svelte/no-unknown-style-directive-property': 'error',
        'svelte/no-unused-svelte-ignore': 'error',
        'svelte/no-useless-mustaches': 'error',
        'svelte/prefer-class-directive': 'error',
        'svelte/prefer-style-directive': 'error',
        'svelte/require-store-callbacks-use-set-param': 'error',
        'svelte/valid-compile': 'error',
        
        // TypeScript rules adjustments for Svelte
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn'
      }
    }
  ],
  rules: {
    // General TypeScript rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error',
    '@typescript-eslint/no-var-requires': 'off',
    
    // General JavaScript rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error'
  }
};