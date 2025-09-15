import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Neutrals
        'brand-background': '#F9FAFB',
        'brand-surface': '#FFFFFF',
        
        // Text Colors
        'brand-text-primary': '#111827',
        'brand-text-secondary': '#6B7280',
        
        // Accent Colors
        'brand-amber': {
          DEFAULT: '#F59E0B',
          light: '#FBBF24',
          dark: '#D97706',
        },
        'brand-emerald': {
          DEFAULT: '#10B981',
          light: '#34D399',
          dark: '#059669',
        },
        'brand-rose': {
          DEFAULT: '#EF4444',
          light: '#F87171',
          dark: '#DC2626',
        },
        
        // Practice Mode Colors
        'practice-listen': {
          bg: '#DBEAFE',
          icon: '#3B82F6',
        },
        'practice-photo': {
          bg: '#EDE9FE',
          icon: '#8B5CF6',
        },
        'practice-read': {
          bg: '#D1FAE5',
          icon: '#10B981',
        },
        'practice-custom': {
          bg: '#FEF3C7',
          icon: '#F59E0B',
        },
      },
      animation: {
        'smooth': 'smooth 200ms ease-in-out',
      },
      transitionDuration: {
        '200': '200ms',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config;