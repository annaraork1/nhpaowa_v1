# Contract: Staff Photo API

Base: `/api/association` — resource `attendance`.

### POST `/staff/photo`

- Auth: `attendance` createEdit  
- Body: `multipart/form-data` field `photo` (image/* , max ~5 MB)  
- **201** `{ "url": "/uploads/staff/...." }`  
- **400** no file / non-image  

### POST `/staff`

Body may include `photoUrl` (optional, nullable) in addition to existing fields (`011` category rules unchanged).

### PATCH `/staff/:id`

Body may include `photoUrl` to set or clear (`null` / empty → clear).

### GET `/staff`

Each row includes `photoUrl` when set.
