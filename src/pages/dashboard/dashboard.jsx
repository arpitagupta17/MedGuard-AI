import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineHome,
  HiOutlineSearch,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineBell,
  HiOutlineChevronDown,
  HiOutlineCamera,
  HiOutlineUpload,
  HiOutlineShieldCheck,
  HiOutlineExclamation,
  HiOutlineCheckCircle,
  HiOutlineX,
  HiOutlineMenu,
  HiOutlineUser,
} from "react-icons/hi";
import { motion } from "framer-motion";
import "./dashboard.css";

/* --------------------------------------------------------------------- */
/* Static config — safe to move into separate files later                */
/* --------------------------------------------------------------------- */

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", icon: HiOutlineHome },
  { key: "verify", label: "Verify Medicine", path: "/verify", icon: HiOutlineSearch },
  { key: "history", label: "History", path: "/history", icon: HiOutlineClipboardList },
  { key: "reports", label: "Reports", path: "/reports", icon: HiOutlineChartBar },
  { key: "settings", label: "Settings", path: "/settings", icon: HiOutlineCog },
];

// Demo data — replace with API data once the backend is connected.
const STATS = [
  { key: "scanned", label: "Total Scanned", value: 24, icon: HiOutlineSearch, tone: "blue" },
  { key: "authentic", label: "Authentic Medicines", value: 21, icon: HiOutlineCheckCircle, tone: "green" },
  { key: "flagged", label: "Flagged Medicines", value: 3, icon: HiOutlineExclamation, tone: "amber" },
  { key: "accuracy", label: "Verification Accuracy", value: "87.5%", icon: HiOutlineShieldCheck, tone: "blue" },
];

const RECENT_VERIFICATIONS = [
  { id: 1, medicine: "Paracetamol", result: "genuine", confidence: 96, date: "Today" },
  { id: 2, medicine: "Amoxicillin", result: "genuine", confidence: 93, date: "Yesterday" },
  { id: 3, medicine: "XYZ Tablet", result: "flagged", confidence: 72, date: "Aug 28" },
];

const QUICK_ACTIONS = [
  {
    key: "verify",
    title: "Verify Medicine",
    desc: "Start a new verification",
    icon: HiOutlineSearch,
    path: "/verify",
  },
  {
    key: "history",
    title: "View History",
    desc: "See previous results",
    icon: HiOutlineClipboardList,
    path: "/history",
  },
  {
    key: "reports",
    title: "View Reports",
    desc: "Analyze your verification activity",
    icon: HiOutlineChartBar,
    path: "/reports",
  },
];

const RECENT_ACTIVITY = [
  { id: 1, text: "Paracetamol verified", time: "Today, 10:42 AM", status: "ok" },
  { id: 2, text: "Amoxicillin verified", time: "Yesterday, 4:18 PM", status: "ok" },
  { id: 3, text: "XYZ Tablet flagged", time: "Aug 28, 2:30 PM", status: "warn" },
];

const BADGE_CONFIG = {
  genuine: { label: "Genuine", icon: "✓", className: "mg-badge--genuine" },
  flagged: { label: "Flagged", icon: "⚠", className: "mg-badge--flagged" },
  suspicious: { label: "Suspicious", icon: "⚠", className: "mg-badge--suspicious" },
};

/* --------------------------------------------------------------------- */
/* Small presentational helpers                                          */
/* --------------------------------------------------------------------- */

