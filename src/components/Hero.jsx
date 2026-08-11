import { motion } from "framer-motion";
import { HiOutlineSparkles, HiOutlineLockClosed, HiOutlineLightningBolt, HiOutlineBadgeCheck } from "react-icons/hi";
import HeroVisual from "./HeroVisual";

const BADGES = [
  { icon: HiOutlineSparkles, label: "AI Powered" },
  { icon: HiOutlineLockClosed, label: "Secure" },
  { icon: HiOutlineLightningBolt, label: "Fast Verification" },
  { icon: HiOutlineBadgeCheck, label: "Reliable Results" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="hero__bg" aria-hidden="true">
        <svg width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse">
              <path d="M56 0H0V56" fill="none" stroke="#E2E8F0" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5" />
        </svg>
      </div>

      <div className="container hero__inner">
        <motion.div
          className="hero__content"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.span className="eyebrow" variants={fadeUp} custom={0}>
            AI-Powered Verification Platform
          </motion.span>

          <motion.h1 variants={fadeUp} custom={1}>
            Verify Medicines.
            <br />
            Protect Lives.
          </motion.h1>

          <motion.p className="hero__sub" variants={fadeUp} custom={2}>
            AI-powered counterfeit medicine detection using Computer Vision,
            OCR, Deep Learning, and secure database verification.
          </motion.p>

          <motion.div className="hero__actions" variants={fadeUp} custom={3}>
            <a href="#verify" className="btn btn-primary btn-lg">
              Verify Medicine
            </a>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">
              Learn More
            </a>
          </motion.div>

          <motion.ul className="hero__badges" variants={fadeUp} custom={4}>
            {BADGES.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={16} />
                {label}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          className="hero__visual-col"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  );
}
