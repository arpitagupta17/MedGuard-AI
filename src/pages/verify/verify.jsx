import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./verify.css";

// ---------------------------------------------------------------------------
// ANALYSIS STAGES
// ---------------------------------------------------------------------------

const ANALYSIS_STAGES = [
  { key: "received", label: "Image received" },
  { key: "processing", label: "Processing image with OpenCV" },
  { key: "extracting", label: "Extracting medicine information with OCR" },
  { key: "batch", label: "Reading batch and medicine details" },
  { key: "ai", label: "Preparing verification information" },
  { key: "generating", label: "Generating result" },
];

// ---------------------------------------------------------------------------
// FILE SETTINGS
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_MB = 10;

// Reasons a user can give when reporting a medicine
const REPORT_CATEGORIES = [
  "Suspected counterfeit medicine",
  "Batch number mismatch",
  "Manufacturer mismatch",
  "Expired medicine",
  "Missing or incorrect packaging information",
  "Other concerns",
];

// Pick the most likely category from the verification result
function suggestCategory(result) {
  const checks = result.checks || {};
  if (checks.expiry_valid === false) return "Expired medicine";
  if (checks.batch_match === false) return "Batch number mismatch";
  if (checks.manufacturer_match === false) return "Manufacturer mismatch";
  if (result.riskLevel === "High") return "Suspected counterfeit medicine";
  return "Other concerns";
}

// Address of the FastAPI backend.
// To change it, set VITE_API_URL in a .env file in the project root.
const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

// The checks returned by the backend, in the order they are shown
const CHECK_ROWS = [
  { key: "medicine_found", label: "Medicine found in database", pass: "Found", fail: "Not found" },
  { key: "strength_match", label: "Strength", pass: "Matches", fail: "Does not match" },
  { key: "manufacturer_match", label: "Manufacturer", pass: "Matches", fail: "Does not match" },
  { key: "batch_match", label: "Batch number", pass: "Matches", fail: "Does not match" },
  { key: "mfg_date_match", label: "Manufacturing date", pass: "Matches", fail: "Differs" },
  { key: "expiry_match", label: "Expiry date", pass: "Matches", fail: "Differs" },
  { key: "expiry_valid", label: "Expiry status", pass: "Not expired", fail: "Expired" },
];

// Checks that use the barcode / QR code (shown only when a code was read)
const BARCODE_ROWS = [
  { key: "barcode_batch_match", label: "Batch: printed vs barcode", pass: "Matches", fail: "Differs" },
  { key: "barcode_expiry_match", label: "Expiry: printed vs barcode", pass: "Matches", fail: "Differs" },
  { key: "barcode_gtin_match", label: "Product code (GTIN)", pass: "Matches", fail: "Does not match" },
];

// Fields shown in the "could not be read" / "could not be verified" lists
const FIELD_LABELS = [
  { key: "medicineName", label: "Medicine name" },
  { key: "strength", label: "Strength" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "batchNumber", label: "Batch number" },
  { key: "manufacturingDate", label: "Manufacturing date" },
  { key: "expiryDate", label: "Expiry date" },
];

function isMissing(value) {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "Not detected"
  );
}

