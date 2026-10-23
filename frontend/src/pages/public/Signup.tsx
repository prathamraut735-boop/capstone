import { useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Brand from "../../components/Brand";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [createdDemo, setCreatedDemo] = useState(false);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = values.get("password");
    const confirmation = values.get("confirmPassword");
    const confirmationInput = form.elements.namedItem("confirmPassword");

    if (confirmationInput instanceof HTMLInputElement && password !== confirmation) {
      confirmationInput.setCustomValidity("Passwords do not match.");
      confirmationInput.reportValidity();
      return;
    }

    setCreatedDemo(true);
    form.reset();
  }

  return (
    <section className="auth-page signup-page">
      <div className="auth-card signup-card">
        <Brand className="brand auth-brand" />
        <div className="auth-heading">
          <span className="auth-welcome-icon signup-icon"><ShieldCheck size={18} /></span>
          <span className="eyebrow">PARENT OR GUARDIAN</span>
          <h1>Create a parent account</h1>
          <p>This public demo shows the planned guardian signup flow. Student and staff accounts are not created here.</p>
        </div>
        {createdDemo ? (
          <div className="signup-success" role="status">
            <CheckCircle2 size={27} />
            <h2>Thanks for exploring!</h2>
            <p>This was a demonstration only. No account was created and no information was sent to a server.</p>
            <button className="button button-outline" type="button" onClick={() => setCreatedDemo(false)}>Back to signup form</button>
          </div>
        ) : (
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
            <button className="button button-pink auth-submit" type="submit">Create account <ArrowRight size={16} /></button>
          </form>
        )}
        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
        <Link className="auth-back" to="/"><ArrowLeft size={15} /> Back to home</Link>
      </div>
    </section>
  );
}
