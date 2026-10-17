# QuickNotes API Design

## Overview

- **Base URL:** `https://api.quicknotes.example/v1`
- **Format:** All requests and responses use JSON.
- **Authentication:** Each request sends a token in the header `Authorization: Bearer <token>`. Users can only read and change their own notes.

## Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| GET | `/notes` | List the signed-in user's notes. Supports `page`, `limit` and `tag` query parameters. | 200 OK |
| GET | `/notes/{id}` | Get one note by its id. | 200 OK |
| POST | `/notes` | Create a new note. | 201 Created |
| PUT | `/notes/{id}` | Replace the title, body and tags of an existing note. | 200 OK |
| DELETE | `/notes/{id}` | Delete a note. | 204 No Content |
| GET | `/tags` | List the signed-in user's tags with the number of notes for each. | 200 OK |

## Example: creating a note

**Request:** `POST /notes`

```json
{
  "title": "Buy milk",
  "body": "Semi-skimmed, two litres",
  "tags": ["personal", "errands"]
}
```

**Response:** `201 Created`

```json
{
  "id": 42,
  "title": "Buy milk",
  "body": "Semi-skimmed, two litres",
  "tags": ["personal", "errands"],
  "created_at": "2026-10-16T09:30:00Z",
  "updated_at": "2026-10-16T09:30:00Z"
}
```

## Example: listing notes

**Request:** `GET /notes?page=1&limit=10`

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 42,
      "title": "Buy milk",
      "body": "Semi-skimmed, two litres",
      "tags": ["personal", "errands"],
      "created_at": "2026-10-16T09:30:00Z",
      "updated_at": "2026-10-16T09:30:00Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

## Error status codes

Every error returns the same shape, so the client can handle them in one place:

```json
{
  "error": {
    "code": 404,
    "message": "Note 999 was not found"
  }
}
```

| Status | Meaning | When it happens | Example message |
|---|---|---|---|
| 400 Bad Request | The request is malformed or fails validation. | The title is missing, or it is longer than 100 characters. | `"title is required"` |
| 401 Unauthorized | The user is not signed in, or the token is missing or expired. | A request is sent without an `Authorization` header. | `"Sign in to continue"` |
| 403 Forbidden | The user is signed in but is not allowed to do this. | A user tries to delete a note that belongs to someone else. | `"You do not have access to this note"` |
| 404 Not Found | The requested item does not exist. | `GET /notes/999` when no note has the id 999. | `"Note 999 was not found"` |
| 500 Internal Server Error | Something failed on the server. | The database is unreachable. | `"Something went wrong. Please try again later."` |
