# Snip Design System
<!-- Inspired by the visual language of lovable.dev — dark, warm-glow, minimal -->

## Color Tokens

| Token           | Value       | Usage                                      |
|-----------------|-------------|--------------------------------------------|
| `--bg`          | `#0a0a0f`   | Page background (near-black, slight purple) |
| `--surface`     | `#13131a`   | Cards, inputs, table background             |
| `--surface-2`   | `#1c1c28`   | Table header, hover states                  |
| `--border`      | `#2a2a3d`   | Subtle borders on cards and inputs          |
| `--text`        | `#f0f0f5`   | Primary text                                |
| `--muted`       | `#7a7a9a`   | Subtitles, placeholder, secondary labels    |
| `--accent-from` | `#ff6b6b`   | Gradient start (coral)                      |
| `--accent-mid`  | `#ff8c42`   | Gradient mid (orange)                       |
| `--accent-to`   | `#ff6b9d`   | Gradient end (pink)                         |
| `--success-bg`  | `#0f2a1a`   | Result notice background                    |
| `--success-text`| `#4ade80`   | Result notice text and link                 |
| `--error-bg`    | `#2a0f0f`   | Error notice background                     |
| `--error-text`  | `#f87171`   | Error notice text                           |

## Accent Gradient

```css
background: linear-gradient(135deg, #ff6b6b 0%, #ff8c42 45%, #ff6b9d 100%);
```

Used as the hero glow and the submit button background.

## Hero Glow

A **fixed, full-viewport-width** band behind the hero — must use
`position: fixed; top: 0; left: 0; right: 0; pointer-events: none` so it spans the
full screen width regardless of any centred content column.

```css
.glow {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 480px;
  background: radial-gradient(ellipse 80% 60% at 50% -10%,
    rgba(255, 107, 107, 0.25) 0%,
    rgba(255, 140, 66, 0.15) 40%,
    transparent 70%);
  pointer-events: none;
  z-index: 0;
}
```

## Typography

| Scale     | Size / Weight | Usage           |
|-----------|---------------|-----------------|
| Hero      | 3rem / 700    | Page `<h1>`     |
| Sub-hero  | 1.1rem / 400  | Muted subtitle  |
| Body      | 1rem / 400    | General text    |
| Small     | 0.8rem / 600  | Table headers   |

Font stack: `'Inter', system-ui, -apple-system, sans-serif`

## Spacing Scale

`8 · 12 · 16 · 24 · 32 · 48 · 64 · 96px` — use multiples of 8.

## Border Radii

| Name   | Value  | Usage                              |
|--------|--------|------------------------------------|
| `sm`   | `8px`  | Table rows, small chips            |
| `md`   | `16px` | Cards, table container             |
| `pill` | `999px`| Form input + button (chat-style)   |

## Shadows & Glow

```css
/* Card shadow */
box-shadow: 0 1px 3px rgba(0,0,0,.4), 0 0 0 1px var(--border);

/* Input focus ring */
box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.3);

/* Button glow on hover */
box-shadow: 0 0 20px rgba(255, 107, 107, 0.4);
```

## Element → Design Mapping

| Snip element        | Design role                                                     |
|---------------------|-----------------------------------------------------------------|
| `<h1>Snip</h1>`     | Hero headline — large, centered, bold                           |
| Subtitle paragraph  | Muted sub-hero line below headline                              |
| URL form            | Chat-style pill input; input + button share one rounded capsule |
| Error notice        | Inline error card below form (dark red surface)                 |
| Result notice       | Inline success card below form (dark green surface)             |
| Links table         | Rounded dark surface card, generous row padding                 |
| Empty state         | Muted centered paragraph                                        |
