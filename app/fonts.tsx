import clsx from 'clsx'
import localFont from 'next/font/local'

const main = localFont({
  variable: '--font-main',
  display: 'swap',
  preload: true,
  src: [
    {
      path: '../public/fonts/neue-haas-display/NeueHaasDisplay-Light.woff2',
      weight: '300',
      style: 'normal'
    },
    {
      path: '../public/fonts/neue-haas-display/NeueHaasDisplay-LightItalic.woff2',
      weight: '300',
      style: 'italic'
    },
    {
      path: '../public/fonts/neue-haas-display/NeueHaasDisplay-Roman.woff2',
      weight: '500',
      style: 'normal'
    },
    {
      path: '../public/fonts/neue-haas-display/NeueHaasDisplay-RomanItalic.woff2',
      weight: '500',
      style: 'italic'
    },
    {
      path: '../public/fonts/neue-haas-display/NeueHaasDisplay-Bold.woff2',
      weight: '700',
      style: 'normal'
    },
    {
      path: '../public/fonts/neue-haas-display/NeueHaasDisplay-BoldItalic.woff2',
      weight: '700',
      style: 'italic'
    }
  ],
  fallback: ['system-ui', 'Arial']
})

const heading = localFont({
  variable: '--font-heading',
  display: 'swap',
  preload: true,
  src: [
    {
      path: '../public/fonts/cal-sans/CalSans-SemiBold.woff2',
      weight: '600',
      style: 'normal'
    }
  ],
  fallback: ['system-ui', 'Arial']
})

export const fonts = clsx(main.variable, heading.variable)
