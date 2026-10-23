import { useState, type ReactNode } from "react";
import { Bell, Check, CircleHelp, Mail, ShieldCheck, UserRound } from "lucide-react";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";

export default function ParentSettings() {
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="role-content">
      <RolePageHeading eyebrow="FAMILY PREFERENCES" title="Settings" description="Example guardian preferences and consent information placeholders." />
      <DemoNote>Settings are local to this page visit only and are not saved to an account or server.</DemoNote>
      <div className="parent-settings-grid">
        <section className="role-panel settings-card">
          <div className="role-panel-heading"><div><span className="eyebrow">ACCOUNT PREFERENCES</span><h2>Contact preferences</h2></div><span className="role-icon-chip purple"><UserRound size={17} /></span></div>
          <div className="settings-placeholder-row"><span><strong>Guardian account details</strong><small>Account profile management is not connected.</small></span><span className="role-status status-draft">Placeholder</span></div>
          <SettingsToggle icon={<Mail size={17} />} title="Email updates" detail="Example learning updates preference" value={emailUpdates} onChange={() => { setEmailUpdates(!emailUpdates); setSaved(false); }} />
          <SettingsToggle icon={<Bell size={17} />} title="Booking reminders" detail="Example session reminder preference" value={bookingReminders} onChange={() => { setBookingReminders(!bookingReminders); setSaved(false); }} />
          <button className="button button-pink settings-save" onClick={() => setSaved(true)}>{saved ? <><Check size={15} /> Preferences updated for demo</> : "Save demo preferences"}</button>
          {saved && <p className="settings-saved-message" role="status">These preferences reset when the page is reloaded.</p>}
        </section>
        <section className="role-panel consent-card">
          <span className="role-icon-chip teal"><ShieldCheck size={18} /></span><span className="eyebrow">GUARDIAN & CONSENT</span><h2>Important information</h2>
          <div className="consent-placeholder-item"><Check size={15} /><span><strong>Guardian relationship</strong><small>Will be verified through a future approved workflow.</small></span></div>
          <div className="consent-placeholder-item"><Check size={15} /><span><strong>Learning permissions</strong><small>Consent and permissions will be managed securely later.</small></span></div>
          <div className="consent-placeholder-item"><CircleHelp size={15} /><span><strong>Policy acknowledgements</strong><small>Policy content and confirmation records are not implemented.</small></span></div>
          <div className="settings-privacy-note"><ShieldCheck size={16} /> Do not enter real learner or sensitive information here.</div>
        </section>
      </div>
    </div>
  );
}

function SettingsToggle({ icon, title, detail, value, onChange }: { icon: ReactNode; title: string; detail: string; value: boolean; onChange: () => void }) {
  return (
    <div className="role-setting-row">
      <span className="role-setting-icon">{icon}</span><span className="role-setting-copy"><strong>{title}</strong><small>{detail}</small></span>
      <button type="button" className={`toggle-switch ${value ? "toggle-on" : ""}`} role="switch" aria-checked={value} aria-label={title} onClick={onChange}><span /></button>
    </div>
  );
}
