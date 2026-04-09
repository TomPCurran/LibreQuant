# LibreQuant — Design System & UI/UX Guidelines

> Optimized for Cursor AI agents. Read this file before generating any UI component, page, or layout for the LibreQuant project.

---

## 0. Project Identity

| Property      | Value                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| Product name  | LibreQuant                                                                |
| Tagline       | "The Local-First Workbench for Algorithmic Alpha."                        |
| Tone          | Precise, technical, minimal. No marketing fluff. Trust through restraint. |
| Persona       | The UI is the _Assistant_; the user is always the _Architect_.            |
| License badge | Open source · Local-first · MIT                                           |
| Target users  | Quantitative traders and algo developers who value privacy and control.   |

---

## 1. Color System

All colors are defined as CSS custom properties in `globals.css` and registered via `@theme inline`. Always use semantic tokens — never hardcode hex values except where noted below.

### 1.1 Semantic Tokens (CSS variables)

```css
/* Use these in all components */
hsl(var(--background))       /* Page background */
hsl(var(--foreground))       /* Default text */
hsl(var(--text-primary))     /* High-emphasis text */
hsl(var(--text-secondary))   /* Supporting / muted text */
hsl(var(--alpha))            /* Brand teal — positive signals, CTA, accents */
hsl(var(--risk))             /* Brand rose — warnings, risk, loss, negatives */
hsl(var(--border-subtle))    /* Dividers, card borders */
```

### 1.2 Tailwind Color Aliases

```
text-text-primary       → hsl(var(--text-primary))
text-text-secondary     → hsl(var(--text-secondary))
bg-background           → hsl(var(--background))
bg-foreground           → hsl(var(--foreground))
text-alpha / bg-alpha   → #0d9488  (brand teal)
text-risk  / bg-risk    → #e11d48  (brand rose)
text-brand-gray         → #6e6e73
```

### 1.3 Raw Hex Reference (for inline styles or SVG fills only)

| Name               | Hex       | Usage                                                     |
| ------------------ | --------- | --------------------------------------------------------- |
| Alpha (teal)       | `#0d9488` | Primary CTA, positive PnL, active states, progress        |
| Risk (rose)        | `#e11d48` | Drawdown, warnings, destructive actions, "never" emphasis |
| Brand gray         | `#6e6e73` | Secondary text, icons, nav links, metadata                |
| Surface light      | `#f9f9fb` | Page background (light mode)                              |
| Text primary light | `#1d1d1f` | Body text, headings (light mode)                          |
| Code surface       | `#1c1c1e` | Dark code blocks and terminal panels                      |
| Code text          | `#d1d1d6` | Monospace text on dark surfaces                           |

### 1.4 Dark Mode

Dark mode is activated via the `.dark` class on `<html>`. All semantic tokens automatically remap — never write `dark:` overrides for colors that are already covered by CSS variables. Only write `dark:` variants for structural differences (shadows, borders with hardcoded opacity).

### 1.5 Color Rules

- **Alpha (teal) = positive / active / primary action.** Use for: primary buttons, progress bars, slider fills, active nav, positive return values, syntax highlighting of key params.
- **Risk (rose) = danger / negative / critical.** Use sparingly and never decoratively. Reserve for: drawdown figures, warnings, risk disclaimers, destructive button variants.
- **Never** use both alpha and risk together on the same element or within the same visual cluster — they are semantically opposed.
- Alpha at reduced opacity (`/5`, `/10`, `/20`) is acceptable for tinted chip backgrounds and chart fills.

---

## 2. Typography

### 2.1 Font Stack

```css
--font-sans:
  "Inter", system-ui,
  sans-serif /* All body and UI text */ --font-mono: "JetBrains Mono",
  ui-monospace, monospace /* All code, params, terminal */;
```

Google Fonts import (for static HTML):

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

In Next.js / app router: load via `next/font/google` and expose as `--font-inter` and `--font-jetbrains-mono`.

### 2.2 Type Scale

