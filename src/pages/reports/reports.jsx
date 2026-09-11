import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineShieldCheck } from "react-icons/hi";
import { DEMO_HISTORY } from "../../data/demoData";
import { getStoredUser } from "../../utils/auth";
import "./reports.css";

export default function Reports() {
  const navigate = useNavigate();
  useEffect(() => { if (!getStoredUser()?.isLoggedIn) navigate("/login"); }, [navigate]);

  const total = DEMO_HISTORY.length;
  const genuine = DEMO_HISTORY.filter(x => x.result === "genuine").length;
  const flagged = total - genuine;
  const avg = Math.round(DEMO_HISTORY.reduce((sum,x)=>sum+x.confidence,0)/total);

  return (
    <div className="mg-page">
      <div className="mg-page__inner">
        <button className="mg-back" onClick={()=>navigate("/dashboard")}><HiOutlineArrowLeft/> Dashboard</button>
        <div className="reports-heading">
          <div><span className="reports-eyebrow"><HiOutlineChartBar/> Account analytics</span><h1>Reports & Analytics</h1><p>Understand your medicine verification activity at a glance.</p></div>
          <button className="mg-primary-btn" onClick={()=>window.print()}>Print Report</button>
        </div>

        <div className="report-stats">
          <div><HiOutlineShieldCheck/><span>Total Scans</span><strong>{total}</strong></div>
          <div><HiOutlineCheckCircle/><span>Likely Genuine</span><strong>{genuine}</strong></div>
          <div><HiOutlineExclamation/><span>Flagged</span><strong>{flagged}</strong></div>
          <div><HiOutlineChartBar/><span>Average Confidence</span><strong>{avg}%</strong></div>
        </div>

        <div className="reports-grid">
          <section className="report-card">
            <h2>Verification overview</h2>
            <div className="bar-row"><span>Genuine</span><div><i style={{width:`${(genuine/total)*100}%`}}/></div><strong>{genuine}</strong></div>
            <div className="bar-row"><span>Flagged</span><div><i className="flag" style={{width:`${(flagged/total)*100}%`}}/></div><strong>{flagged}</strong></div>
            <p className="report-note">These figures are based on the verification records currently available in the demo application.</p>
          </section>
          <section className="report-card">
            <h2>Safety summary</h2>
            <div className="safety-item"><span>🟢</span><div><strong>Likely genuine</strong><p>{genuine} records</p></div></div>
            <div className="safety-item"><span>🟠</span><div><strong>Needs review</strong><p>{flagged} flagged records</p></div></div>
            <div className="report-note"><HiOutlineShieldCheck/> AI-assisted results should be reviewed when necessary and do not guarantee authenticity.</div>
          </section>
        </div>
      </div>
    </div>
  );
}
