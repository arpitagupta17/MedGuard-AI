import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineQuestionMarkCircle,
  HiOutlineSearch,
} from "react-icons/hi";
import "./history.css";
import DashboardLayout from "../../components/DashboardLayout";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const FILTERS = ["all", "genuine", "flagged", "unverified"];

const BADGES = {
  genuine: { label: "Likely genuine", icon: <HiOutlineCheckCircle /> },
  flagged: { label: "Flagged", icon: <HiOutlineExclamation /> },
  unverified: { label: "Unverified", icon: <HiOutlineQuestionMarkCircle /> },
};

function Badge({ result }) {
  const badge = BADGES[result] || BADGES.unverified;

  return (
    <span className={`history-badge history-badge--${result}`}>
      {badge.icon}
      {badge.label}
    </span>
  );
}

// "Calcium Carbonate 500mg" + "500 mg" -> "Calcium Carbonate 500mg" (no repeated strength)
function withStrength(name, strength) {
  if (!strength) return name;
  const clean = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean(name).endsWith(clean(strength)) ? name : `${name} ${strength}`;
}

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

function HistoryContent() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // -------------------------------------------------------------------------
  // LOAD THIS USER'S HISTORY FROM THE BACKEND
  // -------------------------------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login", { replace: true, state: { from: "/history" } });
      return undefined;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        const response = await fetch(`${API_BASE}/history/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Login expired or invalid
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true, state: { from: "/history" } });
          return;
        }

        if (!response.ok) {
          throw new Error("Could not load your verification history.");
        }

        const data = await response.json();

        if (!cancelled) {
          setRecords(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof TypeError
            ? "Cannot reach the MedGuard server. Make sure the backend is running."
            : err.message || "Could not load your verification history."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // -------------------------------------------------------------------------
  // SEARCH AND FILTER
  // -------------------------------------------------------------------------

  const rows = useMemo(
    () =>
      records.filter(
        (row) =>
          (row.medicine || "").toLowerCase().includes(query.toLowerCase()) &&
          (filter === "all" || row.result === filter)
      ),
    [records, query, filter]
  );

  let emptyMessage = "";

  if (!loading && !error && !rows.length) {
    emptyMessage = records.length
      ? "No matching verification records."
      : "No verifications yet. Verify your first medicine to see it here.";
  }

  return (
    <div className="mg-page">
      <div className="mg-page__inner">
        <button className="mg-back" onClick={() => navigate("/dashboard")}>
          <HiOutlineArrowLeft /> Dashboard
        </button>

        <div className="history-heading">
          <div>
            <h1>Verification History</h1>
            <p>Review all medicine verification activity linked to your account.</p>
          </div>

          <button className="mg-primary-btn" onClick={() => navigate("/verify")}>
            + Verify Medicine
          </button>
        </div>

        <div className="history-toolbar">
          <div className="history-search">
            <HiOutlineSearch />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search medicine..."
            />
          </div>

          <div className="history-filters">
            {FILTERS.map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Medicine</th>
                <th>Result</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td>
                    <strong>
                      {withStrength(row.medicine, row.strength)}
                    </strong>
                    {row.batch_number && (
                      <small style={{ display: "block", color: "#8a97ab" }}>
                        Batch {row.batch_number}
                      </small>
                    )}
                  </td>
                  <td>
                    <Badge result={row.result} />
                  </td>
                  <td>
                    {typeof row.confidence === "number"
                      ? `${Math.round(row.confidence)}%`
                      : "—"}
                  </td>
                  <td>
                    <button onClick={() => navigate("/reports")}>View report</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <div className="history-empty">Loading your history...</div>}

          {error && (
            <div className="history-empty" role="alert">
              {error}
            </div>
          )}

          {emptyMessage && <div className="history-empty">{emptyMessage}</div>}
        </div>
      </div>
    </div>
  );
}

export default function History() {
  return (
    <DashboardLayout title="History">
      <HistoryContent />
    </DashboardLayout>
  );
}
