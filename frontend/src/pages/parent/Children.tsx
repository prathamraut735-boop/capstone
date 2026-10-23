import { useState } from "react";
import { ArrowRight, Check, Heart, Link2, Plus, UserRound } from "lucide-react";
import { demoChildren } from "../../data/parentAdminData";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";

export default function Children() {
  const [showDemoMessage, setShowDemoMessage] = useState(false);

  return (
    <div className="role-content">
      <RolePageHeading eyebrow="FAMILY LEARNERS" title="My Children" description="Fictional learner cards showing the kind of overview a guardian may see." />
      <DemoNote>These sample profiles are not linked to real accounts. Do not enter a child's personal or sensitive information in this demo.</DemoNote>
      <div className="children-grid">
        {demoChildren.map((child, index) => (
          <article className="role-panel child-profile-card" key={child.id}>
            <div className="child-profile-top"><span className={`child-profile-avatar child-avatar-${index}`}>{child.name.charAt(0)}</span><span className="role-status status-published">Demo learner</span></div>
            <h2>{child.name}</h2>
            <p>{child.level}</p>
            <div className="child-card-progress"><div><strong>Learning progress</strong><small>{child.lessonsComplete} of {child.lessonsTotal} example lessons</small></div><span>{Math.round((child.lessonsComplete / child.lessonsTotal) * 100)}%</span></div>
            <div className="family-progress-track"><span style={{ width: `${(child.lessonsComplete / child.lessonsTotal) * 100}%` }} /></div>
            <div className="child-recent-activity"><Check size={15} /><span>{child.recentActivity}</span></div>
            <span className="role-example-caption">Sample information only</span>
          </article>
        ))}
        <button className="link-child-placeholder" type="button" onClick={() => setShowDemoMessage(true)}>
          <span className="add-child-icon"><Plus size={22} /></span>
          <strong>Add or link a learner</strong>
          <span>Account linking will be available through a future approved guardian workflow.</span>
          <span className="placeholder-action">Demo placeholder <ArrowRight size={14} /></span>
        </button>
      </div>
      {showDemoMessage && (
        <div className="role-inline-message" role="status"><Link2 size={16} /> Demo only — no learner account was linked.</div>
      )}
      <section className="role-panel child-safety-card">
        <span className="quick-link-icon pink"><UserRound size={18} /></span>
        <div><strong>Guardian-managed learner access</strong><p>Real learner accounts and guardian relationships will need an approved, privacy-conscious workflow.</p></div>
        <Heart size={19} />
      </section>
    </div>
  );
}
