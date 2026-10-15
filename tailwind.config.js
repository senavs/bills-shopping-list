/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  // hover: styles only on devices that can hover, so they don't stick after a tap on iOS
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      // Design tokens, defined as CSS variables in src/index.css (light + .dark)
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        fill: 'var(--fill)',
        ink: token('ink'),
        muted: token('muted'),
        hairline: token('hairline'),
        accent: token('accent'),
        'on-accent': token('on-accent'),
        tag: token('tag'),
        'on-tag': token('on-tag'),
        danger: token('danger'),
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      // iOS text styles: large title, title, body, callout, footnote
      fontSize: {
        'large-title': ['34px', { lineHeight: '41px', letterSpacing: '0.01em' }],
        title: ['22px', { lineHeight: '28px' }],
        body: ['17px', { lineHeight: '22px' }],
        callout: ['15px', { lineHeight: '20px' }],
        footnote: ['13px', { lineHeight: '18px' }],
      },
      borderRadius: {
        group: '10px',
      },
    },
  },
  plugins: [],
}
