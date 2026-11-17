import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import Brand from "../../components/Brand";
import { getCurrentUserProfile } from "../../backendApi";
import { getFirebaseAuthErrorMessage } from "../../firebaseAuthErrors";
import { auth } from "../../firebase";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await getCurrentUserProfile(credential.user);
      if (profile.role !== "admin") {
        setError("This account does not have administrator access.");
        return;
      }
      navigate("/admin/dashboard", { replace: true });
    } catch (cause) {
      setError(getFirebaseAuthErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card login-card">
        <Brand className="brand auth-brand" />
        <div className="auth-heading">
          <span className="auth-welcome-icon"><ShieldCheck size={18} /></span>
          <span className="eyebrow">ADMIN ACCESS</span>
          <h1>Administrator sign in</h1>
          <p>Sign in with an account that has the admin role.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <div className="form-field">
            <label htmlFor="admin-login-password">Password</label>
            <span className="password-field">
              <input
                id="admin-login-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </div>
          {error && <p className="auth-error-message" role="alert">{error}</p>}
          <button className="button button-pink auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Checking administrator access..." : "Sign in"} {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>
        <Link className="auth-back" to="/">Back to Toy Choir TV</Link>
      </div>
    </section>
  );
}
