/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light theme colors
        'lemon-icing': '#F9F1D2',
        'nimbus-cloud': '#D5D5D7',
        'raindrops-roses': '#EAD8DE',
        'cloud-dancer': '#F0F0F0',
        'ice-melt': '#D6E4F0',
        'peach-dust': '#F3DFD1',
        'almost-aqua': '#D1DBCB',
        'orchid-tint': '#E1D5E3',
        'fuku-brand': '#c0b7c9',
        
        // Theme-aware colors using CSS variables
        'glass-bg': 'var(--glass-bg)',
        'glass-border': 'var(--glass-border)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'accent': 'var(--accent)',
        
        // Professional Linux dark theme colors
        'terminal-bg': '#1e1e1e',
        'terminal-fg': '#e5e5e5',
        'terminal-selection': '#3b82f6',
        'terminal-cursor': '#ffffff',
        'sidebar-dark': '#2a2a2a',
        'panel-dark': '#252525',
      },
      backdropBlur: {
        'glass-light': '12px',
        'glass-medium': '20px', 
        'glass-heavy': '32px',
        'glass-extreme': '48px',
      },
      backdropSaturate: {
        'glass': '120%',
        'glass-high': '140%',
        'glass-extreme': '180%',
      },
      backdropBrightness: {
        'glass': '110%',
        'glass-high': '115%',
        'glass-low': '95%',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(255, 255, 255, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
        'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(255, 255, 255, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
        'glass-elevated': '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(255, 255, 255, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.4)',
        'glass-elevated-dark': '0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(255, 255, 255, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.15)',
      },
      borderColor: {
        'glass': 'var(--glass-border)',
      }
    },
  },
  plugins: [],
}