| Role               | Classes                                                                      | Notes                       |
| ------------------ | ---------------------------------------------------------------------------- | --------------------------- |
| Hero H1            | `text-4xl md:text-5xl heading-brand`                                         | Max `max-w-3xl`, centered   |
| Section label      | `text-xs font-semibold tracking-[0.12em] uppercase text-text-secondary`      | Section eyebrows only       |
| Card heading       | `heading-brand text-lg`                                                      | Inside glass cards          |
| Body / prose       | `text-sm font-light leading-relaxed text-text-secondary`                     | Default card copy           |
| Secondary note     | `text-xs font-light text-text-secondary`                                     | Footnotes, helper text      |
| Nav link           | `text-xs font-medium text-text-secondary hover:text-text-primary transition` |                             |
| Monospace / code   | `font-mono-code text-[12px] md:text-[13px] leading-relaxed`                  | Always JetBrains Mono       |
| Tech chip label    | `text-[11px] font-medium`                                                    | Badge/pill labels           |
| Stat / badge count | `text-[10px] tabular-nums`                                                   | Star counts, numeric badges |

### 2.3 `.heading-brand` Utility

```css
.heading-brand {
  font-family: var(--font-inter), system-ui, sans-serif;
  font-weight: 600;
  letter-spacing: -0.011em;
}
```

Apply to all headings (H1–H3). Do not use `font-bold` on headings — always use this class instead.

### 2.4 Rules

- Body weight for prose is **300 (light)**. Use `font-light` for descriptive paragraphs.
- Use `font-medium` (500) for labels, nav, chips, and button text.
- Use `font-semibold` (600) only via `.heading-brand` — nowhere else.
- Never use `font-bold` (700) anywhere in the UI.
- Tracking: headings use `letter-spacing: -0.011em` (tight). Section labels use `tracking-[0.12em]` (wide). Never mix within the same element.

---

## 3. Spacing & Layout

### 3.1 Page Structure

```
max-w-5xl mx-auto px-6   ← Hero / feature grids (wider)
max-w-4xl mx-auto px-6   ← Code showcase panels
max-w-3xl mx-auto px-6   ← Quick start, FAQ, footer (narrower, reading width)
```

Always use `mx-auto` with a `max-w-*` — no full-bleed content except the nav and footer backgrounds.

### 3.2 Section Rhythm

```
Hero:         pt-16 md:pt-20  pb-12
Feature grid: pb-16
Code panel:   pb-16
Quick start:  pb-20  scroll-mt-24
FAQ:          pb-24  scroll-mt-24
Footer:       py-10
```

Add `scroll-mt-24` to every section that is a nav anchor target.

### 3.3 Grid

Feature cards use a responsive 3-column grid:

```html
<div
  class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
></div>
```

### 3.4 Spacing Constants

| Token              | Value                   | Used for                      |
| ------------------ | ----------------------- | ----------------------------- |
| `gap-3`            | 12px                    | Tight chip/badge rows         |
| `gap-4` / `gap-6`  | 16–24px                 | Card grids                    |
| `gap-10 md:gap-12` | 40–48px                 | Code panel columns            |
| `mb-4`             | 16px                    | Paragraph spacing             |
| `mb-6`             | 24px                    | Heading-to-body spacing       |
| `mb-8`             | 32px                    | Section label-to-card spacing |
| `mb-10`            | 40px                    | CTA group below hero text     |
| `px-6`             | 24px                    | Page horizontal padding       |
| `p-8`              | 32px                    | Glass card default padding    |
| `p-6 md:p-8`       | Responsive card padding |                               |

---

## 4. Component Patterns

### 4.1 Glass Card

The primary card surface across the entire UI.

```css
/* globals.css */
.glass {
  background: hsl(var(--foreground) / 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid hsl(var(--foreground) / 0.08);
}
```

```html
<!-- Standard glass card -->
<div class="glass p-8 rounded-4xl">...</div>

<!-- FAQ / list item variant (less padding) -->
<div class="glass rounded-3xl px-5 py-4">...</div>

<!-- Code preview glass inset on dark surface -->
<div class="glass p-6 rounded-[1.25rem]">...</div>
```

**Rules:**

- Always pair `.glass` with `rounded-4xl` for standalone cards, `rounded-3xl` for list items, `rounded-[1.25rem]` for inset panels.
- Never add an explicit `border-*` color to a glass element — the border is baked into the utility.
- On dark surfaces (`bg-[#1c1c1e]`), the `.glass` class automatically adjusts via the `.dark .glass` override in `globals.css`.

