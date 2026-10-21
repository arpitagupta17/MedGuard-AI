import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineShieldCheck,
} from "react-icons/hi";
import "./reports.css";
import DashboardLayout from "../../components/DashboardLayout";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// First line of a report is "Medicine: <name>" (added by the Verify page)
function reportTitle(description) {
  const first = (description || "").split("\n")[0].trim();

  return first || "Medicine report";
}

function percent(part, total) {
  return total ? (part / total) * 100 : 0;
}

function ReportsContent() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -------------------------------------------------------------------------
  // LOAD THIS USER'S CHECKS AND SUBMITTED REPORTS
  // -------------------------------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login", { replace: true, state: { from: "/reports" } });
      return undefined;
    }

    let cancelled = false;
    const headers = { Authorization: `Bearer ${token}` };

    async function load() {
      try {
        const [historyRes, reportsRes] = await Promise.all([
          fetch(`${API_BASE}/history/`, { headers }),
          fetch(`${API_BASE}/reports/`, { headers }),
        ]);

        // Login expired or invalid
        if (historyRes.status === 401 || reportsRes.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true, state: { from: "/reports" } });
          return;
        }

        if (!historyRes.ok || !reportsRes.ok) {
          throw new Error("Could not load your reports.");
        }

        const historyData = await historyRes.json();
        const reportsData = await reportsRes.json();

        if (!cancelled) {
          setHistory(Array.isArray(historyData) ? historyData : []);
          setMyReports(Array.isArray(reportsData) ? reportsData : []);
          setError("");
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof TypeError
            ? "Cannot reach the MedGuard server. Make sure the backend is running."
            : err.message || "Could not load your reports."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // -------------------------------------------------------------------------
  // NUMBERS FOR THE CARDS
  // -------------------------------------------------------------------------

  const stats = useMemo(() => {
    const total = history.length;
    const genuine = history.filter((x) => x.result === "genuine").length;
    const flagged = history.filter((x) => x.result === "flagged").length;
    const unverified = total - genuine - flagged;

    const scores = history
      .map((x) => x.confidence)
      .filter((value) => typeof value === "number");

    const avg = scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : null;

    return { total, genuine, flagged, unverified, avg };
  }, [history]);

  const { total, genuine, flagged, unverified, avg } = stats;

  return (
    <div className="mg-page">
      <div className="mg-page__inner">
        <button className="mg-back" onClick={() => navigate("/dashboard")}>
          <HiOutlineArrowLeft /> Dashboard
        </button>

        <div className="reports-heading">
          <div>
            <span className="reports-eyebrow">
              <HiOutlineChartBar /> Account analytics
            </span>
            <h1>Reports & Analytics</h1>
            <p>Understand your medicine verification activity at a glance.</p>
          </div>

          <button className="mg-primary-btn" onClick={() => window.print()}>
            Print Report
          </button>
        </div>

        {loading && <p className="report-note">Loading your reports...</p>}

        {error && (
          <p className="report-note" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className="report-stats">
              <div>
                <HiOutlineShieldCheck />
                <span>Total Scans</span>
                <strong>{total}</strong>
              </div>
              <div>
                <HiOutlineCheckCircle />
                <span>Likely Genuine</span>
                <strong>{genuine}</strong>
              </div>
              <div>
                <HiOutlineExclamation />
                <span>Flagged</span>
                <strong>{flagged}</strong>
              </div>
              <div>
                <HiOutlineChartBar />
                <span>Average Confidence</span>
                <strong>{avg === null ? "—" : `${avg}%`}</strong>
              </div>
            </div>

            <div className="reports-grid">
              <section className="report-card">
                <h2>Verification overview</h2>

                <div className="bar-row">
                  <span>Genuine</span>
                  <div>
                    <i style={{ width: `${percent(genuine, total)}%` }} />
                  </div>
                  <strong>{genuine}</strong>
                </div>

                <div className="bar-row">
                  <span>Flagged</span>
                  <div>
                    <i
                      className="flag"
                      style={{ width: `${percent(flagged, total)}%` }}
                    />
                  </div>
                  <strong>{flagged}</strong>
                </div>

                <div className="bar-row">
                  <span>Unverified</span>
                  <div>
                    <i
                      className="unverified"
                      style={{ width: `${percent(unverified, total)}%` }}
                    />
                  </div>
                  <strong>{unverified}</strong>
                </div>

                <p className="report-note">
                  {total
                    ? "These figures are based on your own verification history."
                    : "No verifications yet. Verify a medicine to see your analytics here."}
                </p>
              </section>

              <section className="report-card">
                <h2>Safety summary</h2>

                <div className="safety-item">
                  <span>🟢</span>
                  <div>
                    <strong>Likely genuine</strong>
                    <p>{genuine} records</p>
                  </div>
                </div>

                <div className="safety-item">
                  <span>🟠</span>
                  <div>
                    <strong>Needs review</strong>
                    <p>{flagged} flagged records</p>
                  </div>
                </div>

                <div className="safety-item">
                  <span>⚪</span>
                  <div>
                    <strong>Could not verify</strong>
                    <p>{unverified} records</p>
                  </div>
                </div>

                <div className="report-note">
                  <HiOutlineShieldCheck /> AI-assisted results should be
                  reviewed when necessary and do not guarantee authenticity.
                </div>
              </section>
            </div>

            {/* ===========================================================
                REPORTS THE USER SUBMITTED (from the Verify page)
            =========================================================== */}

            <section className="report-card report-card--wide">
              <h2>Reports you submitted</h2>

              {myReports.length === 0 ? (
                <p className="report-note">
                  You haven&apos;t reported any medicine yet. Use{" "}
                  <strong>Report Medicine</strong> on a result page if
                  something looks wrong.
                </p>
              ) : (
                <ul className="report-list">
                  {myReports.map((report) => (
                    <li key={report.id} className="report-list__item">
                      <div className="report-list__top">
                        <strong>{reportTitle(report.description)}</strong>

                        <span
                          className={`report-status report-status--${String(
                            report.status
                          ).toLowerCase()}`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <p className="report-list__meta">
                        {formatDate(report.created_at)}
                        {report.has_image ? " · photo attached" : ""}
                      </p>

                      <details>
                        <summary>View details</summary>
                        <p className="report-list__text">{report.description}</p>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  return (
    <DashboardLayout title="Reports">
      <ReportsContent />
    </DashboardLayout>
  );
}
