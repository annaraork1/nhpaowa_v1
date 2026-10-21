# Research: 003-ui-icons-theme

## Decision: Heroicons + custom IconButton (not Lucide)

Stakeholder chose Heroicons. Use `@heroicons/react/24/outline` for Eye, PencilSquare, Trash.

## Decision: Radix AlertDialog styled like shadcn (no full shadcn CLI)

Project is JS, not TS. Port AlertDialog pattern with `@radix-ui/react-alert-dialog` + Tailwind classes matching shadcn look, branded purple.

## Decision: CSS variables + `class=dark` on html

Tailwind `darkMode: 'class'`. Map brand/surface/ink/line via CSS vars so light/dark switch without duplicating every utility.

## Decision: Keep Recharts

No Tremor install. Optionally tint chart strokes with CSS var `--brand` for readability.

## Decision: Scope pages for icons

Items, Categories, Suppliers, AMC — primary Edit/Delete (and View where useful). Other pages can adopt IconButton later.
