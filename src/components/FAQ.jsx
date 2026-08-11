import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiChevronDown } from "react-icons/hi";

const FAQS = [
  {
    q: "How does verification work?",
    a: "Upload a clear photo of the medicine package. Our AI extracts the printed details, analyzes the packaging quality, and matches everything against a secure manufacturer database to return an authenticity result with a confidence score.",
  },
  {
    q: "What information is extracted?",
    a: "The OCR engine reads the medicine name, batch number, expiry date, and manufacturer details directly from the package label, then structures them for verification.",
  },
  {
    q: "How accurate is AI?",
    a: "Our detection models currently achieve 98% accuracy on packaging authenticity checks, validated across tens of thousands of verified scans and continuously retrained on new data.",
  },
  {
    q: "Can I report counterfeit medicine?",
    a: "Yes. Any scan flagged as suspicious can be reported in one tap, adding it to our shared database and helping protect other patients and pharmacies.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="contact" className="section faq">
      <div className="container faq__inner">
        <div className="section-head">
          <span className="eyebrow">FAQ</span>
          <h2>Questions, answered</h2>
        </div>

        <div className="faq__list">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div className={`faq__item ${isOpen ? "faq__item--open" : ""}`} key={item.q}>
                <button
                  className="faq__question"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                >
                  <span>{item.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <HiChevronDown size={20} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      className="faq__answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <p>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
