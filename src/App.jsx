import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopBar from "./components/layout/TopBar.jsx";
import Home from "./pages/Home.jsx";
import Library from "./pages/Library.jsx";
import Discover from "./pages/Discover.jsx";
import Settings from "./pages/Settings.jsx";
import Statistics from "./pages/Statistics.jsx";
import AnimeDetails from "./pages/AnimeDetails.jsx";
import "./App.css";



export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        {/* <TopBar />  always stays on every page so its kept out of the routes*/}
        <TopBar />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/anime/:id" element={<AnimeDetails />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
