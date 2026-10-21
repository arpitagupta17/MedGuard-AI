import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineSearch,
  HiOutlineShieldCheck,
} from "react-icons/hi";
import "./medicines.css";
import DashboardLayout from "../../components/DashboardLayout";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const BADGES = {
  genuine: { label: "Likely Genuine", icon: HiOutlineCheckCircle },
  flagged: { label: "Flagged", icon: HiOutlineExclamation },
  unverified: { label: "Could not verify", icon: HiOutlineSearch },
};

function ResultBadge({ result }) {
  const badge = BADGES[result] || BADGES.unverified;
  const Icon = badge.icon;
  return (
    <span className={`medicine-badge medicine-badge--${BADGES[result] ? result : "unverified"}`}>
      <Icon />
      {badge.label}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatConfidence(value) {
  const number = Number(value);
  return value === null || value === undefined || Number.isNaN(number)
    ? "—"
    : `${Math.round(number)}%`;
}

// "Calcium Carbonate 500mg" + "500 mg" -> "Calcium Carbonate 500mg" (no repeated strength)
function withStrength(name, strength) {
  if (!strength) return name;
  const clean = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean(name).endsWith(clean(strength)) ? name : `${name} ${strength}`;
}

// Turn the history rows (newest first) into one card per medicine.
// Packs with no readable name are kept as separate cards.
function buildCabinet(history) {
  const cards = new Map();

  for (const row of history) {
    const named = Boolean(row.medicine) && row.medicine !== "Not in database";
    const key = named ? row.medicine.toLowerCase() : `unnamed-${row.id}`;

    if (!cards.has(key)) {
      cards.set(key, {
        key,
        name: named ? row.medicine : "Unrecognised medicine",
        title: named
          ? withStrength(row.medicine, row.strength)
          : "Unrecognised medicine",
        named,
        matched: Boolean(row.matched),
        result: row.result,        // latest check (rows are newest first)
        confidence: row.confidence,
        lastVerified: row.date,
        strength: row.strength,
        manufacturer: row.manufacturer,
        batch: row.batch_number,
        expiry: row.expiry_date,
        checks: 1,
      });
    } else {
      cards.get(key).checks += 1;
    }
  }

  return Array.from(cards.values());
}

function MedicinesContent() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // The route is already protected by <ProtectedRoute>; here we only load the data.
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login", { replace: true, state: { from: "/medicines" } });
      return undefined;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_BASE}/history/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          navigate("/login", { replace: true, state: { from: "/medicines" } });
          return;
        }

        if (!response.ok) throw new Error("failed");

        const data = await response.json();
           if (!cancelled) {
     const rows = Array.isArray(data) ? data : [];
     setHistory(rows.filter((row) => row.result === "genuine" || row.result === "flagged"));
   }
      } catch {
        if (!cancelled) setError("Could not load your medicines. Make sure the backend is running.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const cabinet = useMemo(() => buildCabinet(history), [history]);

  const medicines = cabinet.filter((medicine) =>
    medicine.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mg-page">
      <div className="mg-page__inner">
        <button className="mg-back" onClick={() => navigate("/dashboard")}>
          <HiOutlineArrowLeft /> Dashboard
        </button>

        <div className="mg-page__heading">
          <div>
            <span className="mg-page__eyebrow"><HiOutlineShieldCheck /> Medicine safety</span>
            <h1>My Medicine Cabinet</h1>
            <p>Medicines you have checked with MedGuard AI, with the result of your latest check.</p>
          </div>
          <button className="mg-primary-btn" onClick={() => navigate("/verify")}>
            + Verify Medicine
          </button>
        </div>

        <div className="mg-search">
          <HiOutlineSearch />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your medicines..."
          />
        </div>

        {error && <p role="alert" style={{ color: "#a83c31" }}>{error}</p>}

        {loading ? (
          <div className="mg-empty"><p>Loading your medicines…</p></div>
        ) : (
          <div className="medicine-grid">
            {medicines.map((medicine) => (
              <article className="medicine-card" key={medicine.key}>
                <div className="medicine-card__top">
                  <div className="medicine-card__icon">💊</div>
                  <ResultBadge result={medicine.result} />
                </div>

                <h2>{medicine.title}</h2>
                <p className="medicine-card__manufacturer">
                  {medicine.manufacturer ||
                    `${medicine.checks} ${medicine.checks === 1 ? "check" : "checks"}`}
                </p>

                <div className="medicine-card__details">
                  <div><span>Batch</span><strong>{medicine.batch || "—"}</strong></div>
                  <div><span>Expiry</span><strong>{medicine.expiry || "—"}</strong></div>
                  <div><span>Confidence</span><strong>{formatConfidence(medicine.confidence)}</strong></div>
                  <div><span>Last verified</span><strong>{formatDate(medicine.lastVerified)}</strong></div>
                </div>

                <button className="medicine-card__button" onClick={() => setSelected(medicine)}>
                  View Details
                </button>
              </article>
            ))}
          </div>
        )}

        {!loading && !error && !medicines.length && (
          <div className="mg-empty">
            <div>🔎</div>
            <h2>{cabinet.length ? "No medicines found" : "Nothing here yet"}</h2>
            <p>
              {cabinet.length
                ? "Try another medicine name."
                : "Verify your first medicine and it will appear here."}
            </p>
          </div>
        )}
      </div>

      {selected && (
        <div className="mg-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="mg-modal" onClick={(e) => e.stopPropagation()}>
            <button className="mg-modal__close" onClick={() => setSelected(null)}>×</button>
            <div className="medicine-modal__icon">💊</div>
            <ResultBadge result={selected.result} />
            <h2>{selected.title}</h2>
            <p>
              {selected.matched
                ? "Matched to a medicine batch in the MedGuard database."
                : selected.named
                ? "Read from the pack, but no matching batch record was found in the database."
                : "The medicine name could not be read from this pack."}
            </p>

            <div className="medicine-modal__grid">
              <div><span>Manufacturer</span><strong>{selected.manufacturer || "—"}</strong></div>
              <div><span>Batch Number</span><strong>{selected.batch || "—"}</strong></div>
              <div><span>Expiry Date</span><strong>{selected.expiry || "—"}</strong></div>
              <div><span>AI Confidence</span><strong>{formatConfidence(selected.confidence)}</strong></div>
              <div><span>Last Verified</span><strong>{formatDate(selected.lastVerified)}</strong></div>
              <div><span>Total checks</span><strong>{selected.checks}</strong></div>
            </div>

            <div className="medicine-modal__notice">
              <HiOutlineShieldCheck />
              AI-assisted screening. A match is evidence, not proof, and does not replace professional
              pharmaceutical verification.
            </div>

            <button className="mg-primary-btn" onClick={() => navigate("/verify")}>
              Verify Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Medicines() {
  return (
    <DashboardLayout title="My Medicines">
      <MedicinesContent />
    </DashboardLayout>
  );
}
