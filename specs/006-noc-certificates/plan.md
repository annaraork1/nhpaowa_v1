# Implementation Plan: Society NOC Certificates

**Branch**: `006-noc-certificates` | **Date**: 2026-09-20 | **Spec**: [spec.md](./spec.md)

## Summary

NOC request workflow + printable letter, dependent on flats register. Permissions resource `noc`.

## Technical Context

Same stack as 005. Models: NocRequest, NocStatusEvent. Print via React print stylesheet.

## Constitution Check

PASS — soft history via status events; shared auth; association API namespace.

## Structure

```text
routes/association/noc.js
pages/NocPage.jsx, NocPrintPage.jsx
```
