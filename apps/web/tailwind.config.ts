import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark Navigation Palette
        navy: {
          950: '#0B1226',
          900: '#101A35', // Primary sidebar
          850: '#14203F',
          800: '#17264A', // Secondary sidebar / hover
          700: '#23345E',
          600: '#32477B',
        },
        sidebar: {
          bg: '#101A35',
          surface: '#17264A',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#E8EEFF',
          muted: '#AAB6D3',
          active: '#246BFD',
          hover: '#1D2F5A',
        },
        // Light Workspace Palette
        workspace: {
          bg: '#F5F7FC', // Main background
          card: '#FFFFFF',
          border: '#E5EAF4',
        },
        // Brand & Accent SaaS Blues
        brand: {
          50: '#F0F5FF',
          100: '#E0EBFF',
          200: '#C2D7FF',
          300: '#94BCFF',
          400: '#5595FF', // Secondary blue
          500: '#246BFD', // Primary blue
          600: '#1A56DE',
          700: '#1442B5',
          800: '#133893',
          900: '#153275',
          950: '#0F1F49',
        },
        // Text Palette
        content: {
          primary: '#17213A', // Main text
          secondary: '#77829A', // Secondary text
          muted: '#9DA8BE',
        },
      },
      fontFamily: {
        sans: ['Cairo', 'Alexandria', 'Tahoma', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgba(16, 26, 53, 0.06), 0 1px 3px rgba(16, 26, 53, 0.04)',
        card: '0 4px 20px -2px rgba(23, 33, 58, 0.05), 0 2px 6px -1px rgba(23, 33, 58, 0.03)',
        floating: '0 12px 32px -4px rgba(16, 26, 53, 0.12), 0 4px 12px -2px rgba(16, 26, 53, 0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
