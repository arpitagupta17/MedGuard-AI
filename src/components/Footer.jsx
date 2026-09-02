import { HiOutlineMail } from "react-icons/hi";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import logo from "../assets/logo.png";

const LINK_COLS = [
  {
    title: "Quick Links",
    links: [
      { label: "Home", href: "/" },
      { label: "Verify Medicine", href: "/verify" },
      { label: "About", href: "/#about" },
      { label: "Features", href: "/#features" },
      { label: "How It Works", href: "/#how-it-works" },
    ],
  },
  /*
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "#" },
      { label: "API Reference", href: "#" },
      { label: "Report Counterfeit", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
  */
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__top">
        <div className="footer__brand">
          <a href="/" className="navbar__logo">
            <img src={logo} alt="MedGuard AI logo" />
            <span>
              MedGuard <em>AI</em>
            </span>
          </a>

          <p>
            AI-powered counterfeit medicine detection and verification,
            built to keep every patient safe.
          </p>

          <div className="footer__socials">
            <a href="#github" aria-label="GitHub">
              <FaGithub size={18} />
            </a>

            <a href="#linkedin" aria-label="LinkedIn">
              <FaLinkedin size={18} />
            </a>

            <a
              href="mailto:hello@medguard.ai"
              aria-label="Email"
            >
              <HiOutlineMail size={18} />
            </a>
          </div>
        </div>

        {LINK_COLS.map((col) => (
          <div className="footer__col" key={col.title}>
            <h4>{col.title}</h4>

            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container footer__bottom">
        <p>
          © {new Date().getFullYear()} MedGuard AI. All rights reserved.
        </p>

        <p>Verify. Trust. Protect.</p>
      </div>
    </footer>
  );
}