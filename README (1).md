# QuickNotes System Design

QuickNotes is a note-taking service that is growing from a browser-only app into an online service for up to one million people. This repository contains two parts: a working API client that loads, creates and deletes notes using the JSONPlaceholder practice API, and the design documents the backend team will use to build the real service.

## How to run the API client

1. Download or clone this repository to your computer.
2. Open the folder in VS Code.
3. Right-click `index.html` and select **Open with Live Server**.
4. Click **Load notes** to fetch 10 notes, fill in the form to create a note, and use **Delete** on any note.

The client needs an internet connection, because it talks to `https://jsonplaceholder.typicode.com/posts`. JSONPlaceholder is a practice API, so new notes and deletions are not saved on the server.

## Design documents

- [API design](docs/api-design.md): the REST endpoints, example requests and responses, and error codes.
- [Data model](docs/data-model.md): the tables, keys, relationships, SQL statements, queries and indexes.
- [Architecture](docs/architecture.md): requirements, load estimates, the system diagram, request flows and trade-offs.

## What I learned

- **Separate the client from the server.** Building the client against a practice API showed me what the real API must return, and it made the design documents concrete.
- **Check every response.** `fetch` does not treat a 404 or 500 as an error, so checking `response.ok` is what makes the error handling work.
- **Plan the data before the code.** Writing the data model first made it clear which relationships need a join table, and why the grade of each enrolment belongs to the pairing rather than to one table.
- **Design for failure.** Every component in the architecture has a backup, because a service used by a million people cannot stop when one server fails.
