# Project Context & Roadmap: PALv2

Welcome! This file serves as your central reference for **PALv2**. It tracks what we have built, how it works, and what we need to build next.

---

## 📌 Project Overview
* **Description**: A personal hobby project to search anime, store a watchlist, and track watch progress without relying on piracy websites. The goal is to maintain a persistent watchlist that survives infrastructure changes.
* **API Integration**: Powered by the **AniList GraphQL API** (`https://graphql.anilist.co`).

---

## 🛠️ Technology Stack
* **Frontend**: React (Vite-based) with React Router v6
* **Styling**: Custom CSS (Vanilla CSS for maximum control and clean custom UI aesthetics)
* **Data Fetching**: GraphQL queries targeting the AniList endpoint

---

## 📁 File Structure & Key Files
Here is how the project is organized currently:
* 📄 [`package.json`](file:///c:/Users/Prateek/Desktop/PALv2/package.json): Project dependencies.
* 📄 [`index.html`](file:///c:/Users/Prateek/Desktop/PALv2/index.html): HTML entry point.
* 📁 `src/`
  * 📄 [`App.jsx`](file:///c:/Users/Prateek/Desktop/PALv2/src/App.jsx): Main router and layout coordinator.
  * 📄 [`App.css`](file:///c:/Users/Prateek/Desktop/PALv2/src/App.css): Layout styles (grids, animations, global resets).
  * 📁 `components/layout/`
    * 📄 [`TopBar.jsx`](file:///c:/Users/Prateek/Desktop/PALv2/src/components/layout/TopBar.jsx): Main navigation header with text links (capsule style), search input, and floating preview dropdown.
  * 📁 `styles/`
    * 📄 [`TopBar.css`](file:///c:/Users/Prateek/Desktop/PALv2/src/styles/TopBar.css): Styles for search bar, links, and dropdown.
    * 📄 [`Discover.css`](file:///c:/Users/Prateek/Desktop/PALv2/src/styles/Discover.css): Catalog layout, select boxes, and custom multi-select checkbox dropdown styling.
    * 📄 [`AnimeDetails.css`](file:///c:/Users/Prateek/Desktop/PALv2/src/styles/AnimeDetails.css): Details page aesthetic styles.
  * 📁 `pages/`
    * 📄 [`Home.jsx`](file:///c:/Users/Prateek/Desktop/PALv2/src/pages/Home.jsx): Home dashboard with Hero banner, Trending, and Popular grids.
    * 📄 [`Discover.jsx`](file:///c:/Users/Prateek/Desktop/PALv2/src/pages/Discover.jsx): Catalog browser with multi-select dropdown filters (genres, tags, formats, status) and single-select controls (year, season, sort).
    * 📄 [`AnimeDetails.jsx`](file:///c:/Users/Prateek/Desktop/PALv2/src/pages/AnimeDetails.jsx): Dynamic anime detailed view with custom fallback gradient banners.
  * 📁 `services/`
    * 📄 [`anilist.js`](file:///c:/Users/Prateek/Desktop/PALv2/src/services/anilist.js): Handles search query requests to AniList.

---

## ✅ Achieved Goals
1. **React Router Core**: Configured dynamic page routes (`/`, `/discover`, `/anime/:id`).
2. **Dynamic Dashboard Home**: Built a home page with an immersive Hero section highlighting the top trending show, with clean HTML description stripping and dynamic grids.
3. **Dynamic Catalog Discover**: Developed an advanced Catalog search page with custom multi-select checkbox dropdown filters (Genres, Tags, Format, Status), single dropdown filters (Year, Season, Sort By), and local search with a Clear All filter controller.
4. **Detail Page fallback**: Constructed the details page with fallback CSS gradient banners for anime missing high-res banner files.
5. **Modern Header Navigation**: Created a sleek, capsule-button navigation menu for page links and fixed logo alignment.
6. **Key UX optimizations**: Handled clearing search state via `Esc` key down listeners.

---

## 🚀 Future Roadmap & Upcoming Goals

### 1. Watchlist / Library Page Operations (`/library`)
* Create a global context or hook to add/remove/update anime in the user's active watchlist.
* Design a clean library grid displaying current watch status (e.g. "Plan to Watch", "Watching", "Completed").

### 2. Local Watchlist Persistence
* Save the watchlist state into `localStorage` so user lists survive browser reloads.

### 3. AniList OAuth Integration
* Integrate official AniList OAuth to authenticate users.
* Allow saving list operations directly to the user's AniList profile.

---

## 🎓 Learning Guidelines
* **Role**: The assistant will explain architecture, patterns, and provide precise, clean code snippets. The assistant will NOT directly edit source files in `src/` unless explicitly requested.
* **Brevity**: Snippets should contain no unnecessary lines of code. Keep implementations as concise as possible while providing complete functionality.


