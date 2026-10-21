import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiMenu, HiX } from "react-icons/hi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const LINKS = [
  { label: "Home", to: "/" },
  { label: "Verify Medicine", to: "/verify" },
  { label: "About", to: "/#about" },
  { label: "Features", to: "/#features" },
  { label: "How It Works", to: "/#how-it-works" },
  { label: "Contact", to: "/#contact" },
];

// Reads the saved login (set by the login page)
function readLogin() {
  try {
    if (!localStorage.getItem("access_token")) {
      return { loggedIn: false, name: "" };
    }

    const user = JSON.parse(localStorage.getItem("user") || "null");

    return { loggedIn: true, name: user?.name || "" };
  } catch {
    return { loggedIn: false, name: "" };
  }
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState(readLogin);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);

    window.addEventListener("scroll", onScroll);

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Re-read the login after every page change (login / logout),
  // and when another browser tab logs in or out
  useEffect(() => {
    setAuth(readLogin());
  }, [location.pathname]);

  useEffect(() => {
    const onStorage = () => setAuth(readLogin());

    window.addEventListener("storage", onStorage);

    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");

    setAuth({ loggedIn: false, name: "" });
    setOpen(false);

    navigate("/login", { replace: true });
  }

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

        {/* Desktop Navigation */}
        <nav className="navbar__links">
          {LINKS.map((l) => (
            <Link key={l.label} to={l.to}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="navbar__actions">
          {auth.loggedIn ? (
            <>
              <Link to="/dashboard" className="btn btn-ghost">
                {auth.name ? `Hi, ${auth.name.split(" ")[0]}` : "Dashboard"}
              </Link>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Login
              </Link>

              <Link to="/signup" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="navbar__burger"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <HiX size={24} /> : <HiMenu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
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
              {LINKS.map((l) => (
                <Link
                  key={l.label}
                  to={l.to}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="navbar__mobile-actions">
              {auth.loggedIn ? (
                <>
                  <Link
                    to="/dashboard"
                    className="btn btn-secondary"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              ) : (
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
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
