/**
 * Admin-editable theme (brand colors + logo). Colors are stored in the
 * settings table as `theme.<key>` (hex, e.g. #c9f73a) and injected as CSS
 * custom-property overrides in the root layout; a missing row means "use the
 * default below" (which mirror globals.css). Pure data — safe anywhere.
 */

export const THEME_DEFAULTS = {
  accent: "#c9f73a",
  accent2: "#59e3ea",
  bg: "#070906",
  fg: "#e9efe2",
  muted: "#93a08a",
  surface: "#0c100a",
  surface2: "#131910",
  border: "#28301f",
} as const;

export type ThemeKey = keyof typeof THEME_DEFAULTS;
export type SiteTheme = Record<ThemeKey, string>;

export const THEME_SETTING_PREFIX = "theme.";
export const LOGO_SETTING_KEY = "branding.logo";

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** key → CSS custom property in globals.css */
export const THEME_CSS_VARS: Record<ThemeKey, string> = {
  accent: "--accent",
  accent2: "--accent-2",
  bg: "--bg",
  fg: "--fg",
  muted: "--muted",
  surface: "--surface",
  surface2: "--surface-2",
  border: "--border",
};

export const THEME_LABELS: Record<ThemeKey, string> = {
  accent: "Accent (buttons, highlights)",
  accent2: "Secondary accent",
  bg: "Page background",
  fg: "Text",
  muted: "Muted text",
  surface: "Panel background",
  surface2: "Input / raised background",
  border: "Borders",
};

// Logo upload constraints (stored as a data URI in the settings table).
export const LOGO_MAX_BYTES = 300 * 1024;
export const LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];
