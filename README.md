# PAL - Personal Anime Library (v3.0)

[![Version](https://img.shields.io/badge/version-3.0.0-6366f1.svg)](https://github.com/Prats1729/PALv2)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Node](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248.svg)](https://www.mongodb.com/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24c8db.svg)](https://tauri.app/)
[![Capacitor](https://img.shields.io/badge/Capacitor-v8-119eff.svg)](https://capacitorjs.com/)

**PAL (Personal Anime Library)** is a modern, cross-platform anime tracking and discovery application built for anime fans. It provides a persistent, cloud-synced watchlist independent of third-party streaming sites, AniList OAuth integration for library import and synchronization, a mobile-first web interface, a desktop companion app built with Tauri, and an Android application powered by Capacitor.

---

## Live Deployments & Downloads

🌐 **Web App:** [Open PAL (Vercel)](https://pal-v2-cyan.vercel.app)

💻 **Desktop App (Windows):** [Download Installer (v3.0.0)](https://github.com/Prats1729/PALv2/releases/latest)

📱 **Android App (APK):** [Download APK (v3.0.0)](https://github.com/Prats1729/PALv2/releases/latest)

---

## Platforms

### 🌐 Web Client
- **Tech:** React 19 + Vite, Vanilla CSS.
- **Deployment:** Vercel (`https://pal-v2-cyan.vercel.app`).
- **Capabilities:** Full catalog discovery, watchlist management, AniList two-way sync, themes, profile statistics, and account management.
- *No local desktop playback.*

### 💻 Desktop Companion
- **Tech:** Tauri v2 + Rust (Windows NSIS installer).
- **Capabilities:** Everything in Web, plus native hardware-accelerated video playback via local `ani-cli` + `mpv` through WSL, automatic episode completion tracking (≥70%), saved timestamps, Continue Watching carousel, and seamless desktop OTA updates.

### 📱 Android Application
- **Tech:** Capacitor + Android Native Bridge.
- **Distribution:** Signed APK distributed directly via GitHub Releases.
- **Capabilities:** Mobile-first catalog browsing, persistent cloud watchlist synced with MongoDB Atlas & AniList, bottom navigation bar, guest/authenticated modes, themes, and an in-app GitHub Release APK update checker with user confirmation.
- *Excludes desktop-only local WSL playback and Continue Watching.*

---

## Showcase & Interface

### Desktop Experience

| Section | Preview |
| :--- | :--- |
| **Home Dashboard** | ![Home Dashboard](images/desktop-home.png) |
| **Library Management** | ![Library View](images/desktop-library.png) |
| **Anime Details & Episode Tracker** | ![Anime Details](images/desktop-details.png) |

### Mobile & Android Experience

| Section | Preview |
| :--- | :--- |
| **Mobile Experience** | ![Mobile Homepage](images/mobile-home.png) |

---

## Key Features

### Discovery & Catalog
- **Trending Carousel**: Rotating hero banner displaying currently trending titles with score badges, season tags, and quick-action buttons.
- **Multi-Parameter Filters**: Filter by Genres, Tags, Formats (TV, Movie, OVA, ONA, Special), Seasons, Release Years, and Sort order.
- **URL Search Parameter State**: Catalog filters synchronize with URL query parameters (`useSearchParams`) for shareable links and state persistence on page reloads.
- **Debounced Instant Search**: Floating search input with debounced querying (400ms) and keyboard navigation.

### Library & Cloud Watchlist
- **Persistent MongoDB Storage**: Watchlist records are stored in MongoDB Atlas and associated with user accounts across Web, Desktop, and Android.
- **AniList OAuth & Library Import**: Users can connect their AniList account via OAuth, import their existing library, and synchronize status/progress mutations back to AniList.
- **Watch Status Categories**: Track shows under *Watching*, *Completed*, *On Hold*, *Plan to Watch*, and *Dropped*.
- **Episode Progress Controls**: Manual episode increment/decrement with automatic status updates upon completion.

### Mobile-First Responsive Interface (Web & Android)
- **Mobile-First Layout**: Full-bleed hero banners, horizontal momentum carousels with card peeking, and 3-column poster browsing grids.
- **Floating Bottom Navigation Bar**: Translucent glass bottom bar (`Home`, `Discover`, `Library`, `Settings`) formatted for mobile viewports and Android.
- **Collapsible Filter Controls**: Mobile drawer for filter options to maintain screen real estate on smaller screens.

### Desktop Companion (Tauri)
- **Desktop Playback Integration**: Integrates with `ani-cli` and `mpv` through Windows Subsystem for Linux (WSL) for local playback.
- **Automated Episode Tracking**: Reads playback progress from an embedded `mpv` Lua script to automatically increment episode counters when ≥70% of an episode is watched.
- **Continue Watching Carousel**: Displays recently watched titles with saved timestamps, episode progress bars, and up-next episode indicators.
- **Custom Themed Setup Installer**: NSIS Windows installer packaged with custom anime ensemble artwork, official PAL logo branding, and automatic desktop shortcuts.

### Android In-App APK Update System
- **GitHub Release-Based Updates**: PAL Android checks GitHub Releases for new signed APK versions.
- **Update Workflow**:
  1. PAL queries GitHub Releases and filters for valid Android `.apk` assets.
  2. If a newer version is found, an update modal displays current version, latest version, and release notes.
  3. The user taps **Download & Install**.
  4. The APK is downloaded to app cache and handed to Android's system package installer via `FileProvider`.
  5. The user confirms installation in the standard Android system dialog, updating PAL without losing library data.

---

## System Architecture

```mermaid
graph TD
    ClientWeb[React Web App - Vercel] -->|HTTP / REST API| Server[Node.js / Express Server - Render]
    ClientAndroid[Android App - Capacitor] -->|HTTP / REST API| Server
    ClientTauri[Tauri Desktop App] -->|HTTP / REST API| Server
    ClientTauri -->|Local Process / IPC| WSL[WSL Environment]
    WSL -->|CLI Subprocess| AniCli[ani-cli]
    AniCli -->|Video Player| MPV[mpv Player]
    Server -->|Mongoose ODM| DB[(MongoDB Atlas Cloud)]
    Server -->|OAuth Profile & Token Sync| AniListAPI[AniList GraphQL API]
    ClientWeb -->|Direct GraphQL Queries| AniListAPI
    ClientAndroid -->|Direct GraphQL Queries| AniListAPI
    ClientTauri -->|Direct GraphQL Queries| AniListAPI
```

### Core Technologies

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, React Router v7, Vite, Vanilla CSS |
| **Mobile Runtime** | Capacitor v8 (Android WebView + Native Bridge) |
| **Desktop Runtime** | Tauri v2, Rust, NSIS |
| **Backend** | Node.js, Express.js, JWT, bcryptjs, crypto (AES-256-CBC) |
| **Database** | MongoDB Atlas, Mongoose ODM |
| **External APIs** | AniList GraphQL API |
| **Desktop Playback** | `ani-cli`, `mpv` video player |

---

## Project Structure

```text
PALv2/
├── android/                  # Capacitor Android native project & Gradle build
│   ├── app/src/main/
│   │   ├── java/com/palv2/app/   # Native MainActivity & ApkUpdaterPlugin
│   │   ├── res/xml/file_paths.xml # FileProvider configuration for APK installer
│   │   └── AndroidManifest.xml   # App permissions and activity definitions
│   └── build.gradle          # Android build and SDK configuration
├── backend/                  # Express REST API & Database Models
│   ├── middleware/           # JWT authentication middleware
│   ├── routes/               # Auth and Watchlist API routes
│   ├── utils/                # AniList GraphQL importer & AES crypto helpers
│   └── server.js             # Backend server entry point
├── src-tauri/                # Tauri v2 Rust application configuration & IPC handlers
│   ├── icons/                # Multi-resolution application icons (.ico, .icns, .png)
│   ├── nsis/                 # Custom NSIS installer graphics (header & sidebar bitmaps)
│   ├── src/                  # Rust backend logic & command handlers (lib.rs, main.rs)
│   └── tauri.conf.json       # Desktop window, security, and packaging configuration
├── src/                      # Frontend React Application
│   ├── assets/               # SVGs, icons, and branding assets
│   ├── components/
│   │   ├── common/           # Reusable cards, pagination, UpdateModal
│   │   └── layout/           # TopBar, BottomNavBar, modals
│   ├── context/              # AuthContext, WatchlistContext
│   ├── pages/                # Home, Discover, Library, AnimeDetails, Settings, Auth
│   ├── services/             # AniList GraphQL queries & sync mutations
│   ├── utils/                # platform.js, updater.js, desktopUpdater.js, androidUpdater.js
│   ├── styles/               # Component stylesheets
│   ├── App.jsx               # Router configuration & providers
│   ├── App.css               # Design tokens, themes, mobile media queries
│   └── main.jsx              # React DOM entry point
├── capacitor.config.json     # Capacitor configuration for Android
├── package.json              # Workspace dependencies & build scripts
└── README.md                 # Project documentation
```

---

## Getting Started

### Prerequisites

- **Node.js**: v20.0.0 or higher
- **MongoDB**: MongoDB Atlas cluster or local instance
- **Rust & Cargo** *(Optional, for building the desktop app)*: [Install Rust](https://www.rust-lang.org/tools/install)
- **Android Studio & SDK** *(Optional, for building the Android APK)*: [Android Studio](https://developer.android.com/studio)
- **WSL & ani-cli** *(Optional, for desktop playback)*: [ani-cli](https://github.com/pystardust/ani-cli)

---

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Prats1729/PALv2.git
   cd PALv2
   ```

2. **Configure Environment Variables:**

   Create `.env` in the project root:
   ```env
   VITE_API_URL=http://localhost:5000
   VITE_ANILIST_CLIENT_ID=your_anilist_client_id
   ```

   Create `backend/.env`:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_uri
   JWT_SECRET=your_jwt_secret_key
   ENCRYPTION_KEY=your_64_character_hex_aes_encryption_key
   ```

3. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

4. **Start Development Servers:**

   *Terminal 1 (Backend API):*
   ```bash
   cd backend
   node server.js
   ```

   *Terminal 2 (Frontend Web):*
   ```bash
   npm run dev
   ```

   *Terminal 3 (Tauri Desktop App - Optional):*
   ```bash
   npx tauri dev
   ```

   *Terminal 4 (Android App via Capacitor - Optional):*
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

5. **Build for Production:**

   *Web Client:*
   ```bash
   npm run build
   ```

   *Desktop App & Windows Setup Installer:*
   ```bash
   npx tauri build
   ```

   *Android Release APK:*
   ```bash
   npm run build
   npx cap sync android
   cd android && ./gradlew assembleRelease
   ```

---

## Release Process & CI/CD

PAL releases are automated via GitHub Actions:

1. Update version to `v3.x.x` in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `android/app/build.gradle`.
2. Push commits to `main` or trigger release workflow.
3. GitHub Actions builds:
   - **Windows:** Packages the signed Tauri desktop NSIS installer.
   - **Android:** Compiles, signs, and attaches the release APK (`PAL-Release.apk`) to the GitHub Release.
4. Installed desktop and Android clients discover the update automatically via their in-app update checkers.

---

## Version History

### v3.0.0
Major release introducing the Android application and APK update system:
- **Android Application:** Native Android client powered by Capacitor v8.
- **In-App APK Updates:** Automatic check and user-confirmed installation via GitHub Releases API and `FileProvider`.
- **Platform Separation:** Dedicated platform capability layer isolating desktop-only playback from web and mobile clients.
- **Modular Updaters:** Clean separation between desktop Tauri updater and Android APK updater.
- **Shared Architecture:** Web, Desktop, and Android seamlessly share the same Render backend, MongoDB Atlas, and AniList synchronization.

### v2.0.0
Major release introducing the Tauri v2 Desktop app, local `ani-cli` + `mpv` playback, automated episode tracking, and AniList OAuth sync.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

- [AniList API](https://anilist.gitbook.io/anilist-apiv2-docs) for providing anime metadata and GraphQL endpoints.
- [Capacitor](https://capacitorjs.com/) for the cross-platform native runtime.
- [Tauri](https://tauri.app) for the lightweight desktop application runtime.
- [ani-cli](https://github.com/pystardust/ani-cli) for CLI video playback tooling.
