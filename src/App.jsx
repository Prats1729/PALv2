import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopBar from "./components/layout/TopBar.jsx";
import Home from "./pages/Home.jsx";
import Library from "./pages/Library.jsx";
import Discover from "./pages/Discover.jsx";
import Settings from "./pages/Settings.jsx";
import Statistics from "./pages/Statistics.jsx";
import AnimeDetails from "./pages/AnimeDetails.jsx";
import Search from "./pages/Search.jsx";

import "./App.css";

export default function App() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    const handleToast = (e) => {
      if (timer) clearTimeout(timer);
      setToast({ message: e.detail.message, type: e.detail.type });
      timer = setTimeout(() => {
        setToast(null);
      }, 3000);
    };

    window.addEventListener("pal-toast", handleToast);
    return () => {
      window.removeEventListener("pal-toast", handleToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Handle Light/Dark theme overrides globally on document.body
  useEffect(() => {
    const updateBodyTheme = (isDark) => {
      if (isDark) {
        document.body.classList.remove("light-theme");
      } else {
        document.body.classList.add("light-theme");
      }
    };

    const initialDark = localStorage.getItem("pal_dark_mode") !== "false";
    updateBodyTheme(initialDark);

    const handleThemeChange = (e) => {
      updateBodyTheme(e.detail);
    };

    window.addEventListener("pal-theme-change", handleThemeChange);
    return () => window.removeEventListener("pal-theme-change", handleThemeChange);
  }, []);

  return (
    <BrowserRouter>
      <div className="app-container">
        <TopBar />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/anime/:id" element={<AnimeDetails />} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </main>

        {/* Global Toast Alert */}
        {toast && (
          <div className={`toast-notification toast-${toast.type}`}>
            {toast.message}
          </div>
        )}
      </div>
    </BrowserRouter>
  );
}
