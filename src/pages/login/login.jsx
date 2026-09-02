import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// DEMO AUTHENTICATION ONLY.
// Replace this function with your real backend authentication later.
// ---------------------------------------------------------------------------
function demoAuthenticate(email, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email && password) {
        resolve({ email });
      } else {
        reject(
          new Error(
            "Unable to sign in. Please check your email and password."
          )
        );
      }
    }, 1200);
  });
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Email validation
  const emailError =
    touched.email && !email
      ? "Email is required."
      : touched.email && !EMAIL_PATTERN.test(email)
      ? "Please enter a valid email address."
      : "";

  // Password validation
  const passwordError =
    touched.password && !password
      ? "Password is required."
      : "";

  const isFormValid =
    email &&
    EMAIL_PATTERN.test(email) &&
    password;

  function handleBlur(field) {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  }

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
      // Demo authentication
      const user = await demoAuthenticate(
        email,
        password
      );

      // Save logged-in user
      // DEMO ONLY - replace with real authentication later
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: "User",
          email: user.email,
          isLoggedIn: true,
        })
      );

      // Go to Dashboard after successful login
      navigate("/dashboard");
    } catch (err) {
      setFormError(
        err.message ||
          "Unable to sign in. Please check your email and password."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-page">
      <div className="login-layout">

        {/* ================= BRANDING SIDE ================= */}

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

        {/* ================= LOGIN FORM ================= */}

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

                  Remember me

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

            {/* ================= SIGNUP ================= */}

            <p className="login-signup-note">
              Don&apos;t have an account?{" "}
              <Link to="/signup">
                Create an account
              </Link>
            </p>

            {/* ================= SECURITY NOTE ================= */}

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