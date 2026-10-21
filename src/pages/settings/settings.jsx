import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineUser,
} from "react-icons/hi";
import DashboardLayout from "../../components/DashboardLayout";
import "./settings.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const messageStyle = (ok) => ({
  margin: "12px 0 0",
  fontSize: "13.5px",
  fontWeight: 600,
  color: ok ? "#17825a" : "#a83c31",
});

function SettingsContent() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null); // { name, email }
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [profileMsg, setProfileMsg] = useState(null); // { ok, text }
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  function authHeaders(extra = {}) {
    return {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      ...extra,
    };
  }

  function sessionExpired() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true, state: { from: "/settings" } });
  }

  // Load the real account details from the backend
  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      navigate("/login", { replace: true, state: { from: "/settings" } });
      return undefined;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: authHeaders(),
        });

        if (response.status === 401) {
          sessionExpired();
          return;
        }

        if (!response.ok) throw new Error("failed");

        const data = await response.json();

        if (!cancelled) {
          setProfile(data);
          setName(data.name || "");
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load your account. Make sure the backend is running.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileMsg(null);

    if (!name.trim()) {
      setProfileMsg({ ok: false, text: "Please enter your name." });
      return;
    }

    setSavingProfile(true);

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.status === 401) {
        sessionExpired();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setProfileMsg({ ok: false, text: data.detail || "Could not save your name." });
        return;
      }

      setProfile(data);
      setName(data.name);

      // Keep the name shown on the Dashboard in step
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        if (stored) {
          localStorage.setItem("user", JSON.stringify({ ...stored, name: data.name }));
        }
      } catch {
        /* ignore */
      }

      setProfileMsg({ ok: true, text: "Saved ✓" });
    } catch {
      setProfileMsg({ ok: false, text: "Cannot reach the MedGuard server." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ ok: false, text: "Please fill in all three fields." });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: "The new passwords do not match." });
      return;
    }

    setSavingPassword(true);

    try {
      const response = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.status === 401) {
        sessionExpired();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPasswordMsg({ ok: false, text: data.detail || "Could not change the password." });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ ok: true, text: "Password changed ✓" });
    } catch {
      setPasswordMsg({ ok: false, text: "Cannot reach the MedGuard server." });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mg-page">

      <div className="mg-page__inner">
        <button className="mg-back" onClick={() => navigate("/dashboard")}>
          <HiOutlineArrowLeft /> Dashboard
        </button>

        <div className="settings-heading">
          <h1>Profile & Settings</h1>
          <p>Manage your account and password.</p>
        </div>

        {loading && <p>Loading your account...</p>}

        {loadError && (
          <p role="alert" style={messageStyle(false)}>
            {loadError}
          </p>
        )}

        {profile && (
          <div className="settings-layout">
            <aside className="settings-menu">
              <div className="settings-user">
                <div className="settings-avatar">
                  {(profile.name || "U").slice(0, 1).toUpperCase()}
                </div>
                <strong>{profile.name || "User"}</strong>
                <span>{profile.email}</span>
              </div>
              <a href="#profile">👤 Profile</a>
              <a href="#security">🔐 Password</a>
            </aside>

            <main className="settings-content">
              <section className="settings-card" id="profile">
                <div className="settings-card__head">
                  <HiOutlineUser />
                  <div>
                    <h2>My Profile</h2>
                    <p>Keep your account information up to date.</p>
                  </div>
                </div>

                <form onSubmit={saveProfile} className="settings-form">
                  <label>
                    Full Name
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                  </label>
                  <label>
                    Email Address
                    <input value={profile.email} disabled />
                  </label>
                  <button className="mg-primary-btn" type="submit" disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </form>

                {profileMsg && (
                  <p role="status" style={messageStyle(profileMsg.ok)}>
                    {profileMsg.text}
                  </p>
                )}
              </section>

              <section className="settings-card" id="security">
                <div className="settings-card__head">
                  <HiOutlineShieldCheck />
                  <div>
                    <h2>Change Password</h2>
                    <p>Use at least 8 characters.</p>
                  </div>
                </div>

                <form onSubmit={changePassword} className="settings-form">
                  <label>
                    Current password
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </label>
                  <label>
                    New password
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                  <label>
                    Confirm new password
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </label>
                  <button className="mg-primary-btn" type="submit" disabled={savingPassword}>
                    <HiOutlineLockClosed style={{ verticalAlign: "-2px", marginRight: 6 }} />
                    {savingPassword ? "Changing..." : "Change Password"}
                  </button>
                </form>

                {passwordMsg && (
                  <p role="status" style={messageStyle(passwordMsg.ok)}>
                    {passwordMsg.text}
                  </p>
                )}
              </section>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <DashboardLayout title="Settings">
      <SettingsContent />
    </DashboardLayout>
  );
}
