import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import RoleDashboardLayout from "./RoleDashboardLayout";
import { getCurrentUserProfile } from "../backendApi";
import { auth } from "../firebase";

const navigation = [
  { label: "Publish a session", to: "/admin/dashboard", icon: CalendarDays },
];

export default function AdminLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let requestId = 0;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const currentRequestId = ++requestId;
      setUser(nextUser);
      setIsAuthReady(true);
      setError("");
      setIsAdmin(false);
      if (!nextUser) {
        setIsCheckingRole(false);
        return;
      }
      setIsCheckingRole(true);
      getCurrentUserProfile(nextUser)
        .then((profile) => {
          if (!active || currentRequestId !== requestId) return;
          if (profile.role !== "admin") {
            setError("This account does not have administrator access.");
            return;
          }
          setIsAdmin(true);
        })
        .catch((cause: unknown) => {
          if (active && currentRequestId === requestId) {
            setError(cause instanceof Error ? cause.message : "Administrator access could not be verified.");
          }
        })
        .finally(() => {
          if (active && currentRequestId === requestId) setIsCheckingRole(false);
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (!isAuthReady || isCheckingRole) {
    return <main className="auth-page"><section className="auth-card"><p>Checking administrator access...</p></section></main>;
  }
  if (!user || !isAdmin) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Administrator access required</h1>
          <p className={error ? "auth-error-message" : undefined} role={error ? "alert" : undefined}>
            {error || "Sign in with an account that has the admin role to publish music sessions."}
          </p>
          {!user && <Link className="button button-pink" to="/admin/login">Administrator sign in</Link>}
          {user && <Link className="button button-outline" to="/admin/login">Use an administrator account</Link>}
        </section>
      </main>
    );
  }

  return <RoleDashboardLayout role="Admin workspace" title="Publish a session" navigation={navigation} variant="admin" />;
}
