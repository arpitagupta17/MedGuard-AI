import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function CTA() {
  return (
    <section className="cta">
      <div className="container cta__inner">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{
            duration: 0.6,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <h2>Start Verifying Medicines Today</h2>

          <p>
            Join pharmacies, hospitals, and patients using MedGuard AI
            to catch counterfeits before they cause harm.
          </p>

          <div className="cta__actions">

            {/* Verify Medicine */}
            <Link
              to="/verify"
              className="btn btn-cta-primary"
            >
              Verify Medicine
            </Link>

            {/* Sign Up */}
            <Link
              to="/signup"
              className="btn btn-cta-secondary"
            >
              Create Free Account
            </Link>

          </div>
        </motion.div>
      </div>
    </section>
  );
}