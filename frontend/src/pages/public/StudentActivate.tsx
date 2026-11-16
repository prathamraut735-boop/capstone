import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import Brand from "../../components/Brand";
import { activateStudentInvitation, getStudentAuthEmail, getStudentProfile } from "../../backendApi";
import { auth } from "../../firebase";
import { getFirebaseAuthErrorMessage } from "../../firebaseAuthErrors";

export default function StudentActivate() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const activation = await activateStudentInvitation(code.trim(), password);
      setUsername(activation.username);
      const credential = await signInWithEmailAndPassword(
        auth,
        getStudentAuthEmail(activation.username),
        password,
      );
      await getStudentProfile(credential.user);
      navigate("/student/dashboard", { replace: true });
    } catch (activationError) {
      setError(getFirebaseAuthErrorMessage(activationError));
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
          <span className="eyebrow">STUDENT ACCESS</span>
          <h1>Set up your student sign-in</h1>
          <p>Enter the one-time invitation from your parent or guardian and create your own password.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Invitation code</span>
            <input
              type="text"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Create a password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="auth-error-message" role="alert">{error}</p>}
          {username && (
            <p className="form-helper-message" role="status">
              Your student username is <strong>{username}</strong>. Keep it safe for future sign-ins.
            </p>
          )}
          <button className="button button-pink auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Activating..." : "Create student access"} {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>
        <p className="auth-switch">Already activated? <Link to="/student/login">Student sign in</Link></p>
        <Link className="auth-back" to="/">Back to home</Link>
      </div>
    </section>
  );
}
