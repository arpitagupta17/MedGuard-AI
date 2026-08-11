import { motion } from "framer-motion";
import { SiReact, SiFastapi, SiPytorch, SiOpencv, SiPostgresql } from "react-icons/si";
import { HiOutlineDocumentText } from "react-icons/hi";

const STACK = [
  { icon: SiReact, color: "#2563EB", name: "React", desc: "Component-driven interface for a fast, responsive experience." },
  { icon: SiFastapi, color: "#10B981", name: "FastAPI", desc: "High-performance Python backend serving verification requests." },
  { icon: SiPytorch, color: "#EF4444", name: "PyTorch", desc: "Deep learning models trained to spot counterfeit packaging." },
  { icon: SiOpencv, color: "#2563EB", name: "OpenCV", desc: "Computer vision pipeline for image preprocessing and analysis." },
  { icon: HiOutlineDocumentText, color: "#10B981", name: "EasyOCR", desc: "Optical character recognition for labels and batch codes." },
  { icon: SiPostgresql, color: "#0F172A", name: "PostgreSQL", desc: "Secure relational database of manufacturers and batches." },
];

export default function TechnologyStack() {
  return (
    <section className="section tech-stack">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Technology Stack</span>
          <h2>Powered by a proven, production-grade stack</h2>
          <p>Every layer, from image capture to database match, runs on tools built for scale and reliability.</p>
        </div>

        <div className="tech-stack__grid">
          {STACK.map(({ icon: Icon, color, name, desc }, i) => (
            <motion.div
              key={name}
              className="card tech-stack__card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Icon size={30} color={color} />
              <h3>{name}</h3>
              <p>{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
