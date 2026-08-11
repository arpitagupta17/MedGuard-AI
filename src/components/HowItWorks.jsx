import { motion } from "framer-motion";
import {
  HiOutlineUpload,
  HiOutlineDocumentSearch,
  HiOutlineCube,
  HiOutlineDatabase,
  HiOutlineBadgeCheck,
  HiOutlineFlag,
} from "react-icons/hi";

const STEPS = [
  {
    icon: HiOutlineUpload,
    title: "Upload Medicine Image",
    desc: "Snap or upload a photo of the package.",
  },
  {
    icon: HiOutlineDocumentSearch,
    title: "OCR Extraction",
    desc: "Name, batch number, expiry date, manufacturer.",
  },
  {
    icon: HiOutlineCube,
    title: "Packaging Analysis",
    desc: "AI inspects print quality and design integrity.",
  },
  {
    icon: HiOutlineDatabase,
    title: "Database Verification",
    desc: "Details are matched against manufacturer records.",
  },
  {
    icon: HiOutlineBadgeCheck,
    title: "Authenticity Result",
    desc: "A clear, confidence-scored verdict is returned.",
  },
  {
    icon: HiOutlineFlag,
    title: "Report Suspicious Medicine",
    desc: "Flag counterfeits to alert the community.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section how-it-works">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">How It Works</span>
          <h2>From photo to verdict in seconds</h2>
          <p>Six automated steps take a single image all the way to a trustworthy authenticity result.</p>
        </div>

        <div className="timeline">
          <div className="timeline__line" aria-hidden="true" />
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              className="timeline__step"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="timeline__node">
                <Icon size={20} />
                <span className="timeline__index">{i + 1}</span>
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
