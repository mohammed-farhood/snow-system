# Snow factory: look and feel

**Idea:** the painted ice truck. Iraqi delivery trucks wear sun yellow, deep teal and hand-painted trim; the app
borrows that, so it reads instantly in bright sun on a cheap phone, and nothing about it looks like a generic ERP.

## Colours

| Token | Hex | Use |
|---|---|---|
| `--teal` | `#0F4C4A` | header, nav, headings, primary text on yellow |
| `--teal-2` | `#17625F` | hover/secondary teal |
| `--sun` | `#FFC530` | the main action (بيع), selected states |
| `--sun-deep` | `#E8A800` | pressed yellow, stripes |
| `--ground` | `#EEF3F2` | page background (cool, never cream) |
| `--paper` | `#FFFFFF` | panels |
| `--ink` | `#161616` | body text |
| `--muted` | `#5B6B69` | secondary text |
| `--line` | `#D3DDDB` | borders |
| `--debt` | `#C2412D` | anything owed, undo, errors |
| `--cash` | `#1D7A4A` | money in, success |

Light only. The factory works outdoors in daylight.

## Type

- **Lalezar** for titles and every big number (prices, counts, totals). Western digits 0-9 always.
- **IBM Plex Sans Arabic** for everything else, line-height ≥ 1.7.
- Numbers, times and ranges inside Arabic text sit in `dir="ltr"` spans.

## Shape and spacing

- Radius 14px on panels, 18px on big buttons; touch targets ≥ 56px, steppers 64px.
- Spacing scale 4 / 8 / 12 / 16 / 24 / 32.
- Panels have a 2px teal-tinted border, no soft grey drop shadows.

## The one bold thing

The yellow **بيع** panel with painted-trim stripes (diagonal teal/yellow band), and the trim band along the
top of the header. Nowhere else gets stripes.

## Motion (CSS only, honours reduced-motion)

- Screen enter: 180ms fade + 6px rise, once per screen, not per card.
- Home numbers count up (600ms). Stepper number "bumps" on change.
- Success: check mark draws itself, yellow ring pulses once.
- Bottom sheets slide up 220ms.
GSAP was considered and skipped: nothing here needs timeline control.

## Never do

- Dark navy dashboard with a cyan accent (the old look).
- Emoji as icons, gradient blobs, glass cards, identical stat-card grids.
- Eastern Arabic digits (٠-٩).
- Sidebars that hold one number; empty space is fixed by the main flow, not a side column.
- Rejected without seeing: "Frost tag" (pale frost + navy) and "Steel plate" (steel grey + enamel green).
