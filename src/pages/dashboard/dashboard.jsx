import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineSearch,
  HiOutlineClipboardList,
  HiOutlineShieldCheck,
  HiOutlineExclamation,
  HiOutlineCheckCircle,
  HiOutlineCamera,
  HiOutlineUpload,
  HiOutlineClock,
} from "react-icons/hi";
import { motion } from "framer-motion";
import DashboardLayout, { useDashboardData } from "../../components/DashboardLayout";
import "./dashboard.css";

const BADGE_CONFIG = {
  genuine: { label: "Likely genuine", icon: "✓", className: "mg-badge--genuine" },
  flagged: { label: "Flagged", icon: "⚠", className: "mg-badge--flagged" },
  unverified: { label: "Could not verify", icon: "?", className: "mg-badge--unverified" },
};

const TIPS = [
  "Photograph the side of the pack that shows the batch number and the dates.",
  "Use good light and hold the camera steady so the small print is sharp.",
  "A match is evidence, not proof. If a pack looks wrong, ask your pharmacist.",
];

/* ---------------------------- helpers ---------------------------- */

function readName() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) return "there";
    const name = user.name || user.full_name || user.fullName || user.username;
    if (name) return String(name).split(" ")[0];
    if (user.email) return String(user.email).split("@")[0];
  } catch {
    /* ignore */
  }
  return "there";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function withStrength(name, strength) {
  const base = name || "Unnamed pack";
  if (!strength) return base;
  const compact = (s) => String(s).toLowerCase().replace(/\s+/g, "");
  return compact(base).includes(compact(strength)) ? base : `${base} ${strength}`;
}

// "2027-11" -> months from now (negative = already expired); null if unreadable
function monthsLeft(expiry) {
  const match = /^(\d{4})-(\d{1,2})/.exec(String(expiry || ""));
  if (!match) return null;
  const now = new Date();
  return (Number(match[1]) - now.getFullYear()) * 12 + (Number(match[2]) - (now.getMonth() + 1));
}

