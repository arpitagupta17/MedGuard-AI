import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiMenu, HiX } from "react-icons/hi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/#about" },
  { label: "Features", to: "/#features" },
  { label: "How It Works", to: "/#how-it-works" },
  { label: "Contact", to: "/#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // ---------------------------------------
  // CHECK LOGIN STATUS
  // ---------------------------------------
  const checkLoginStatus = () => {
    try {
      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setIsLoggedIn(false);
        setUser(null);
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      if (parsedUser?.isLoggedIn === true) {
        setIsLoggedIn(true);
        setUser(parsedUser);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Unable to read logged-in user:", error);
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  // ---------------------------------------
  // INITIAL LOGIN CHECK + AUTH LISTENER
  // ---------------------------------------
  useEffect(() => {
    checkLoginStatus();

    // Fires when login/signup/logout happens
    window.addEventListener("authChanged", checkLoginStatus);

    // Fires when localStorage changes in another tab
    window.addEventListener("storage", checkLoginStatus);

    return () => {
      window.removeEventListener("authChanged", checkLoginStatus);
      window.removeEventListener("storage", checkLoginStatus);
    };
  }, []);

  // ---------------------------------------
  // SCROLL
  // ---------------------------------------
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // ---------------------------------------
  // CLOSE MOBILE MENU WHEN ROUTE CHANGES
  // ---------------------------------------
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // ---------------------------------------
  // VERIFY MEDICINE
  // ---------------------------------------
  const handleVerifyMedicine = () => {
    setOpen(false);

    if (isLoggedIn) {
      navigate("/verify");
    } else {
      navigate("/login", {
        state: { from: "/verify" },
      });
    }
  };

  // ---------------------------------------
  // LOGOUT
  // ---------------------------------------
  const handleLogout = () => {
    localStorage.removeItem("user");

    // Remove auth-related backend/local tokens too
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");

    setIsLoggedIn(false);
    setUser(null);
    setOpen(false);

    // Tell the rest of the application
    window.dispatchEvent(new Event("authChanged"));

    navigate("/");
  };

  // ---------------------------------------
  // ACTIVE LINK
  // ---------------------------------------
  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname === path;
  };

  return (
    <header className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}>
      <div className="container navbar__inner">

        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <img src={logo} alt="MedGuard AI logo" />

          <span>
            MedGuard <em>AI</em>
          </span>
        </Link>

        {/* -------------------------------- */}
        {/* DESKTOP NAVIGATION */}
        {/* -------------------------------- */}
        <nav className="navbar__links">

          {LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className={isActive(link.to) ? "active" : ""}
            >
              {link.label}
            </Link>
          ))}

          {/* Verify Medicine */}
          <button
            type="button"
            className={`navbar__link navbar__verify-button ${
              isActive("/verify") ? "active" : ""
            }`}
            onClick={handleVerifyMedicine}
          >
            Verify Medicine
          </button>

          {/* Dashboard only when logged in */}
          {isLoggedIn && (
            <Link
              to="/dashboard"
              className={isActive("/dashboard") ? "active" : ""}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* -------------------------------- */}
        {/* DESKTOP ACTIONS */}
        {/* -------------------------------- */}
        <div className="navbar__actions">

          {!isLoggedIn ? (
            <>
              <Link to="/login" className="btn btn-ghost">
                Login
              </Link>

              <Link to="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/dashboard"
                className="navbar__user"
                title="Open Dashboard"
              >
                <span className="navbar__user-icon">👤</span>

                <span className="navbar__user-name">
                  {user?.name || "User"}
                </span>
              </Link>

              <button
                type="button"
                className="btn btn-ghost navbar__logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          )}

        </div>

        {/* -------------------------------- */}
        {/* MOBILE MENU BUTTON */}
        {/* -------------------------------- */}
        <button
          className="navbar__burger"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <HiX size={24} /> : <HiMenu size={24} />}
        </button>
      </div>

      {/* -------------------------------- */}
      {/* MOBILE MENU */}
      {/* -------------------------------- */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="navbar__mobile"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <nav>

              {LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {/* Mobile Verify Medicine */}
              <button
                type="button"
                className="navbar__mobile-verify-button"
                onClick={handleVerifyMedicine}
              >
                Verify Medicine
              </button>

              {/* Mobile Dashboard */}
              {isLoggedIn && (
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                >
                  Dashboard
                </Link>
              )}

            </nav>

            {/* -------------------------------- */}
            {/* MOBILE ACTIONS */}
            {/* -------------------------------- */}
            <div className="navbar__mobile-actions">

              {!isLoggedIn ? (
                <>
                  <Link
                    to="/login"
                    className="btn btn-secondary"
                    onClick={() => setOpen(false)}
                  >
                    Login
                  </Link>

                  <Link
                    to="/signup"
                    className="btn btn-primary"
                    onClick={() => setOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    className="btn btn-secondary"
                    onClick={() => setOpen(false)}
                  >
                    👤 {user?.name || "Dashboard"}
                  </Link>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}