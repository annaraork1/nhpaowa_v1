# Contracts: UI actions & theme

## Theme API (client)
- `getTheme()` → `light` | `dark`
- `setTheme(mode)` → persists + sets `document.documentElement.classList`
- Toggle control in app header

## IconButton
- Props: `label` (required a11y), `icon`, `onClick`, `tone?: 'default'|'danger'|'brand'`, `disabled?`
- Renders icon-only button + native `title` and `aria-label`

## ConfirmDelete
- Props: `open`, `onOpenChange`, `title`, `description`, `onConfirm`, `loading?`
- Confirm triggers `onConfirm`; Cancel closes without side effects

## Pages
Items / Categories / Suppliers / AMC replace text Edit/Delete with IconButton + ConfirmDelete.
