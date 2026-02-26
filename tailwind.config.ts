
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'orbitron': ['Orbitron', 'sans-serif'],
				'rajdhani': ['Rajdhani', 'sans-serif'],
				'oswald': ['Oswald', 'sans-serif'],
				'roboto-condensed': ['"Roboto Condensed"', 'sans-serif'],
				'roboto': ['Roboto', 'sans-serif'],
				'sans': ['"Plus Jakarta Sans"', 'sans-serif'],
				'display': ['Orbitron', 'sans-serif'],
			},
			colors: {
				'wine-dark': '#2D1418',
				'wine-base': '#421C22',
				'wine-light': '#5A242B',
				'accent-red': '#E94560',
				'sidebar-dark': '#1a0b0d',
				'sidebar-glass': 'rgba(26, 11, 13, 0.45)',
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				nexa: {
					red: '#FF1F44',
					dark: '#0E0E0E',
					'red-dark': '#CC1936',
					'red-light': '#FF4D70'
				},
				// Military theme colors
				military: {
					'army-green': '#2F3E34',
					'charcoal': '#1C1F22',
					'desert-tan': '#C2B280',
					'steel-gray': '#6B7280',
					'tactical-red': '#B11226',
					'military-orange': '#D97706',
				},
				// Wallet redesign color tokens
				wallet: {
					'bg-main': '#F8F9FB',
					'hero-gradient-start': '#FFE8ED',
					'hero-gradient-end': '#FFFFFF',
					'red-primary': '#FF1F44',
					'red-light': '#FFE8ED',
					'text-primary': '#1A1A1A',
					'text-secondary': '#9E9E9E',
					'text-tertiary': '#616161',
					'success': '#4CAF50',
					'error': '#FF5252',
					'card-white': '#FFFFFF',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'glow-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 20px rgba(255, 31, 68, 0.3)'
					},
					'50%': {
						boxShadow: '0 0 40px rgba(255, 31, 68, 0.6)'
					}
				},
				'slide-up': {
					'0%': {
						transform: 'translateY(20px)',
						opacity: '0'
					},
					'100%': {
						transform: 'translateY(0)',
						opacity: '1'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0'
					},
					'100%': {
						opacity: '1'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'slide-up': 'slide-up 0.6s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'scale-in': 'scale-in 0.3s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
