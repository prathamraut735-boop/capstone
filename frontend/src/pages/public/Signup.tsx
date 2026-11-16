import { useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "../../components/Brand";
import { auth } from "../../firebase";
import { getFirebaseAuthErrorMessage } from "../../firebaseAuthErrors";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { saveUserProfile } from "../../userProfile";

export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [authError, setAuthError] = useState("");

  function validatePasswordMatch(event: ChangeEvent<HTMLInputElement>) {
    const form = event.currentTarget.form;
    const password = form?.elements.namedItem("password");
    const confirmation = form?.elements.namedItem("confirmPassword");
    if (password instanceof HTMLInputElement && confirmation instanceof HTMLInputElement) {
      confirmation.setCustomValidity(
        confirmation.value && confirmation.value !== password.value
          ? "Passwords do not match."
          : "",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAccountCreated(false);
    const form = event.currentTarget;
    const values = new FormData(form);
    const fullName = String(values.get("fullName") ?? "").trim();
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    const confirmation = String(values.get("confirmPassword") ?? "");
    const confirmationInput = form.elements.namedItem("confirmPassword");

    if (confirmationInput instanceof HTMLInputElement && password !== confirmation) {
      confirmationInput.setCustomValidity("Passwords do not match.");
      confirmationInput.reportValidity();
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      let profileUpdateError = "";
      try {
        await updateProfile(credential.user, { displayName: fullName });
      } catch (error) {
        profileUpdateError = getFirebaseAuthErrorMessage(error);
      }

      try {
        await saveUserProfile(credential.user, fullName);
      } catch (error) {
        setAccountCreated(true);
        const profileError = getFirebaseAuthErrorMessage(error);
        setAuthError(
          `Your account was created, but its Firestore profile could not be saved. Log in to try syncing it again. ${profileError}`,
        );
        return;
      }

      if (profileUpdateError) {
        setAccountCreated(true);
        setAuthError(
          `Your account and Firestore profile were created, but we couldn't update your authentication profile. ${profileUpdateError}`,
        );
        return;
      }

      navigate("/parent/dashboard", { replace: true });
    } catch (error) {
      setAuthError(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page signup-page">
      <div className="auth-card signup-card">
        <Brand className="brand auth-brand" />
        <div className="auth-heading">
          <span className="auth-welcome-icon signup-icon"><ShieldCheck size={18} /></span>
          <span className="eyebrow">PARENT OR GUARDIAN</span>
          <h1>Create a parent account</h1>
          <p>Create an account to continue to the parent area.</p>
        </div>
          <form className="auth-form signup-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Full name</span>
              <input type="text" name="fullName" autoComplete="name" placeholder="Your full name" required />
            </label>
            <label className="form-field">
              <span>Email address</span>
              <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
            </label>
            <div className="form-field">
              <label htmlFor="signup-password">Password <small>At least 8 characters</small></label>
              <span className="password-field">
                <input id="signup-password" type={showPassword ? "text" : "password"} name="password" autoComplete="new-password" minLength={8} placeholder="Create a password" required onChange={validatePasswordMatch} />
                <button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </div>
            <label className="form-field">
              <span>Confirm password</span>
              <input type={showPassword ? "text" : "password"} name="confirmPassword" autoComplete="new-password" minLength={8} placeholder="Enter your password again" required onChange={validatePasswordMatch} />
            </label>
            <div className="checkbox-field consent-field">
              <input id="signup-consent" type="checkbox" name="consent" required />
              <span><label htmlFor="signup-consent">I confirm I am a parent or guardian and agree to the</label> <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a> (placeholders).</span>
            </div>
            {authError && <p className="auth-error-message" role="alert">{authError}</p>}
            {accountCreated && <Link className="button button-outline auth-submit" to="/parent/dashboard">Continue to parent area <ArrowRight size={16} /></Link>}
            {!accountCreated && <button className="button button-pink auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Create account"} {!isSubmitting && <ArrowRight size={16} />}</button>}
          </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
        <Link className="auth-back" to="/"><ArrowLeft size={15} /> Back to home</Link>
      </div>
    </section>
  );
}
