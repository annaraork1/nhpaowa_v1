# Data Model: NOC

## NocRequest
- id, associationId, flatId, purpose, applicantName, applicantPhone?, status, duesCleared (bool), validUntil?, issuedAt?, issuedByName?, rejectionReason?, notes?, timestamps

## NocStatusEvent
- id, nocRequestId, fromStatus?, toStatus, actorUserId?, note?, createdAt
