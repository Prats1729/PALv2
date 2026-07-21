# PAL - Personal Anime Library 🎬
**Version:** v1.0.0

PAL (Personal Anime Library) is a modern, responsive web application built for anime enthusiasts to search, track, and catalog their favorite shows. Designed as a client-side catalog manager, PAL links directly to the AniList GraphQL API to provide real-time trending recommendations, advanced multi-layered filter configurations, custom search results, and public library summaries alongside calculated watch metrics without requiring a database in its initial release.

---

## Screenshots

To set up PAL locally and view the user interface layouts, please check the placeholders below:

| Feature Section | Screenshot Preview Placeholder |
| :--- | :--- |
| **Home Dashboard** | ![home-dark](/images/image.png)  |
| **Discover Catalog** | ![discover-dark](/images/image-1.png) |
| **Quick Search & Full Page** | ![quickSearch-dark](/images/image-2.png) |
| **Anime Details** | ![Anime Details](/images/image-3.png) |
| **Library List Lookup** | ![Library](/images/image-4.png) |
| **Statistics Console** | ![Statistics](/images/image-5.png) |
| **Settings Panel** | ![Settings](/images/image-6.png) |
| **Dark Theme View** | ![Dark Theme](/images/image-7.png) |
| **Light Theme View** | ![Light Theme](/images/image-8.png) |

---

## Features

### Discover
- **Trending Slideshow**: Immersive landing banner highlighting highly active shows with automated slide intervals and indicators.
- **Advanced Filtering**: Custom multi-select checkbox list menus (Genres, Tags, Format, Status) alongside single-select options (Year, Season, Sort By).
- **URL Parameter State Syncing**: All catalog parameters automatically sync to the browser query parameters (`?genres=Action&year=2024`), preserving filter selections upon reload or link sharing.

### Search
- **Debounced Suggestion Dropdown**: Floating navigation menu suggesting matching results as you type (400ms debounce), with full keyboard arrow key focus support.
- **Full Results Page**: Redirects to a dedicated grid displaying full query matches (`/search?q=Naruto`).

### Anime Details
- **Dynamic Banners**: Pulls source banner banners with a dynamic gradient overlay, with smart CSS gradient backups for records missing hero artwork.
- **Metadata Cards**: Formats detailed technical indexes including status, season, type, episodes, average rating, and studio names.

### Library
- **Public Profile Lookups**: Load public watchlists from AniList by simply entering a profile name.
- **Tabs Categories**: Fast sorting toggles between *Watching*, *Completed*, *Plan to Watch*, and *Dropped* shows.
- **Saved Profiles**: Cache multiple bookmarks in browser memory for easy switching.

### Statistics
- **Computed Indicators**: Evaluates profile records to calculate total entries, total episodes watched, mean rating, and watch time converted into days.
- **Profile Quick-Selector**: Change statistics views instantly via saved profile buttons.

### UI & UX
- **Theme Preferences**: Fully supported Light/Dark layout switches synced to browser memory.
- **Loading Skeletons**: Fluid pulsing loaders that occupy empty grid spaces during loading states.
- **Scrollbar Aesthetics**: Custom Windows 10 flat rectangular scrollbar modules matching dark/light themes.

---

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **React** | Component-driven UI rendering engine |
| **React Router v7** | Single Page Application client-side routing |
| **Vite** | Fast frontend build bundler |
| **GraphQL** | Query language used for targeted resource requests |
| **AniList API** | External database server supplying metadata and lists |
| **Vanilla CSS** | Structured, modular design layout and themes |
| **LocalStorage** | Persistence layer caching settings, user contexts, and bookmark tags |
| **Vercel** | Hosting platform for client-side static deployment |

---

## Project Structure

```text
PALv2/
├── public/                 # Static asset distribution files
├── src/
│   ├── assets/             # SVG icons and logos
│   ├── components/
│   │   └── layout/
│   │       └── TopBar.jsx   # Fixed navigation bar and suggestion list
│   ├── pages/
│   │   ├── Home.jsx         # Carousel and dashboard
│   │   ├── Discover.jsx     # Filtering search catalog
│   │   ├── Library.jsx      # Watchlist lookup and saved users
│   │   ├── Search.jsx       # Dedicated query grids
│   │   ├── Statistics.jsx   # Metrics calculations
│   │   ├── Settings.jsx     # App configuration values
│   │   └── AnimeDetails.jsx # Detailed synopsis and stats
│   ├── services/
│   │   ├── anilist.js       # GraphQL queries and API fetchers
│   │   ├── storage.js       # localStorage CRUD helpers
│   │   └── toast.js         # Event-driven toast notifications
│   ├── styles/              # Component-specific styles
│   ├── App.jsx              # Main routing coordinator
│   ├── App.css              # Global themes, media queries, and skeletons
│   └── main.jsx             # React DOM entry point
├── package.json             # Core dependency settings
└── README.md                # Project documentation
```

---

## Installation

Follow these steps to run PAL on your local machine:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/pal.git
   cd pal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the local Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. Build the production bundle:
   ```bash
   npm run build
   ```

---

## Deployment

PAL is configured for production hosting on **Vercel**. Every commit pushed to the main repository automatically builds and updates the live site.

---

## Future Plans (Version 2)

Version 2 will transition PAL into a full-stack dashboard, introducing the following backend capabilities:
- **Node.js & Express API**: Internal backend server to orchestrate data aggregation.
- **MongoDB Database**: Document-store persistence for user accounts and personal lists.
- **OAuth Login**: Official AniList OAuth integration to update watch lists and ratings directly from PAL.
- **Personal Cloud Library**: User accounts with settings and profile caching synced across devices.

---

## What I Learned

Building PAL provided deep experience in modern frontend development patterns:
- **React Router Navigation Context**: Synchronizing search parameters (`useSearchParams`) to serve as the single source of truth for UI filters.
- **GraphQL Integration**: Structuring efficient queries to fetch nested parameters (e.g. titles, cover colors, format, user lists) in a single request.
- **Pure CSS Theme Systems**: Creating overrides based on parent container classes (e.g. `body.light-theme`) to transition inputs, scrollbars, and skeletons cleanly.
- **Keyboard Usability**: Implementing index-based states to enable keyboard controls on custom floating components.
- **State Caching**: Constructing resilient CRUD helpers on browser storage models.

---

## Acknowledgements

- [AniList API Co.](https://github.com/AniList/ApiV2-GraphQL-Docs) for providing their detailed GraphQL endpoint.
- [React Group](https://react.dev) for components.
- [Vite Team](https://vite.dev) for compilation tooling.

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
