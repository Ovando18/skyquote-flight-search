import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cockpit: { 950: '#050D1C', 900: '#0A192F', 800: '#0B132B' },
        panel: { DEFAULT: '#112240', 2: '#1C2541', 3: '#16294A' },
        line: { DEFAULT: '#233554', strong: '#2E4A70' },
        horizon: { DEFAULT: '#38BDF8', deep: '#00B4D8', dim: '#0E7490' },
        instrument: { DEFAULT: '#F59E0B', dim: '#B45309' },
        radar: { DEFAULT: '#10B981', dim: '#047857' },
        ink: { DEFAULT: '#E6F1FF', muted: '#8892B0', faint: '#5C6B8A' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(56,189,248,0.35), 0 0 24px -4px rgba(56,189,248,0.35)',
        amber: '0 0 0 1px rgba(245,158,11,0.45), 0 0 22px -6px rgba(245,158,11,0.5)',
        card: '0 10px 30px -12px rgba(2,8,23,0.8)',
      },
      keyframes: {
        sweep: { to: { transform: 'rotate(360deg)' } },
        blip: { '0%,100%': { opacity: '0.15' }, '50%': { opacity: '1' } },
        fly: { '0%': { left: '0%' }, '100%': { left: '100%' } },
        rise: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        sweep: 'sweep 2.4s linear infinite',
        blip: 'blip 1.8s ease-in-out infinite',
        fly: 'fly 2.2s ease-in-out infinite',
        rise: 'rise 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