### 4.2 Navigation

```html
<nav
  class="w-full min-h-14 flex flex-wrap items-center justify-between gap-3 px-6 py-3 sticky top-0 z-50 border-b border-black/6 bg-background/80 backdrop-blur-xl"
></nav>
```

- Always `sticky top-0 z-50`.
- Background: `bg-background/80 backdrop-blur-xl` — never fully opaque.
- Border: `border-b border-black/6` (light) / adjust for dark if needed.
- Nav links: `text-xs font-medium text-text-secondary hover:text-text-primary transition`.

### 4.3 Buttons

**Primary CTA (filled teal):**

```html
<a
  class="inline-flex items-center justify-center bg-alpha text-white px-6 py-2.5 rounded-full font-medium text-sm hover:opacity-90 transition shadow-md shadow-alpha/20"
>
  Get Started
</a>
```

**Secondary CTA (glass):**

```html
<a
  class="inline-flex items-center justify-center glass text-text-primary px-6 py-2.5 rounded-full font-medium text-sm hover:bg-white/80 transition"
>
  View on GitHub
</a>
```

**Rules:**

- All buttons use `rounded-full` — never `rounded-md` or `rounded-lg`.
- Hover state on primary: `hover:opacity-90` (never change background on hover).
- Never use `bg-risk` for any button unless it is an irreversible destructive action (e.g., "Delete strategy").
- Icon buttons: include `aria-hidden="true"` on the SVG; use `aria-label` on the button.

### 4.4 Tech / Tag Chips

**Neutral chip:**

```html
<span
  class="rounded-full border border-black/8 bg-white/50 px-3 py-1 text-[11px] font-medium text-text-secondary"
>
  Python
</span>
```

**Alpha-tinted chip (highlight / performance):**

```html
<span
  class="rounded-full border border-alpha/25 bg-alpha/5 px-3 py-1 text-[11px] font-medium text-alpha"
>
  &lt;100ms bridge
</span>
```

**Star / count badge:**

```html
<div
  class="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-text-secondary"
>
  <span class="mr-2 text-text-primary">Star</span>
  <span
    class="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] tabular-nums"
    >4.1k</span
  >
</div>
```

### 4.5 Code Blocks / Terminal Panels

**Dark terminal panel (outer shell):**

```html
<div
  class="bg-[#1c1c1e] rounded-4xl p-8 md:p-12 shadow-xl shadow-foreground/10 relative overflow-hidden"
></div>
```

**Inline code block (light surface):**

```html
<pre
  class="font-mono-code text-[12px] md:text-[13px] leading-relaxed text-text-primary bg-foreground/4 rounded-2xl p-4 overflow-x-auto border border-black/6"
>
  <code>...</code>
</pre>
```

**Syntax highlighting palette (inside dark panels):**

```
Default text:   #d1d1d6
Line numbers:   #6e6e73  (text-brand-gray)
String/value:   #0d9488  (alpha teal)
Keywords:       #0d9488  (alpha teal)
Comments:       #6e6e73
```

### 4.6 Section Labels (Eyebrows)

```html
<h2
  class="text-center text-xs font-semibold tracking-[0.12em] text-text-secondary mb-8 uppercase"
>
  Section Name
</h2>
```

Always uppercase, always `tracking-[0.12em]`, always `text-text-secondary`. Never use a larger font size for section eyebrows.

### 4.7 FAQ / Definition Lists

```html
<dl class="space-y-4">
  <div class="glass rounded-3xl px-5 py-4">
    <dt class="heading-brand text-text-primary text-sm mb-1">Question</dt>
    <dd class="text-sm font-light text-text-secondary leading-relaxed">
      Answer
    </dd>
  </div>
</dl>
```

### 4.8 Risk Disclaimer Inline Emphasis

When surfacing risk warnings in body copy:

```html
<span class="text-risk font-medium">never</span>
```

Use sparingly — one instance per warning. Never wrap entire sentences in `text-risk`.

### 4.9 Progress / Slider Fill

