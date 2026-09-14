import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiMenu,
  HiX,
  HiOutlineUserCircle,
  HiOutlineLogout,
} from "react-icons/hi";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import logo from "../assets/logo.png";
import "./Navbar.css";

/* =========================================================
   PUBLIC NAVIGATION LINKS
========================================================= */

const PUBLIC_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/#about" },
  { label: "Features", to: "/#features" },
  { label: "How It Works", to: "/#how-it-works" },
  { label: "Contact", to: "/#contact" },
];

/* =========================================================
   LOGGED-IN NAVIGATION LINKS
========================================================= */

const USER_LINKS = [
  { label: "Home", to: "/" },
  { label: "Dashboard", to: "/dashboard" },
];

/* =========================================================
   NAVBAR
========================================================= */

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  /* =======================================================
     CHECK LOGIN STATUS
  ======================================================= */

  const checkLoginStatus = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      setIsLoggedIn(false);
      setUser(null);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (parsedUser?.isLoggedIn === true) {
        setIsLoggedIn(true);
        setUser(parsedUser);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Invalid user data:", error);

      setIsLoggedIn(false);
      setUser(null);
    }
  };

  /* =======================================================
     EFFECTS
  ======================================================= */

  useEffect(() => {
    /*
      Check login status when Navbar first loads.
    */
    checkLoginStatus();

    /*
      Detect page scrolling.
    */
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    window.addEventListener("scroll", handleScroll);

    /*
      Listen for login/signup/logout.
    */
    window.addEventListener(
      "authChanged",
      checkLoginStatus
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );

      window.removeEventListener(
        "authChanged",
        checkLoginStatus
      );
    };
  }, []);

  /* =======================================================
     CLOSE MOBILE MENU
  ======================================================= */

  const closeMenu = () => {
    setOpen(false);
  };

  /* =======================================================
     VERIFY MEDICINE NAVIGATION
  ======================================================= */

  const handleVerifyMedicine = () => {
    closeMenu();

    /*
      If user is already logged in,
      directly open Verify Medicine.
    */

    if (isLoggedIn) {
      navigate("/verify");
      return;
    }

    /*
      If user is NOT logged in,
      send them to Login.

      The "from" state tells Login:

      "The user originally wanted /verify."

      Login will then redirect them back to /verify
      after successful authentication.
    */

    navigate("/login", {
      state: {
        from: "/verify",
      },
    });
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    /*
      Remove logged-in user.
    */
    localStorage.removeItem("user");

    /*
      Update Navbar immediately.
    */
    setIsLoggedIn(false);
    setUser(null);
    setOpen(false);

    /*
      Tell other components that authentication changed.
    */
    window.dispatchEvent(
      new Event("authChanged")
    );

    /*
      Return user to Home.
    */
    navigate("/");
  };

  /* =======================================================
     NAVIGATION LINKS
  ======================================================= */

  const links = isLoggedIn
    ? USER_LINKS
    : PUBLIC_LINKS;

  /* =======================================================
     ACTIVE LINK CHECK
  ======================================================= */

  const isCurrentPath = (path) => {
    if (path.includes("#")) {
      return location.pathname === "/";
    }

    return location.pathname === path;
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <header
      className={`navbar ${
        scrolled ? "navbar--scrolled" : ""
      }`}
    >

      <div className="container navbar__inner">

        {/* =================================================
            LOGO
        ================================================== */}

        <Link
          to="/"
          className="navbar__logo"
          onClick={closeMenu}
        >
          <img
            src={logo}
            alt="MedGuard AI logo"
          />

          <span>
            MedGuard <em>AI</em>
          </span>
        </Link>


        {/* =================================================
            DESKTOP NAVIGATION
        ================================================== */}

        <nav className="navbar__links">

          {/* -------------------------------
              HOME / OTHER LINKS
          -------------------------------- */}

          {links.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              onClick={closeMenu}
              className={() =>
                `navbar__link ${
                  isCurrentPath(link.to)
                    ? "navbar__link--active"
                    : ""
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {/* -------------------------------
              VERIFY MEDICINE
          -------------------------------- */}

          <button
            type="button"
            className={`navbar__link navbar__verify-button ${
              location.pathname === "/verify"
                ? "navbar__link--active"
                : ""
            }`}
            onClick={handleVerifyMedicine}
          >
            Verify Medicine
          </button>

        </nav>


        {/* =================================================
            DESKTOP ACTIONS
        ================================================== */}

        <div className="navbar__actions">

          {/* ===============================
              LOGGED OUT
          ================================ */}

          {!isLoggedIn && (
            <>
              <Link
                to="/login"
                className="btn btn-ghost"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="btn btn-primary"
              >
                Sign Up
              </Link>
            </>
          )}


          {/* ===============================
              LOGGED IN
          ================================ */}

          {isLoggedIn && (
            <>
              {/* User Dashboard */}

              <motion.button
                type="button"
                className="navbar__user"
                onClick={() =>
                  navigate("/dashboard")
                }
                aria-label="Open User Dashboard"
                title="User Dashboard"
                whileHover={{
                  scale: 1.03,
                }}
                whileTap={{
                  scale: 0.97,
                }}
              >
                <HiOutlineUserCircle
                  size={25}
                />

                <span>
                  {user?.name || "User"}
                </span>
              </motion.button>


              {/* Logout */}

              <motion.button
                type="button"
                className="navbar__logout"
                onClick={handleLogout}
                whileHover={{
                  scale: 1.03,
                }}
                whileTap={{
                  scale: 0.97,
                }}
              >
                <HiOutlineLogout
                  size={20}
                />

                <span>
                  Logout
                </span>
              </motion.button>
            </>
          )}

        </div>


        {/* =================================================
            MOBILE MENU BUTTON
        ================================================== */}

        <button
          type="button"
          className="navbar__burger"
          aria-label={
            open
              ? "Close menu"
              : "Open menu"
          }
          aria-expanded={open}
          onClick={() =>
            setOpen((value) => !value)
          }
        >
          {open ? (
            <HiX size={24} />
          ) : (
            <HiMenu size={24} />
          )}
        </button>

      </div>


      {/* =================================================
          MOBILE MENU
      ================================================== */}

      <AnimatePresence>

        {open && (

          <motion.div
            className="navbar__mobile"

            initial={{
              height: 0,
              opacity: 0,
            }}

            animate={{
              height: "auto",
              opacity: 1,
            }}

            exit={{
              height: 0,
              opacity: 0,
            }}

            transition={{
              duration: 0.3,
              ease: [
                0.16,
                1,
                0.3,
                1,
              ],
            }}
          >

            {/* =============================================
                MOBILE NAVIGATION
            ============================================== */}

            <nav>

              {/* -------------------------------
                  HOME / OTHER LINKS
              -------------------------------- */}

              {links.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  onClick={closeMenu}
                  className={() =>
                    `navbar__mobile-link ${
                      isCurrentPath(link.to)
                        ? "navbar__mobile-link--active"
                        : ""
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}


              {/* -------------------------------
                  VERIFY MEDICINE
              -------------------------------- */}

              <button
                type="button"
                className={`navbar__mobile-link navbar__mobile-verify-button ${
                  location.pathname === "/verify"
                    ? "navbar__mobile-link--active"
                    : ""
                }`}
                onClick={handleVerifyMedicine}
              >
                Verify Medicine
              </button>

            </nav>


            {/* =============================================
                MOBILE ACTIONS
            ============================================== */}

            <div className="navbar__mobile-actions">

              {/* ===============================
                  LOGGED OUT
              ================================ */}

              {!isLoggedIn && (
                <>
                  <Link
                    to="/login"
                    className="btn btn-secondary"
                    onClick={closeMenu}
                  >
                    Login
                  </Link>

                  <Link
                    to="/signup"
                    className="btn btn-primary"
                    onClick={closeMenu}
                  >
                    Sign Up
                  </Link>
                </>
              )}


              {/* ===============================
                  LOGGED IN
              ================================ */}

              {isLoggedIn && (
                <>
                  {/* User Dashboard */}

                  <button
                    type="button"
                    className="navbar__mobile-user"
                    onClick={() => {
                      closeMenu();
                      navigate("/dashboard");
                    }}
                  >
                    <HiOutlineUserCircle
                      size={23}
                    />

                    <span>
                      {user?.name || "User"}
                    </span>
                  </button>


                  {/* Logout */}

                  <button
                    type="button"
                    className="navbar__mobile-logout"
                    onClick={handleLogout}
                  >
                    <HiOutlineLogout
                      size={21}
                    />

                    <span>
                      Logout
                    </span>
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