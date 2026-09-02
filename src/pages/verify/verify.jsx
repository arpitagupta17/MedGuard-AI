import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./verify.css";

// ---------------------------------------------------------------------------
// MOCK VERIFICATION — placeholder only, not a real AI/backend call.
// Replace the body of `handleVerification` with a real request, e.g.:
//
//   const formData = new FormData();
//   formData.append("image", imageFile);
//   const res = await fetch("/verify", { method: "POST", body: formData });
//   const data = await res.json();
//
// The backend is expected to eventually return:
//   { status, confidence, medicineName, manufacturer, batchNumber,
//     manufacturingDate, expiryDate, barcode, issues }
// ---------------------------------------------------------------------------

const ANALYSIS_STAGES = [
  { key: "received", label: "Image received" },
  { key: "processing", label: "Processing image" },
  { key: "extracting", label: "Extracting medicine information" },
  { key: "batch", label: "Checking manufacturer and batch details" },
  { key: "ai", label: "AI authenticity analysis" },
  { key: "generating", label: "Generating verification result" },
];

const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function mockVerificationCall() {
  // Simulated network/AI latency + a simulated response.
  // This is placeholder data for UI development only — swap this whole
  // function out for the real `/verify` endpoint described above.
  return new Promise((resolve) => {
    setTimeout(() => {
      const roll = Math.random();

      if (roll > 0.62) {
        resolve({
          status: "authentic",
          confidence: 98.4,
          medicineName: "Paracetamol 500 mg",
          manufacturer: "Example Pharmaceuticals",
          batchNumber: "ABC12345",
          manufacturingDate: "06/2026",
          expiryDate: "05/2028",
          barcode: "8901234567890",
          issues: [],
        });
      } else if (roll > 0.28) {
        resolve({
          status: "suspicious",
          confidence: 46.7,
          medicineName: "Paracetamol 500 mg",
          manufacturer: "Example Pharmaceuticals",
          batchNumber: "ABC12345",
          manufacturingDate: "06/2026",
          expiryDate: "05/2028",
          barcode: "8901234567890",
          issues: [
            "Batch number could not be verified",
            "Packaging information mismatch",
            "Manufacturer information inconsistent",
          ],
        });
      } else {
        resolve({
          status: "unable",
          confidence: null,
          issues: [],
        });
      }
    }, 3200);
  });
}

