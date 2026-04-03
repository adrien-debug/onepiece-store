import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--dashboard-page)',
        surface: 'var(--dashboard-surface)',
        card: 'var(--dashboard-card)',
        accent: 'var(--dashboard-accent)',
        'text-bright': 'var(--dashboard-text-bright)',
        'text-primary': 'var(--dashboard-text-primary)',
        'text-secondary': 'var(--dashboard-text-secondary)',
        'text-muted': 'var(--dashboard-text-muted)',
        border: 'var(--dashboard-border)',
        success: 'var(--dashboard-success)',
        warning: 'var(--dashboard-warning)',
        error: 'var(--dashboard-error)',
        info: 'var(--dashboard-info)',
        'op-brand': 'var(--op-brand)',
        'op-cream': 'var(--op-cream)',
        'op-ink': 'var(--op-ink)',
        'op-muted': 'var(--op-muted)',
        'op-card': 'var(--op-card)',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--dashboard-font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        box: 'var(--dashboard-radius-box)',
        card: 'var(--dashboard-radius-card)',
        input: 'var(--dashboard-radius-input)',
        button: 'var(--dashboard-radius-button)',
      },
      boxShadow: {
        dashboard: 'var(--dashboard-shadow-md)',
        'dashboard-lg': 'var(--dashboard-shadow-lg)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
