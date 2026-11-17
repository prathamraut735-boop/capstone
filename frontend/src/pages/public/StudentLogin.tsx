import { useState, type FormEvent } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithCustomToken, type User } from "firebase/auth";
import Brand from "../../components/Brand";
import { auth } from "../../firebase";
import { getFirebaseAuthErrorMessage } from "../../firebaseAuthErrors";
import { getStudentProfile, loginStudent, setStudentUsername } from "../../backendApi";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameSetupUser, setUsernameSetupUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      if (usernameSetupUser) {
        await setStudentUsername(usernameSetupUser, username.trim());
        navigate("/student/dashboard", { replace: true });
        return;
      }

      const login = await loginStudent(identifier.trim(), password);
      const credential = await signInWithCustomToken(auth, login.customToken);
      const profile = await getStudentProfile(credential.user);
      if (!profile.username) {
        setUsernameSetupUser(credential.user);
        setPassword("");
        setNotice("Choose a username for easier sign-ins next time.");
        return;
      }
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
          <p>
            {usernameSetupUser
              ? "Set a username you can remember. You can use it or your Student ID next time."
              : "Sign in with your Student ID or username. Ask your parent or guardian to reset your password if needed."}
          </p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {usernameSetupUser ? (
            <label className="form-field">
              <span>Choose a username</span>
              <input
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]{3,20}"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <small>Use 3-20 letters, numbers, or underscores.</small>
            </label>
          ) : (
            <>
              <label className="form-field">
                <span>Student ID or username</span>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="TC2026001 or username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
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
            </>
          )}
          {error && <p className="auth-error-message" role="alert">{error}</p>}
          {notice && <p className="form-helper-message" role="status">{notice}</p>}
          <button className="button button-pink auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? usernameSetupUser ? "Saving username..." : "Signing in..."
              : usernameSetupUser ? "Save username" : "Sign in"}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>
        <p className="auth-switch">Have an invitation code? <Link to="/student/activate">Activate student access</Link></p>
        <Link className="auth-back" to="/">Back to home</Link>
      </div>
    </section>
  );
}