```html
<!-- Track -->
<div class="h-1 w-full bg-foreground/10 rounded-full overflow-hidden">
  <!-- Fill -->
  <div class="w-1/2 h-full bg-alpha rounded-full"></div>
</div>
```

Always `bg-alpha` for fills. Never use risk color for a progress fill.

### 4.10 Mini Bar Chart (Equity Curve / Histogram)

```html
<div class="h-20 w-full flex items-end gap-1">
  <div class="w-full bg-alpha/10 h-1/2 rounded-t-sm"></div>
  <div class="w-full bg-alpha/20 h-2/3 rounded-t-sm"></div>
  <div class="w-full bg-alpha/40 h-1/3 rounded-t-sm"></div>
  <div class="w-full bg-alpha/60 h-3/4 rounded-t-sm"></div>
  <div class="w-full bg-alpha h-full rounded-t-sm"></div>
</div>
```

Use graduated opacity (`/10` → `/100`) to suggest depth or recency. All bars `rounded-t-sm`.

### 4.11 AST→UI Bridge Label

```html
<div
  class="hidden md:flex items-center justify-center shrink-0 bg-[#2c2c2e] px-3 py-1.5 rounded-full text-[10px] font-medium text-text-secondary border border-white/10"
>
  AST → UI (0.03s)
</div>
```

---

## 5. Background & Surface

### 5.1 Grid Pattern

Applied globally on `<body>`. Never add it to individual sections.

```css
/* globals.css */
.bg-grid-pattern {
  background-image: radial-gradient(
    hsl(var(--alpha) / 0.12) 1px,
    transparent 0
  );
  background-size: 24px 24px;
}
```

```html
<body class="antialiased bg-grid-pattern"></body>
```

Grid dot color is alpha-tinted at very low opacity — it reads as gray but carries brand intent.

### 5.2 Surface Hierarchy

```
bg-background          ← Page base (light: #f9f9fb, dark: hsl(240 6% 6%))
.glass                 ← Cards, nav, modals — frosted, elevated
bg-[#1c1c1e]           ← Code terminal panels — always dark regardless of theme
bg-foreground/4        ← Inline code on light surface — very subtle tint
```

Never put a glass card inside another glass card.

---

## 6. Icons & SVG

- All icons are custom inline SVGs. No icon library dependency.
- Default icon size: `width="40" height="40"` on feature cards; `width="22" height="22"` for nav/inline.
- Stroke style: `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap="round"`, `stroke-linejoin="round"`.
- Fill style: none by default (`fill="none"`); use `fill="currentColor"` only for GitHub logo and similar brand marks.
- All decorative icons: `aria-hidden="true"`.
- Color: inherit from `text-text-secondary` on the parent — never hardcode icon colors.
- Never use `fill` icons in the UI — outline strokes only.

### 6.1 GitHub Logo SVG

The only exception to the outline rule. Used in nav only.

```html
<svg
  width="22"
  height="22"
  viewBox="0 0 24 24"
  aria-hidden="true"
  class="text-text-secondary shrink-0"
>
  <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12..." />
</svg>
```

---

## 7. Animation & Motion

### 7.1 Defined Keyframe

```css
/* tailwind.config.ts */
"soft-pulse": {
  "0%, 100%": { opacity: "1" },
  "50%": { opacity: "0.55" },
}
animation: "soft-pulse 1.25s ease-in-out infinite"
```

**Usage:** Apply `animate-soft-pulse` to live status indicators, polling badges, or realtime data markers. Never apply to layout elements or headings.

### 7.2 Transitions

- All interactive elements: `transition` (shorthand — covers opacity and color).
- Duration: default Tailwind `150ms`. Never override to longer than `200ms` for hover states.
- Hover pattern: `hover:opacity-90` on filled buttons; `hover:text-text-primary` on links; `hover:bg-white/80` on glass secondaries.

### 7.3 Rules

- No entrance animations on page load — content appears instantly.
- No scroll-triggered animations.
- No transform-based hover effects (`hover:scale-*`, `hover:-translate-y-*`).
- The only acceptable motion is `transition` opacity/color on hover and `animate-soft-pulse` for live indicators.

---

## 8. Accessibility

- Provide a skip link as the first child of `<body>`:
  ```html
  <a href="#main" class="skip-link">Skip to content</a>
  ```
