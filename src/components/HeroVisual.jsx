import { motion } from "framer-motion";
import { HiOutlineShieldCheck, HiOutlineDocumentText } from "react-icons/hi";
import { BsQrCodeScan } from "react-icons/bs";

export default function HeroVisual() {
  return (
    <div className="hero-visual">
      <div className="hero-visual__blob hero-visual__blob--a" />
      <div className="hero-visual__blob hero-visual__blob--b" />

      <motion.div
        className="hero-visual__stage"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg viewBox="0 0 420 460" className="hero-visual__svg" role="img" aria-label="AI scanning a medicine package for authenticity">
          {/* package */}
          <rect x="120" y="90" width="180" height="260" rx="18" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
          <rect x="120" y="90" width="180" height="60" rx="18" fill="#2563EB" />
          <rect x="120" y="132" width="180" height="18" fill="#2563EB" />
          <text x="210" y="126" textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="17" fontWeight="700" fill="#FFFFFF">
            MEDIGUARD
          </text>
          <rect x="146" y="176" width="128" height="10" rx="5" fill="#E2E8F0" />
          <rect x="146" y="198" width="98" height="8" rx="4" fill="#E2E8F0" />
          <rect x="146" y="222" width="128" height="1" fill="#E2E8F0" />

          {/* barcode */}
          <g>
            {[0, 5, 8, 12, 15, 19, 23, 26, 30, 34, 37, 41, 45].map((x, i) => (
              <rect key={i} x={146 + x} y="240" width={i % 3 === 0 ? 3 : 2} height="34" fill="#0F172A" />
            ))}
          </g>
          <text x="210" y="292" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fill="#475569" letterSpacing="2">
            BN-48213-EXP-0327
          </text>

          <rect x="146" y="310" width="70" height="24" rx="6" fill="#ECFDF5" />
          <text x="181" y="326" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" fill="#10B981">
            Rx Verified
          </text>

          {/* scan line */}
          <motion.rect
            x="120" width="180" height="4" fill="#10B981" opacity="0.85"
            initial={{ y: 90 }}
            animate={{ y: [90, 340, 90] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.rect
            x="120" width="180" height="40" fill="url(#scanGlow)"
            initial={{ y: 70 }}
            animate={{ y: [70, 320, 70] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />

          <defs>
            <linearGradient id="scanGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#10B981" stopOpacity="0" />
              <stop offset="0.5" stopColor="#10B981" stopOpacity="0.18" />
              <stop offset="1" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* corner scan brackets */}
          {[
            [104, 74], [316, 74], [104, 366], [316, 366],
          ].map(([x, y], i) => (
            <g key={i} stroke="#2563EB" strokeWidth="4" strokeLinecap="round">
              <path
                d={
                  i === 0 ? `M${x} ${y + 26} V${y} H${x + 26}` :
                  i === 1 ? `M${x - 26} ${y} H${x} V${y + 26}` :
                  i === 2 ? `M${x} ${y - 26} V${y} H${x + 26}` :
                  `M${x - 26} ${y} H${x} V${y - 26}`
                }
                fill="none"
              />
            </g>
          ))}
        </svg>

        <motion.div
          className="hero-visual__card hero-visual__card--score"
          initial={{ opacity: 0, x: 20, y: -10 }}
          animate={{ opacity: 1, x: 0, y: [0, -8, 0] }}
          transition={{ opacity: { delay: 0.5, duration: 0.6 }, x: { delay: 0.5, duration: 0.6 }, y: { delay: 1.1, duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        >
          <div className="hero-visual__ring">
            <HiOutlineShieldCheck size={20} />
          </div>
          <div>
            <strong>98.4%</strong>
            <span>Confidence Score</span>
          </div>
        </motion.div>

        <motion.div
          className="hero-visual__card hero-visual__card--ocr"
          initial={{ opacity: 0, x: -20, y: 10 }}
          animate={{ opacity: 1, x: 0, y: [0, 10, 0] }}
          transition={{ opacity: { delay: 0.7, duration: 0.6 }, x: { delay: 0.7, duration: 0.6 }, y: { delay: 1.3, duration: 4.5, repeat: Infinity, ease: "easeInOut" } }}
        >
          <div className="hero-visual__ring hero-visual__ring--muted">
            <HiOutlineDocumentText size={18} />
          </div>
          <div>
            <strong>OCR Extracted</strong>
            <span>Batch · Expiry · Manufacturer</span>
          </div>
        </motion.div>

        <motion.div
          className="hero-visual__card hero-visual__card--verified"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{ opacity: { delay: 0.9, duration: 0.6 }, y: { delay: 1.5, duration: 3.6, repeat: Infinity, ease: "easeInOut" } }}
        >
          <div className="hero-visual__ring hero-visual__ring--success">
            <BsQrCodeScan size={16} />
          </div>
          <div>
            <strong>Authentic Medicine</strong>
            <span>Matched in database</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
