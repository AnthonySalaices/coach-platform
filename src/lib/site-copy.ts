/**
 * Registry of every admin-editable string on the public site.
 * Stored in the settings table as `copy.<key>`; a missing/blank row means
 * "use the default below". Pure data — safe to import anywhere.
 */

export const COPY_DEFAULTS = {
  "meta.description":
    "Self-hostable coaching for gamers — book top coaches, climb.",

  "nav.gameplan": "game plan",
  "nav.roster": "roster",
  "nav.signin": "sign in with discord",

  "hero.eyebrow": "[ for players done being hardstuck ]",
  "hero.title1": "Stop coping.",
  "hero.title2": "Start climbing.",
  "hero.sub":
    "Book 1-on-1 sessions with top-ranked coaches across your favorite games. VOD reviews, live duos, and a plan that actually moves your rank — not vibes.",
  "hero.cta": "get started — free to browse",
  "hero.cta2": "see the game plan",

  "ticker.items":
    "VOD REVIEW\nLIVE DUO\nRANK UP\nAIM AUDIT\nMACRO FIX\nNO VIBES, JUST WINS\nPRIVATE DISCORD\nREAL FEEDBACK",

  "how.title": "The game plan",
  "how.step1.tag": "lock in",
  "how.step1.title": "Find your coach",
  "how.step1.body":
    "Filter by game and pick a verified, top-ranked coach who fits your goals.",
  "how.step2.tag": "queue up",
  "how.step2.title": "Book a session",
  "how.step2.body":
    "Secure Stripe checkout. A private Discord channel spins up for the two of you.",
  "how.step3.tag": "rank up",
  "how.step3.title": "Level up",
  "how.step3.body":
    "VOD breakdowns, live coaching, and homework. Then rate your session.",

  "roster.title": "The roster",
  "roster.empty": "No coaches listed yet — check back soon.",

  "footer.tagline": "open-source, self-hosted coaching.",

  "signin.eyebrow": "[ player login ]",
  "signin.title": "Ready up.",
  "signin.sub":
    "We use Discord to sign you in — sessions happen there anyway. You'll approve on discord.com, the official Discord site.",
  "signin.button": "Continue with Discord",
  "signin.trust.yes": "we receive your discord username, avatar & email",
  "signin.trust.no1": "we never see your password or DMs",
  "signin.trust.no2": "nothing is posted to your account",
  "signin.foot":
    "free to browse · payments handled by stripe · sessions in private discord channels",
} as const;

export type CopyKey = keyof typeof COPY_DEFAULTS;
export type SiteCopy = Record<CopyKey, string>;

export const COPY_SETTING_PREFIX = "copy.";
export const COPY_MAX_LENGTH = 2000;

export interface CopyField {
  key: CopyKey;
  label: string;
  multiline?: boolean;
  help?: string;
}

export interface CopyGroup {
  id: string;
  title: string;
  fields: CopyField[];
}

export const COPY_GROUPS: CopyGroup[] = [
  {
    id: "general",
    title: "General",
    fields: [
      {
        key: "meta.description",
        label: "Meta description (browser tab / link previews)",
        multiline: true,
      },
    ],
  },
  {
    id: "nav",
    title: "Landing · navigation",
    fields: [
      { key: "nav.gameplan", label: "Nav link — how it works" },
      { key: "nav.roster", label: "Nav link — coaches" },
      { key: "nav.signin", label: "Nav sign-in button" },
    ],
  },
  {
    id: "hero",
    title: "Landing · hero",
    fields: [
      { key: "hero.eyebrow", label: "Eyebrow line" },
      { key: "hero.title1", label: "Headline — line 1" },
      { key: "hero.title2", label: "Headline — line 2 (highlighted)" },
      { key: "hero.sub", label: "Subheadline", multiline: true },
      { key: "hero.cta", label: "Primary button" },
      { key: "hero.cta2", label: "Secondary button" },
    ],
  },
  {
    id: "ticker",
    title: "Landing · scrolling ticker",
    fields: [
      {
        key: "ticker.items",
        label: "Ticker items",
        multiline: true,
        help: "One item per line.",
      },
    ],
  },
  {
    id: "how",
    title: "Landing · how it works",
    fields: [
      { key: "how.title", label: "Section title" },
      { key: "how.step1.tag", label: "Step 1 — tag" },
      { key: "how.step1.title", label: "Step 1 — title" },
      { key: "how.step1.body", label: "Step 1 — body", multiline: true },
      { key: "how.step2.tag", label: "Step 2 — tag" },
      { key: "how.step2.title", label: "Step 2 — title" },
      { key: "how.step2.body", label: "Step 2 — body", multiline: true },
      { key: "how.step3.tag", label: "Step 3 — tag" },
      { key: "how.step3.title", label: "Step 3 — title" },
      { key: "how.step3.body", label: "Step 3 — body", multiline: true },
    ],
  },
  {
    id: "roster",
    title: "Landing · roster",
    fields: [
      { key: "roster.title", label: "Section title" },
      { key: "roster.empty", label: "Empty-state message" },
    ],
  },
  {
    id: "footer",
    title: "Landing · footer",
    fields: [
      {
        key: "footer.tagline",
        label: "Tagline",
        help: "Shown after the site name.",
      },
    ],
  },
  {
    id: "signin",
    title: "Sign-in page",
    fields: [
      { key: "signin.eyebrow", label: "Eyebrow line" },
      { key: "signin.title", label: "Headline" },
      { key: "signin.sub", label: "Explainer paragraph", multiline: true },
      { key: "signin.button", label: "Discord button" },
      { key: "signin.trust.yes", label: "Trust list — ✓ item" },
      { key: "signin.trust.no1", label: "Trust list — ✗ item 1" },
      { key: "signin.trust.no2", label: "Trust list — ✗ item 2" },
      { key: "signin.foot", label: "Footer line" },
    ],
  },
];
