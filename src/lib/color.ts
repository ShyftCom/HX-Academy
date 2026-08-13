/**
 * Minimal colour maths for deriving interaction states from a brand colour.
 *
 * Exists because Branding stores a single `primary_color`, and the hover and
 * pressed states have to be *relatives* of it. Asking an admin to hand-pick a
 * matching shade does not work in practice: production shipped
 * primary=#ae1e1e (red) with secondary=#0f172a (near-black slate), so every
 * primary button turned almost black on hover.
 *
 * Deliberately dependency-free and sRGB-only. A perceptual space (OKLCH) would
 * give more even steps, but this runs in the root layout on every request and
 * the inputs are a handful of brand hexes, so the extra correctness is not
 * worth the weight.
 */

/** #rgb, #rrggbb, with or without the hash. Returns null if unparseable. */
export function parseHex(input: string): { r: number; g: number; b: number } | null {
  if (typeof input !== "string") return null;
  const hex = input.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex.split("").map((c) => c + c).join("")
      : hex.length === 6
        ? hex
        : null;
  if (!full || !/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toHex = (n: number) => clamp(n).toString(16).padStart(2, "0");

function format({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Mixes `amount` (0–1) of white into the colour. `mix` rather than an HSL
 * lightness bump because bumping L on an already-saturated hue desaturates it
 * unevenly — mixing toward white keeps the hue recognisably the same.
 */
export function lighten(color: string, amount: number): string {
  const c = parseHex(color);
  if (!c) return color;
  return format({
    r: c.r + (255 - c.r) * amount,
    g: c.g + (255 - c.g) * amount,
    b: c.b + (255 - c.b) * amount,
  });
}

/** Mixes `amount` (0–1) of black into the colour. */
export function darken(color: string, amount: number): string {
  const c = parseHex(color);
  if (!c) return color;
  return format({ r: c.r * (1 - amount), g: c.g * (1 - amount), b: c.b * (1 - amount) });
}

/** Relative luminance, WCAG 2.x definition. */
export function luminance(color: string): number {
  const c = parseHex(color);
  if (!c) return 0;
  const ch = [c.r, c.g, c.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/**
 * Hover and pressed states for a brand colour.
 *
 * Obsidian Flux is a dark system, so hover *lightens* — on a charcoal page a
 * darker button reads as receding, which is the opposite of what a hover
 * should signal. Pressed then darkens, giving hover -> base -> pressed a
 * consistent direction of travel.
 *
 * A primary that is already very light (a pastel or near-white brand) would
 * have nowhere to go on hover, so the direction flips below the threshold.
 */
export function deriveInteractionStates(primary: string): { hover: string; active: string } {
  if (!parseHex(primary)) {
    // Unparseable — return the input unchanged rather than emitting a broken
    // custom property, so the CSS falls back to the stylesheet default.
    return { hover: primary, active: primary };
  }
  const light = luminance(primary) > 0.55;
  return light
    ? { hover: darken(primary, 0.12), active: darken(primary, 0.24) }
    : { hover: lighten(primary, 0.14), active: darken(primary, 0.16) };
}

/** WCAG 2.x contrast ratio between two opaque colours. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** `#rrggbb` + alpha as `#rrggbbaa`. Alpha is clamped to 0–1. */
export function withAlpha(color: string, alpha: number): string {
  const c = parseHex(color);
  if (!c) return color;
  const a = Math.max(0, Math.min(1, alpha));
  return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}${toHex(a * 255)}`;
}

/**
 * A tint of the brand colour light enough to use as *text* on a dark surface.
 *
 * `--ob-primary-light` is not a decorative lightening — it is what the active
 * sidebar item, inline links and default badges are coloured with, all sitting
 * on --ob-surface-low. A fixed lighten() amount cannot guarantee that is
 * readable, because how far a hue has to travel to clear 4.5:1 depends on the
 * hue: #0070f3 needs much more lightening than #f5d90a does.
 *
 * So this walks toward white until it clears the target ratio, and gives up at
 * white rather than looping. The design system's own pairing is the reference
 * point: #0070f3 -> #aec6ff, which is ~7.5:1 on #1c1b1b.
 */
export function readableTint(color: string, background: string, minRatio = 7): string {
  if (!parseHex(color) || !parseHex(background)) return color;
  // Start at the design system's own step so a blue brand lands close to the
  // hand-picked #aec6ff rather than stopping the moment it scrapes past.
  let candidate = lighten(color, 0.6);
  for (let i = 0; i < 20 && contrastRatio(candidate, background) < minRatio; i++) {
    candidate = lighten(candidate, 0.08);
  }
  return candidate;
}

/**
 * The full set of primary-derived tokens.
 *
 * Deriving only hover/active left --ob-primary-light, --ob-primary-soft and
 * --ob-primary-glow at their hardcoded blues, so a red-branded install showed
 * a blue active nav item, blue soft fills and a blue focus glow. Every token
 * that is a *function of* the brand colour has to be derived, or none of them
 * should be.
 */
export function derivePrimaryTokens(primary: string, surface = "#1c1b1b") {
  const { hover, active } = deriveInteractionStates(primary);
  return {
    hover,
    active,
    light: readableTint(primary, surface),
    soft: withAlpha(primary, 0.12),
    glow: withAlpha(primary, 0.28),
  };
}
