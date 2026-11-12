import { useEffect, useState } from "react";
import { LogOut, Menu, Music2, X, type LucideIcon } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Brand from "../components/Brand";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import { getFirebaseAuthErrorMessage } from "../firebaseAuthErrors";

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
  const [user, setUser] = useState<User | null>(null);
  const [logoutError, setLogoutError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = navigation.find((item) => item.to === location.pathname)?.label ?? title;

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function handleLogout() {
    setLogoutError("");
    setIsSigningOut(true);

    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSigningOut(false);
    }
  }

  const accountName = user?.displayName || user?.email || "Signed-in account";
  const accountDetail = user?.displayName && user.email ? user.email : "Firebase account";
  const accountInitial = accountName.charAt(0).toUpperCase();

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
          <span className="role-account-avatar" aria-hidden="true">{user ? accountInitial : "?"}</span>
          <span className="role-account-details">
            <strong>{user ? accountName : "Not signed in"}</strong>
            <small>{user ? accountDetail : <Link to="/login">Log in to your account</Link>}</small>
          </span>
          {user && (
            <button className="role-logout-button" type="button" onClick={handleLogout} disabled={isSigningOut} aria-label="Log out" title="Log out">
              <LogOut size={15} />
            </button>
          )}
        </div>
        {logoutError && <p className="role-logout-error" role="alert">{logoutError}</p>}
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
