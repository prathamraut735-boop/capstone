import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../../components/Brand";
import { auth } from "../../firebase";
import { getFirebaseAuthErrorMessage } from "../../firebaseAuthErrors";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { saveUserProfile } from "../../userProfile";
import { getCurrentUserProfile, getStudentProfile, isStudentAuthEmail } from "../../backendApi";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");

    try {
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence,
      );
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (isStudentAuthEmail(credential.user.email)) {
        await getStudentProfile(credential.user);
        navigate("/student/dashboard", { replace: true });
        return;
      }
      await saveUserProfile(credential.user);
      await getCurrentUserProfile(credential.user);
      navigate("/parent/dashboard", { replace: true });
    } catch (error) {
      setAuthError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card login-card">
        <Brand className="brand auth-brand" />
        <div className="auth-heading">
          <span className="auth-welcome-icon"><Sparkles size={18} /></span>
          <span className="eyebrow">WELCOME BACK</span>
          <h1>Log in to your space</h1>
          <p>Log in with your parent or guardian account to continue.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Email address</span>
            <input type="email" name="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <div className="form-field">
            <label htmlFor="login-password">Password</label>
            <span className="password-field">
              <input id="login-password" type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" placeholder="Enter your password" required minLength={6} />
              <button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </div>
          <div className="form-options">
            <label className="checkbox-field"><input type="checkbox" name="remember" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /> <span>Remember me</span></label>
            <Link className="forgot-link" to="/forgot-password">Forgot password?</Link>
          </div>
          {authError && <p className="auth-error-message" role="alert">{authError}</p>}
          <button className="button button-pink auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Logging in..." : "Log in"} {!isSubmitting && <ArrowRight size={16} />}</button>
        </form>
        <p className="auth-switch">New to Toy Choir TV? <Link to="/signup">Create a parent account</Link></p>
        <Link className="auth-back" to="/"><ArrowLeft size={15} /> Back to home</Link>
      </div>
    </section>
  );
}
