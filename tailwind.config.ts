import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: { DEFAULT: '#2d7a4f', light: '#3a9962', dark: '#1f5537', muted: '#e8f5ee' },
          gold: { DEFAULT: '#c9a84c', light: '#d4b96a', dark: '#9e7e33', muted: '#faf5e8' },
        },
      },
    },
  },
  plugins: [],
}
export default config
