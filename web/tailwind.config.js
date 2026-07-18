/** @type {import('tailwindcss').Config} */
export default {
  // MUI's CssBaseline is the single source of baseline/reset styles, so we turn
  // off Tailwind's preflight. Tailwind is used only as a layout-utility layer.
  corePlugins: {
    preflight: false,
  },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
