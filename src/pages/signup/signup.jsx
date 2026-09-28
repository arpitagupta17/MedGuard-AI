import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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


/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_NAME_LENGTH = 2;


/* -------------------------------------------------------------------------- */
/* Password strength                                                          */
/* -------------------------------------------------------------------------- */

function getPasswordStrength(password) {

  if (!password) {
    return {
      label: "",
      score: 0,
    };
  }

  let score = 0;

  if (password.length >= 8) {
    score += 1;
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }


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


/* -------------------------------------------------------------------------- */
/* Password validation                                                        */
/* -------------------------------------------------------------------------- */

function meetsPasswordRequirements(password) {

  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}


/* -------------------------------------------------------------------------- */
/* Signup Component                                                            */
/* -------------------------------------------------------------------------- */

export default function SignUp() {

  const navigate = useNavigate();


  /* ------------------------------------------------------------------------ */
  /* Form state                                                               */
  /* ------------------------------------------------------------------------ */

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");


  /* ------------------------------------------------------------------------ */
  /* UI state                                                                 */
  /* ------------------------------------------------------------------------ */

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [agreedToTerms, setAgreedToTerms] =
    useState(false);


  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });


  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [formError, setFormError] =
    useState("");

  const [isSuccess, setIsSuccess] =
    useState(false);


  /* ------------------------------------------------------------------------ */
  /* Password strength                                                        */
  /* ------------------------------------------------------------------------ */

  const strength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );


  /* ------------------------------------------------------------------------ */
  /* Validation errors                                                        */
  /* ------------------------------------------------------------------------ */

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
      : touched.email &&
        !EMAIL_PATTERN.test(email)
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


  /* ------------------------------------------------------------------------ */
  /* Overall form validation                                                  */
  /* ------------------------------------------------------------------------ */

  const isFormValid =
    name.trim().length >= MIN_NAME_LENGTH &&
    EMAIL_PATTERN.test(email) &&
    meetsPasswordRequirements(password) &&
    confirmPassword === password &&
    agreedToTerms;


  /* ------------------------------------------------------------------------ */
  /* Handle field blur                                                        */
  /* ------------------------------------------------------------------------ */

  function handleBlur(field) {

    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

  }


  /* ------------------------------------------------------------------------ */
  /* Handle signup                                                            */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(e) {

    e.preventDefault();


    /* ---------------------------------------------------------------------- */
    /* Mark all fields as touched                                             */
    /* ---------------------------------------------------------------------- */

    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });


    setFormError("");


    /* ---------------------------------------------------------------------- */
    /* Stop if form is invalid                                                */
    /* ---------------------------------------------------------------------- */

    if (!isFormValid || isSubmitting) {
      return;
    }


    setIsSubmitting(true);


    try {

      /* -------------------------------------------------------------------- */
      /* Send signup request to FastAPI                                       */
      /* -------------------------------------------------------------------- */

      const response = await fetch(
        "/auth/signup",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: password,
          }),
        }
      );


      /* -------------------------------------------------------------------- */
      /* Convert response to JSON                                             */
      /* -------------------------------------------------------------------- */

      const data = await response.json();


      /* -------------------------------------------------------------------- */
      /* Handle backend error                                                  */
      /* -------------------------------------------------------------------- */

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Unable to create your account."
        );

      }


      /* -------------------------------------------------------------------- */
      /* Save JWT access token                                                 */
      /* -------------------------------------------------------------------- */

      localStorage.setItem(
        "access_token",
        data.access_token
      );


      /* -------------------------------------------------------------------- */
      /* Save token type                                                      */
      /* -------------------------------------------------------------------- */

      localStorage.setItem(
        "token_type",
        data.token_type || "bearer"
      );


      /* -------------------------------------------------------------------- */
      /* Save user information                                                */
      /*                                                                        */
      /* IMPORTANT:                                                           */
      /* Password is NOT stored in localStorage.                              */
      /* -------------------------------------------------------------------- */

      localStorage.setItem(
        "user",
        JSON.stringify({
          user_id: data.user_id,
          name: data.name,
          email: data.email,
          isLoggedIn: true,
        })
      );


      /* -------------------------------------------------------------------- */
      /* Show success screen                                                  */
      /* -------------------------------------------------------------------- */

      setIsSuccess(true);


      /* -------------------------------------------------------------------- */
      /* Redirect directly to dashboard                                       */
      /* -------------------------------------------------------------------- */

      setTimeout(() => {

        navigate("/dashboard");

      }, 700);


    } catch (err) {

      /* -------------------------------------------------------------------- */
      /* Display signup error                                                 */
      /* -------------------------------------------------------------------- */

      setFormError(
        err.message ||
        "Unable to create your account. Please try again."
      );


    } finally {

      setIsSubmitting(false);

    }

  }


  /* ------------------------------------------------------------------------ */
  /* UI                                                                       */
  /* ------------------------------------------------------------------------ */

  return (

    <section className="signup-page">

      <div className="signup-layout">


        {/* ================================================================== */}
        {/* Branding side                                                       */}
        {/* ================================================================== */}

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


            <h1 className="signup-branding__headline">

              Verify Medicines.

              <br />

              Protect Lives.

            </h1>


            <p className="signup-branding__text">

              Join MedGuard AI and make medicine
              verification faster, smarter, and
              more accessible.

            </p>


            <ul className="signup-branding__trust-list">

              <li>
                ✓ AI-Powered Verification
              </li>

              <li>
                ✓ Secure User Experience
              </li>

              <li>
                ✓ Easy Medicine Verification
              </li>

            </ul>

          </div>

        </motion.aside>


        {/* ================================================================== */}
        {/* Signup form side                                                    */}
        {/* ================================================================== */}

        <div className="signup-form-side">


          {/* Back to home */}

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


              {isSuccess ? (

                /* ========================================================== */
                /* Success screen                                              */
                /* ========================================================== */

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

                    Taking you to your dashboard&hellip;

                  </p>

                </motion.div>


              ) : (

                /* ========================================================== */
                /* Signup form                                                 */
                /* ========================================================== */

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


                  {/* ====================================================== */}
                  {/* Backend error                                            */}
                  {/* ====================================================== */}

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


                    {/* ==================================================== */}
                    {/* Full Name                                              */}
                    {/* ==================================================== */}

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
                            setName(
                              e.target.value
                            )
                          }

                          onBlur={() =>
                            handleBlur("name")
                          }

                          placeholder="Enter your full name"
                          autoComplete="name"

                          aria-invalid={
                            Boolean(nameError)
                          }

                          aria-describedby={
                            nameError
                              ? "signup-name-error"
                              : undefined
                          }
                        />

                      </div>


                      {nameError && (

                        <p
                          className="field-error"
                          id="signup-name-error"
                        >

                          {nameError}

                        </p>

                      )}

                    </div>


                    {/* ==================================================== */}
                    {/* Email                                                   */}
                    {/* ==================================================== */}

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
                            setEmail(
                              e.target.value
                            )
                          }

                          onBlur={() =>
                            handleBlur("email")
                          }

                          placeholder="Enter your email"
                          autoComplete="email"

                          aria-invalid={
                            Boolean(emailError)
                          }

                          aria-describedby={
                            emailError
                              ? "signup-email-error"
                              : undefined
                          }
                        />

                      </div>


                      {emailError && (

                        <p
                          className="field-error"
                          id="signup-email-error"
                        >

                          {emailError}

                        </p>

                      )}

                    </div>


                    {/* ==================================================== */}
                    {/* Password                                                */}
                    {/* ==================================================== */}

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
                            setPassword(
                              e.target.value
                            )
                          }

                          onBlur={() =>
                            handleBlur("password")
                          }

                          placeholder="Create a password"

                          autoComplete="new-password"

                          aria-invalid={
                            Boolean(passwordError)
                          }

                          aria-describedby="signup-password-strength signup-password-error"
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


                      {password && (

                        <div
                          className="password-strength"
                          id="signup-password-strength"
                        >

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

                        <p
                          className="field-error"
                          id="signup-password-error"
                        >

                          {passwordError}

                        </p>

                      )}

                    </div>


                    {/* ==================================================== */}
                    {/* Confirm Password                                       */}
                    {/* ==================================================== */}

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

                          aria-invalid={
                            Boolean(
                              confirmPasswordError
                            )
                          }

                          aria-describedby={
                            confirmPasswordError
                              ? "signup-confirm-password-error"
                              : undefined
                          }
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


                      {confirmPasswordError && (

                        <p
                          className="field-error"
                          id="signup-confirm-password-error"
                        >

                          {confirmPasswordError}

                        </p>

                      )}

                    </div>


                    {/* ==================================================== */}
                    {/* Terms                                                   */}
                    {/* ==================================================== */}

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
                        </Link>

                        {" "}and{" "}

                        <Link to="/privacy">
                          Privacy Policy
                        </Link>

                        .

                      </span>

                    </label>


                    {/* ==================================================== */}
                    {/* Submit button                                           */}
                    {/* ==================================================== */}

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


                  {/* ==================================================== */}
                  {/* Login link                                              */}
                  {/* ==================================================== */}

                  <p className="signup-login-note">

                    Already have an account?{" "}

                    <Link to="/login">
                      Login
                    </Link>

                  </p>


                  {/* ==================================================== */}
                  {/* Security note                                           */}
                  {/* ==================================================== */}

                  <p className="signup-trust-note">

                    <HiOutlineShieldCheck
                      aria-hidden="true"
                    />

                    Your account information is handled securely.

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