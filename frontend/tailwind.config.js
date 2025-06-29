/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Base colors
				black: '#000000',
				white: '#FFFFFF',

				// Dark theme colors
				dark: {
					100: '#1C1C1E',
					200: '#1C1C1D',
					300: '#3A3A3C',
					400: '#38383A',
					500: '#48484A',
				},

				// Text colors
				text: {
					primary: '#F2F2F7',
					secondary: '#C7C7CC',
					tertiary: '#8E8E93',
				},

				// Accent colors
				blue: {
					500: '#00A3FF',
					600: '#0089E0',
					700: '#0A84FF',
				},
				red: {
					500: '#FF453A',
					600: '#FF3B30',
				},
				green: {
					500: '#32D74B',
				},
				yellow: {
					500: '#FFD60A',
				},
				orange: {
					500: '#FF9F0A',
				},
				purple: {
					500: '#BF5AF2',
				},
			},

			backgroundColor: {
				primary: '#1C1C1E',
				secondary: '#1C1C1D',
				tertiary: '#3A3A3C',
			},

			borderColor: {
				primary: '#38383A',
			},

			fontFamily: {
				sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'Roboto', 'sans-serif'],
			},

			spacing: {
				'4xs': '0.125rem', // 2px
				'3xs': '0.25rem', // 4px
				'2xs': '0.5rem', // 8px
				xs: '0.75rem', // 12px
				sm: '1rem', // 16px
				md: '1.5rem', // 24px
				lg: '2rem', // 32px
				xl: '2.5rem', // 40px
				'2xl': '3rem', // 48px
				'3xl': '4rem', // 64px
			},

			boxShadow: {
				sm: '0 1px 3px rgba(0, 0, 0, 0.04)',
				md: '0 4px 6px rgba(0, 0, 0, 0.07)',
				lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
				xl: '0 20px 60px rgba(0, 0, 0, 0.5)',
			},

			transitionDuration: {
				fast: '150ms',
				normal: '250ms',
				slow: '350ms',
			},

			transitionTimingFunction: {
				smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
			},

			borderRadius: {
				sm: '4px',
				md: '6px',
				lg: '8px',
				xl: '12px',
				'2xl': '16px',
				full: '9999px',
			},

			zIndex: {
				dropdown: '100',
				sticky: '200',
				fixed: '300',
				'modal-backdrop': '1000',
				modal: '1001',
				popover: '2000',
				tooltip: '3000',
				notification: '4000',
				max: '9999',
			},
		},
	},
	plugins: [],
};
