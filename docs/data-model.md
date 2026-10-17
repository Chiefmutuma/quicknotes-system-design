# QuickNotes Data Model

## Entities

### users
| Column | Type | Key | Notes |
|---|---|---|---|
| id | INTEGER | Primary key | Unique id for each user |
| email | VARCHAR(255) | Unique | Used to sign in. Must be unique and cannot be empty. |
| password_hash | VARCHAR(255) | | A hashed password. Plain-text passwords are never stored. |
| created_at | TIMESTAMP | | When the account was created |

### notes
| Column | Type | Key | Notes |
|---|---|---|---|
| id | INTEGER | Primary key | Unique id for each note |
| user_id | INTEGER | Foreign key to users.id | The owner of the note |
| title | VARCHAR(100) | | Required, up to 100 characters |
| body | TEXT | | Optional |
| created_at | TIMESTAMP | | When the note was created |
| updated_at | TIMESTAMP | | When the note was last changed |

### tags
| Column | Type | Key | Notes |
|---|---|---|---|
| id | INTEGER | Primary key | Unique id for each tag |
| name | VARCHAR(50) | Unique | For example "work" or "personal" |

### note_tags
| Column | Type | Key | Notes |
|---|---|---|---|
| note_id | INTEGER | Primary key (with tag_id), foreign key to notes.id | The note |
| tag_id | INTEGER | Primary key (with note_id), foreign key to tags.id | The tag |

## Relationships

- **users to notes: one-to-many.** One user can own many notes, but each note belongs to exactly one user. The `user_id` column in `notes` holds this link.
- **notes to tags: many-to-many.** One note can have many tags, and one tag can be used on many notes. A join table, `note_tags`, is needed because neither table can hold a list of links without breaking the rules of a relational database. Each row in `note_tags` records one pairing. The combined primary key stops the same tag being added to the same note twice.

## CREATE TABLE statements

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title VARCHAR(100) NOT NULL,
  body TEXT,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes (id),
  FOREIGN KEY (tag_id) REFERENCES tags (id)
);
```

## Example queries

**1. The 10 newest notes for one user**

```sql
SELECT id, title, created_at
FROM notes
WHERE user_id = 1
ORDER BY created_at DESC
LIMIT 10;
```

**2. Each note with its tags (JOIN)**

```sql
SELECT notes.id, notes.title, tags.name AS tag
FROM notes
JOIN note_tags ON note_tags.note_id = notes.id
JOIN tags ON tags.id = note_tags.tag_id
WHERE notes.user_id = 1;
```

**3. Number of notes per tag**

```sql
SELECT tags.name, COUNT(note_tags.note_id) AS note_count
FROM tags
LEFT JOIN note_tags ON note_tags.tag_id = tags.id
GROUP BY tags.id, tags.name;
```

## Indexes

**Index: `notes (user_id, created_at)`**

```sql
CREATE INDEX idx_notes_user_created ON notes (user_id, created_at);
```

Almost every screen in QuickNotes shows one user's notes, newest first, which is query 1. Without this index, the database reads every note in the table to find the matches, and that gets slower as the table grows to millions of rows. With the index, it finds the user's notes directly, already in date order, so it doesn't need a separate sort step.

## SQL or NoSQL

I would choose SQL for QuickNotes. The data is structured and connected: each note belongs to a user, and tags link to notes through a join table. The database must keep these links correct, reject notes for users who don't exist, and stop duplicate tags on a note. SQL enforces these rules with keys and constraints, and joins answer questions such as "which notes have the tag work?" directly. A NoSQL document store would suit data with no fixed shape, but QuickNotes has a clear structure that benefits from the guarantees SQL provides.
