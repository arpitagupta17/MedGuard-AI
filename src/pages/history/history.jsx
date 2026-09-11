import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineSearch } from "react-icons/hi";
import { DEMO_HISTORY } from "../../data/demoData";
import { getStoredUser } from "../../utils/auth";
import "./history.css";

function Badge({ result }) {
  return (
    <span className={`history-badge history-badge--${result}`}>
      {result === "genuine" ? <HiOutlineCheckCircle /> : <HiOutlineExclamation />}
      {result === "genuine" ? "Genuine" : "Flagged"}
    </span>
  );
}

export default function History() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!getStoredUser()?.isLoggedIn) navigate("/login");
  }, [navigate]);

  const rows = useMemo(
    () => DEMO_HISTORY.filter((row) =>
      row.medicine.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" || row.result === filter)
    ),
    [query, filter]
  );

  return (
    <div className="mg-page">
      <div className="mg-page__inner">
        <button className="mg-back" onClick={() => navigate("/dashboard")}><HiOutlineArrowLeft /> Dashboard</button>
        <div className="history-heading">
          <div><h1>Verification History</h1><p>Review all medicine verification activity linked to your account.</p></div>
          <button className="mg-primary-btn" onClick={() => navigate("/verify")}>+ Verify Medicine</button>
        </div>

        <div className="history-toolbar">
          <div className="history-search"><HiOutlineSearch /><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search medicine..." /></div>
          <div className="history-filters">
            {["all","genuine","flagged"].map((item) => (
              <button key={item} className={filter===item ? "active" : ""} onClick={()=>setFilter(item)}>
                {item[0].toUpperCase()+item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="history-table-wrap">
          <table className="history-table">
            <thead><tr><th>Date</th><th>Medicine</th><th>Result</th><th>Confidence</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td>{row.date}</td><td><strong>{row.medicine}</strong></td><td><Badge result={row.result}/></td>
                  <td>{row.confidence}%</td>
                  <td><button onClick={()=>navigate("/reports")}>View report</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="history-empty">No matching verification records.</div>}
        </div>
      </div>
    </div>
  );
}
