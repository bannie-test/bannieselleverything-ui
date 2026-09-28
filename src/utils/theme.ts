import type { ColorMode, CornerStyle, FontFamily } from '@/api/types'
import { storage } from '@/utils/storage'

interface FontOption {
  label: string
  stack: string
  /** Google Fonts family spec; the system stack needs no download. */
  google?: string
}

export const fonts: Record<FontFamily, FontOption> = {
  system: { label: 'System default', stack: "ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'" },
  inter: { label: 'Inter', stack: "'Inter', ui-sans-serif, system-ui, sans-serif", google: 'Inter:wght@400;500;600;700' },
  'be-vietnam-pro': {
    label: 'Be Vietnam Pro',
    stack: "'Be Vietnam Pro', ui-sans-serif, system-ui, sans-serif",
    google: 'Be+Vietnam+Pro:wght@400;500;600;700',
  },
  nunito: { label: 'Nunito', stack: "'Nunito', ui-sans-serif, system-ui, sans-serif", google: 'Nunito:wght@400;500;600;700' },
  lora: { label: 'Lora (serif)', stack: "'Lora', ui-serif, Georgia, serif", google: 'Lora:wght@400;500;600;700' },
  playfair: {
    label: 'Playfair Display (serif)',
    stack: "'Playfair Display', ui-serif, Georgia, serif",
    google: 'Playfair+Display:wght@400;500;600;700',
  },
}

export const cornerStyles: Record<CornerStyle, { label: string; radii: [md: string, lg: string, xl: string, xxl: string] }> = {
  sharp: { label: 'Sharp', radii: ['0.125rem', '0.125rem', '0.25rem', '0.25rem'] },
  rounded: { label: 'Rounded', radii: ['0.375rem', '0.5rem', '0.75rem', '1rem'] },
  pill: { label: 'Soft', radii: ['0.75rem', '1.25rem', '1.5rem', '2rem'] },
}

/** Near-black or white, whichever reads better on `hex` (WCAG relative luminance). */
export function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#ffffff'
  const n = parseInt(m[1]!, 16)
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  // Contrast against white vs. against stone-900 (#1c1917, luminance ≈ 0.011).
  return (1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.061) ? '#ffffff' : '#1c1917'
}

export interface ThemeInput {
  primaryColor: string
  accentColor: string
  fontFamily: FontFamily
  cornerStyle: CornerStyle
  colorMode?: ColorMode
}

/** CSS custom properties for a theme; bind to `style` to theme a subtree. */
export function themeVars(t: ThemeInput): Record<string, string> {
  const [md, lg, xl, xxl] = (cornerStyles[t.cornerStyle] ?? cornerStyles.rounded).radii
  return {
    '--tenant-primary': t.primaryColor,
    '--tenant-on-primary': readableOn(t.primaryColor),
    '--tenant-accent': t.accentColor,
    '--tenant-on-accent': readableOn(t.accentColor),
    '--tenant-font': (fonts[t.fontFamily] ?? fonts.system).stack,
    '--tenant-radius-md': md,
    '--tenant-radius-lg': lg,
    '--tenant-radius-xl': xl,
    '--tenant-radius-2xl': xxl,
  }
}

/** Loads a Google font once. Safe to call repeatedly. */
export function loadFont(family: FontFamily) {
  const spec = fonts[family]?.google
  if (!spec) return
  const id = `font-${family}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`
  document.head.appendChild(link)
}

const darkQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
const COLOR_MODE_KEY = 'color-mode'
/** Last mode this shop used, so a dark shop doesn't flash light while its settings load. */
let pageColorMode = (storage.get(COLOR_MODE_KEY) as ColorMode | null) ?? 'light'

/** Whether `mode` means dark right now; 'system' asks the OS. */
export function isDark(mode: ColorMode | undefined): boolean {
  return mode === 'dark' || (mode === 'system' && !!darkQuery?.matches)
}

/** Class that puts a subtree in the given color mode (see style.css). */
export function colorModeClass(mode: ColorMode | undefined): 'theme-dark' | 'theme-light' {
  return isDark(mode) ? 'theme-dark' : 'theme-light'
}

function applyColorMode() {
  document.documentElement.classList.toggle('theme-dark', isDark(pageColorMode))
}
// A shop set to 'system' follows the OS switching between light and dark while the page is open.
darkQuery?.addEventListener('change', applyColorMode)
applyColorMode()

/** Axis and gridline colors for Chart.js, which draws on a canvas and can't follow the CSS palette. */
export function chartColors(): { grid: string; tick: string } {
  return document.documentElement.classList.contains('theme-dark') ? { grid: '#44403c', tick: '#a8a29e' } : { grid: '#e7e5e4', tick: '#78716c' }
}

/** Themes the whole page. */
export function applyTheme(t: ThemeInput) {
  loadFont(t.fontFamily)
  const root = document.documentElement.style
  for (const [key, value] of Object.entries(themeVars(t))) root.setProperty(key, value)
  pageColorMode = t.colorMode ?? 'light'
  storage.set(COLOR_MODE_KEY, pageColorMode)
  applyColorMode()
}
