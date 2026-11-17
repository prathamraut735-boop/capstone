import { useState } from "react";
import { Check, CircleHelp, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";
import {
  cancelParentSubscription,
  changeParentSubscription,
  type SubscriptionPlan,
} from "../../backendApi";
import { useParentSubscription } from "../../hooks/useParentSubscription";

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

export default function ParentSubscription() {
  const { user, overview, loading, error, reload } = useParentSubscription();
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlan["id"] | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  const currentPlan = overview?.plans.find((plan) => plan.id === overview.subscription.effectivePlanId);
  const selectedPlan = overview?.plans.find((plan) => plan.id === selectedPlanId);

  async function confirmPlanChange() {
    if (!user || !selectedPlanId) return;
    setIsSaving(true);
    setActionError("");
    setMessage("");
    try {
      await changeParentSubscription(user, selectedPlanId);
      setSelectedPlanId(null);
      setMessage("Your simulated plan change is active. No payment was taken.");
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "The plan could not be changed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmCancellation() {
    if (!user) return;
    setIsSaving(true);
    setActionError("");
    setMessage("");
    try {
      await cancelParentSubscription(user);
      setConfirmCancel(false);
      setMessage("The simulated subscription was cancelled. Free Plan access is now active.");
      reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "The subscription could not be cancelled.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="role-content">
      <RolePageHeading
        eyebrow="ONLINE LEARNING ACCESS"
        title="Subscription"
        description="Choose the learning access that works for your family. Plan changes are simulated and take effect immediately."
      />
      {/* <DemoNote tone="yellow">
        University project prototype only. No payment gateway, recurring charge, card details, or real billing is used.
      </DemoNote> */}

      {loading && <p className="subscription-feedback" role="status">Loading your subscription…</p>}
      {!loading && error && <p className="subscription-feedback subscription-error" role="alert">{error}</p>}
      {!loading && !user && (
        <p className="subscription-feedback" role="alert">Sign in with a parent account to manage a subscription.</p>
      )}

      {currentPlan && overview && (
        <>
          <div className="subscription-page-grid">
            <section className="role-panel subscription-main-card">
              <div className="subscription-card-heading">
                <span className="role-icon-chip purple"><Sparkles size={19} /></span>
                <span className={`role-status ${overview.subscription.status === "active" ? "status-published" : "status-draft"}`}>
                  {overview.subscription.status === "cancelled" ? "Cancelled · Free access" : "Active · Simulated"}
                </span>
              </div>
              <span className="eyebrow">YOUR CURRENT PLAN</span>
              <h2>{currentPlan.name} Plan</h2>
              <p className="subscription-description">
                {formatPrice(currentPlan.priceCents)} per month · {overview.subscription.limits.maxLearners} learner
                {overview.subscription.limits.maxLearners === 1 ? "" : "s"} maximum
              </p>
              <div className="subscription-includes">
                {currentPlan.features.map((feature) => (
                  <span key={feature}><Check size={15} /> {feature}</span>
                ))}
              </div>
              <div className="subscription-usage-grid">
                <span><strong>{overview.subscription.activeLearnerCount} / {overview.subscription.limits.maxLearners}</strong><small>Active learners</small></span>
                <span><strong>{overview.subscription.practiceSubmissionsUsed} / {overview.subscription.limits.practiceSubmissionsPerMonth}</strong><small>Family practice submissions this UTC month</small></span>
              </div>
              <p className="subscription-date">
                {overview.subscription.startedAt
                  ? `Plan started ${new Date(overview.subscription.startedAt).toLocaleDateString("en-GB")}`
                  : "Free access is active. Confirm a plan below to save it to your account."}
              </p>
              {overview.subscription.status === "active" && overview.subscription.effectivePlanId !== "free" && (
                <button
                  className="button button-outline"
                  type="button"
                  onClick={() => { setConfirmCancel(true); setSelectedPlanId(null); setActionError(""); }}
                  disabled={isSaving}
                >
                  Cancel simulated subscription
                </button>
              )}
            </section>

            <aside className="role-panel billing-placeholder-card">
              <span className="role-icon-chip teal"><ShieldCheck size={18} /></span>
              <h3>Prototype billing</h3>
              <p>This project does not collect money or store payment details.</p>
              <div className="billing-placeholder-row"><CircleHelp size={15} /><span>Billing cycle<br /><strong>Monthly (demonstration)</strong></span></div>
              <div className="billing-placeholder-row"><CircleHelp size={15} /><span>Payment method<br /><strong>Not requested</strong></span></div>
              <div className="billing-safe-note">Confirmations update Firestore only. No payment is processed.</div>
            </aside>
          </div>

          <section className="subscription-plans-section">
            <div className="role-panel-heading">
              <div><span className="eyebrow">CHOOSE A PLAN</span><h2>Family learning plans</h2></div>
            </div>
            <div className="subscription-plan-grid">
              {overview.plans.map((plan) => {
                const isCurrent = plan.id === overview.subscription.effectivePlanId;
                const isSelected = plan.id === selectedPlanId;
                const canConfirm = !isCurrent || !overview.subscription.isPersisted || overview.subscription.status === "cancelled";
                return (
                  <article className={`subscription-plan-card ${isCurrent ? "subscription-plan-current" : ""} ${isSelected ? "subscription-plan-selected" : ""}`} key={plan.id}>
                    <div className="subscription-plan-heading">
                      <h3>{plan.name}</h3>
                      {isCurrent && <span className="role-status status-published">Current</span>}
                    </div>
                    <p className="subscription-plan-price"><strong>{formatPrice(plan.priceCents)}</strong><span> / month</span></p>
                    <p className="subscription-plan-limits">
                      Up to {plan.maxLearners} learner{plan.maxLearners === 1 ? "" : "s"} · {plan.practiceSubmissionsPerMonth} family practice submissions per UTC month
                    </p>
                    <ul>
                      {plan.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}
                    </ul>
                    <button
                      className={`button ${isCurrent ? "button-outline" : "button-pink"}`}
                      type="button"
                      disabled={isSaving || (isCurrent && !canConfirm)}
                      onClick={() => { setSelectedPlanId(plan.id); setConfirmCancel(false); setActionError(""); setMessage(""); }}
                    >
                      {isCurrent && !canConfirm ? "Current plan" : isCurrent ? "Confirm Free Plan" : `Choose ${plan.name}`}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          {selectedPlan && (
            <section className="subscription-confirm-box" aria-labelledby="confirm-plan-heading">
              <h3 id="confirm-plan-heading">Confirm {selectedPlan.name} Plan</h3>
              <p>
                This simulated change will apply immediately. It updates your plan and entitlements in Firestore;
                it does not charge you or start real recurring billing.
              </p>
              <div>
                <button className="button button-pink" type="button" onClick={() => void confirmPlanChange()} disabled={isSaving}>
                  {isSaving ? "Saving…" : "Confirm simulated plan"}
                </button>
                <button className="button button-outline" type="button" onClick={() => setSelectedPlanId(null)} disabled={isSaving}>
                  Go back
                </button>
              </div>
            </section>
          )}

          {confirmCancel && (
            <section className="subscription-confirm-box" aria-labelledby="confirm-cancel-heading">
              <h3 id="confirm-cancel-heading">Cancel this simulated subscription?</h3>
              <p>Cancellation takes effect immediately and switches learning access to the Free Plan. No payment or refund is involved.</p>
              <div>
                <button className="button button-pink" type="button" onClick={() => void confirmCancellation()} disabled={isSaving}>
                  {isSaving ? "Cancelling…" : "Confirm cancellation"}
                </button>
                <button className="button button-outline" type="button" onClick={() => setConfirmCancel(false)} disabled={isSaving}>
                  Keep current plan
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {(actionError || message) && (
        <p className={`subscription-feedback ${actionError ? "subscription-error" : ""}`} role={actionError ? "alert" : "status"}>
          {actionError || message}
        </p>
      )}
    </div>
  );
}
