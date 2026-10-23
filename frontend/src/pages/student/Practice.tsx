import { useState } from "react";
import { AudioLines, Check, Clock3, FileAudio2, LockKeyhole, Mic2, ShieldCheck, Upload } from "lucide-react";
import { recentPractices } from "../../data/mockData";
import { PageHeading, SectionTitle, StatusPill } from "../../components/UI";

export default function Practice() {
  const [demoMessage, setDemoMessage] = useState(false);
  return (
    <div className="page-content">
      <PageHeading eyebrow="YOUR PRACTICE SPACE" title="My Practice">A calm place to try things out and share your progress with your teacher.</PageHeading>
      <div className="privacy-banner"><ShieldCheck size={20} /><span><strong>Your practice stays private.</strong> Audio submissions are for your teacher only — no public sharing or student-to-student messaging.</span></div>
      <div className="practice-grid">
        <section className="panel upload-panel">
          <div className="panel-heading-icon"><span className="upload-icon"><Mic2 size={21} /></span><div><h2>Record or add a practice</h2><p>Ready when you are — no need to get it perfect.</p></div></div>
          <button className="upload-zone" type="button" onClick={() => setDemoMessage(true)}>
            <span className="upload-round"><Upload size={21} /></span>
            <strong>Audio practice demo</strong>
            <span>This is a visual demo only. Recording and uploads are not enabled.</span>
            <span className="upload-formats"><FileAudio2 size={14} /> Audio only <i /> Up to 4 minutes</span>
          </button>
          {demoMessage && <div className="inline-demo-message" role="status"><Check size={16} /> Demo only — no recording or files were uploaded.</div>}
          <div className="upload-foot"><LockKeyhole size={15} /><span>Video uploads are not accepted. Your audio is private and teacher-reviewed.</span></div>
        </section>
        <aside className="practice-tip">
          <span className="tip-sparkle">✦</span><span className="eyebrow">A LITTLE REMINDER</span>
          <h2>Practice your way</h2>
          <p>Try a few minutes at a time. You can always come back and have another go.</p>
          <div className="tip-doodle">♫ <span>♪</span> ♫</div>
          <div className="duration-chip"><Clock3 size={15} /> Max recording: 4 minutes</div>
        </aside>
      </div>
      <section className="panel submissions-panel">
        <SectionTitle title="Previous submissions" />
        <div className="submission-list">
          {recentPractices.map((practice, index) => (
            <div className="submission-row" key={practice.title}>
              <span className={`submission-wave wave-${index}`}><AudioLines size={19} /></span>
              <span className="submission-copy"><strong>{practice.title}</strong><small>{practice.date} <i /> Audio only <i /> Example submission</small></span>
              <StatusPill tone={index === 1 ? "green" : "yellow"}>{index === 1 ? <><Check size={12} /> Teacher feedback</> : "Waiting for teacher"}</StatusPill>
            </div>
          ))}
        </div>
        <p className="example-note">These are fictional examples. No audio recordings are stored or played here.</p>
      </section>
    </div>
  );
}
