import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const pageTitles: Record<string, string> = {
  "/student/dashboard": "Dashboard",
  "/student/lessons": "My Lessons",
  "/student/practice": "My Practice",
  "/student/progress": "My Progress",
  "/student/profile": "My Profile",
};

function Topbar() {
  const location = useLocation();
  const isLesson = location.pathname.startsWith("/student/lessons/");
  const title = isLesson ? "Lesson details" : pageTitles[location.pathname] ?? "Your learning space";

  return (
    <header className="topbar">
      <div><span className="breadcrumb-muted">My learning space</span><span className="breadcrumb-divider">/</span><strong>{title}</strong></div>
      <div className="topbar-right"><span className="topbar-note">Student demo · no account</span><span className="avatar avatar-top">S</span></div>
    </header>
  );
}

export default function StudentLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">
        <Topbar />
        <Outlet />
      </main>
    </div>
  );
}
