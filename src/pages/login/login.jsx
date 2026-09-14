import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineShieldCheck,
  HiOutlineArrowLeft,
} from "react-icons/hi";

import logo from "../../assets/logo.png";
import "./login.css";

import {
  authenticateDemoAccount,
  saveLoggedInUser,
} from "../../utils/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* =========================================================
   DEMO AUTHENTICATION
   Replace this with FastAPI authentication later.
========================================================= */

async function authenticate(email, password) {
  await new Promise((resolve) =>
    setTimeout(resolve, 700)
  );

  return authenticateDemoAccount(email, password);
}

/* =========================================================
   LOGIN COMPONENT
========================================================= */

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  /*
    This tells us where the user came from.

    Example:

    If user clicked Verify Medicine while logged out:

    {
      from: "/verify"
    }

    If user clicked Login normally:

    state will be undefined.
  */
  const from = location.state?.from;

  /* -------------------------------------------------------
     Form values
  ------------------------------------------------------- */

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /* -------------------------------------------------------
     UI state
  ------------------------------------------------------- */

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* -------------------------------------------------------
     Errors
  ------------------------------------------------------- */

  const [formError, setFormError] = useState("");

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  /* =======================================================
     EMAIL VALIDATION
  ======================================================= */

  const emailError =
    touched.email && !email
      ? "Email is required."
      : touched.email &&
        !EMAIL_PATTERN.test(email)
      ? "Please enter a valid email address."
      : "";

  /* =======================================================
     PASSWORD VALIDATION
  ======================================================= */

  const passwordError =
    touched.password && !password
      ? "Password is required."
      : "";

  /* =======================================================
     FORM VALIDATION
  ======================================================= */

  const isFormValid =
    Boolean(email) &&
    EMAIL_PATTERN.test(email) &&
    Boolean(password);

  /* =======================================================
     HANDLE BLUR
  ======================================================= */

  function handleBlur(field) {
    setTouched((previous) => ({
      ...previous,
      [field]: true,
    }));
  }

  /* =======================================================
     HANDLE LOGIN
  ======================================================= */

  async function handleSubmit(e) {
    e.preventDefault();

    /* Show validation errors */

    setTouched({
      email: true,
      password: true,
    });

    setFormError("");

    /* Stop if invalid */

    if (
      !email ||
      !EMAIL_PATTERN.test(email) ||
      !password ||
      isSubmitting
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      /* ---------------------------------------------------
         Authenticate user
      --------------------------------------------------- */

      const user = await authenticate(
        email.trim(),
        password
      );

      /* ---------------------------------------------------
         Save logged-in user
      --------------------------------------------------- */

      saveLoggedInUser(user);

      /* ---------------------------------------------------
         Tell Navbar authentication has changed
      --------------------------------------------------- */

      window.dispatchEvent(
        new Event("authChanged")
      );

      /* ---------------------------------------------------
         IMPORTANT REDIRECT LOGIC

         Case 1:
         User clicked Verify Medicine while logged out.

         Login -> Verify

         Case 2:
         User clicked Login normally.

         Login -> Dashboard
      --------------------------------------------------- */

      if (from === "/verify") {
        navigate("/verify", {
          replace: true,
        });
      } else {
        navigate("/dashboard", {
          replace: true,
        });
      }

    } catch (err) {
      setFormError(
        err.message ||
          "Unable to sign in. Please check your email and password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section className="login-page">

      <div className="login-layout">

        {/* =================================================
            BRANDING SIDE
        ================================================== */}

        <motion.aside
          className="login-branding"

          initial={{
            opacity: 0,
            x: -16,
          }}

          animate={{
            opacity: 1,
            x: 0,
          }}

          transition={{
            duration: 0.4,
          }}
        >

          <div
            className="login-branding__pattern"
            aria-hidden="true"
          />

          <div className="login-branding__content">

            {/* Logo */}

            <Link
              to="/"
              className="login-branding__logo"
            >

              <img
                src={logo}
                alt="MedGuard AI logo"
              />

              <span>
                MedGuard <em>AI</em>
              </span>

            </Link>

            {/* Heading */}

            <h1 className="login-branding__headline">

              Verify Medicines.

              <br />

              Protect Lives.

            </h1>

            {/* Description */}

            <p className="login-branding__text">
              AI-powered counterfeit medicine detection
              designed to help users verify medicines
              with confidence.
            </p>

            {/* Trust Points */}

            <ul className="login-branding__trust-list">

              <li>
                ✓ AI-Powered Verification
              </li>

              <li>
                ✓ Secure User Experience
              </li>

              <li>
                ✓ Reliable Medicine Analysis
              </li>

            </ul>

          </div>

        </motion.aside>


        {/* =================================================
            LOGIN FORM SIDE
        ================================================== */}

        <div className="login-form-side">

          {/* Back to Home */}

          <Link
            to="/"
            className="login-back-link"
          >

            <HiOutlineArrowLeft
              aria-hidden="true"
            />

            Back to Home

          </Link>


          <motion.div
            className="login-card"

            initial={{
              opacity: 0,
              y: 14,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.4,
              delay: 0.05,
            }}
          >

            {/* =================================================
                HEADER
            ================================================== */}

            <h2 className="login-card__title">
              Welcome Back
            </h2>

            <p className="login-card__subtitle">
              Sign in to continue to MedGuard AI.
            </p>


            {/* =================================================
                ERROR MESSAGE
            ================================================== */}

            <AnimatePresence>

              {formError && (

                <motion.p
                  className="login-error"
                  role="alert"

                  initial={{
                    opacity: 0,
                    height: 0,
                  }}

                  animate={{
                    opacity: 1,
                    height: "auto",
                  }}

                  exit={{
                    opacity: 0,
                    height: 0,
                  }}

                  transition={{
                    duration: 0.2,
                  }}
                >

                  {formError}

                </motion.p>

              )}

            </AnimatePresence>


            {/* =================================================
                FORM
            ================================================== */}

            <form
              onSubmit={handleSubmit}
              noValidate
            >

              {/* ================= EMAIL ================= */}

              <div className="form-field">

                <label htmlFor="login-email">
                  Email Address
                </label>

                <div
                  className={`input-wrap ${
                    emailError
                      ? "input-wrap--error"
                      : ""
                  }`}
                >

                  <HiOutlineMail
                    className="input-wrap__icon"
                    aria-hidden="true"
                  />

                  <input
                    id="login-email"
                    type="email"

                    value={email}

                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFormError("");
                    }}

                    onBlur={() =>
                      handleBlur("email")
                    }

                    placeholder="Enter your email"

                    autoComplete="email"

                    aria-invalid={Boolean(
                      emailError
                    )}

                    aria-describedby={
                      emailError
                        ? "login-email-error"
                        : undefined
                    }
                  />

                </div>


                {emailError && (

                  <p
                    className="field-error"
                    id="login-email-error"
                  >

                    {emailError}

                  </p>

                )}

              </div>


              {/* ================= PASSWORD ================= */}

              <div className="form-field">

                <label htmlFor="login-password">
                  Password
                </label>

                <div
                  className={`input-wrap ${
                    passwordError
                      ? "input-wrap--error"
                      : ""
                  }`}
                >

                  <HiOutlineLockClosed
                    className="input-wrap__icon"
                    aria-hidden="true"
                  />

                  <input
                    id="login-password"

                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }

                    value={password}

                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFormError("");
                    }}

                    onBlur={() =>
                      handleBlur("password")
                    }

                    placeholder="Enter your password"

                    autoComplete="current-password"

                    aria-invalid={Boolean(
                      passwordError
                    )}

                    aria-describedby={
                      passwordError
                        ? "login-password-error"
                        : undefined
                    }
                  />


                  {/* Show / Hide Password */}

                  <button
                    type="button"

                    className="input-wrap__toggle"

                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }

                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >

                    {showPassword ? (

                      <HiOutlineEyeOff
                        aria-hidden="true"
                      />

                    ) : (

                      <HiOutlineEye
                        aria-hidden="true"
                      />

                    )}

                  </button>

                </div>


                {passwordError && (

                  <p
                    className="field-error"
                    id="login-password-error"
                  >

                    {passwordError}

                  </p>

                )}

              </div>


              {/* ================= OPTIONS ================= */}

              <div className="form-row">

                <label className="checkbox-label">

                  <input
                    type="checkbox"

                    checked={rememberMe}

                    onChange={(e) =>
                      setRememberMe(
                        e.target.checked
                      )
                    }
                  />

                  <span>
                    Remember me
                  </span>

                </label>


                <Link
                  to="/forgot-password"
                  className="forgot-link"
                >
                  Forgot password?
                </Link>

              </div>


              {/* ================= LOGIN BUTTON ================= */}

              <button
                type="submit"
                className="btn-login"

                disabled={
                  isSubmitting ||
                  (
                    touched.email &&
                    touched.password &&
                    !isFormValid
                  )
                }
              >

                {isSubmitting ? (

                  <>
                    <span
                      className="btn-login__spinner"
                      aria-hidden="true"
                    />

                    Signing in...
                  </>

                ) : (

                  "Login"

                )}

              </button>

            </form>


            {/* =================================================
                SIGNUP
            ================================================== */}

            <p className="login-signup-note">

              Don&apos;t have an account?{" "}

              <Link
                to="/signup"
                state={location.state}
              >
                Create an account
              </Link>

            </p>


            {/* =================================================
                SECURITY NOTE
            ================================================== */}

            <p className="login-trust-note">

              <HiOutlineShieldCheck
                aria-hidden="true"
              />

              Your account information is handled
              securely.

            </p>

          </motion.div>

        </div>

      </div>

    </section>
  );
}