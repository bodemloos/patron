/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        // Neutral charcoal palette — calm, content-forward dark.
        // No purple/magenta tint; depth comes from drop shadows, not bloom.
        surface: {
          950: '#141414',  // page background, deepest
          900: '#1c1c1d',  // default card surface
          850: '#232325',  // raised / role-pill
          800: '#2c2c2e',  // hover, secondary surface
          700: '#3a3a3d',  // borders / dividers
          600: '#4d4d51',  // muted accents
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Neutral depth shadow + inner rim-light. Calm and flat — depth
        // comes from a single soft drop shadow, not colored ambient glow.
        // Combined into one utility so a single class produces both layers.
        glow: '0 12px 32px -12px rgba(0, 0, 0, 0.55), 0 4px 12px -6px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        // Tighter drop for smaller chips / buttons.
        'glow-sm': '0 4px 16px -6px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        // Warm orange aura for primary CTAs — only spot of color in the
        // shadow language, since brand orange is the only true accent.
        'brand-glow': '0 8px 24px -10px rgba(234, 88, 12, 0.55), 0 0 14px -4px rgba(249, 115, 22, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        // Subtle top inner highlight by itself (for inputs, ghost buttons).
        edge: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
