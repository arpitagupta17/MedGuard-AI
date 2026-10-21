import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
import { markSession } from "../../utils/session";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// REAL BACKEND AUTHENTICATION
// ---------------------------------------------------------------------------

async function authenticate(email, password) {
  const response = await fetch(
    `${API_BASE}/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        email: email.trim(),
        password: password,
      }),
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server returned an invalid response."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to sign in. Please check your email and password."
    );
  }

  return data;
}

// ---------------------------------------------------------------------------
// LOGIN COMPONENT
// ---------------------------------------------------------------------------

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // -------------------------------------------------------------------------
  // EMAIL VALIDATION
  // -------------------------------------------------------------------------

  const emailError =
    touched.email && !email
      ? "Email is required."
      : touched.email &&
        !EMAIL_PATTERN.test(email)
      ? "Please enter a valid email address."
      : "";

  // -------------------------------------------------------------------------
  // PASSWORD VALIDATION
  // -------------------------------------------------------------------------

  const passwordError =
    touched.password && !password
      ? "Password is required."
      : "";

  // -------------------------------------------------------------------------
  // FORM VALIDATION
  // -------------------------------------------------------------------------

  const isFormValid =
    email &&
    EMAIL_PATTERN.test(email) &&
    password;

  // -------------------------------------------------------------------------
  // BLUR
  // -------------------------------------------------------------------------

  function handleBlur(field) {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  }

  // -------------------------------------------------------------------------
  // LOGIN
  // -------------------------------------------------------------------------

  async function handleSubmit(e) {
    e.preventDefault();

    // Show validation errors
    setTouched({
      email: true,
      password: true,
    });

    setFormError("");

    // Stop if form is invalid
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
      // ---------------------------------------------------------------------
      // CALL FASTAPI LOGIN
      // ---------------------------------------------------------------------

      const data = await authenticate(
        email,
        password
      );

      // ---------------------------------------------------------------------
      // SAVE JWT TOKEN
      // ---------------------------------------------------------------------

      localStorage.setItem(
        "access_token",
        data.access_token
      );

      // ---------------------------------------------------------------------
      // SAVE USER INFORMATION
      // ---------------------------------------------------------------------

      const loggedInUser = {
        user_id: data.user_id,
        name: data.name,
        email: data.email,
        isLoggedIn: true,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(loggedInUser)
      );

      // ---------------------------------------------------------------------
      // SAVE REMEMBER ME PREFERENCE
      // ---------------------------------------------------------------------

      localStorage.setItem(
        "rememberMe",
        rememberMe ? "true" : "false"
      );

      // Session marker: lets "Remember me" off log the user out when the
      // browser is closed (see utils/session.js)
      markSession();

      // ---------------------------------------------------------------------
      // GO TO DASHBOARD
      // ---------------------------------------------------------------------

      // Go back to the page the user wanted (e.g. Verify), else dashboard
      navigate(location.state?.from || "/dashboard", { replace: true });

    } catch (err) {
      console.error("Login error:", err);

      setFormError(
        err.message ||
          "Unable to sign in. Please check your email and password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // UI
  // -------------------------------------------------------------------------

  return (
    <section className="login-page">

      <div className="login-layout">

        {/* ===============================================================
            BRANDING SIDE
        =============================================================== */}

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


        {/* ===============================================================
            LOGIN FORM
        =============================================================== */}

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

            {/* Header */}

            <h2 className="login-card__title">
              Welcome Back
            </h2>

            <p className="login-card__subtitle">
              Sign in to continue to MedGuard AI.
            </p>


            {/* Error Message */}

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


            {/* Form */}

            <form
              onSubmit={handleSubmit}
              noValidate
            >

              {/* =====================================================
                  EMAIL
              ===================================================== */}

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

                    onChange={(e) =>
                      setEmail(e.target.value)
                    }

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


              {/* =====================================================
                  PASSWORD
              ===================================================== */}

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

                    onChange={(e) =>
                      setPassword(e.target.value)
                    }

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


              {/* =====================================================
                  OPTIONS
              ===================================================== */}

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

                  Remember me

                </label>


                <Link
                  to="/forgot-password"
                  className="forgot-link"
                >
                  Forgot password?
                </Link>

              </div>


              {/* =====================================================
                  LOGIN BUTTON
              ===================================================== */}

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


            {/* =====================================================
                SIGNUP
            ===================================================== */}

            <p className="login-signup-note">

              Don&apos;t have an account?{" "}

              <Link to="/signup" state={location.state}>
                Create an account
              </Link>

            </p>


            {/* =====================================================
                SECURITY NOTE
            ===================================================== */}

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