function ResultBadge({ result }) {
  const config = BADGE_CONFIG[result] || BADGE_CONFIG.unverified;
  return (
    <span className={`mg-badge ${config.className}`}>
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

function ProgressRing({ percent }) {
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
      aria-label={`${percent} percent likely genuine`}
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

/* ---------------------------- page ---------------------------- */

function DashboardContent() {
  const navigate = useNavigate();
  const { history: allHistory, loading, error } = useDashboardData();

  // Only checks that produced a clear result are counted here
  const history = useMemo(
    () => allHistory.filter((row) => row.result === "genuine" || row.result === "flagged"),
    [allHistory]
  );

  const summary = useMemo(() => {
    const total = history.length;
    const genuine = history.filter((h) => h.result === "genuine").length;
    const flagged = history.filter((h) => h.result === "flagged").length;

    // Expiry of each pack the user has checked (latest check of each pack)
    const seen = new Set();
    let expired = 0;
    let soon = 0;

    history.forEach((row) => {
      const key = `${row.medicine}|${row.batch_number}`;
      if (seen.has(key)) return;
      seen.add(key);
      const left = monthsLeft(row.expiry_date);
      if (left === null) return;
      if (left < 0) expired += 1;
      else if (left <= 2) soon += 1;
    });

    return {
      total,
      genuine,
      flagged,
      expired,
      soon,
      genuinePercent: total ? Math.round((genuine / total) * 100) : 0,
    };
  }, [history]);

  const recent = history.slice(0, 5);
  const hasHistory = recent.length > 0;
  const needsAttention = summary.flagged + summary.expired + summary.soon > 0;

  const stats = [
    { key: "total", label: "Checks done", value: summary.total, icon: HiOutlineSearch, tone: "blue", to: "/history" },
    { key: "genuine", label: "Likely genuine", value: summary.genuine, icon: HiOutlineCheckCircle, tone: "green", to: "/history" },
    { key: "flagged", label: "Flagged", value: summary.flagged, icon: HiOutlineExclamation, tone: "amber", to: "/history" },
    { key: "expiring", label: "Expired or expiring", value: summary.expired + summary.soon, icon: HiOutlineClock, tone: "amber", to: "/medicines" },
  ];

  return (
    <motion.main
      className="mg-content"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Welcome */}
      <section className="mg-welcome">
        <h2 className="mg-welcome__title">
          {greeting()}, {readName()} 👋
        </h2>
        <p className="mg-welcome__subtitle">
          Check a medicine pack in a few seconds, and keep track of what needs your attention.
        </p>
      </section>

      {error && (
        <p className="mg-load-error" role="alert">
          {error}
        </p>
      )}

      {/* Needs attention */}
      {!loading && !error && hasHistory && needsAttention && (
        <section className="mg-attention" aria-label="Needs your attention">
          <span className="mg-attention__icon" aria-hidden="true">
            <HiOutlineExclamation />
          </span>
          <div className="mg-attention__body">
            <p className="mg-attention__title">Needs your attention</p>
            <ul>
              {summary.flagged > 0 && (
                <li>
                  {summary.flagged} {summary.flagged === 1 ? "check was" : "checks were"} flagged. Do not use
                  those medicines until a pharmacist has checked them.
                </li>
              )}
              {summary.expired > 0 && (
                <li>
                  {summary.expired} {summary.expired === 1 ? "pack is" : "packs are"} past the expiry date.
                </li>
              )}
              {summary.soon > 0 && (
                <li>
                  {summary.soon} {summary.soon === 1 ? "pack expires" : "packs expire"} within 2 months.
                </li>
              )}
            </ul>
          </div>
          <button type="button" className="mg-btn mg-btn--primary" onClick={() => navigate("/medicines")}>
            Review my medicines
          </button>
        </section>
      )}

      {/* Verify + progress */}
      <section className="mg-grid-2">
        <div className="mg-verify-card">
          <span className="mg-verify-card__ring" aria-hidden="true" />
          <span className="mg-verify-card__ring mg-verify-card__ring--2" aria-hidden="true" />

          <div className="mg-verify-card__top">
            <span className="mg-verify-card__eyebrow">
              <HiOutlineShieldCheck aria-hidden="true" /> Takes about a minute
            </span>
            <h3 className="mg-verify-card__title">Check a medicine</h3>
            <p className="mg-verify-card__subtitle">
              Take a photo of the pack, or upload one. We read the name, batch and dates and compare them
              with our records.
            </p>
          </div>

          <div className="mg-verify-card__actions">
            <button type="button" className="mg-btn mg-btn--primary-light" onClick={() => navigate("/verify")}>
              <HiOutlineCamera aria-hidden="true" /> Scan with camera
            </button>
            <button type="button" className="mg-btn mg-btn--ghost-light" onClick={() => navigate("/verify")}>
              <HiOutlineUpload aria-hidden="true" /> Upload a photo
            </button>
          </div>
        </div>

        <div className="mg-insight-card">
          <h3 className="mg-insight-card__heading">Your results</h3>
          <div className="mg-insight-ring">
            <ProgressRing percent={summary.genuinePercent} />
            <div>
              <div className="mg-insight-ring__value">{summary.genuinePercent}% matched</div>
              <p className="mg-insight-ring__caption">
                {summary.total === 0
                  ? "Check your first medicine to see your results here."
                  : `${summary.genuine} of your ${summary.total} checks matched our records.`}
              </p>
            </div>
          </div>
          <p className="mg-insight-card__note">
            A match is evidence, not proof. Always ask a pharmacist if you are unsure.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="mg-stats" aria-label="Your numbers">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.button
              type="button"
              key={stat.key}
              className="mg-stat-card mg-stat-card--link"
              onClick={() => navigate(stat.to)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <span className={`mg-stat-card__icon mg-stat-card__icon--${stat.tone}`} aria-hidden="true">
                <Icon />
              </span>
              <span>
                <span className="mg-stat-card__value">{loading ? "…" : stat.value}</span>
                <span className="mg-stat-card__label">{stat.label}</span>
              </span>
            </motion.button>
          );
        })}
      </section>

      {/* Recent checks */}
      <section className="mg-section">
        <div className="mg-section__head">
          <h3 className="mg-section__title">Recent checks</h3>
          <button type="button" className="mg-section__link" onClick={() => navigate("/history")}>
            View all
          </button>
        </div>

        <div className="mg-panel">
          {loading ? (
            <div className="mg-empty-state">
              <p className="mg-empty-state__title">Loading your checks…</p>
            </div>
          ) : hasHistory ? (
            <ul className="mg-recent">
              {recent.map((row) => (
                <li key={row.id} className="mg-recent__item">
                  <span
                    className={`mg-recent__dot mg-recent__dot--${row.result === "genuine" ? "ok" : "warn"}`}
                    aria-hidden="true"
                  >
                    {row.result === "genuine" ? "✓" : "⚠"}
                  </span>
                  <div className="mg-recent__main">
                    <p className="mg-recent__name">{withStrength(row.medicine, row.strength)}</p>
                    <p className="mg-recent__meta">
                      {[row.batch_number && `Batch ${row.batch_number}`, row.expiry_date && `Expiry ${row.expiry_date}`]
                        .filter(Boolean)
                        .join(" · ") || "Details not read"}
                    </p>
                  </div>
                  <div className="mg-recent__side">
                    <ResultBadge result={row.result} />
                    <span className="mg-recent__date">{formatDate(row.date)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mg-empty-state">
              <span className="mg-empty-state__icon" aria-hidden="true">
                <HiOutlineClipboardList />
              </span>
              <p className="mg-empty-state__title">No checks yet.</p>
              <p className="mg-empty-state__subtitle">Check your first medicine and the result will appear here.</p>
              <button type="button" className="mg-btn mg-btn--primary" onClick={() => navigate("/verify")}>
                Check a medicine
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Tips */}
      <section className="mg-section">
        <div className="mg-section__head">
          <h3 className="mg-section__title">Tips for a good scan</h3>
        </div>
        <div className="mg-tips">
          {TIPS.map((tip, index) => (
            <div className="mg-tip" key={tip}>
              <span className="mg-tip__num" aria-hidden="true">
                {index + 1}
              </span>
              <p>{tip}</p>
            </div>
          ))}
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
            AI-assisted medicine screening. Results should be reviewed when necessary and do not guarantee
            authenticity.
          </p>
        </div>
      </div>
    </motion.main>
  );
}

export default function Dashboard() {
  return (
    <DashboardLayout title="Dashboard">
      <DashboardContent />
    </DashboardLayout>
  );
}
