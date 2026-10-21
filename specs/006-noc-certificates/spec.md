# Feature Specification: Society NOC Certificates

**Feature Branch**: `006-noc-certificates`  
**Created**: 2026-09-20  
**Status**: Draft  
**Depends on**: `005-flat-owners`  
**Input**: Secretary/board issue NOCs for flat owners (sale, loan, rental, etc.).

## User Scenarios & Testing

### User Story 1 - Request NOC for a flat (Priority: P1)

Secretary creates an NOC request against a registered flat stating purpose (Sale/Transfer, Bank Loan/Mortgage, Rental/Tenant, Renovation, Other), applicant details, and notes. Status starts as DRAFT or SUBMITTED.

**Independent Test**: Create Sale NOC for A-101; list shows SUBMITTED.

### User Story 2 - Approve / issue NOC (Priority: P1)

Approver (Secretary or Treasurer when dues check is required) marks NOC as ISSUED with issue date and validity notes, or REJECTED with reason. Issued NOC can be viewed/printed as a formal letter (HTML/print v1; PDF later).

**Independent Test**: Issue Sale NOC → status ISSUED → print view shows society name, flat, owner, no-objection statement, date, issuer name.

### User Story 3 - Track NOC history per flat (Priority: P2)

Committee views all NOCs for a flat with status timeline. **Residents** with a linked flat MAY create NOC requests for their own flat only (see `014-resident-portal`); they cannot issue/reject. Secretary may still create on their behalf.

### Edge Cases

- Issue NOC for flat without Primary Owner — warn but allow with manual applicant name.
- Re-issue after rejection — new request, do not mutate history.
- Cancel issued NOC — status CANCELLED with reason (soft revoke).

## Requirements

- **FR-001**: System MUST support NOC purposes: SALE_TRANSFER, BANK_LOAN, RENTAL, RENOVATION, OTHER.
- **FR-002**: Each NOC MUST reference an association flat and capture applicant name + purpose.
- **FR-003**: Workflow statuses: DRAFT, SUBMITTED, ISSUED, REJECTED, CANCELLED.
- **FR-004**: Only authorized roles MAY issue or reject (Secretary, Superadmin; Treasurer may approve when configured).
- **FR-005**: Issued letter MUST include society name, flat identity, owner/applicant, purpose, issue date, and issuer.
- **FR-006**: System MUST retain immutable history of status changes (audit).
- **FR-007**: List/filter by status, purpose, flat, date range.
- **FR-009**: Flat picker on create MUST use shared typeahead search (005 FR-006a), not a full-register `<select>`.
- **FR-010**: NOC requests MUST support optional file **attachments** (images/PDF); creators (staff or linked resident) MAY upload/list/download; soft-delete hides from default lists. See also `014-resident-portal`.

## Key Entities

- **NocRequest**: Application/certificate record.
- **NocStatusEvent**: Audit of status transitions.
- **NocAttachment**: Supporting documents on a request.
- **Flat / FlatMember**: From 005.

## Success Criteria

- **SC-001**: Secretary can issue a Sale NOC letter for printing in under 3 minutes from a registered flat.
- **SC-002**: 100% of issued NOCs retain previous status history.
- **SC-003**: Unauthorized roles cannot issue NOCs (verified in UI + API).

## Assumptions

- Society legal name/address come from association settings (extend settings or hardcode NHPAOWA for v1).
- Digital signature / stamp image deferred; print + wet signature OK for v1.
- Maharashtra/Karnataka bye-law nuances: product supports optional NOC even where not always legally mandatory.
