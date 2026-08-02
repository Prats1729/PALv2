import { NavLink, useLocation } from "react-router-dom";
import "../../styles/BottomNavBar.css";

export default function BottomNavBar() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const currentUser = params.get("user");
  const userSuffix = currentUser ? `?user=${currentUser}` : "";

  return (
    <div className="bottom-nav-bar">
      <NavLink
        to={`/${userSuffix}`}
        className={({ isActive }) =>
          isActive ? "bottom-nav-link active" : "bottom-nav-link"
        }
        end
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </NavLink>
      <NavLink
        to={`/discover${userSuffix}`}
        className={({ isActive }) =>
          isActive ? "bottom-nav-link active" : "bottom-nav-link"
        }
      >
        <span className="nav-icon">🔍</span>
        <span className="nav-label">Discover</span>
      </NavLink>
      <NavLink
        to={`/statistics${userSuffix}`}
        className={({ isActive }) =>
          isActive ? "bottom-nav-link active" : "bottom-nav-link"
        }
      >
        <span className="nav-icon">📊</span>
        <span className="nav-label">Stats</span>
      </NavLink>
      <NavLink
        to={`/library${userSuffix}`}
        className={({ isActive }) =>
          isActive ? "bottom-nav-link active" : "bottom-nav-link"
        }
      >
        <span className="nav-icon">📚</span>
        <span className="nav-label">Library</span>
      </NavLink>
      <NavLink
        to={`/settings${userSuffix}`}
        className={({ isActive }) =>
          isActive ? "bottom-nav-link active" : "bottom-nav-link"
        }
      >
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">Settings</span>
      </NavLink>
    </div>
  );
}
