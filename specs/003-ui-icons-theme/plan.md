# Implementation Plan: Action Icons, Brand Tokens & Theme Modes

**Branch**: `003-ui-icons-theme` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

Add Heroicon-only View/Edit/Delete actions with tooltips, Radix/shadcn-style AlertDialog for deletes, CSS-variable brand purple tokens for light/dark, and a theme toggle — without redesigning page layout or replacing Recharts with Tremor.

## Technical Context

**Language/Version**: React 18 + Vite + Tailwind 3 (JS)  
**Primary Dependencies**: `@heroicons/react`, `@radix-ui/react-alert-dialog`, existing Recharts  
**Storage**: `localStorage` theme key  
**Testing**: Manual quickstart + existing RBAC tests unchanged  
**Target Platform**: Web (`apps/web`)  
**Project Type**: SPA shell in monorepo  
**Constraints**: Keep layout; purple-only brand; no Tremor this feature  

## Constitution Check

| Gate | Status |
|------|--------|
| Spec-driven | PASS |
| Shared stack (React/Tailwind) | PASS |
| Modular monorepo | PASS — web-only UI change |
| Auth/RBAC unchanged | PASS — still wrap with `Can` |

## Project Structure

```text
specs/003-ui-icons-theme/
apps/web/src/
  theme/ThemeProvider.jsx
  modules/inventory/components/
    BrandLogo.jsx          # existing
    IconButton.jsx         # new
    AlertDialog.jsx        # new
    ConfirmDelete.jsx      # new
  index.css                # CSS variables light/dark
  App.jsx                  # theme toggle
  pages/*                  # wire icon actions
```

## Complexity Tracking

None.
