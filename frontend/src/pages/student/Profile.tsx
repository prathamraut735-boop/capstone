import { useState } from "react";
import { Bell, Check, CircleHelp, Music2, Sparkles, Volume2 } from "lucide-react";
import { PageHeading, StatusPill } from "../../components/UI";

export default function Profile() {
  const [soundOn, setSoundOn] = useState(true);
  const [remindersOn, setRemindersOn] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <div className="page-content">
      <PageHeading eyebrow="YOUR LITTLE CORNER" title="My Profile">A simple demo profile and preferences for your learning space.</PageHeading>
      <div className="profile-grid">
        <section className="panel profile-card">
          <span className="avatar avatar-large">S</span>
          <h2>Sunny Student</h2>
          <p>Music explorer</p>
          <StatusPill tone="purple">Sample profile</StatusPill>
          <div className="profile-divider" />
          <div className="profile-detail"><span><Music2 size={16} /> Learning focus</span><strong>Singing & ukulele</strong></div>
          <div className="profile-detail"><span><Sparkles size={16} /> My level</span><strong>Level 1 · Sample</strong></div>
          <div className="profile-privacy"><CircleHelp size={16} /><span>Fictional example details only. This demo does not create accounts or collect personal information.</span></div>
        </section>
        <section className="panel preferences-panel">
          <div className="preferences-heading"><span className="preferences-icon"><Sparkles size={19} /></span><div><h2>My preferences</h2><p>Make your learning space feel like yours.</p></div></div>
          <div className="preference-row">
            <span className="preference-symbol teal"><Volume2 size={18} /></span><span className="preference-copy"><strong>Sound effects</strong><small>Play friendly sounds around the site</small></span>
            <button className={`toggle-switch ${soundOn ? "toggle-on" : ""}`} type="button" role="switch" aria-checked={soundOn} aria-label="Sound effects" onClick={() => { setSoundOn(!soundOn); setSaved(false); }}><span /></button>
          </div>
          <div className="preference-row">
            <span className="preference-symbol yellow"><Bell size={18} /></span><span className="preference-copy"><strong>Practice reminders</strong><small>A gentle reminder to practise</small></span>
            <button className={`toggle-switch ${remindersOn ? "toggle-on" : ""}`} type="button" role="switch" aria-checked={remindersOn} aria-label="Practice reminders" onClick={() => { setRemindersOn(!remindersOn); setSaved(false); }}><span /></button>
          </div>
          <div className="preference-note"><CircleHelp size={15} /> Preferences are saved only for this visit and reset when the page reloads.</div>
          <button className="button button-pink save-preferences" onClick={() => setSaved(true)}>{saved ? <><Check size={17} /> Preferences updated</> : "Save preferences"}</button>
          {saved && <div className="saved-status" role="status">Your demo preferences are updated for now.</div>}
        </section>
      </div>
      <div className="safety-footer"><span>💛</span><p>In the full learning space, your profile and practice would be private. This frontend demo has no accounts, uploads, or personal data collection.</p></div>
    </div>
  );
}
