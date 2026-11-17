import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import Brand from "../../components/Brand";
import { auth } from "../../firebase";
import { getFirebaseAuthErrorMessage } from "../../firebaseAuthErrors";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [authError, setAuthError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setEmailSent(false);
    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setEmailSent(true);
    } catch (error) {
      setAuthError(getFirebaseAuthErrorMessage(error));
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
          <span className="eyebrow">PARENT ACCOUNT RECOVERY</span>
          <h1>Forgot your password?</h1>
          <p>Enter the email address linked to your parent account and we’ll send you a password reset link.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {emailSent && (
            <p className="form-helper-message" role="status">
              If an account exists for this address, a password reset email has been sent. Check your inbox.
            </p>
          )}
          {authError && <p className="auth-error-message" role="alert">{authError}</p>}
          <button className="button button-pink auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending link..." : "Send reset link"} {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>
        <Link className="auth-back" to="/login"><ArrowLeft size={15} /> Back to login</Link>
      </div>
    </section>
  );
}
