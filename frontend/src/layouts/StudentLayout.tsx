import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import { getStudentProfile, type StudentProfile } from "../backendApi";
import { getFirebaseAuthErrorMessage } from "../firebaseAuthErrors";
import { auth } from "../firebase";

const pageTitles: Record<string, string> = {
  "/student/dashboard": "Dashboard",
  "/student/lessons": "My Lessons",
  "/student/practice": "My Practice",
  "/student/progress": "My Progress",
  "/student/profile": "My Profile",
};

function Topbar({ studentName, onLogout }: { studentName: string; onLogout: () => void }) {
  const location = useLocation();
  const isLesson = location.pathname.startsWith("/student/lessons/");
  const title = isLesson ? "Lesson details" : pageTitles[location.pathname] ?? "Your learning space";

  return (
    <header className="topbar">
      <div><span className="breadcrumb-muted">My learning space</span><span className="breadcrumb-divider">/</span><strong>{title}</strong></div>
      <div className="topbar-right">
        <span className="topbar-note">{studentName}</span>
        <span className="avatar avatar-top">{studentName.charAt(0).toUpperCase()}</span>
        <button className="student-logout-button" type="button" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}

export default function StudentLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!active) return;
      setUser(nextUser);
      setProfile(null);
      setProfileError("");
      setIsAuthReady(true);
      if (!nextUser) {
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);
      getStudentProfile(nextUser)
        .then((studentProfile) => {
          if (active) setProfile(studentProfile);
        })
        .catch((error: unknown) => {
          if (active) {
            setProfileError(error instanceof Error ? error.message : "Student access could not be verified.");
          }
        })
        .finally(() => {
          if (active) setIsProfileLoading(false);
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate("/student/login", { replace: true });
    } catch (error) {
      setProfileError(getFirebaseAuthErrorMessage(error));
    }
  }

  if (!isAuthReady || (user && isProfileLoading)) {
    return <main className="auth-page"><section className="auth-card"><p>Checking student access...</p></section></main>;
  }

  if (!user || !profile) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Student sign-in required</h1>
          <p>{profileError || "Sign in with the separate student account created by your parent or guardian."}</p>
          {profileError && <p className="auth-error-message" role="alert">{profileError}</p>}
          <Link className="button button-pink" to="/student/login">Student sign in</Link>
          {user && <button className="button button-outline" type="button" onClick={() => void handleLogout()}>Sign out current account</button>}
        </section>
      </main>
    );
  }

  const studentName = profile.preferredName || profile.firstName;
  return (
    <div className="app-shell">
      <Sidebar studentName={studentName} />
      <main className="main-area">
        <Topbar studentName={studentName} onLogout={() => void handleLogout()} />
        <Outlet />
      </main>
    </div>
  );
}
