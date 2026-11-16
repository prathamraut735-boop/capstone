import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import Brand from "../../components/Brand";
import { auth } from "../../firebase";
import { getFirebaseAuthErrorMessage } from "../../firebaseAuthErrors";
import { getStudentAuthEmail, getStudentProfile } from "../../backendApi";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        getStudentAuthEmail(username.trim().toLowerCase()),
        password,
      );
      await getStudentProfile(credential.user);
      navigate("/student/dashboard", { replace: true });
    } catch (loginError) {
      setError(getFirebaseAuthErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <Brand className="brand auth-brand" />
        <div className="auth-heading">
          <span className="auth-welcome-icon"><KeyRound size={18} /></span>
          <span className="eyebrow">STUDENT SIGN IN</span>
          <h1>Welcome back</h1>
          <p>Use the student username your parent or guardian gave you.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Student username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="auth-error-message" role="alert">{error}</p>}
          <button className="button button-pink auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"} {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>
        <p className="auth-switch">Have an invitation code? <Link to="/student/activate">Activate student access</Link></p>
        <Link className="auth-back" to="/">Back to home</Link>
      </div>
    </section>
  );
}
