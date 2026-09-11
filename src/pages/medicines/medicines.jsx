import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineSearch,
  HiOutlineShieldCheck,
} from "react-icons/hi";
import { DEMO_MEDICINES } from "../../data/demoData";
import { getStoredUser } from "../../utils/auth";
import "./medicines.css";

function ResultBadge({ result }) {
  return (
    <span className={`medicine-badge medicine-badge--${result}`}>
      {result === "genuine" ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />}
      {result === "genuine" ? "Likely Genuine" : "Flagged"}
    </span>
  );
}

export default function Medicines() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!getStoredUser()?.isLoggedIn) navigate("/login");
  }, [navigate]);

  const medicines = DEMO_MEDICINES.filter((medicine) =>
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
            <p>Keep track of medicines you have verified with MedGuard AI.</p>
          </div>
          <button className="mg-primary-btn" onClick={() => navigate("/verify")}>
            + Add / Verify Medicine
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

        <div className="medicine-grid">
          {medicines.map((medicine) => (
            <article className="medicine-card" key={medicine.id}>
              <div className="medicine-card__top">
                <div className="medicine-card__icon">💊</div>
                <ResultBadge result={medicine.result} />
              </div>

              <h2>{medicine.name} <span>{medicine.strength}</span></h2>
              <p className="medicine-card__manufacturer">{medicine.manufacturer}</p>

              <div className="medicine-card__details">
                <div><span>Batch</span><strong>{medicine.batchNumber}</strong></div>
                <div><span>Expiry</span><strong>{medicine.expiryDate}</strong></div>
                <div><span>Confidence</span><strong>{medicine.confidence}%</strong></div>
                <div><span>Last verified</span><strong>{medicine.lastVerified}</strong></div>
              </div>

              <button className="medicine-card__button" onClick={() => setSelected(medicine)}>
                View Details
              </button>
            </article>
          ))}
        </div>

        {!medicines.length && (
          <div className="mg-empty">
            <div>🔎</div>
            <h2>No medicines found</h2>
            <p>Try another medicine name.</p>
          </div>
        )}
      </div>

      {selected && (
        <div className="mg-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="mg-modal" onClick={(e) => e.stopPropagation()}>
            <button className="mg-modal__close" onClick={() => setSelected(null)}>×</button>
            <div className="medicine-modal__icon">💊</div>
            <ResultBadge result={selected.result} />
            <h2>{selected.name} {selected.strength}</h2>
            <p>{selected.manufacturer}</p>

            <div className="medicine-modal__grid">
              <div><span>Batch Number</span><strong>{selected.batchNumber}</strong></div>
              <div><span>Expiry Date</span><strong>{selected.expiryDate}</strong></div>
              <div><span>AI Confidence</span><strong>{selected.confidence}%</strong></div>
              <div><span>Last Verified</span><strong>{selected.lastVerified}</strong></div>
            </div>

            <div className="medicine-modal__notice">
              <HiOutlineShieldCheck />
              AI-assisted screening. This result does not replace professional pharmaceutical verification.
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
