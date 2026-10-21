import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineHome,
  HiOutlineSearch,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineBell,
  HiOutlineChevronDown,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle,
  HiOutlineX,
  HiOutlineMenu,
  HiOutlineUser,
} from "react-icons/hi";
import "../pages/dashboard/dashboard.css";

/* ------------------------------------------------------------------ */
/* Shared layout for every page after login:                           */
/* sidebar + top bar + notifications + profile menu                    */
/* Use it by wrapping a page:  <DashboardLayout title="History"> ...   */
/* ------------------------------------------------------------------ */

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: HiOutlineHome },
  { label: "Verify Medicine", path: "/verify", icon: HiOutlineSearch },
  { label: "My Medicines", path: "/medicines", icon: HiOutlineShieldCheck },
  { label: "History", path: "/history", icon: HiOutlineClipboardList },
  { label: "Reports", path: "/reports", icon: HiOutlineChartBar },
  { label: "Settings", path: "/settings", icon: HiOutlineCog },
];

// The pages inside the layout can read the history without fetching it again
const DashboardDataContext = createContext({
  history: [],
  loading: true,
  error: "",
});

export function useDashboardData() {
  return useContext(DashboardDataContext);
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function nameFromUser(user) {
  if (!user) return "User";
  const name = user.name || user.full_name || user.fullName || user.username;
  if (name) return String(name);
  if (user.email) return String(user.email).split("@")[0];
  return "User";
}

function initialsFromName(name) {
  const parts = (name || "U").trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardLayout({ title, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [user] = useState(readStoredUser);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  function clearSession() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
  }

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  function goTo(path) {
    setSidebarOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    navigate(path);
  }

  // Load the logged-in user's verification history (for the bell and Dashboard)
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login", { replace: true, state: { from: location.pathname } });
      return undefined;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_BASE}/history/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          clearSession();
          navigate("/login", { replace: true, state: { from: location.pathname } });
          return;
        }

        if (!response.ok) throw new Error("failed");

        const data = await response.json();

        if (!cancelled) {
          setHistory(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Could not load your activity. Make sure the backend is running.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname]);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = nameFromUser(user);
  const initials = initialsFromName(displayName);
  const flaggedRecent = history.filter((h) => h.result === "flagged").slice(0, 3);

  return (
    <div className="mg-dashboard">
      {sidebarOpen && (
        <div className="mg-sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside className={`mg-sidebar ${sidebarOpen ? "is-open" : ""}`} aria-label="Primary navigation">
        <button
          type="button"
          className="mg-sidebar__close"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <HiOutlineX />
        </button>

        <div className="mg-sidebar__brand">
          <span className="mg-sidebar__brand-mark" aria-hidden="true">
            <HiOutlineShieldCheck />
          </span>
          <span className="mg-sidebar__brand-name">MedGuard AI</span>
        </div>

        <nav className="mg-sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                className={`mg-nav-item ${isActive ? "is-active" : ""}`}
                onClick={() => goTo(item.path)}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mg-sidebar__footer">
          <button type="button" className="mg-nav-item mg-nav-item--logout" onClick={handleLogout}>
            <HiOutlineLogout aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="mg-main">
        <header className="mg-header">
          <div className="mg-header__left">
            <button
              type="button"
              className="mg-header__menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <HiOutlineMenu />
            </button>
            <h1 className="mg-header__title">{title}</h1>
          </div>

          <div className="mg-header__right">
            <div className="mg-notifications" ref={notificationsRef}>
              <button
                type="button"
                className="mg-icon-btn"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <HiOutlineBell />
                {flaggedRecent.length > 0 && <span className="mg-icon-btn__dot" aria-hidden="true" />}
              </button>

              {notificationsOpen && (
                <div className="mg-notifications__dropdown">
                  <div className="mg-notifications__head">
                    <strong>Notifications</strong>
                    <span>{flaggedRecent.length ? `${flaggedRecent.length} to review` : "All clear"}</span>
                  </div>

                  {flaggedRecent.length === 0 && (
                    <div className="mg-notification">
                      <span>✓</span>
                      <div>
                        <strong>Nothing to review</strong>
                        <p>None of your recent checks were flagged.</p>
                      </div>
                    </div>
                  )}

                  {flaggedRecent.map((item) => (
                    <div className="mg-notification mg-notification--warning" key={item.id}>
                      <span>⚠️</span>
                      <div>
                        <strong>Medicine flagged</strong>
                        <p>{item.medicine} needs further verification.</p>
                        <small>{formatDateTime(item.date)}</small>
                      </div>
                    </div>
                  ))}

                  <button className="mg-notifications__all" onClick={() => goTo("/history")}>
                    View history
                  </button>
                </div>
              )}
            </div>

            <div className="mg-profile" ref={profileRef}>
              <button
                type="button"
                className="mg-profile__trigger"
                onClick={() => setProfileOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="mg-avatar" aria-hidden="true">{initials}</span>
                <span className="mg-profile__meta">
                  <span className="mg-profile__name">{displayName}</span>
                  <span className="mg-profile__badge">
                    <HiOutlineCheckCircle aria-hidden="true" /> Signed in
                  </span>
                </span>
                <HiOutlineChevronDown className="mg-profile__chevron" aria-hidden="true" />
              </button>

              {profileOpen && (
                <div className="mg-profile__dropdown" role="menu">
                  <button type="button" className="mg-profile__dropdown-item" role="menuitem" onClick={() => goTo("/settings")}>
                    <HiOutlineUser aria-hidden="true" /> Profile
                  </button>
                  <button type="button" className="mg-profile__dropdown-item" role="menuitem" onClick={() => goTo("/settings")}>
                    <HiOutlineCog aria-hidden="true" /> Settings
                  </button>
                  <div className="mg-profile__dropdown-divider" />
                  <button
                    type="button"
                    className="mg-profile__dropdown-item mg-profile__dropdown-item--danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <HiOutlineLogout aria-hidden="true" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <DashboardDataContext.Provider value={{ history, loading, error }}>
          <div className="mg-shell-content">{children}</div>
        </DashboardDataContext.Provider>
      </div>
    </div>
  );
}
