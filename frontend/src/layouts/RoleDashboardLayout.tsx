import { useState } from "react";
import { Menu, Music2, X, type LucideIcon } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Brand from "../components/Brand";

type RoleNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

type Props = {
  role: string;
  title: string;
  navigation: RoleNavItem[];
  variant: "parent" | "admin" | "teacher";
};

export default function RoleDashboardLayout({ role, title, navigation, variant }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const pageTitle = navigation.find((item) => item.to === location.pathname)?.label ?? title;

  return (
    <div className={`role-app role-app-${variant}`}>
      <header className="role-mobile-header">
        <Brand to={homePath(variant)} />
        <button
          className="icon-button"
          type="button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>
      {menuOpen && <button className="role-nav-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`role-sidebar ${menuOpen ? "role-sidebar-open" : ""}`}>
        <Brand className="brand role-brand" to={homePath(variant)} />
        <div className="role-sidebar-label">{role}</div>
        <nav className="role-navigation" aria-label={`${role} navigation`}>
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `role-nav-link ${isActive ? "role-nav-link-active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="role-sidebar-foot">
          <span className="role-demo-indicator" />
          <span>Demo workspace<br /><small>No live account data</small></span>
        </div>
      </aside>
      <main className="role-main">
        <header className="role-topbar">
          <div><span>{role}</span><b>/</b><strong>{pageTitle}</strong></div>
          <Link className="role-exit-link" to="/"><Music2 size={15} /> Toy Choir TV</Link>
        </header>
        <div className="role-page"><Outlet /></div>
      </main>
    </div>
  );
}

function homePath(variant: Props["variant"]) {
  if (variant === "parent") return "/parent/dashboard";
  if (variant === "teacher") return "/teacher/dashboard";
  return "/admin/dashboard";
}
