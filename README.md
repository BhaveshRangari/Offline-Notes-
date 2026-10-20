# Offline Notes

An offline-first notes app built with plain HTML, CSS and JavaScript. Notes are stored in IndexedDB, and a Service Worker caches the app so it opens and works with no internet connection.

**Live demo:** [add your Netlify link]

## Features

- Create, edit, delete and search notes
- Stored in **IndexedDB**, the browser's built-in database
- Works fully **offline** thanks to a **Service Worker** (cache-first strategy)
- **Installable** as an app (PWA) on desktop and phone
- **Optimistic updates**: the screen updates instantly, and rolls back if saving fails
- Online/offline badge using the browser's `online` and `offline` events
- **Accessible**: skip link, keyboard shortcuts, visible focus, focus management, screen-reader announcements, accessible form errors, reduced-motion support
- Responsive two-column layout with CSS Grid

## Tech

HTML5 · CSS3 (Grid, Flexbox, custom properties) · JavaScript (ES6+, async/await, Promises) · IndexedDB · Service Worker · Cache API · Web App Manifest

---

# Your learning guide (delete this section before publishing)

## How to run it

**Important:** this one will NOT fully work if you double-click `index.html`. Service Workers only run on `http://localhost` or `https://`.

1. Put all 7 files in one folder, e.g. `D:\offline-notes`
2. Open the folder in VS Code
3. Right-click `index.html` → **Open with Live Server**

## Try the offline magic

1. Add a few notes
2. Press **F12** → **Application** tab → **Service Workers**: you'll see `sw.js` "activated and running"
3. In the same tab, tick **Offline** (or go to the **Network** tab and choose **Offline**)
4. Refresh the page. It still loads, and the badge says "Offline"
5. Add a note while offline. It still saves.
6. **Application → IndexedDB → offline-notes → notes**: see your notes stored in the database

## Study order (one section of app.js per day)

| Day | Section | Concept |
|---|---|---|
| 1 | 1. IndexedDB helpers | Wrapping callbacks in Promises, transactions |
| 2 | 4–5. Render + Save | Optimistic updates, validation, spread `...`, `??` |
| 3 | 6–7. Edit/Delete + Keyboard | Event delegation, focus management, shortcuts |
| 4 | `sw.js` | Service Worker lifecycle, Cache API, cache-first |
| 5 | `index.html` + `style.css` | Semantic HTML, ARIA, skip link, Grid, compositor-friendly animation |

## Interview questions this project prepares you for

1. **"localStorage vs IndexedDB?"** → localStorage is small (~5 MB), stores only strings and is synchronous, so it blocks the page. IndexedDB is asynchronous, stores real objects, can hold much more data and supports transactions.
2. **"What is a Service Worker?"** → A background script between the page and the network. It can cache files and answer requests offline. Lifecycle: install → activate → fetch.
3. **"Cache-first vs network-first?"** → Cache-first gives a fast, offline-ready app shell, but files can be stale. Network-first gives fresh data but needs a connection. Pick per file type.
4. **"How do users get updates when files are cached?"** → Change `CACHE_NAME`. The new worker installs, and `activate` deletes the old cache.
5. **"What is an optimistic update?"** → Update the UI before the server or database confirms, then roll back on failure. It makes the app feel instant.
6. **"How did you make it accessible?"** → Semantic HTML, labels, visible focus, `aria-live` announcements, `aria-invalid` on errors, a skip link, keyboard shortcuts, moving focus after delete, and `prefers-reduced-motion`.
7. **"Why does `defer` help performance?"** → The script downloads in parallel and runs after HTML parsing, so it doesn't block the first paint.
8. **"Why animate `transform` and not `top` or `margin`?"** → `transform` is handled by the GPU compositor with no layout reflow. Changing `top` forces layout and paint again.
9. **"Why `textContent` and not `innerHTML`?"** → It prevents XSS, because user text is never parsed as HTML.

## Add one feature yourself

1. Add a colour or tag for each note
2. Add "Export notes" that downloads all notes as a `.json` file
3. Show "Last saved 2 minutes ago" that updates live
