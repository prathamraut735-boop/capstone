import { useState } from "react";
import { Check, CircleHelp, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";

export default function ParentSubscription() {
  const [showManage, setShowManage] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div className="role-content">
      <RolePageHeading eyebrow="ONLINE LEARNING ACCESS" title="Subscription" description="An illustrative overview of how subscription information might be presented." />
      <DemoNote tone="yellow">Pricing, eligibility, billing periods and payment integration are pending confirmation.</DemoNote>
      <div className="subscription-page-grid">
        <section className="role-panel subscription-main-card">
          <div className="subscription-card-heading"><span className="role-icon-chip purple"><Sparkles size={19} /></span><span className="role-status status-draft">Illustrative demo</span></div>
          <span className="eyebrow">TOY CHOIR TV ONLINE LEARNING</span>
          <h2>Family learning access</h2>
          <p className="subscription-description">A future subscription may provide online lesson access for a family. The plan details are not final.</p>
          <div className="price-placeholder"><strong>Price to be confirmed</strong><span>Monthly billing period placeholder</span></div>
          <div className="subscription-includes"><span><Check size={15} /> Online lesson access concept</span><span><Check size={15} /> Guardian-linked learner access concept</span><span><Check size={15} /> Teacher-guided learning concept</span></div>
          <div className="subscription-status-panel"><span className="status-dot status-dot-yellow" /><div><strong>Sample status: Not active</strong><small>No real subscription is connected.</small></div></div>
          <button className="button button-outline" type="button" onClick={() => { setShowManage(!showManage); setMessage(""); }}><CreditCard size={15} /> Manage subscription demo</button>
          {showManage && (
            <div className="subscription-manage-box">
              <strong>Management controls preview</strong>
              <p>Subscription changes are unavailable until eligibility and billing are confirmed.</p>
              <div><button type="button" onClick={() => setMessage("Demo only. No subscription was changed.")}>Change plan</button><button type="button" onClick={() => setMessage("Demo only. No subscription was cancelled.")}>Cancel subscription</button></div>
              {message && <span className="role-inline-message" role="status">{message}</span>}
            </div>
          )}
        </section>
        <aside className="role-panel billing-placeholder-card">
          <span className="role-icon-chip teal"><ShieldCheck size={18} /></span><h3>Billing information</h3>
          <p>There are no card details or payment information in this frontend demo.</p>
          <div className="billing-placeholder-row"><CircleHelp size={15} /><span>Billing period<br /><strong>To be confirmed</strong></span></div>
          <div className="billing-placeholder-row"><CircleHelp size={15} /><span>Next payment<br /><strong>Not available</strong></span></div>
          <div className="billing-safe-note">No payment is collected or simulated.</div>
        </aside>
      </div>
    </div>
  );
}