export default function VerifyMedicine() {
  // ---- Flow state ----------------------------------------------------
  // "choose" -> "camera" -> "preview" -> "analyzing" -> "result"
  const [stage, setStage] = useState("choose");

  // ---- Image state -----------------------------------------------------
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // ---- Camera state -----------------------------------------------------
  const [cameraError, setCameraError] = useState("");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // ---- Analysis / result state ----
  const [completedStages, setCompletedStages] = useState([]);
  const [result, setResult] = useState(null);

  // Always stop the camera when the component unmounts, no matter what
  // stage the user was in.
  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }

  // ---------------------------------------------------------------------
  // Camera flow
  // ---------------------------------------------------------------------
  async function openCamera() {
    setCameraError("");
    setUploadError("");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Camera access isn't supported in this browser. Please upload an image instead."
      );
      return;
    }

    setStage("camera");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraReady(true);
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError(
          "Camera access was denied. You can still upload an image from your device."
        );
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera was found on this device. Please upload an image instead.");
      } else {
        setCameraError("Couldn't start the camera. Please upload an image instead.");
      }
      setStage("choose");
    }
  }

  function closeCamera() {
    stopCamera();
    setStage("choose");
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Couldn't capture the photo. Please try again.");
          return;
        }
        const capturedFile = new File([blob], `medicine-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        acceptImage(capturedFile, { width: canvas.width, height: canvas.height });
        stopCamera();
        setStage("preview");
      },
      "image/jpeg",
      0.92
    );
  }

  // ---------------------------------------------------------------------
  // Upload flow
  // ---------------------------------------------------------------------
  function validateFile(file) {
    if (!file) return "No file was selected.";
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Unsupported file type. Please upload a JPG, PNG, or WEBP image.";
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`;
    }
    return "";
  }

  function acceptImage(file, knownDimensions) {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploadError("");
    setResult(null);

    if (knownDimensions) {
      setImageDimensions(knownDimensions);
    } else {
      const img = new Image();
      img.onload = () => setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = url;
    }
  }

  function handleFileSelected(file) {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }
    acceptImage(file, null);
    setStage("preview");
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0];
    if (!file) return; // selection cancelled
    handleFileSelected(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
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

  function handleBrowseClick() {
    fileInputRef.current?.click();
  }

  function handleRemoveImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStage("choose");
  }

  function handleChangeImage() {
    handleBrowseClick();
  }

  // ---------------------------------------------------------------------
  // Verification flow
  // ---------------------------------------------------------------------
  async function handleVerification() {
    if (!imageFile || stage === "analyzing") return;

    setStage("analyzing");
    setCompletedStages([]);
    setResult(null);

    const stageTimers = ANALYSIS_STAGES.map((s, index) =>
      setTimeout(() => {
        setCompletedStages((prev) => [...prev, s.key]);
      }, (index + 1) * 480)
    );

    const verificationResult = await mockVerificationCall();

    stageTimers.forEach(clearTimeout);
    setCompletedStages(ANALYSIS_STAGES.map((s) => s.key));

    setTimeout(() => {
      setResult(verificationResult);
      setStage("result");
    }, 400);
  }

  function handleVerifyAnother() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);
    setUploadError("");
    setCameraError("");
    setCompletedStages([]);
    setResult(null);
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStage("choose");
  }

  function handleReportMedicine() {
    // Placeholder hook — wire this up to a real reporting endpoint later.
    window.alert(
      "Thanks for flagging this. Reporting isn't connected to a backend yet — hook this button up to your reporting API."
    );
  }

  return (
    <section className="verify-page" aria-labelledby="verify-heading">
      <div className="verify-container">
        {/* ---------------- Header ---------------- */}
        <motion.header
          className="verify-header"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="verify-badge">AI-Powered Medicine Verification</span>
          <h1 id="verify-heading" className="verify-title">
            Verify Your Medicine
          </h1>
          <p className="verify-subtitle">
            Check your medicine&apos;s authenticity using AI-powered image analysis
            and verification.
          </p>
          <p className="verify-trust-note">
            Upload or capture a clear image of your medicine packaging.
          </p>
        </motion.header>

        {/* ---------------- Step: choose method ---------------- */}
        {stage === "choose" && (
          <motion.div
            className="verify-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {(cameraError || uploadError) && (
              <p className="verify-error" role="alert">
                {cameraError || uploadError}
              </p>
            )}

            <div className="choice-grid">
              <button type="button" className="choice-option" onClick={openCamera}>
                <span className="choice-option__icon" aria-hidden="true">
                  📷
                </span>
                <span className="choice-option__label">Use Camera</span>
                <span className="choice-option__hint">Capture a live photo</span>
              </button>

              <button type="button" className="choice-option" onClick={handleBrowseClick}>
                <span className="choice-option__icon" aria-hidden="true">
                  📁
                </span>
                <span className="choice-option__label">Upload Image</span>
                <span className="choice-option__hint">Choose from your device</span>
              </button>
            </div>

            <div
              className={`upload-dropzone ${isDragging ? "upload-dropzone--dragging" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              role="button"
              tabIndex={0}
              aria-label="Drag and drop a medicine image, or browse from your device"
              onClick={handleBrowseClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleBrowseClick();
                }
              }}
            >
              <p className="upload-dropzone__title">Drag &amp; drop your medicine image here</p>
              <p className="upload-dropzone__hint">or browse from your device</p>
              <p className="upload-dropzone__meta">
                Supported formats: JPG, PNG, WEBP &bull; Max {MAX_FILE_SIZE_MB} MB
              </p>
            </div>

            <label htmlFor="medicine-file-input" className="visually-hidden">
              Upload medicine packaging image
            </label>
            <input
              ref={fileInputRef}
              id="medicine-file-input"
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              className="visually-hidden"
            />
          </motion.div>
        )}

        {/* ---------------- Step: camera ---------------- */}
        {stage === "camera" && (
          <motion.div
            className="verify-card"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
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
                <div className="camera-view__guide" aria-hidden="true">
                  <span className="camera-view__guide-corner camera-view__guide-corner--tl" />
                  <span className="camera-view__guide-corner camera-view__guide-corner--tr" />
                  <span className="camera-view__guide-corner camera-view__guide-corner--bl" />
                  <span className="camera-view__guide-corner camera-view__guide-corner--br" />
                </div>
              </div>

              <p className="camera-view__instruction">
                Place the medicine package inside the frame and make sure the text
                is clearly visible.
              </p>

              {cameraError && (
                <p className="verify-error" role="alert">
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
                <button type="button" className="btn btn-ghost" onClick={closeCamera}>
                  Close Camera
                </button>
              </div>
            </div>

            <canvas ref={canvasRef} className="visually-hidden" aria-hidden="true" />
          </motion.div>
        )}

        {/* ---------------- Step: preview ---------------- */}
        {stage === "preview" && imageFile && (
          <motion.div
            className="verify-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <p className="preview-success">Photo ready &mdash; here&apos;s your preview</p>

            <div className="preview">
              <div className="preview__image-wrap">
                <img src={previewUrl} alt="Selected medicine packaging" className="preview__image" />
              </div>

              <div className="preview__details">
                <p className="preview__filename" title={imageFile.name}>
                  {imageFile.name}
                </p>
                <p className="preview__meta">
                  {formatFileSize(imageFile.size)}
                  {imageDimensions ? ` \u00b7 ${imageDimensions.width}\u00d7${imageDimensions.height}px` : ""}
                </p>

                <ul className="quality-checklist">
                  <li className="quality-checklist__item quality-checklist__item--pass">
                    <span aria-hidden="true">✓</span> Image selected
                  </li>
                  <li className="quality-checklist__item quality-checklist__item--pass">
                    <span aria-hidden="true">✓</span> Image format supported
                  </li>
                  <li className="quality-checklist__item quality-checklist__item--pass">
                    <span aria-hidden="true">✓</span> Image size valid
                  </li>
                </ul>
                <p className="quality-warning">
                  Tip: for best results, make sure the medicine name, batch number,
                  and packaging text are clearly visible and in focus.
                </p>

                <div className="preview__actions">
                  <button type="button" className="btn btn-secondary" onClick={handleChangeImage}>
                    Change Image
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={handleRemoveImage}>
                    Remove
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleInputChange}
                  className="visually-hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                />

                {uploadError && (
                  <p className="verify-error" role="alert">
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

        {/* ---------------- Step: analyzing ---------------- */}
        {stage === "analyzing" && (
          <motion.div
            className="verify-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="analysis" role="status" aria-live="polite">
              <div className="analysis__header">
                <span className="analysis__spinner" aria-hidden="true" />
                <p className="analysis__title">Analyzing Medicine&hellip;</p>
              </div>

              <ul className="analysis__stages">
                {ANALYSIS_STAGES.map((s) => {
                  const done = completedStages.includes(s.key);
                  return (
                    <li
                      key={s.key}
                      className={`analysis__stage ${done ? "analysis__stage--done" : ""}`}
                    >
                      <span className="analysis__stage-icon" aria-hidden="true">
                        {done ? "✓" : "○"}
                      </span>
                      {s.label}
                    </li>
                  );
                })}
              </ul>

              <p className="analysis__note">
                This is a frontend simulation for demo purposes and is not yet
                connected to a live AI backend.
              </p>
            </div>
          </motion.div>
        )}

        {/* ---------------- Step: result ---------------- */}
        <AnimatePresence>
          {stage === "result" && result && result.status === "authentic" && (
            <ResultAuthentic result={result} onVerifyAnother={handleVerifyAnother} />
          )}

          {stage === "result" && result && result.status === "suspicious" && (
            <ResultSuspicious
              result={result}
              onVerifyAnother={handleVerifyAnother}
              onReport={handleReportMedicine}
            />
          )}

          {stage === "result" && result && result.status === "unable" && (
            <ResultUnableToVerify
              onTryAgain={() => setStage("preview")}
              onUploadNew={handleVerifyAnother}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Result sub-components
// ---------------------------------------------------------------------------

function ExtractedInfo({ result }) {
  return (
    <div className="extracted-info">
      <div className="extracted-info__header">
        <p className="extracted-info__title">Extracted Medicine Information</p>
        <span className="extracted-info__demo-tag">Demo values &mdash; OCR not yet connected</span>
      </div>

      <dl className="extracted-info__grid">
        <div className="extracted-info__row">
          <dt>Medicine Name</dt>
          <dd>{result.medicineName}</dd>
        </div>
        <div className="extracted-info__row">
          <dt>Manufacturer</dt>
          <dd>{result.manufacturer}</dd>
        </div>
        <div className="extracted-info__row">
          <dt>Batch Number</dt>
          <dd>{result.batchNumber}</dd>
        </div>
        <div className="extracted-info__row">
          <dt>Manufacturing Date</dt>
          <dd>{result.manufacturingDate}</dd>
        </div>
        <div className="extracted-info__row">
          <dt>Expiry Date</dt>
          <dd>{result.expiryDate}</dd>
        </div>
        <div className="extracted-info__row">
          <dt>Barcode / QR</dt>
          <dd>{result.barcode}</dd>
        </div>
      </dl>
    </div>
  );
}

function ConfidenceRing({ value }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="confidence-ring" role="img" aria-label={`Confidence score ${value}%`}>
      <svg viewBox="0 0 100 100" className="confidence-ring__svg">
        <circle className="confidence-ring__track" cx="50" cy="50" r={radius} />
        <circle
          className="confidence-ring__value"
          cx="50"
          cy="50"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="confidence-ring__label">{value}%</span>
    </div>
  );
}

function ResultAuthentic({ result, onVerifyAnother }) {
  return (
    <motion.div
      className="verify-card result result--authentic"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4 }}
    >
      <div className="result__icon result__icon--authentic" aria-hidden="true">
        ✓
      </div>
      <h2 className="result__title">Medicine Appears Authentic</h2>

      <ConfidenceRing value={result.confidence} />

      <ul className="result__checks">
        <li>✓ Packaging information analyzed</li>
        <li>✓ Manufacturer information checked</li>
        <li>✓ Batch information checked</li>
        <li>✓ Medicine details analyzed</li>
      </ul>

      <ExtractedInfo result={result} />

      <p className="result__disclaimer">
        This result comes from a demo analysis pipeline and has not been checked
        against a live verification backend yet.
      </p>

      <button type="button" className="btn btn-primary" onClick={onVerifyAnother}>
        Verify Another Medicine
      </button>
    </motion.div>
  );
}

function ResultSuspicious({ result, onVerifyAnother, onReport }) {
  return (
    <motion.div
      className="verify-card result result--suspicious"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4 }}
    >
      <div className="result__icon result__icon--suspicious" aria-hidden="true">
        ⚠
      </div>
      <h2 className="result__title">Potentially Counterfeit</h2>

      <ConfidenceRing value={result.confidence} />

      <div className="result__issues">
        <p className="result__issues-label">Detected issues</p>
        <ul>
          {result.issues.map((issue) => (
            <li key={issue}>⚠ {issue}</li>
          ))}
        </ul>
      </div>

      <ExtractedInfo result={result} />

      <p className="result__disclaimer">
        This result comes from a demo analysis pipeline and has not been checked
        against a live verification backend yet. Use additional judgment before
        acting on it.
      </p>

      <div className="result__actions">
        <button type="button" className="btn btn-secondary" onClick={onVerifyAnother}>
          Verify Another Medicine
        </button>
        <button type="button" className="btn btn-danger" onClick={onReport}>
          Report Medicine
        </button>
      </div>
    </motion.div>
  );
}

function ResultUnableToVerify({ onTryAgain, onUploadNew }) {
  return (
    <motion.div
      className="verify-card result result--unable"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4 }}
    >
      <div className="result__icon result__icon--unable" aria-hidden="true">
        ?
      </div>
      <h2 className="result__title">Unable to Verify</h2>
      <p className="result__unable-text">
        We could not confidently verify this medicine. Please upload a clearer
        image showing the medicine name, batch number, and packaging.
      </p>

      <div className="result__actions">
        <button type="button" className="btn btn-secondary" onClick={onTryAgain}>
          Try Again
        </button>
        <button type="button" className="btn btn-primary" onClick={onUploadNew}>
          Upload New Image
        </button>
      </div>
    </motion.div>
  );
}
