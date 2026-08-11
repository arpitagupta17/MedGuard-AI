import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";

const STATS = [
  { value: 98, suffix: "%", label: "Detection Accuracy" },
  { value: 50, suffix: "K+", label: "Medicines Verified" },
  { value: 10, suffix: "K+", label: "Suspicious Reports" },
  { value: 24, suffix: "/7", label: "AI Verification", isRatio: true },
];

function Counter({ value, suffix, isRatio }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className="stats__number">
      {display}
      <span className="stats__suffix">{suffix}</span>
    </span>
  );
}

export default function Stats() {
  return (
    <section className="stats">
      <div className="container">
        <div className="stats__grid">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="card stats__card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Counter value={s.value} suffix={s.suffix} isRatio={s.isRatio} />
              <p>{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
