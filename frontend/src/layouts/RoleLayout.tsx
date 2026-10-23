import type { ReactNode } from "react";
import { ArrowLeft, Construction } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import Brand from "../components/Brand";

export default function RoleLayout({ role, children }: { role: string; children?: ReactNode }) {
  return (
    <div className="role-placeholder-shell">
      <header className="role-placeholder-header"><Brand /><Link to="/">Back to home <ArrowLeft size={15} /></Link></header>
      {children ?? <Outlet />}
      <main className="role-placeholder-content">
        <span className="role-placeholder-icon"><Construction size={25} /></span>
        <p className="eyebrow">FUTURE WORKSPACE</p>
        <h1>{role} pages are not available yet</h1>
        <p>This area is prepared for future development. No role access or account permissions are implemented in this frontend demo.</p>
        <Link className="button button-outline" to="/">Return to Toy Choir TV</Link>
      </main>
    </div>
  );
}
