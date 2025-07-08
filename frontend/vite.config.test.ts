import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(() => {
	// Force test mode environment loading
	const env = loadEnv('test', process.cwd(), '');
	
	// Test-specific API target
	const apiTarget = env.PUBLIC_API_URL ? 
		env.PUBLIC_API_URL.replace('/api/v1', '') : 
		'http://localhost:3000';
		
	console.log(`[Vite Test] API Target: ${apiTarget}`);
	console.log(`[Vite Test] PUBLIC_API_URL: ${env.PUBLIC_API_URL}`);
	
	return {
		plugins: [sveltekit()],
		server: {
			port: 4173,
			strictPort: false,
			proxy: {
				'/api': {
					target: apiTarget,
					changeOrigin: true,
					secure: false,
				},
			},
		},
		// Ensure test environment variables are embedded during build
		define: {
			'import.meta.env.PUBLIC_API_URL': JSON.stringify(
				env.PUBLIC_API_URL || 'http://localhost:3000/api/v1'
			),
			'import.meta.env.PUBLIC_APP_NAME': JSON.stringify(
				env.PUBLIC_APP_NAME || 'bŏs'
			),
			'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(
				env.PUBLIC_APP_VERSION || '0.0.1'
			),
		},
		// Test-specific build options
		build: {
			sourcemap: true,
			minify: false, // Easier debugging in tests
		},
	};
});