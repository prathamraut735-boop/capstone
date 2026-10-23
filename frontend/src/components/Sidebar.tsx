import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  BookOpen,
  ChevronRight,
  CircleUserRound,
  GraduationCap,
  Menu,
  Music2,
  Sparkles,
  X,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", to: "/student/dashboard", icon: GraduationCap },
  { label: "My Lessons", to: "/student/lessons", icon: BookOpen },
  { label: "My Practice", to: "/student/practice", icon: Music2 },
  { label: "My Progress", to: "/student/progress", icon: Sparkles },
  { label: "My Profile", to: "/student/profile", icon: CircleUserRound },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="mobile-header">
        <Link className="brand" to="/student/dashboard" onClick={() => setIsOpen(false)}>
          <span className="brand-mark"><Music2 size={21} /></span>
          <span>Toy Choir <b>TV</b></span>
        </Link>
        <button
          className="icon-button mobile-menu-button"
          type="button"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      {isOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setIsOpen(false)} />}
      <aside className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
        <Link className="brand desktop-brand" to="/student/dashboard" onClick={() => setIsOpen(false)}>
          <span className="brand-mark"><Music2 size={21} /></span>
          <span>Toy Choir <b>TV</b></span>
        </Link>
        <div className="nav-caption">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/student/dashboard"}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              <Icon size={19} strokeWidth={2} />
              <span>{label}</span>
              {label === "Dashboard" && <ChevronRight className="nav-chevron" size={16} />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-star"><Sparkles size={18} /></div>
          <strong>Little steps make big music!</strong>
          <span>Keep learning at your own pace.</span>
        </div>
        <div className="sidebar-footer">
          <span className="avatar avatar-small">S</span>
          <span><strong>Sunny Student</strong><small>My learning space</small></span>
          <span className="online-dot" aria-label="Online" />
        </div>
      </aside>
    </>
  );
}