// The verdict shown to the user: one of four outcomes.
// Wording is careful on purpose: the system compares the printed text with
// reference records, so it never claims certainty and never calls a pack
// "counterfeit" because of a mismatch or an expiry date alone.
function getVerdict(result) {
  const checks = result.checks || {};

  // Fields that disagree with the database (expiry is handled separately)
  const mismatched = CHECK_ROWS.filter(
    (row) =>
      row.key !== "expiry_valid" &&
      row.key !== "medicine_found" &&
      checks[row.key] === false
  ).map((row) => row.label);

  BARCODE_ROWS.forEach((row) => {
    if (checks[row.key] === false) mismatched.push(row.label);
  });

  if (checks.medicine_found === false) {
    mismatched.unshift("Medicine not found in the database");
  }

  // Fields that could not be read from the photo
  const unread = FIELD_LABELS.filter((f) => isMissing(result[f.key])).map(
    (f) => f.label
  );

  // Fields that were read but could not be compared with the database
  const unverified = CHECK_ROWS.filter(
    (row) =>
      row.key !== "medicine_found" &&
      row.key !== "expiry_valid" &&
      (checks[row.key] === null || checks[row.key] === undefined)
  ).map((row) => row.label);

  const base = { mismatched, unread, unverified };

  // D. Expired
  if (checks.expiry_valid === false) {
    return {
      ...base,
      kind: "expired",
      tone: "high",
      title: "Expired Medicine",
      text: `This pack expired on ${result.expiryDate}. An expired medicine is not necessarily counterfeit.`,
      steps: [
        "Do not use this medicine.",
        "Ask a pharmacist how to dispose of it safely and about a replacement.",
        ...(mismatched.length > 0
          ? ["Some other details also differ from our records (see below). Mention this to the pharmacist."]
          : []),
      ],
    };
  }

  // C. Failed / mismatched
  if (mismatched.length > 0 || result.riskLevel === "High") {
    return {
      ...base,
      kind: "failed",
      tone: "high",
      title:
        result.riskLevel === "High"
          ? "Verification Failed: Further Verification Required"
          : "Suspicious Packaging: Further Verification Required",
      text:
        "Some details on this pack do not match our reference records. " +
        "This does not prove the medicine is counterfeit. It means it needs checking.",
      steps: [
        "Do not use this medicine until a pharmacist, the manufacturer or the authorities have confirmed it.",
        "Contact the manufacturer with the batch number printed on the pack.",
        "Ask the pharmacy where it came from, and keep the pack and the bill.",
        "Use Report Medicine below to record your concern in MedGuard.",
      ],
    };
  }

  // A. Verified match (a text match only, never proof)
  if (result.outcome === "Match" && result.riskLevel === "Low") {
    return {
      ...base,
      kind: "verified",
      tone: "low",
      title: "Medicine Details Matched",
      text:
        "The details read from this pack match our reference records and the medicine has not expired.",
      steps: [
        "This compares printed text only. It is not proof of authenticity and does not test the tablets.",
        "Keep the bill, and check the pack for damaged seals or printing errors.",
        "If anything about the pack or the medicine looks wrong, ask your pharmacist.",
      ],
    };
  }

  // A2. Product recognised in the catalogue, but there are no batch records
  if (result.outcome === "Partial") {
    return {
      ...base,
      kind: "product",
      tone: "medium",
      title: "Product Recognised: Batch Not Verified",
      text:
        "The name, strength and manufacturer match a known medicine. We have no batch records for it, so the batch and dates could not be checked against a record.",
      steps: [
        "This is not proof of authenticity. It only shows the printed details fit a known product.",
        "Buy from a licensed pharmacy, keep the bill, and check the pack for damaged seals or printing errors.",
        "To confirm the batch, contact the manufacturer with the batch number on the pack.",
      ],
    };
  }

  // B. Incomplete
  return {
    ...base,
    kind: "incomplete",
    tone: "medium",
    title: "Verification Incomplete",
    text:
      "We could not read or compare enough details to reach a result. This is not a sign that the medicine is unsafe.",
    steps: [
      "Retake a clear, well-lit photo of the side with the batch number and the manufacturing and expiry dates.",
      "Check the original packaging and the strip itself for the batch and expiry.",
      "The medicine may simply not be in our database yet. A pharmacist or the manufacturer can confirm it.",
    ],
  };
}

const RISK_ICONS = {
  low: "✓",
  medium: "!",
  high: "✕",
  unknown: "?",
};

const RISK_ICON_CLASSES = {
  low: "result__icon--authentic",
  medium: "result__icon--suspicious",
  high: "result__icon--high",
  unknown: "result__icon--unable",
};

const DEFAULT_NOTE =
  "These checks compare the text printed on the package with the MedGuard database. " +
  "A match is evidence, not proof that a medicine is genuine.";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// ---------------------------------------------------------------------------
// HELPER
// ---------------------------------------------------------------------------

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ---------------------------------------------------------------------------
// CONVERT THE BACKEND RESPONSE (POST /verify-ocr/) INTO THE UI FORMAT
// ---------------------------------------------------------------------------

