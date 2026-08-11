import { motion } from "framer-motion";

const TESTIMONIALS = [
  {
    quote:
      "We scan every new batch that comes through the pharmacy now. It takes seconds and has already flagged two suspicious shipments before they reached the shelf.",
    name: "Dr. Amara Chen",
    role: "Healthcare Professional",
    initials: "AC",
  },
  {
    quote:
      "The OCR extraction is genuinely accurate even on worn or glossy packaging. It has become part of our intake checklist for every new supplier.",
    name: "Rohan Mehta",
    role: "Pharmacist",
    initials: "RM",
  },
  {
    quote:
      "I used it for a pharmacology research project comparing packaging authenticity signals. The confidence scoring made the results easy to explain.",
    name: "Sofia Alvarez",
    role: "Medical Student",
    initials: "SA",
  },
];

export default function Testimonials() {
  return (
    <section className="section testimonials">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Testimonials</span>
          <h2>Trusted by the people who verify medicine every day</h2>
        </div>

        <div className="testimonials__grid">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              className="card testimonials__card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <blockquote>“{t.quote}”</blockquote>
              <figcaption>
                <span className="testimonials__avatar">{t.initials}</span>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
