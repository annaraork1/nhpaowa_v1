# Tasks: Action Icons, Brand Tokens & Theme Modes

## Phase 1: Setup
- [x] T001 Write feature docs under `specs/003-ui-icons-theme/`
- [x] T002 Install `@heroicons/react` and `@radix-ui/react-alert-dialog` in `@nhpaowa/web`

## Phase 2: Foundation
- [x] T003 CSS variables + Tailwind `darkMode: 'class'` mapped to brand tokens
- [x] T004 `ThemeProvider` + persist `nhpaowa_theme`
- [x] T005 `IconButton` + `AlertDialog` + `ConfirmDelete` components

## Phase 3: US1–US2 Icons & dialog
- [x] T006 Wire Items page View/Edit/Delete icons + confirm
- [x] T007 Wire Categories + Suppliers
- [x] T008 Wire AMC remove with confirm

## Phase 4: US3–US4 Theme
- [x] T009 Theme toggle in App header; update panel/body classes for dark
- [x] T010 Recharts: readable colors in dark via theme-aware strokes if needed

## Phase 5: Polish
- [x] T011 Mark tasks complete; smoke quickstart

## Dependencies
T002→T005→T006–T008; T003–T004→T009