function mapBackendResult(data) {
  const extracted = data.extracted || {};

  return {
    outcome: data.result || "Inconclusive",
    riskLevel: data.risk_level || null,
    riskPercent: data.risk_percent ?? null,
    riskReasons: data.risk_reasons || [],
    checks: data.checks || {},
    note: data.note || "",

    // The database record that matched (null when none matched)
    matched: data.matched_medicine || null,

    // The catalogue entry the pack was recognised as (null when none)
    catalogue: data.catalogue ? data.catalogue.entry : null,

    // What was read from a barcode / QR code (null when none was found)
    code: data.barcode || null,
    batchSource: extracted.batch_source || null,

    medicineName: extracted.medicine_name || "Not detected",
    strength: extracted.strength || "Not detected",
    manufacturer: extracted.manufacturer || "Not detected",
    batchNumber: extracted.batch_number || "Not detected",
    manufacturingDate: extracted.mfg_date || "Not detected",
    expiryDate: extracted.expiry_date || "Not detected",

    // null (not the text "Not detected") so that the
    // rupee sign is only added when a real value exists
    mrp: extracted.mrp ?? null,

    // Barcode reading is not built yet
    barcode: null,

    ocr: data.ocr || [],
  };
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------

export default function VerifyMedicine() {
  const navigate = useNavigate();

  // -------------------------------------------------------------------------
  // FLOW STATE
  // choose -> camera -> preview -> analyzing -> result
  // -------------------------------------------------------------------------

  const [stage, setStage] = useState("choose");

  // -------------------------------------------------------------------------
  // IMAGE STATE
  // -------------------------------------------------------------------------

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);

  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // -------------------------------------------------------------------------
  // CAMERA STATE
  // -------------------------------------------------------------------------

  const [cameraError, setCameraError] = useState("");
  const [isCameraReady, setIsCameraReady] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // -------------------------------------------------------------------------
  // ANALYSIS / RESULT STATE
  // -------------------------------------------------------------------------

  const [completedStages, setCompletedStages] = useState([]);
  const [result, setResult] = useState(null);

  // -------------------------------------------------------------------------
  // REPORT STATE
  // -------------------------------------------------------------------------

  const [reportOpen, setReportOpen] = useState(false);
  const [reportNotes, setReportNotes] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportDone, setReportDone] = useState(false);
  const [reportCategory, setReportCategory] = useState(REPORT_CATEGORIES[0]);
  const [reportRef, setReportRef] = useState("");

  // -------------------------------------------------------------------------
  // CLEANUP CAMERA WHEN COMPONENT UNMOUNTS
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // -------------------------------------------------------------------------
  // STOP CAMERA
  // -------------------------------------------------------------------------

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    setIsCameraReady(false);
  }

  // -------------------------------------------------------------------------
  // CAMERA FLOW
  // -------------------------------------------------------------------------

  async function openCamera() {
    setCameraError("");
    setUploadError("");

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        "Camera access isn't supported in this browser. Please upload an image instead."
      );

      return;
    }

    setStage("camera");

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
      }

      setIsCameraReady(true);
    } catch (err) {
      console.error("Camera error:", err);

      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setCameraError(
          "Camera access was denied. You can still upload an image from your device."
        );
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        setCameraError(
          "No camera was found on this device. Please upload an image instead."
        );
      } else {
        setCameraError(
          "Couldn't start the camera. Please upload an image instead."
        );
      }

      setStage("choose");
    }
  }

  // -------------------------------------------------------------------------
  // CLOSE CAMERA
  // -------------------------------------------------------------------------

  function closeCamera() {
    stopCamera();
    setStage("choose");
  }

  // -------------------------------------------------------------------------
  // CAPTURE PHOTO
  // -------------------------------------------------------------------------

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setCameraError("Unable to capture the image.");
      return;
    }

    ctx.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError(
            "Couldn't capture the photo. Please try again."
          );

          return;
        }

        const capturedFile = new File(
          [blob],
          `medicine-capture-${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        acceptImage(capturedFile, {
          width: canvas.width,
          height: canvas.height,
        });

        stopCamera();

        setStage("preview");
      },
      "image/jpeg",
      0.92
    );
  }

  // -------------------------------------------------------------------------
  // FILE VALIDATION
  // -------------------------------------------------------------------------

  function validateFile(file) {
    if (!file) {
      return "No file was selected.";
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return (
        "Unsupported file type. Please upload a JPG, PNG, or WEBP image."
      );
    }

    if (
      file.size >
      MAX_FILE_SIZE_MB * 1024 * 1024
    ) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    }

    return "";
  }

  // -------------------------------------------------------------------------
  // ACCEPT IMAGE
  // -------------------------------------------------------------------------

  function acceptImage(file, knownDimensions = null) {
    // Release previous object URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(file);

    const url = URL.createObjectURL(file);

    setPreviewUrl(url);

    setUploadError("");
    setCameraError("");
    setResult(null);
    setCompletedStages([]);

    if (knownDimensions) {
      setImageDimensions(knownDimensions);
    } else {
      const img = new Image();

      img.onload = () => {
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };

      img.src = url;
    }
  }

  // -------------------------------------------------------------------------
  // FILE SELECTED
  // -------------------------------------------------------------------------

  function handleFileSelected(file) {
    const error = validateFile(file);

    if (error) {
      setUploadError(error);
      return;
    }

    acceptImage(file);

    setStage("preview");
  }

  // -------------------------------------------------------------------------
  // INPUT CHANGE
  // -------------------------------------------------------------------------

  function handleInputChange(e) {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    handleFileSelected(file);
  }

  // -------------------------------------------------------------------------
  // DRAG AND DROP
  // -------------------------------------------------------------------------

  function handleDrop(e) {
    e.preventDefault();

    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    handleFileSelected(file);
  }

  function handleDragOver(e) {
    e.preventDefault();

    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();

    setIsDragging(false);
  }

  // -------------------------------------------------------------------------
  // BROWSE
  // -------------------------------------------------------------------------

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  // -------------------------------------------------------------------------
  // REMOVE IMAGE
  // -------------------------------------------------------------------------

  function handleRemoveImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);
    setUploadError("");
    setResult(null);
    setCompletedStages([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setStage("choose");
  }

  // -------------------------------------------------------------------------
  // CHANGE IMAGE
  // -------------------------------------------------------------------------

  function handleChangeImage() {
    handleBrowseClick();
  }

  // -------------------------------------------------------------------------
  // SEND THE USER TO LOGIN (no account, or the login has expired)
  // After logging in they come back to this page.
  // -------------------------------------------------------------------------

  function redirectToLogin() {
    stopCamera();

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/login", {
      replace: true,
      state: { from: "/verify" },
    });
  }

  // -------------------------------------------------------------------------
  // REAL BACKEND VERIFICATION
  // -------------------------------------------------------------------------

  async function handleVerification() {
    if (!imageFile || stage === "analyzing") {
      return;
    }

    // Verification needs an account
    if (!localStorage.getItem("access_token")) {
      redirectToLogin();
      return;
    }

    setStage("analyzing");
    setCompletedStages([]);
    setResult(null);
    setUploadError("");

    try {
      // ---------------------------------------------------------------
      // CREATE MULTIPART FORM DATA
      // ---------------------------------------------------------------

      const formData = new FormData();

      formData.append("file", imageFile);

      // ---------------------------------------------------------------
      // LOGIN TOKEN
      // Sent with the image so the backend can identify the user.
      // ---------------------------------------------------------------

      const token = localStorage.getItem("access_token");

      const headers = { Authorization: `Bearer ${token}` };

      // ---------------------------------------------------------------
      // SEND IMAGE TO FASTAPI
      // (do not set Content-Type: the browser adds it for FormData)
      // ---------------------------------------------------------------

      const response = await fetch(`${API_BASE}/verify-ocr/`, {
        method: "POST",
        headers,
        body: formData,
      });

      // ---------------------------------------------------------------
      // LOGIN EXPIRED OR INVALID: go to the login page
      // ---------------------------------------------------------------

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      // ---------------------------------------------------------------
      // READ RESPONSE
      // ---------------------------------------------------------------

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("The backend returned an invalid response.");
      }

      // ---------------------------------------------------------------
      // HANDLE BACKEND ERROR
      // ---------------------------------------------------------------

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Medicine verification failed."
        );
      }

      console.log("MedGuard backend response:", data);

      // ---------------------------------------------------------------
      // COMPLETE ANALYSIS STAGES AND SHOW RESULT
      // ---------------------------------------------------------------

      setCompletedStages(ANALYSIS_STAGES.map((s) => s.key));

      setResult(mapBackendResult(data));

      setStage("result");
    } catch (error) {
      console.error("Medicine verification error:", error);

      // A TypeError from fetch means the server could not be reached
      const message =
        error instanceof TypeError
          ? "Cannot reach the MedGuard server. Make sure the backend is running."
          : error.message ||
            "Something went wrong while processing the image.";

      setUploadError(message);

      setStage("preview");
    }
  }

  // -------------------------------------------------------------------------
  // VERIFY ANOTHER
  // -------------------------------------------------------------------------

  function handleVerifyAnother() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);

    setUploadError("");
    setCameraError("");

    setCompletedStages([]);
    setResult(null);

    stopCamera();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setStage("choose");
  }

  // -------------------------------------------------------------------------
  // REPORT MEDICINE
  // -------------------------------------------------------------------------

  function handleReportMedicine() {
    setReportCategory(result ? suggestCategory(result) : REPORT_CATEGORIES[0]);
    setReportRef("");
    setReportNotes("");
    setReportError("");
    setReportDone(false);
    setReportOpen(true);
  }

  function closeReport() {
    if (reportSending) {
      return;
    }

    setReportOpen(false);
  }

  async function submitReport(e) {
    e.preventDefault();

    if (reportSending || !result) {
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      redirectToLogin();
      return;
    }

    // The report text includes what MedGuard found, so a reviewer
    // can see it without opening the pack photo.
    const lines = [
      `Category: ${reportCategory}`,
      `Medicine: ${result.medicineName}`,
      `Strength: ${result.strength}`,
      `Manufacturer: ${result.manufacturer}`,
      `Batch number: ${result.batchNumber}`,
      `MedGuard result: ${result.outcome}` +
        (result.riskLevel
          ? ` (${result.riskLevel} risk, ${result.riskPercent}%)`
          : ""),
    ];

    if (result.riskReasons.length > 0) {
      lines.push(`Reasons: ${result.riskReasons.join("; ")}`);
    }

    if (reportNotes.trim()) {
      lines.push("", `User notes: ${reportNotes.trim()}`);
    }

    const formData = new FormData();

    formData.append("description", lines.join("\n"));

    if (imageFile) {
      formData.append("image", imageFile);
    }

    setReportSending(true);
    setReportError("");

    try {
      const response = await fetch(`${API_BASE}/reports/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      let data = {};

      try {
        data = await response.json();
      } catch {
        // keep the generic message below
      }

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Could not submit the report. Please try again."
        );
      }

      setReportRef(
        data.report_id ? `MG-R-${String(data.report_id).padStart(5, "0")}` : ""
      );
      setReportDone(true);
    } catch (error) {
      setReportError(
        error instanceof TypeError
          ? "Cannot reach the MedGuard server. Make sure the backend is running."
          : error.message || "Could not submit the report."
      );
    } finally {
      setReportSending(false);
    }
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <section
      className="verify-page"
      aria-labelledby="verify-heading"
    >
      <div className="verify-container">

        {/* ===============================================================
            HEADER
        =============================================================== */}

        <motion.header
          className="verify-header"
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.4,
          }}
        >
          <span className="verify-badge">
            AI-Powered Medicine Verification
          </span>

          <h1
            id="verify-heading"
            className="verify-title"
          >
            Verify Your Medicine
          </h1>

          <p className="verify-subtitle">
            Check your medicine&apos;s authenticity
            using AI-powered image analysis
            and verification.
          </p>

          <p className="verify-trust-note">
            Upload or capture a clear image of
            your medicine packaging.
          </p>
        </motion.header>

        {/* ===============================================================
            CHOOSE IMAGE
        =============================================================== */}

        {stage === "choose" && (
          <motion.div
            className="verify-card"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.35,
            }}
          >
            {(cameraError || uploadError) && (
              <p
                className="verify-error"
                role="alert"
              >
                {cameraError || uploadError}
              </p>
            )}

            <div className="choice-grid">

              {/* CAMERA */}

              <button
                type="button"
                className="choice-option"
                onClick={openCamera}
              >
                <span
                  className="choice-option__icon"
                  aria-hidden="true"
                >
                  📷
                </span>

                <span className="choice-option__label">
                  Use Camera
                </span>

                <span className="choice-option__hint">
                  Capture a live photo
                </span>
              </button>

              {/* UPLOAD */}

              <button
                type="button"
                className="choice-option"
                onClick={handleBrowseClick}
              >
                <span
                  className="choice-option__icon"
                  aria-hidden="true"
                >
                  📁
                </span>

                <span className="choice-option__label">
                  Upload Image
                </span>

                <span className="choice-option__hint">
                  Choose from your device
                </span>
              </button>

            </div>

            {/* DROPZONE */}

            <div
              className={`upload-dropzone ${
                isDragging
                  ? "upload-dropzone--dragging"
                  : ""
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              role="button"
              tabIndex={0}
              aria-label="Drag and drop a medicine image, or browse from your device"
              onClick={handleBrowseClick}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" ||
                  e.key === " "
                ) {
                  e.preventDefault();
                  handleBrowseClick();
                }
              }}
            >
              <p className="upload-dropzone__title">
                Drag &amp; drop your medicine image here
              </p>

              <p className="upload-dropzone__hint">
                or browse from your device
              </p>

              <p className="upload-dropzone__meta">
                Supported formats: JPG, PNG, WEBP
                &bull; Max {MAX_FILE_SIZE_MB} MB
              </p>
            </div>

            <label
              htmlFor="medicine-file-input"
              className="visually-hidden"
            >
              Upload medicine packaging image
            </label>

            <input
              ref={fileInputRef}
              id="medicine-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              className="visually-hidden"
            />
          </motion.div>
        )}

        {/* ===============================================================
            CAMERA
        =============================================================== */}

        {stage === "camera" && (
          <motion.div
            className="verify-card"
            initial={{
              opacity: 0,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <div className="camera-view">

              <div className="camera-view__frame-wrap">

                <video
                  ref={videoRef}
                  className="camera-view__video"
                  playsInline
                  muted
                  aria-label="Live camera preview"
                />

                <div
                  className="camera-view__guide"
                  aria-hidden="true"
                >
                  <span className="camera-view__guide-corner camera-view__guide-corner--tl" />
                  <span className="camera-view__guide-corner camera-view__guide-corner--tr" />
                  <span className="camera-view__guide-corner camera-view__guide-corner--bl" />
                  <span className="camera-view__guide-corner camera-view__guide-corner--br" />
                </div>

              </div>

              <p className="camera-view__instruction">
                Place the medicine package inside
                the frame and make sure the text
                is clearly visible.
              </p>

              {cameraError && (
                <p
                  className="verify-error"
                  role="alert"
                >
                  {cameraError}
                </p>
              )}

              <div className="camera-view__actions">

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={capturePhoto}
                  disabled={!isCameraReady}
                >
                  Capture Photo
                </button>

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={closeCamera}
                >
                  Close Camera
                </button>

              </div>
            </div>

            <canvas
              ref={canvasRef}
              className="visually-hidden"
              aria-hidden="true"
            />
          </motion.div>
        )}

        {/* ===============================================================
            PREVIEW
        =============================================================== */}

        {stage === "preview" &&
          imageFile && (
            <motion.div
              className="verify-card"
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.35,
              }}
            >
              <p className="preview-success">
                Photo ready &mdash; here&apos;s
                your preview
              </p>

              <div className="preview">

                <div className="preview__image-wrap">
                  <img
                    src={previewUrl}
                    alt="Selected medicine packaging"
                    className="preview__image"
                  />
                </div>

                <div className="preview__details">

                  <p
                    className="preview__filename"
                    title={imageFile.name}
                  >
                    {imageFile.name}
                  </p>

                  <p className="preview__meta">
                    {formatFileSize(
                      imageFile.size
                    )}

                    {imageDimensions
                      ? ` · ${imageDimensions.width}×${imageDimensions.height}px`
                      : ""}
                  </p>

                  <ul className="quality-checklist">

                    <li className="quality-checklist__item quality-checklist__item--pass">
                      <span aria-hidden="true">
                        ✓
                      </span>
                      Image selected
                    </li>

                    <li className="quality-checklist__item quality-checklist__item--pass">
                      <span aria-hidden="true">
                        ✓
                      </span>
                      Image format supported
                    </li>

                    <li className="quality-checklist__item quality-checklist__item--pass">
                      <span aria-hidden="true">
                        ✓
                      </span>
                      Image size valid
                    </li>

                  </ul>

                  <p className="quality-warning">
                    Tip: for best OCR results,
                    make sure the medicine name,
                    batch number, dates, and
                    packaging text are clearly
                    visible and in focus.
                  </p>

                  <div className="preview__actions">

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleChangeImage}
                    >
                      Change Image
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleRemoveImage}
                    >
                      Remove
                    </button>

                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleInputChange}
                    className="visually-hidden"
                    aria-hidden="true"
                    tabIndex={-1}
                  />

                  {uploadError && (
                    <p
                      className="verify-error"
                      role="alert"
                    >
                      {uploadError}
                    </p>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary verify-button"
                    onClick={handleVerification}
                    disabled={!imageFile}
                  >
                    Verify Medicine
                  </button>

                </div>
              </div>
            </motion.div>
          )}

        {/* ===============================================================
            ANALYZING
        =============================================================== */}

        {stage === "analyzing" && (
          <motion.div
            className="verify-card"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            <div
              className="analysis"
              role="status"
              aria-live="polite"
            >

              <div className="analysis__header">

                <span
                  className="analysis__spinner"
                  aria-hidden="true"
                />

                <p className="analysis__title">
                  Analyzing Medicine&hellip;
                </p>

              </div>

              <ul className="analysis__stages">

                {ANALYSIS_STAGES.map((s) => {

                  const done =
                    completedStages.includes(
                      s.key
                    );

                  return (
                    <li
                      key={s.key}
                      className={`analysis__stage ${
                        done
                          ? "analysis__stage--done"
                          : ""
                      }`}
                    >
                      <span
                        className="analysis__stage-icon"
                        aria-hidden="true"
                      >
                        {done ? "✓" : "○"}
                      </span>

                      {s.label}
                    </li>
                  );
                })}

              </ul>

              <p className="analysis__note">
                Your image is being processed
                by the MedGuard backend.
              </p>

            </div>
          </motion.div>
        )}

        {/* ===============================================================
            RESULT
        =============================================================== */}

        <AnimatePresence>

          {stage === "result" &&
            result && (
              <ResultInformation
                result={result}
                onVerifyAnother={
                  handleVerifyAnother
                }
                onReport={
                  handleReportMedicine
                }
              />
            )}

        </AnimatePresence>

      </div>

      {/* ===============================================================
          REPORT MEDICINE DIALOG
      =============================================================== */}

      {reportOpen && (
        <div
          className="report-modal__overlay"
          role="presentation"
          onClick={closeReport}
        >
          <div
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            onClick={(e) => e.stopPropagation()}
          >
            {reportDone ? (
              <>
                <h2 id="report-title" className="report-modal__title">
                  Report submitted
                </h2>

                <p className="report-modal__text">
                  Thank you for helping keep medicines safe. Your report is
                  saved in MedGuard with the status Pending.
                  {reportRef && (
                    <>
                      {" "}Your reference ID is <strong>{reportRef}</strong>.
                    </>
                  )}
                </p>

                <p className="report-modal__text">
                  It has not been sent to the manufacturer or to any
                  government authority. You can follow its status on the
                  Reports page.
                </p>

                <div className="report-modal__actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setReportOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={submitReport}>
                <h2 id="report-title" className="report-modal__title">
                  Report this medicine
                </h2>

                <p className="report-modal__text">
                  The medicine details MedGuard read
                  {imageFile ? " and your photo are" : " are"} included
                  automatically. Add anything else that looks wrong.
                </p>

                <label
                  htmlFor="report-category"
                  className="report-modal__label"
                >
                  Reason for reporting
                </label>

                <select
                  id="report-category"
                  className="report-modal__textarea"
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                >
                  {REPORT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <label
                  htmlFor="report-notes"
                  className="report-modal__label"
                >
                  Notes (optional)
                </label>

                <textarea
                  id="report-notes"
                  className="report-modal__textarea"
                  rows={4}
                  maxLength={1500}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Where did you buy it? What looks wrong with the pack?"
                />

                {reportError && (
                  <p className="verify-error" role="alert">
                    {reportError}
                  </p>
                )}

                <div className="report-modal__actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={closeReport}
                    disabled={reportSending}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={reportSending}
                  >
                    {reportSending ? "Sending..." : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ===========================================================================
// RESULT INFORMATION
// ===========================================================================

function ResultInformation({
  result,
  onVerifyAnother,
  onReport,
}) {
  // -------------------------------------------------------------------------
  // COUNT HOW MANY FIELDS WERE ACTUALLY READ FROM THE PACK
  // -------------------------------------------------------------------------

  const TOTAL_FIELDS = 7;

  const detectedCount = [
    result.medicineName,
    result.strength,
    result.manufacturer,
    result.batchNumber,
    result.manufacturingDate,
    result.expiryDate,
    result.mrp,
  ].filter(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== "" &&
      value !== "Not detected"
  ).length;

  const levelKey = result.riskLevel
    ? result.riskLevel.toLowerCase()
    : "unknown";

  const hasRisk =
    result.riskPercent !== null &&
    result.riskPercent !== undefined;

  const verdict = getVerdict(result);

  return (
    <motion.div
      className={`verify-card result result--risk-${verdict.tone}`}
      initial={{
        opacity: 0,
        y: 12,
        scale: 0.98,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        y: -8,
      }}
      transition={{
        duration: 0.4,
      }}
    >

      <div
        className={`result__icon ${RISK_ICON_CLASSES[verdict.tone]}`}
        aria-hidden="true"
      >
        {RISK_ICONS[verdict.tone]}
      </div>

      <h2 className="result__title">
        {verdict.title}
      </h2>

      <p className="result__verdict-text">
        {verdict.text}
      </p>

      {result.riskLevel && (
        <span className={`risk-badge risk-badge--${levelKey}`}>
          {result.riskLevel} Risk
        </span>
      )}

      {hasRisk && (
        <>
          <ConfidenceRing
            value={result.riskPercent}
            label="Risk score"
          />

          <p className="risk-caption">
            Risk score
          </p>
        </>
      )}

      {/* =============================================================
          WHY THIS SCORE
      ============================================================= */}

      {result.riskReasons.length > 0 && (
        <div
          className={`result__issues ${
            levelKey === "high" ? "result__issues--high" : ""
          }`}
        >
          <p className="result__issues-label">
            Why this score
          </p>

          <ul>
            {result.riskReasons.map((reason) => (
              <li key={reason}>&bull; {reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* =============================================================
          WHAT TO DO NEXT
      ============================================================= */}

      <div className={`next-steps next-steps--${verdict.tone}`}>
        <p className="next-steps__title">
          What to do next
        </p>

        <ul>
          {verdict.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      {/* =============================================================
          WHAT IS MISSING OR DIFFERENT
      ============================================================= */}

      {(verdict.mismatched.length > 0 ||
        verdict.unread.length > 0 ||
        verdict.unverified.length > 0) && (
        <div className="result__lists">
          {verdict.mismatched.length > 0 && (
            <div className="result__list result__list--fail">
              <p className="result__list-title">Does not match our records</p>
              <ul>
                {verdict.mismatched.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {verdict.unread.length > 0 && (
            <div className="result__list result__list--warn">
              <p className="result__list-title">Could not be read from the pack</p>
              <ul>
                {verdict.unread.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {verdict.unverified.length > 0 && (
            <div className="result__list result__list--warn">
              <p className="result__list-title">Could not be verified against the database</p>
              <ul>
                {verdict.unverified.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* =============================================================
          DATABASE CHECKS
      ============================================================= */}

      <ul className="verify-checks">

        {[
          ...CHECK_ROWS,
          ...BARCODE_ROWS.filter(
            (row) =>
              result.checks[row.key] !== null &&
              result.checks[row.key] !== undefined
          ),
        ].map((row) => {
          const value = result.checks[row.key];

          const state =
            value === true
              ? "pass"
              : value === false
              ? "fail"
              : "skip";

          const icon =
            state === "pass" ? "✓" : state === "fail" ? "✕" : "–";

          const text =
            state === "pass"
              ? row.pass
              : state === "fail"
              ? row.fail
              : "Not checked";

          return (
            <li
              key={row.key}
              className={`verify-checks__item verify-checks__item--${state}`}
            >
              <span
                className="verify-checks__icon"
                aria-hidden="true"
              >
                {icon}
              </span>

              {row.label}

              <span className="verify-checks__state">
                {text}
              </span>
            </li>
          );
        })}

      </ul>

      <p className="risk-fields">
        {detectedCount > 0
          ? `${detectedCount} of ${TOTAL_FIELDS} fields were read from the pack`
          : "No medicine fields could be read from the pack"}
      </p>

      <ComparisonTable result={result} />

      <ExtractedInfo
        result={result}
      />

      {/* =============================================================
          RAW OCR TEXT
      ============================================================= */}

      {result.ocr &&
        result.ocr.length > 0 && (
          <div className="extracted-info">

            <div className="extracted-info__header">

              <p className="extracted-info__title">
                OCR Detected Text
              </p>

              <span className="extracted-info__demo-tag">
                EasyOCR
              </span>

            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >

              {result.ocr.map(
                (item, index) => (
                  <div
                    key={`${item.text}-${index}`}
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "16px",
                      padding: "8px 0",
                      borderBottom:
                        "1px solid #e5e7eb",
                    }}
                  >

                    <span>
                      {item.text}
                    </span>

                    <span>
                      {typeof item.confidence ===
                      "number"
                        ? `${(
                            item.confidence *
                            100
                          ).toFixed(1)}%`
                        : "—"}
                    </span>

                  </div>
                )
              )}

            </div>
          </div>
        )}

      <p className="result__disclaimer">
        {result.note || DEFAULT_NOTE}
      </p>

      <div className="result__actions">

        <button
          type="button"
          className="btn btn-primary"
          onClick={onVerifyAnother}
        >
          Verify Another Medicine
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={onReport}
        >
          Report Medicine
        </button>

      </div>

    </motion.div>
  );
}

// ===========================================================================
// FIELD-BY-FIELD COMPARISON (read from the pack vs. the database record)
// ===========================================================================

function ComparisonTable({ result }) {
  const db = result.matched;
  const cat = result.catalogue;
  const checks = result.checks || {};

  const rows = [
    { label: "Medicine", read: result.medicineName, record: (db && db.medicine_name) || (cat && cat.name), check: checks.medicine_found },
    { label: "Strength", read: result.strength, record: cat && cat.composition, check: checks.strength_match },
    { label: "Manufacturer", read: result.manufacturer, record: (db && db.manufacturer) || (cat && cat.manufacturer), check: checks.manufacturer_match },
    { label: "Batch number", read: result.batchNumber, record: db && db.batch_number, check: checks.batch_match },
    { label: "Manufacturing date", read: result.manufacturingDate, record: db && db.mfg_date, check: checks.mfg_date_match },
    { label: "Expiry date", read: result.expiryDate, record: db && db.expiry_date, check: checks.expiry_match },
  ];

  const show = (v) =>
    isMissing(v)
      ? "Not available"
      : /^\d{4}-\d{2}-\d{2}/.test(String(v))
      ? String(v).slice(0, 7)
      : String(v);

  return (
    <div className="extracted-info">
      <div className="extracted-info__header">
        <p className="extracted-info__title">Read from pack vs. database</p>
      </div>

      <div className="compare-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Read from pack</th>
              <th>Database record</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const state =
                r.check === true ? "pass" : r.check === false ? "fail" : "skip";
              return (
                <tr key={r.label} className={`compare-row compare-row--${state}`}>
                  <td>{r.label}</td>
                  <td>{show(r.read)}</td>
                  <td>{show(r.record)}</td>
                  <td>
                    {state === "pass" ? "✓ Match" : state === "fail" ? "✕ Differs" : "– Not checked"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="compare-note">
        Batch and dates are shown from the database only when a batch record
        matched. Name, strength and manufacturer may come from the medicine
        catalogue, which has no batch records. Values from the pack are never
        replaced by database values.
      </p>
    </div>
  );
}

// ===========================================================================
// EXTRACTED MEDICINE INFORMATION
// ===========================================================================

function ExtractedInfo({ result }) {
  return (
    <div className="extracted-info">

      <div className="extracted-info__header">

        <p className="extracted-info__title">
          Extracted Medicine Information
        </p>

        <span className="extracted-info__demo-tag">
          OCR detected information
        </span>

      </div>

      <dl className="extracted-info__grid">

        <div className="extracted-info__row">
          <dt>Medicine Name</dt>
          <dd>
            {result.medicineName ||
              "Not detected"}
          </dd>
        </div>

        <div className="extracted-info__row">
          <dt>Strength</dt>
          <dd>
            {result.strength ||
              "Not detected"}
          </dd>
        </div>

        <div className="extracted-info__row">
          <dt>Manufacturer</dt>
          <dd>
            {isMissing(result.manufacturer)
              ? "Manufacturer could not be verified"
              : result.manufacturer}
            {!isMissing(result.manufacturer) &&
              result.checks.manufacturer_match !== true && (
                <span> (could not be verified)</span>
              )}
          </dd>
        </div>

        <div className="extracted-info__row">
          <dt>Batch Number</dt>
          <dd>
            {result.batchNumber ||
              "Not detected"}
          </dd>
        </div>

        <div className="extracted-info__row">
          <dt>Manufacturing Date</dt>
          <dd>
            {result.manufacturingDate ||
              "Not detected"}
          </dd>
        </div>

        <div className="extracted-info__row">
          <dt>Expiry Date</dt>
          <dd>
            {result.expiryDate ||
              "Not detected"}
          </dd>
        </div>

        <div className="extracted-info__row">
          <dt>MRP</dt>
          <dd>
            {result.mrp !== null &&
            result.mrp !== undefined &&
            result.mrp !== ""
              ? `₹${result.mrp}`
              : "Not detected"}
          </dd>
        </div>

        <div className="extracted-info__row">
          <dt>Barcode / QR</dt>
          <dd>
            {result.code
              ? [
                  result.code.format,
                  result.code.gtin && `GTIN ${result.code.gtin}`,
                  result.code.batch && `Batch ${result.code.batch}`,
                  result.code.expiry_iso && `Expiry ${result.code.expiry_iso}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "No barcode or QR code found in the photo"}
            {result.batchSource === "barcode" && (
              <span> (batch taken from the code, not the printed text)</span>
            )}
          </dd>
        </div>

      </dl>
    </div>
  );
}

// ===========================================================================
// CONFIDENCE RING
// ===========================================================================

function ConfidenceRing({ value, label = "Confidence score" }) {
  const safeValue = Math.max(
    0,
    Math.min(100, Number(value) || 0)
  );

  const radius = 42;

  const circumference =
    2 * Math.PI * radius;

  const offset =
    circumference -
    (safeValue / 100) *
      circumference;

  return (
    <div
      className="confidence-ring"
      role="img"
      aria-label={`${label} ${safeValue}%`}
    >

      <svg
        viewBox="0 0 100 100"
        className="confidence-ring__svg"
      >

        <circle
          className="confidence-ring__track"
          cx="50"
          cy="50"
          r={radius}
        />

        <circle
          className="confidence-ring__value"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={
            circumference
          }
          strokeDashoffset={
            offset
          }
        />

      </svg>

      <span className="confidence-ring__label">
        {Number.isInteger(safeValue) ? safeValue : safeValue.toFixed(1)}%
      </span>

    </div>
  );
}
