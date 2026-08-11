import { motion } from "framer-motion";
import {
  HiOutlinePhoto,
  HiOutlineDocumentText,
  HiOutlineCpuChip,
  HiOutlineCircleStack,
  HiOutlineChartBar,
  HiOutlineCheckBadge,
  HiOutlineArrowRight,
} from "react-icons/hi2";

const NODES = [
  { icon: HiOutlinePhoto, label: "Medicine Image" },
  { icon: HiOutlineDocumentText, label: "OCR" },
  { icon: HiOutlineCpuChip, label: "Deep Learning Model" },
  { icon: HiOutlineCircleStack, label: "Database" },
  { icon: HiOutlineChartBar, label: "Confidence Score" },
  { icon: HiOutlineCheckBadge, label: "Authenticity Result" },
];

export default function Workflow() {
  return (
    <section className="section workflow">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">AI Workflow</span>
          <h2>What happens behind every scan</h2>
          <p>A single image flows through six coordinated stages to produce one trustworthy result.</p>
        </div>

        <div className="workflow__row">
          {NODES.map(({ icon: Icon, label }, i) => (
            <motion.div
              className="workflow__item"
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="workflow__node">
                <Icon size={22} />
              </div>
              <span>{label}</span>
              {i < NODES.length - 1 && (
                <motion.span
                  className="workflow__arrow"
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
                >
                  <HiOutlineArrowRight size={18} />
                </motion.span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
