import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Brand from "../../components/Brand";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [demoReady, setDemoReady] = useState(false);
  const [forgotMessage, setForgotMessage] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDemoReady(true);
  }

  return (
    <section className="auth-page">
      <div className="auth-card login-card">
        <Brand className="brand auth-brand" />
        <div className="auth-heading">
          <span className="auth-welcome-icon"><Sparkles size={18} /></span>
          <span className="eyebrow">WELCOME BACK</span>
          <h1>Log in to your space</h1>
          <p>This is a frontend demo. Use any valid email and a password of at least eight characters to preview the student area.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Email address</span>
            <input type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
          </label>
          <div className="form-field">
            <label htmlFor="login-password">Password</label>
            <span className="password-field">
              <input id="login-password" type={showPassword ? "text" : "password"} name="password" autoComplete="current-password" placeholder="Enter your password" required minLength={8} />
              <button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </div>
          <div className="form-options">
            <label className="checkbox-field"><input type="checkbox" name="remember" /> <span>Remember me</span></label>
            <button className="forgot-link" type="button" onClick={() => setForgotMessage(true)}>Forgot password?</button>
          </div>
          {forgotMessage && <p className="form-helper-message" role="status">Password reset is not available in this demo.</p>}
          <button className="button button-pink auth-submit" type="submit">Log in <ArrowRight size={16} /></button>
        </form>
        {demoReady && (
          <div className="demo-result" role="status">
            <span className="demo-result-icon"><LockKeyhole size={17} /></span>
            <div><strong>Demo only — you are not logged in.</strong><p>No account was checked and no session was created.</p></div>
            <Link to="/student/dashboard" className="button button-outline">Visit student demo <ArrowRight size={15} /></Link>
          </div>
        )}
        <p className="auth-switch">New to Toy Choir TV? <Link to="/signup">Create a parent account</Link></p>
        <Link className="auth-back" to="/"><ArrowLeft size={15} /> Back to home</Link>
      </div>
    </section>
  );
}