- All `<section>` elements: use `aria-labelledby` pointing to the section's heading `id`.
- All `<nav>` elements: `aria-label="Primary"` (or appropriate label).
- All decorative SVGs: `aria-hidden="true"`.
- All interactive SVGs / icon buttons: `aria-label` on the button, `aria-hidden` on the SVG.
- Use semantic HTML: `<main>`, `<nav>`, `<footer>`, `<section>`, `<dl>/<dt>/<dd>` for FAQs.
- `scroll-behavior: smooth` on `html` (set in `globals.css`).
- All anchor sections: `scroll-mt-24` so sticky nav doesn't overlap.
- Color contrast: `text-text-secondary` (#6e6e73) on white (#f9f9fb) is WCAG AA for large/medium text. For small text, prefer `text-text-primary`.

---

## 9. Page Shell Template

```html
<!doctype html>
<html lang="en" class="">
  <!-- add "dark" class here for dark mode -->
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LibreQuant | [Page Title]</title>
    <!-- fonts, styles -->
  </head>
  <body class="antialiased bg-grid-pattern">
    <a href="#main" class="skip-link">Skip to content</a>

    <nav
      aria-label="Primary"
      class="w-full min-h-14 flex flex-wrap items-center justify-between gap-3 px-6 py-3 sticky top-0 z-50 border-b border-black/6 bg-background/80 backdrop-blur-xl"
    >
      <!-- logo left, links + star right -->
    </nav>

    <main id="main">
      <!-- Hero: max-w-5xl -->
      <!-- Features: max-w-5xl -->
      <!-- Code panel: max-w-4xl -->
      <!-- Docs / FAQ: max-w-3xl -->
    </main>

    <footer class="border-t border-black/6 bg-background/90">
      <div
        class="max-w-3xl mx-auto px-6 py-10 text-center text-text-secondary text-sm font-light"
      >
        <!-- copyright + links -->
      </div>
    </footer>
  </body>
</html>
```

---

## 10. Writing Style for UI Copy

| Pattern          | Example                                                                             |
| ---------------- | ----------------------------------------------------------------------------------- |
| Headlines        | Sentence case. No period. "The Local-First Workbench for Algorithmic Alpha."        |
| Section eyebrows | ALL CAPS, sparse. "Quick start" → "QUICK START"                                     |
| Button labels    | Title Case. "Get Started (Docker)", "View on GitHub"                                |
| Body copy        | Plain, direct, technical. No adjective stacking.                                    |
| Metadata strings | Lowercase, middot-separated. "Open source · Local-first · MIT"                      |
| Risk language    | One word in `text-risk`: "…—**never** treat a green curve as a guarantee."          |
| The product      | "LibreQuant" — no space, capital L and Q. Never "Librequant" or "libre quant".      |
| The AI           | "the Assistant" — always lowercase "the", capital "A". The user is "the Architect". |

---

## 11. Anti-Patterns — Never Do These

```
❌ font-bold anywhere in the UI
❌ rounded-md or rounded-lg on cards or buttons (use rounded-full or rounded-4xl)
❌ Hardcoded hex colors in component JSX/TSX (use Tailwind tokens or CSS vars)
❌ bg-risk on any non-destructive element
❌ Nesting .glass inside .glass
❌ Scroll-triggered or entrance animations
❌ hover:scale-* or hover:-translate-y-* transforms
❌ Borders with explicit color classes on .glass elements
❌ text-lg or larger for body copy
❌ Uppercase headings (only section eyebrows are uppercase)
❌ Shadow colors other than shadow-alpha/20 (primary button) or shadow-foreground/10 (dark panels)
❌ More than 2 CTA buttons in the same button group
❌ Risk and Alpha colors in the same visual element
```

---

## 12. File Locations

```
tailwind.config.ts   → Color extensions, font families, soft-pulse animation
globals.css          → CSS variables (light/dark), @theme inline, .glass, .bg-grid-pattern, .heading-brand, .font-mono-code
index.html           → Reference implementation of all patterns above
```

When adding new components, check `globals.css` for existing utilities before writing new CSS. Prefer Tailwind utilities. Only add to `globals.css` if the pattern is genuinely reusable across 3+ components.
