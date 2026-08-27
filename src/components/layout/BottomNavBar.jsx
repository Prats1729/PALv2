import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/BottomNavBar.css";

export default function BottomNavBar() {
  const { user } = useAuth();
  const location = useLocation();
  const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  // Never show mobile bottom bar on desktop Tauri app or on unauthenticated auth pages
  if (isTauri || !user || location.pathname === "/login" || location.pathname === "/register") {
    return null;
  }

  const params = new URLSearchParams(location.search);
  const currentUser = params.get("user");
  const userSuffix = currentUser ? `?user=${currentUser}` : "";

  return (
    <nav className="bottom-nav-bar" aria-label="Mobile Navigation">
      <NavLink
        to={`/${userSuffix}`}
        className={({ isActive }) =>
          isActive ? "bottom-nav-link active" : "bottom-nav-link"
        }
        end
      >
        <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span className="nav-label">Home</span>
      </NavLink>

      <NavLink
        to={`/discover${userSuffix}`}
        className={({ isActive }) =>
          isActive ? "bottom-nav-link active" : "bottom-nav-link"
        }
      >
        <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
        <span className="nav-label">Discover</span>
      </NavLink>

      <NavLink
        to={`/library${userSuffix}`}
        className={({ isActive }) =>
          isActive ? "bottom-nav-link active" : "bottom-nav-link"
        }
      >
        <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <span className="nav-label">Library</span>
      </NavLink>

      <NavLink
        to={`/settings${userSuffix}`}
        className={({ isActive }) =>
          isActive ? "bottom-nav-link active" : "bottom-nav-link"
        }
      >
        <svg className="nav-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span className="nav-label">Settings</span>
      </NavLink>
    </nav>
  );
}
