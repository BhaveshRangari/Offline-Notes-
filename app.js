

"use strict";

// ---------------------------------------------------------------------
// 1. INDEXEDDB HELPERS
// IndexedDB uses old-style callbacks (onsuccess/onerror).
// We wrap them in Promises so we can use async/await — a very common pattern.
// ---------------------------------------------------------------------
const DB_NAME = "offline-notes";
const DB_VERSION = 1;
const STORE = "notes";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Runs only the first time (or when DB_VERSION goes up): create the "table"
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" }); // each note is found by its id
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Open once, reuse the same connection everywhere
const dbReady = openDatabase();

// Runs one operation inside a transaction and returns a Promise with its result.
// mode: "readonly" for reading, "readwrite" for changes.
async function runInStore(mode, operation) {
  const db = await dbReady;
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    // Resolve when the whole transaction is finished, so the data is really saved
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

const db = {
  getAll: () => runInStore("readonly", (store) => store.getAll()),
  save: (note) => runInStore("readwrite", (store) => store.put(note)), // put = insert OR update
  remove: (id) => runInStore("readwrite", (store) => store.delete(id)),
};


let notes = [];         
let editingId = null;    
let searchText = "";


const form = document.getElementById("note-form");
const titleInput = document.getElementById("note-title");
const bodyInput = document.getElementById("note-body");
const formError = document.getElementById("form-error");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");
const editorHeading = document.getElementById("editor-heading");
const list = document.getElementById("notes-list");
const countEl = document.getElementById("note-count");
const searchInput = document.getElementById("search-input");
const statusBadge = document.getElementById("status-badge");
const announcer = document.getElementById("announcer");

// Intl.DateTimeFormat: built-in, locale-aware date formatting (no library needed)
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});


function render() {
  const visible = notes
    .filter((note) =>
      (note.title + " " + note.body).toLowerCase().includes(searchText)
    )
    .sort((a, b) => b.updatedAt - a.updatedAt); // newest first

  countEl.textContent = visible.length;
  list.replaceChildren(); // removes all old items

  if (visible.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = searchText ? "No notes match your search." : "No notes yet. Write your first one!";
    list.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment(); // one DOM update instead of many
  visible.forEach((note) => fragment.append(createNoteElement(note)));
  list.append(fragment);
}

function createNoteElement(note) {
  const li = document.createElement("li");
  li.className = "note";
  li.dataset.id = note.id;

  // <article> is the semantic tag for a self-contained piece of content
  const article = document.createElement("article");
  article.style.display = "contents";

  const title = document.createElement("h3");
  title.textContent = note.title; // textContent, never innerHTML, for user text (prevents XSS)

  const body = document.createElement("p");
  body.textContent = note.body;

  // <time datetime="..."> gives machines the exact date, humans the readable one
  const time = document.createElement("time");
  time.dateTime = new Date(note.updatedAt).toISOString();
  time.textContent = dateFormatter.format(note.updatedAt);

  const actions = document.createElement("div");
  actions.className = "note-actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.dataset.action = "edit";
  editBtn.textContent = "Edit";
  editBtn.setAttribute("aria-label", `Edit note: ${note.title}`); // screen readers say WHICH note

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.dataset.action = "delete";
  deleteBtn.textContent = "Delete";
  deleteBtn.setAttribute("aria-label", `Delete note: ${note.title}`);

  actions.append(editBtn, deleteBtn);
  article.append(title, body, time, actions);
  li.append(article);
  return li;
}


function announce(message) {
  announcer.textContent = "";
  
  setTimeout(() => (announcer.textContent = message), 50);
}


form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  
  if (!title) {
    formError.hidden = false;
    titleInput.setAttribute("aria-invalid", "true");
    titleInput.setAttribute("aria-describedby", "form-error");
    titleInput.focus();
    return;
  }
  clearError();

  const note = {
    id: editingId ?? crypto.randomUUID(), // ?? = use the right side only if left is null/undefined
    title,
    body,
    updatedAt: Date.now(),
  };

  // OPTIMISTIC UPDATE: update the screen first so it feels instant,
  // then save to the database. If saving fails, roll back.
  const previousNotes = notes;
  notes = editingId
    ? notes.map((n) => (n.id === editingId ? note : n)) // replace the edited one
    : [...notes, note];                                   // spread = copy + add
  const wasEditing = Boolean(editingId);
  resetForm();
  render();

  try {
    await db.save(note);
    announce(wasEditing ? "Note updated" : "Note saved");
  } catch (error) {
    notes = previousNotes; // roll back
    render();
    announce("Could not save the note. Please try again.");
    console.error(error);
  }
});

function clearError() {
  formError.hidden = true;
  titleInput.removeAttribute("aria-invalid");
  titleInput.removeAttribute("aria-describedby");
}

function resetForm() {
  form.reset();
  clearError();
  editingId = null;
  editorHeading.textContent = "New note";
  saveBtn.textContent = "Save note";
  cancelBtn.hidden = true;
}


list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.closest(".note").dataset.id;
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  if (button.dataset.action === "edit") {
    startEditing(note);
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete "${note.title}"?`)) return;

    const previousNotes = notes;
    notes = notes.filter((n) => n.id !== id); // optimistic remove
    if (editingId === id) resetForm();
    render();

    try {
      await db.remove(id);
      announce("Note deleted");
      list.focus(); // FOCUS MANAGEMENT: the button is gone, so move focus somewhere sensible
    } catch (error) {
      notes = previousNotes;
      render();
      announce("Could not delete the note.");
    }
  }
});

function startEditing(note) {
  editingId = note.id;
  titleInput.value = note.title;
  bodyInput.value = note.body;
  editorHeading.textContent = "Edit note";
  saveBtn.textContent = "Update note";
  cancelBtn.hidden = false;
  titleInput.focus(); // move keyboard focus to the form
  titleInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

cancelBtn.addEventListener("click", () => {
  resetForm();
  announce("Editing cancelled");
});


form.addEventListener("keydown", (event) => {

  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    form.requestSubmit(); // triggers the submit event, just like clicking Save
  }
  // Escape cancels editing
  if (event.key === "Escape" && editingId) {
    resetForm();
    announce("Editing cancelled");
  }
});

function debounce(fn, delay) {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delay);
  };
}

searchInput.addEventListener(
  "input",
  debounce(() => {
    searchText = searchInput.value.trim().toLowerCase();
    render();
  }, 250)
);


function updateStatus() {
  const online = navigator.onLine;
  statusBadge.textContent = online ? "Online" : "Offline — notes still save";
  statusBadge.className = `badge ${online ? "online" : "offline"}`;
}

window.addEventListener("online", () => {
  updateStatus();
  announce("You are back online");
});
window.addEventListener("offline", () => {
  updateStatus();
  announce("You are offline. Notes are still saved on this device.");
});


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch((error) => console.warn("Service Worker not registered:", error));
  });
}


async function init() {
  updateStatus();
  try {
    notes = await db.getAll();
  } catch (error) {
    announce("Could not load your notes.");
    console.error(error);
  }
  render();
}

init();
