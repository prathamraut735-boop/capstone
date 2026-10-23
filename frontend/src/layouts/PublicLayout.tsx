import { ArrowRight } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import Brand from "../components/Brand";

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Brand />
        <nav className="public-nav" aria-label="Public navigation">
          <Link to="/">Home</Link>
          <Link to="/#how-it-works">How it works</Link>
          <Link to="/#lessons">Lessons</Link>
        </nav>
        <div className="public-header-actions">
          <Link className="public-login-link" to="/login">Log in</Link>
          <Link className="button button-pink public-get-started" to="/signup">Get started <ArrowRight size={15} /></Link>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="public-footer">
        <div className="public-footer-inner">
          <div>
            <Brand className="brand footer-brand" />
            <p>A friendly place to explore singing, ukulele and songwriting.</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link to="/">Home</Link>
            <Link to="/#how-it-works">How it works</Link>
            <Link to="/#lessons">Lessons</Link>
            <Link to="/login">Log in</Link>
          </nav>
          <div className="policy-links">
            <a href="#privacy">Privacy (placeholder)</a>
            <a href="#terms">Terms (placeholder)</a>
          </div>
        </div>
        <p className="footer-bottom">© Toy Choir TV · Frontend demonstration</p>
      </footer>
    </div>
  );
}
