import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlineShieldCheck,
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
} from "react-icons/hi";

import logo from "../../assets/logo.png";
import "./signup.css";

import { registerDemoAccount } from "../../utils/auth";

/* =========================================================
   VALIDATION CONSTANTS
========================================================= */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_NAME_LENGTH = 2;

/* =========================================================
   PASSWORD STRENGTH
========================================================= */

function getPasswordStrength(password) {
  if (!password) {
    return {
      label: "",
      score: 0,
    };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return {
      label: "Weak",
      score: 1,
    };
  }

  if (score <= 4) {
    return {
      label: "Medium",
      score: 2,
    };
  }

  return {
    label: "Strong",
    score: 3,
  };
}

/* =========================================================
   PASSWORD REQUIREMENTS
========================================================= */

function meetsPasswordRequirements(password) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

/* =========================================================
   DEMO SIGNUP
   Replace with FastAPI later
========================================================= */

async function createAccount(name, email, password) {
  await new Promise((resolve) => setTimeout(resolve, 700));

  return registerDemoAccount({
    name,
    email,
    password,
  });
}

/* =========================================================
   SIGNUP COMPONENT
========================================================= */

export default function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();

  /*
    If the user came to Signup by clicking
    "Verify Medicine", location.state will contain:

    {
      from: "/verify"
    }

    Otherwise, from will be undefined.
  */
  const from = location.state?.from;

  /* -------------------------------------------------------
     Form values
  ------------------------------------------------------- */

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* -------------------------------------------------------
     Password visibility
  ------------------------------------------------------- */

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  /* -------------------------------------------------------
     Terms
  ------------------------------------------------------- */

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  /* -------------------------------------------------------
     Validation
  ------------------------------------------------------- */

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  /* -------------------------------------------------------
     UI state
  ------------------------------------------------------- */

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formError, setFormError] = useState("");

  const [isSuccess, setIsSuccess] = useState(false);

  /* -------------------------------------------------------
     Password strength
  ------------------------------------------------------- */

  const strength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  /* =======================================================
     VALIDATION
  ======================================================= */

  const nameError =
    touched.name && !name.trim()
      ? "Please enter your name."
      : touched.name &&
        name.trim().length < MIN_NAME_LENGTH
      ? "Please enter your full name."
      : "";

  const emailError =
    touched.email && !email
      ? "Email is required."
      : touched.email && !EMAIL_PATTERN.test(email)
      ? "Please enter a valid email address."
      : "";

  const passwordError =
    touched.password && !password
      ? "Password is required."
      : touched.password &&
        !meetsPasswordRequirements(password)
      ? "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number."
      : "";

  const confirmPasswordError =
    touched.confirmPassword && !confirmPassword
      ? "Please confirm your password."
      : touched.confirmPassword &&
        confirmPassword !== password
      ? "Passwords do not match."
      : "";

  const isFormValid =
    name.trim().length >= MIN_NAME_LENGTH &&
    EMAIL_PATTERN.test(email) &&
    meetsPasswordRequirements(password) &&
    confirmPassword === password &&
    agreedToTerms;

  /* =======================================================
     BLUR
  ======================================================= */

  function handleBlur(field) {
    setTouched((previous) => ({
      ...previous,
      [field]: true,
    }));
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function handleSubmit(e) {
    e.preventDefault();

    /* Show all validation errors */

    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    setFormError("");

    /* Stop if invalid */

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      /* ---------------------------------------------------
         Create account
      --------------------------------------------------- */

      const user = await createAccount(
        name.trim(),
        email.trim(),
        password
      );

      /* ---------------------------------------------------
         SAVE LOGGED-IN USER
      --------------------------------------------------- */

      localStorage.setItem(
        "user",
        JSON.stringify({
          name: user.name,
          email: user.email,
          isLoggedIn: true,
        })
      );

      /* ---------------------------------------------------
         IMPORTANT:
         Tell Navbar authentication has changed.
      --------------------------------------------------- */

      window.dispatchEvent(new Event("authChanged"));

      /* ---------------------------------------------------
         Show success message
      --------------------------------------------------- */

      setIsSuccess(true);

      /* ---------------------------------------------------
         IMPORTANT REDIRECT LOGIC

         If Signup was opened because the user wanted
         to verify a medicine:

             Signup -> Verify

         Otherwise:

             Signup -> Dashboard
      --------------------------------------------------- */

      setTimeout(() => {
        if (from === "/verify") {
          navigate("/verify", {
            replace: true,
          });
        } else {
          navigate("/dashboard", {
            replace: true,
          });
        }
      }, 700);
    } catch (err) {
      setFormError(
        err.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="signup-page">
      <div className="signup-layout">

        {/* =================================================
            BRANDING SIDE
        ================================================== */}

        <motion.aside
          className="signup-branding"
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
            className="signup-branding__pattern"
            aria-hidden="true"
          />

          <div className="signup-branding__content">

            {/* Logo */}

            <Link
              to="/"
              className="signup-branding__logo"
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

            <h1 className="signup-branding__headline">
              Verify Medicines.
              <br />
              Protect Lives.
            </h1>

            {/* Description */}

            <p className="signup-branding__text">
              Join MedGuard AI and make medicine
              verification faster, smarter, and more
              accessible.
            </p>

            {/* Trust points */}

            <ul className="signup-branding__trust-list">
              <li>✓ AI-Powered Verification</li>
              <li>✓ Secure User Experience</li>
              <li>✓ Easy Medicine Verification</li>
            </ul>
          </div>
        </motion.aside>

        {/* =================================================
            SIGNUP FORM
        ================================================== */}

        <div className="signup-form-side">

          {/* Back to Home */}

          <Link
            to="/"
            className="signup-back-link"
          >
            <HiOutlineArrowLeft
              aria-hidden="true"
            />

            Back to Home
          </Link>

          <motion.div
            className="signup-card"
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
            <AnimatePresence mode="wait">

              {/* =================================================
                  SUCCESS
              ================================================== */}

              {isSuccess ? (
                <motion.div
                  key="success"
                  className="signup-success"
                  initial={{
                    opacity: 0,
                    scale: 0.97,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.3,
                  }}
                >
                  <HiOutlineCheckCircle
                    className="signup-success__icon"
                    aria-hidden="true"
                  />

                  <h2 className="signup-success__title">
                    Account created successfully!
                  </h2>

                  <p className="signup-success__text">
                    {from === "/verify"
                      ? "Taking you to medicine verification..."
                      : "Taking you to your dashboard..."}
                  </p>
                </motion.div>
              ) : (

                /* =================================================
                   FORM
                ================================================== */

                <motion.div
                  key="form"
                  initial={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                >
                  <h2 className="signup-card__title">
                    Create Your Account
                  </h2>

                  <p className="signup-card__subtitle">
                    Join MedGuard AI to start verifying
                    medicines.
                  </p>

                  {/* =================================================
                     ERROR
                  ================================================== */}

                  <AnimatePresence>
                    {formError && (
                      <motion.p
                        className="signup-error"
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

                  <form
                    onSubmit={handleSubmit}
                    noValidate
                  >

                    {/* =================================================
                        FULL NAME
                    ================================================== */}

                    <div className="form-field">
                      <label htmlFor="signup-name">
                        Full Name
                      </label>

                      <div
                        className={`input-wrap ${
                          nameError
                            ? "input-wrap--error"
                            : ""
                        }`}
                      >
                        <HiOutlineUser
                          className="input-wrap__icon"
                          aria-hidden="true"
                        />

                        <input
                          id="signup-name"
                          type="text"
                          value={name}
                          onChange={(e) =>
                            setName(e.target.value)
                          }
                          onBlur={() =>
                            handleBlur("name")
                          }
                          placeholder="Enter your full name"
                          autoComplete="name"
                          aria-invalid={Boolean(
                            nameError
                          )}
                        />
                      </div>

                      {nameError && (
                        <p className="field-error">
                          {nameError}
                        </p>
                      )}
                    </div>

                    {/* =================================================
                        EMAIL
                    ================================================== */}

                    <div className="form-field">
                      <label htmlFor="signup-email">
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
                          id="signup-email"
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
                        />
                      </div>

                      {emailError && (
                        <p className="field-error">
                          {emailError}
                        </p>
                      )}
                    </div>

                    {/* =================================================
                        PASSWORD
                    ================================================== */}

                    <div className="form-field">
                      <label htmlFor="signup-password">
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
                          id="signup-password"
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
                          placeholder="Create a password"
                          autoComplete="new-password"
                          aria-invalid={Boolean(
                            passwordError
                          )}
                        />

                        <button
                          type="button"
                          className="input-wrap__toggle"
                          onClick={() =>
                            setShowPassword(
                              (v) => !v
                            )
                          }
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showPassword ? (
                            <HiOutlineEyeOff />
                          ) : (
                            <HiOutlineEye />
                          )}
                        </button>
                      </div>

                      {/* Password Strength */}

                      {password && (
                        <div className="password-strength">
                          <div className="password-strength__bar">
                            <span
                              className={`password-strength__fill password-strength__fill--${strength.score}`}
                            />
                          </div>

                          <span
                            className={`password-strength__label password-strength__label--${strength.score}`}
                          >
                            {strength.label}
                          </span>
                        </div>
                      )}

                      <p className="password-hint">
                        Use 8+ characters with an uppercase
                        letter, a lowercase letter, and a number.
                      </p>

                      {passwordError && (
                        <p className="field-error">
                          {passwordError}
                        </p>
                      )}
                    </div>

                    {/* =================================================
                        CONFIRM PASSWORD
                    ================================================== */}

                    <div className="form-field">
                      <label htmlFor="signup-confirm-password">
                        Confirm Password
                      </label>

                      <div
                        className={`input-wrap ${
                          confirmPasswordError
                            ? "input-wrap--error"
                            : ""
                        }`}
                      >
                        <HiOutlineLockClosed
                          className="input-wrap__icon"
                          aria-hidden="true"
                        />

                        <input
                          id="signup-confirm-password"
                          type={
                            showConfirmPassword
                              ? "text"
                              : "password"
                          }
                          value={confirmPassword}
                          onChange={(e) =>
                            setConfirmPassword(
                              e.target.value
                            )
                          }
                          onBlur={() =>
                            handleBlur(
                              "confirmPassword"
                            )
                          }
                          placeholder="Confirm your password"
                          autoComplete="new-password"
                          aria-invalid={Boolean(
                            confirmPasswordError
                          )}
                        />

                        <button
                          type="button"
                          className="input-wrap__toggle"
                          onClick={() =>
                            setShowConfirmPassword(
                              (v) => !v
                            )
                          }
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showConfirmPassword ? (
                            <HiOutlineEyeOff />
                          ) : (
                            <HiOutlineEye />
                          )}
                        </button>
                      </div>

                      {confirmPasswordError && (
                        <p className="field-error">
                          {confirmPasswordError}
                        </p>
                      )}
                    </div>

                    {/* =================================================
                        TERMS
                    ================================================== */}

                    <label className="terms-label">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) =>
                          setAgreedToTerms(
                            e.target.checked
                          )
                        }
                      />

                      <span>
                        I agree to the{" "}
                        <Link to="/terms">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link to="/privacy">
                          Privacy Policy
                        </Link>
                        .
                      </span>
                    </label>

                    {/* =================================================
                        CREATE ACCOUNT
                    ================================================== */}

                    <button
                      type="submit"
                      className="btn-signup"
                      disabled={
                        !isFormValid ||
                        isSubmitting
                      }
                    >
                      {isSubmitting ? (
                        <>
                          <span
                            className="btn-signup__spinner"
                            aria-hidden="true"
                          />

                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </button>
                  </form>

                  {/* Login */}

                  <p className="signup-login-note">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      state={location.state}
                    >
                      Login
                    </Link>
                  </p>

                  {/* Security */}

                  <p className="signup-trust-note">
                    <HiOutlineShieldCheck
                      aria-hidden="true"
                    />

                    Your account information is handled
                    securely.
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}