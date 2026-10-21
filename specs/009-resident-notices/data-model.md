# Data Model: Resident Notices

## Notice

- id (uuid)
- associationId (uuid)
- title (string)
- body (text)
- category (string?, e.g. Security | General | Compliance)
- status: DRAFT | PUBLISHED | UNPUBLISHED | ARCHIVED
- publishedAt (datetime?)
- publishedByName (string?)
- publishedByUserId (uuid?)
- pdfFileName (string?)
- pdfPath (string?) — server-relative path to generated PDF
- createdByUserId (uuid?)
- createdAt, updatedAt

## NoticeStatusEvent

- id (uuid)
- noticeId (uuid)
- fromStatus (string?)
- toStatus (string)
- actorUserId (uuid?)
- note (string?)
- createdAt

## Indexes

- (associationId, status)
- (associationId, publishedAt)
