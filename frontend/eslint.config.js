import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import namingConventionRule from './eslint-custom-rules/naming-convention-simple.js';

export default [
	// JavaScript recommended rules
	js.configs.recommended,

	// Prettier config (disables formatting rules)
	prettier,

	// Global ignores
	{
		ignores: [
			'.DS_Store',
			'node_modules/**',
			'build/**',
			'.svelte-kit/**',
			'package/**',
			'.env',
			'.env.*',
			'!.env.example',
			'vite.config.ts.timestamp-*',
			'vite.config.js.timestamp-*',
		],
	},

	// Base configuration for all files
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2017,
				...globals.node,
			},
			ecmaVersion: 2020,
			sourceType: 'module',
		},
		plugins: {
			'epic-007': {
				rules: {
					'naming-convention': namingConventionRule
				}
			}
		},
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error'] }],
			'epic-007/naming-convention': 'warn', // ✅ ENABLED: EPIC-007 Phase 2 naming convention
			'no-unused-vars': 'off', // Turn off base rule to avoid conflicts with TypeScript version
		},
	},

	// TypeScript configuration
	{
		files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				extraFileExtensions: ['.svelte'],
			},
		},
		plugins: {
			'@typescript-eslint': typescript,
		},
		rules: {
			...typescript.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},

	// Service Worker configuration
	{
		files: ['**/service-worker.ts', '**/service-worker.js'],
		languageOptions: {
			globals: {
				...globals.serviceworker,
				ServiceWorkerGlobalScope: 'readonly',
			},
		},
	},

	// Svelte configuration
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: typescriptParser,
			},
		},
		plugins: {
			svelte,
			'@typescript-eslint': typescript,
		},
		rules: {
			...svelte.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},
];
