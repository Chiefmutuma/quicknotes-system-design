// ---------- Setup ----------
const API_URL = "https://jsonplaceholder.typicode.com/posts";
const MAX_TITLE_LENGTH = 100;

const loadBtn = document.querySelector("#load-btn");
const statusEl = document.querySelector("#status");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");
const notesList = document.querySelector("#notes-list");

// Notes currently shown on the page
let notes = [];

// ---------- Helpers ----------

// Reusable request function: calls fetch, checks the response and throws on errors
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const data = await response.json();
  return { status: response.status, data };
}

// Shows a message in #status. type is "loading", "success" or "error"
function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status-${type}`;
}

// Draws the list. Shows an empty state when there are no notes
function renderNotes(list) {
  notesList.replaceChildren();

  if (list.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent = "No notes to show. Load notes or create one below.";
    notesList.appendChild(empty);
    return;
  }

  for (const note of list) {
    const item = document.createElement("li");
    item.className = "note-card";

    const title = document.createElement("h3");
    title.textContent = note.title;

    const body = document.createElement("p");
    body.textContent = note.body;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteNote(note, deleteBtn));

    item.append(title, body, deleteBtn);
    notesList.appendChild(item);
  }
}

// Returns an error message if the title is not valid, or "" if it is valid
function validateTitle(title) {
  if (title === "") {
    return "Please enter a title.";
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return `Titles must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }
  return "";
}

// ---------- GET: load 10 notes ----------
async function loadNotes() {
  loadBtn.disabled = true;
  showStatus("Loading notes...", "loading");

  try {
    const { data } = await request(`${API_URL}?_limit=10`);
    notes = data; // replaces the list with the server's notes
    renderNotes(notes);
    showStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    showStatus("Could not load notes. Please check your connection and try again.", "error");
    console.error(error);
  } finally {
    loadBtn.disabled = false;
  }
}

// ---------- POST: create a note ----------
async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  const problem = validateTitle(title);
  if (problem !== "") {
    showStatus(problem, "error");
    return;
  }

  submitBtn.disabled = true;
  showStatus("Creating note...", "loading");

  try {
    const { status, data } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });

    notes.unshift(data); // add the returned note to the top of the list
    renderNotes(notes);
    showStatus(`Note created (status ${status}, id ${data.id}).`, "success");
    noteForm.reset();
  } catch (error) {
    showStatus("Could not create the note. Please try again.", "error");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
}

// ---------- DELETE: remove one note ----------
// JSONPlaceholder is a practice API. It does not really store notes:
// - A POST always returns id 101, even though nothing is saved on the server.
// - A DELETE returns success for any id, without removing anything real.
// So the server can't confirm a deletion in a meaningful way. We still send the
// DELETE request so the app follows the real API pattern, and we remove the note
// from our own list only when the request succeeds. We remove the exact note object
// that was clicked, not every note with the same id, so notes that share id 101
// are not removed by mistake.
async function deleteNote(note, deleteBtn) {
  deleteBtn.disabled = true;
  showStatus(`Deleting note ${note.id}...`, "loading");

  try {
    await request(`${API_URL}/${note.id}`, { method: "DELETE" });
    notes = notes.filter((item) => item !== note);
    renderNotes(notes);
    showStatus(`Note ${note.id} deleted.`, "success");
  } catch (error) {
    showStatus("Could not delete the note. Please try again.", "error");
    console.error(error);
    deleteBtn.disabled = false;
  }
}

// Load the notes when the button is clicked
loadBtn.addEventListener("click", loadNotes);

// Create a note when the form is submitted
noteForm.addEventListener("submit", createNote);

// Show the empty state when the page first opens
renderNotes(notes);
