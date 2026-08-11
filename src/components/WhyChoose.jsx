import { motion } from "framer-motion";
import { HiCheckCircle } from "react-icons/hi";

const POINTS = [
  "Fast AI Verification",
  "Easy to Use",
  "Secure Database Matching",
  "Real-Time Analysis",
  "Detailed OCR Extraction",
  "Trusted Healthcare Solution",
];

export default function WhyChoose() {
  return (
    <section id="about" className="section why-choose">
      <div className="container why-choose__grid">
        <motion.div
          className="why-choose__visual"
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg viewBox="0 0 380 380" role="img" aria-label="Shield protecting verified medicine">
            <circle cx="190" cy="190" r="170" fill="#EFF6FF" />
            <circle cx="190" cy="190" r="130" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
            <path
              d="M190 70 L270 100 V190 C270 250 235 290 190 310 C145 290 110 250 110 190 V100 Z"
              fill="#2563EB"
            />
            <path
              d="M190 90 L252 114 V188 C252 238 223 270 190 288 C157 270 128 238 128 188 V114 Z"
              fill="#3B82F6"
            />
            <path
              d="M160 190 L182 214 L226 164"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="300" cy="110" r="34" fill="#10B981" />
            <path d="M288 110 L298 120 L314 100" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>

        <motion.div
          className="why-choose__content"
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">Why Choose MedGuard AI</span>
          <h2>Built for the moment trust matters most</h2>
          <p className="why-choose__lead">
            Every check is designed to be fast enough for a pharmacy counter
            and rigorous enough for a hospital supply chain.
          </p>
          <ul className="why-choose__list">
            {POINTS.map((point, i) => (
              <motion.li
                key={point}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <HiCheckCircle size={20} />
                {point}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