function initialsFromName(name) {
  if (!name) return "U";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function ResultBadge({ result }) {
  const config = BADGE_CONFIG[result] || BADGE_CONFIG.suspicious;
  return (
    <span className={`mg-badge ${config.className}`}>
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

function AccuracyRing({ percent }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg
      className="mg-insight-ring__chart"
      width="76"
      height="76"
      viewBox="0 0 76 76"
      role="img"
      aria-label={`${percent} percent genuine`}
    >
      <circle cx="38" cy="38" r={radius} fill="none" stroke="var(--mg-surface-alt)" strokeWidth="8" />
      <circle
        cx="38"
        cy="38"
        r={radius}
        fill="none"
        stroke="var(--mg-green-500)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 38 38)"
      />
    </svg>
  );
}

/* --------------------------------------------------------------------- */
/* Main component                                                        */
/* --------------------------------------------------------------------- */

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Protected-route check (frontend/demo auth only — not real security).
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    if (!stored?.isLoggedIn) {
      navigate("/login");
      return;
    }
    setUser(stored);
  }, [navigate]);

  // Close the profile dropdown when clicking outside of it.
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = user?.name || "User";
  const initials = useMemo(() => initialsFromName(displayName), [displayName]);
  const hasHistory = RECENT_VERIFICATIONS.length > 0;

  function handleLogout() {
    localStorage.removeItem("user");
    navigate("/");
  }

  function goTo(path) {
    setSidebarOpen(false);
    navigate(path);
  }

  return (
    <div className="mg-dashboard">
      {sidebarOpen && (
        <div className="mg-sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ------------------------------------------------------------- */}
      {/* Sidebar                                                       */}
      {/* ------------------------------------------------------------- */}
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
            const isActive = item.key === "dashboard";
            return (
              <button
                key={item.key}
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

      {/* ------------------------------------------------------------- */}
      {/* Main column                                                   */}
      {/* ------------------------------------------------------------- */}
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
            <h1 className="mg-header__title">Dashboard</h1>
          </div>

          <div className="mg-header__right">
            <button type="button" className="mg-icon-btn" aria-label="Notifications">
              <HiOutlineBell />
              <span className="mg-icon-btn__dot" aria-hidden="true" />
            </button>

            <div className="mg-profile" ref={profileRef}>
              <button
                type="button"
                className="mg-profile__trigger"
                onClick={() => setProfileOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="mg-avatar" aria-hidden="true">
                  {initials}
                </span>
                <span className="mg-profile__meta">
                  <span className="mg-profile__name">{displayName}</span>
                  <span className="mg-profile__badge">
                    <HiOutlineCheckCircle aria-hidden="true" /> Verified User
                  </span>
                </span>
                <HiOutlineChevronDown className="mg-profile__chevron" aria-hidden="true" />
              </button>

              {profileOpen && (
                <div className="mg-profile__dropdown" role="menu">
                  <button
                    type="button"
                    className="mg-profile__dropdown-item"
                    role="menuitem"
                    onClick={() => goTo("/settings")}
                  >
                    <HiOutlineUser aria-hidden="true" /> Profile
                  </button>
                  <button
                    type="button"
                    className="mg-profile__dropdown-item"
                    role="menuitem"
                    onClick={() => goTo("/settings")}
                  >
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

        <motion.main
          className="mg-content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          {/* Welcome */}
          <section className="mg-welcome">
            <h2 className="mg-welcome__title">Welcome back, {displayName} 👋</h2>
            <p className="mg-welcome__subtitle">
              Monitor your medicine verification activity and keep track of your results.
            </p>
          </section>

          {/* Stats */}
          <section className="mg-stats" aria-label="Verification statistics">
            {STATS.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.key}
                  className="mg-stat-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <span className={`mg-stat-card__icon mg-stat-card__icon--${stat.tone}`} aria-hidden="true">
                    <Icon />
                  </span>
                  <span>
                    <span className="mg-stat-card__value">{stat.value}</span>
                    <span className="mg-stat-card__label">{stat.label}</span>
                  </span>
                </motion.div>
              );
            })}
          </section>

          {/* Verify + Insight */}
          <section className="mg-grid-2">
            <div className="mg-verify-card">
              <span className="mg-verify-card__ring" aria-hidden="true" />
              <span className="mg-verify-card__ring mg-verify-card__ring--2" aria-hidden="true" />

              <div className="mg-verify-card__top">
                <span className="mg-verify-card__eyebrow">
                  <HiOutlineShieldCheck aria-hidden="true" /> AI-assisted screening
                </span>
                <h3 className="mg-verify-card__title">Verify a Medicine</h3>
                <p className="mg-verify-card__subtitle">
                  Check whether a medicine is genuine or potentially counterfeit using your camera or a
                  photo upload.
                </p>
              </div>

              <div className="mg-verify-card__actions">
                <button type="button" className="mg-btn mg-btn--ghost-light" onClick={() => goTo("/verify")}>
                  <HiOutlineCamera aria-hidden="true" /> Use Camera
                </button>
                <button type="button" className="mg-btn mg-btn--ghost-light" onClick={() => goTo("/verify")}>
                  <HiOutlineUpload aria-hidden="true" /> Upload Image
                </button>
                <button
                  type="button"
                  className="mg-btn mg-btn--primary-light"
                  onClick={() => goTo("/verify")}
                >
                  Verify Medicine
                </button>
              </div>
            </div>

            <div className="mg-insight-card">
              <h3 className="mg-insight-card__heading">Verification Insight</h3>
              <div className="mg-insight-ring">
                <AccuracyRing percent={87.5} />
                <div>
                  <div className="mg-insight-ring__value">87.5% Genuine</div>
                  <p className="mg-insight-ring__caption">
                    Most of your recent medicines have been verified as genuine.
                  </p>
                </div>
              </div>
              <p className="mg-insight-card__note">
                AI-assisted screening result. Results should be reviewed when necessary.
              </p>
            </div>
          </section>

          {/* Recent verification */}
          <section className="mg-section">
            <div className="mg-section__head">
              <h3 className="mg-section__title">Recent Verification</h3>
              <button type="button" className="mg-section__link" onClick={() => goTo("/history")}>
                View all
              </button>
            </div>

            <div className="mg-panel">
              {hasHistory ? (
                <table className="mg-table">
                  <thead>
                    <tr>
                      <th scope="col">Medicine</th>
                      <th scope="col">Result</th>
                      <th scope="col">Confidence</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RECENT_VERIFICATIONS.map((row) => (
                      <tr key={row.id}>
                        <td className="mg-table__medicine">{row.medicine}</td>
                        <td>
                          <ResultBadge result={row.result} />
                        </td>
                        <td className="mg-table__confidence">{row.confidence}%</td>
                        <td>{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="mg-empty-state">
                  <span className="mg-empty-state__icon" aria-hidden="true">
                    <HiOutlineClipboardList />
                  </span>
                  <p className="mg-empty-state__title">No verification history yet.</p>
                  <p className="mg-empty-state__subtitle">
                    Verify your first medicine to see results here.
                  </p>
                  <button type="button" className="mg-btn mg-btn--primary" onClick={() => goTo("/verify")}>
                    Verify Medicine
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Quick actions */}
          <section className="mg-section">
            <div className="mg-section__head">
              <h3 className="mg-section__title">Quick Actions</h3>
            </div>
            <div className="mg-quick-actions">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    className="mg-quick-action"
                    onClick={() => goTo(action.path)}
                  >
                    <span className="mg-quick-action__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span>
                      <p className="mg-quick-action__title">{action.title}</p>
                      <p className="mg-quick-action__desc">{action.desc}</p>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Recent activity */}
          <section className="mg-section">
            <div className="mg-section__head">
              <h3 className="mg-section__title">Recent Activity</h3>
            </div>
            <div className="mg-panel">
              <div className="mg-timeline">
                {RECENT_ACTIVITY.map((activity, index) => (
                  <div className="mg-timeline__item" key={activity.id}>
                    <div className="mg-timeline__rail">
                      <span
                        className={`mg-timeline__dot mg-timeline__dot--${
                          activity.status === "warn" ? "warn" : "ok"
                        }`}
                        aria-hidden="true"
                      >
                        {activity.status === "warn" ? "⚠" : "✓"}
                      </span>
                      {index < RECENT_ACTIVITY.length - 1 && <span className="mg-timeline__line" />}
                    </div>
                    <div className="mg-timeline__body">
                      <p className="mg-timeline__text">{activity.text}</p>
                      <p className="mg-timeline__time">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Trust indicator */}
          <div className="mg-trust">
            <span className="mg-trust__icon" aria-hidden="true">
              <HiOutlineShieldCheck />
            </span>
            <div>
              <p className="mg-trust__title">MedGuard AI Verification</p>
              <p className="mg-trust__desc">
                AI-assisted medicine screening. Results should be reviewed when necessary and do not
                guarantee authenticity.
              </p>
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
}
