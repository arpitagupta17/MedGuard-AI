import { motion } from "framer-motion";
import {
  HiOutlineCube,
  HiOutlineDocumentText,
  HiOutlineHashtag,
  HiOutlineCalendar,
  HiOutlineOfficeBuilding,
  HiOutlineChartBar,
} from "react-icons/hi";

const FEATURES = [
  {
    icon: HiOutlineCube,
    title: "AI Packaging Analysis",
    desc: "Deep learning models inspect print quality, color accuracy, and packaging texture to flag counterfeits at a glance.",
  },
  {
    icon: HiOutlineDocumentText,
    title: "OCR Text Extraction",
    desc: "Automatically reads medicine name, dosage, and label details straight from the package image.",
  },
  {
    icon: HiOutlineHashtag,
    title: "Batch Number Verification",
    desc: "Cross-checks extracted batch numbers against manufacturer and regulatory records in real time.",
  },
  {
    icon: HiOutlineCalendar,
    title: "Expiry Date Validation",
    desc: "Detects and validates expiry dates, catching altered or expired stock before it reaches patients.",
  },
  {
    icon: HiOutlineOfficeBuilding,
    title: "Manufacturer Verification",
    desc: "Confirms the listed manufacturer against a secure, continuously updated pharmaceutical database.",
  },
  {
    icon: HiOutlineChartBar,
    title: "Confidence Score Generation",
    desc: "Combines every signal into one transparent authenticity score you can trust at a glance.",
  },
];

export default function Features() {
  return (
    <section id="features" className="section features">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Why MedGuard AI</span>
          <h2>One scan, six layers of verification</h2>
          <p>
            Every upload runs through a full pipeline of computer vision and
            data checks, so you get a decision you can act on, not a guess.
          </p>
        </div>

        <div className="features__grid">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="card features__card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="features__icon">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
