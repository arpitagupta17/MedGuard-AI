import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineBell, HiOutlineLockClosed, HiOutlineShieldCheck, HiOutlineUser } from "react-icons/hi";
import { getStoredUser, updateStoredUser } from "../../utils/auth";
import "./settings.css";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [saved, setSaved] = useState(false);
  const [alerts, setAlerts] = useState({ verification:true, flagged:true, expiry:true, medication:true });

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.isLoggedIn) { navigate("/login"); return; }
    setUser(stored); setName(stored.name || ""); setPhone(stored.phone || ""); setLocation(stored.location || "");
  }, [navigate]);

  function saveProfile(e) {
    e.preventDefault();
    const next = updateStoredUser({ name: name.trim() || "User", phone: phone.trim(), location: location.trim() });
    setUser(next); setSaved(true); setTimeout(()=>setSaved(false),1800);
  }

  if (!user) return null;

  return (
    <div className="mg-page">
      <div className="mg-page__inner">
        <button className="mg-back" onClick={()=>navigate("/dashboard")}><HiOutlineArrowLeft/> Dashboard</button>
        <div className="settings-heading"><h1>Profile & Settings</h1><p>Manage your account, notifications and security preferences.</p></div>

        <div className="settings-layout">
          <aside className="settings-menu">
            <div className="settings-user"><div className="settings-avatar">{(name || "U").slice(0,1).toUpperCase()}</div><strong>{name || "User"}</strong><span>{user.email}</span></div>
            <a href="#profile">👤 Profile</a><a href="#notifications">🔔 Notifications</a><a href="#security">🔐 Security</a>
          </aside>

          <main className="settings-content">
            <section className="settings-card" id="profile">
              <div className="settings-card__head"><HiOutlineUser/><div><h2>My Profile</h2><p>Keep your account information up to date.</p></div></div>
              <form onSubmit={saveProfile} className="settings-form">
                <label>Full Name<input value={name} onChange={e=>setName(e.target.value)} /></label>
                <label>Email Address<input value={user.email} disabled /></label>
                <label>Phone Number<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Optional" /></label>
                <label>Location<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Optional" /></label>
                <button className="mg-primary-btn" type="submit">{saved ? "Saved ✓" : "Save Changes"}</button>
              </form>
            </section>

            <section className="settings-card" id="notifications">
              <div className="settings-card__head"><HiOutlineBell/><div><h2>Notifications</h2><p>Choose which safety updates you want to receive.</p></div></div>
              {Object.entries(alerts).map(([key,value])=>(
                <label className="setting-toggle" key={key}><span>{key==="verification"?"Medicine verification alerts":key==="flagged"?"Flagged medicine alerts":key==="expiry"?"Expiry reminders":"Medication reminders"}</span><input type="checkbox" checked={value} onChange={()=>setAlerts(a=>({...a,[key]:!a[key]}))}/></label>
              ))}
            </section>

            <section className="settings-card" id="security">
              <div className="settings-card__head"><HiOutlineShieldCheck/><div><h2>Security & Privacy</h2><p>Security controls for your account.</p></div></div>
              <div className="security-row"><HiOutlineLockClosed/><div><strong>Password</strong><p>••••••••••</p></div><button type="button">Change</button></div>
              <div className="security-row"><HiOutlineShieldCheck/><div><strong>Two-Factor Authentication</strong><p>Recommended for stronger account protection.</p></div><button type="button">Set up</button></div>
              <div className="privacy-note">For the current frontend prototype, authentication is stored locally. Do not use this implementation for real patient data until a secure backend is connected.</div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
