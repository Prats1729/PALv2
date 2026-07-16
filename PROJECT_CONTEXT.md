# Project Context & Roadmap: PALv2

Welcome! This file serves as your central reference for **PALv2** as you step away to learn React Router. When you return, this document will help you immediately get back up to speed on what we have built, how it works, and what we need to build next.

---

## 📌 Project Overview
* **Description**: A personal hobby project to search anime, store a watchlist, and track watch progress without relying on piracy websites. The goal is to maintain a persistent watchlist that survives infrastructure changes.
* **API Integration**: Powered by the **AniList GraphQL API** (`https://graphql.anilist.co`).

---

## 🛠️ Technology Stack
* **Frontend**: React (Vite-based)
* **Styling**: Custom CSS (Vanilla CSS for maximum control and clean custom UI aesthetics)
* **Data Fetching**: GraphQL queries targeting the AniList endpoint

---

## 📁 File Structure & Key Files
Here is how the project is organized currently:
* 📄 [`package.json`](file:///c:/Users/Prateek/Desktop/PALv2/package.json): Project dependencies.
* 📄 [`index.html`](file:///c:/Users/Prateek/Desktop/PALv2/index.html): HTML entry point.
* 📁 `src/`
  * 📄 [`App.jsx`](file:///c:/Users/Prateek/Desktop/PALv2/src/App.jsx): Parent component managing the active search state (`query`), rendering results, loading/error states, and coordinates with `TopBar`.
  * 📄 [`App.css`](file:///c:/Users/Prateek/Desktop/PALv2/src/App.css): Layout styles (grid layout for anime cards, animations, dark theme colors).
  * 📁 `components/layout/`
    * 📄 [`TopBar.jsx`](file:///c:/Users/Prateek/Desktop/PALv2/src/components/layout/TopBar.jsx): The header search bar. Keeps track of typing input, contains the **debounce logic**, and submits to `App.jsx`.
  * 📁 `styles/`
    * 📄 [`TopBar.css`](file:///c:/Users/Prateek/Desktop/PALv2/src/styles/TopBar.css): Styles for the search bar, search buttons, inputs, and positioning.
  * 📁 `services/`
    * 📄 [`anilist.js`](file:///c:/Users/Prateek/Desktop/PALv2/src/services/anilist.js): Handles GraphQL query requests to AniList for searching anime.
  * 📁 `assets/`
    * Contains icons and assets (e.g. search icon SVG, star image for scores).

---

## ✅ Achieved Goals
1. **AniList API Service**: Configured GraphQL queries in `anilist.js` to fetch anime details (title, cover image, average score, formats, episode count, next airing episode).
2. **Dynamic Search UI**: Built a responsive search grid that displays cards with rich aesthetics (glassmorphism effect, hover transformations, score badges, status/episode tracking).
3. **Debounced Search**: Added automatic debounced searching (`TopBar.jsx`) that triggers 500ms after the user stops typing, and cleans up pending timers if the user types again.
4. **Auto-Clear Results**: Handled resetting search results to empty when the search query is cleared.

---

## 🚀 Future Roadmap & Upcoming Goals

Once you have learned React Router, here is the sequence of goals we will tackle:

### 1. Navigation & Routing (Using React Router)
* **Home Page (`/`)**: The main search dashboard.
* **Anime Details Page (`/anime/:id`)**: A dedicated detail view for any anime clicked in the search grid.
* **Watchlist Page (`/watchlist`)**: A dedicated page displaying the user's saved watchlist.

### 2. Local Watchlist Persistence
* Create a context or state manager to add, delete, and update progress of anime in a personal watchlist.
* Use `localStorage` to save and read the watchlist so the list survives browser reloads.

### 3. AniList OAuth Integration
* Integrate official AniList authentication (OAuth).
* Allow the application to read and update the user's live list on AniList itself.
