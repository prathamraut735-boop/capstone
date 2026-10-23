import { ArrowRight, CalendarDays, CreditCard, Heart, MessageCircle, Music2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { demoChildren, demoSessions, demoTeacherFeedback } from "../../data/parentAdminData";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";

export default function ParentDashboard() {
  const feedback = demoTeacherFeedback[0];
  const session = demoSessions[0];

  return (
    <div className="role-content">
      <RolePageHeading eyebrow="FAMILY SPACE" title="Welcome to your family dashboard" description="A quick look at your family's music learning journey." />
      <DemoNote>Everything on this page is fictional demo information. There are no linked learner accounts or live bookings.</DemoNote>

      <section className="family-welcome-card">
        <div className="family-welcome-copy">
          <span className="family-welcome-icon"><Heart size={19} fill="currentColor" /></span>
          <span className="eyebrow">YOUR FAMILY MUSIC SPACE</span>
          <h2>Little steps, lovely progress.</h2>
          <p>See example learning activity and find the next step for your family.</p>
        </div>
        <div className="family-mini-stat"><strong>{demoChildren.length}</strong><span>sample learner profiles</span></div>
      </section>

      <div className="parent-dashboard-grid">
        <section className="role-panel parent-child-summary">
          <div className="role-panel-heading"><div><span className="eyebrow">LEARNER OVERVIEW</span><h2>Learning progress</h2></div><Link to="/parent/children" className="text-link">All children <ArrowRight size={15} /></Link></div>
          {demoChildren.map((learner, index) => (
            <div className="family-child-row" key={learner.id}>
              <span className={`family-avatar family-avatar-${index}`}>{learner.name.charAt(0)}</span>
              <div className="family-child-content">
                <div className="family-child-title"><strong>{learner.name}</strong><small>{learner.level}</small></div>
                <div className="family-progress-track"><span style={{ width: `${(learner.lessonsComplete / learner.lessonsTotal) * 100}%` }} /></div>
                <span className="family-progress-label">{learner.lessonsComplete} of {learner.lessonsTotal} sample lessons</span>
              </div>
            </div>
          ))}
          <p className="role-example-caption">Fictional learner information · teacher-guided progression</p>
        </section>

        <section className="role-panel feedback-preview">
          <div className="role-panel-heading"><div><span className="eyebrow">TEACHER NOTES</span><h2>Recent feedback</h2></div><span className="role-icon-chip purple"><MessageCircle size={17} /></span></div>
          <div className="sample-feedback-card">
            <span className="feedback-avatar"><Sparkles size={18} /></span>
            <div><strong>{feedback.child}</strong><small>{feedback.lesson} · {feedback.date}</small><p>“{feedback.note}”</p></div>
          </div>
          <span className="role-sample-label">SAMPLE FEEDBACK ONLY</span>
        </section>

        <section className="role-panel session-preview">
          <div className="role-panel-heading"><div><span className="eyebrow">IN-PERSON LEARNING</span><h2>Upcoming sessions</h2></div><span className="role-icon-chip teal"><CalendarDays size={17} /></span></div>
          <div className="session-mini-card"><strong>{session.title}</strong><span>{session.date} · {session.time}</span><small>{session.venue}</small><span className="role-status status-pending">Example session</span></div>
          <Link to="/parent/bookings" className="text-link">Explore bookings <ArrowRight size={15} /></Link>
        </section>

        <section className="role-panel subscription-preview">
          <div className="role-panel-heading"><div><span className="eyebrow">ONLINE LEARNING</span><h2>Subscription</h2></div><span className="role-icon-chip yellow"><CreditCard size={17} /></span></div>
          <div className="subscription-status-row"><span className="status-dot status-dot-yellow" /><strong>Illustrative demo status</strong></div>
          <p>Pricing and payment options are pending confirmation.</p>
          <Link to="/parent/subscription" className="button button-outline">Manage subscription <ArrowRight size={15} /></Link>
        </section>
      </div>

      <section className="role-panel parent-quick-links">
        <div className="role-panel-heading"><div><span className="eyebrow">FAMILY SHORTCUTS</span><h2>Where would you like to go?</h2></div></div>
        <div className="quick-link-grid">
          <Link to="/parent/children"><span className="quick-link-icon pink"><Heart size={18} /></span><strong>My Children</strong><small>Sample learner profiles</small><ArrowRight size={15} /></Link>
          <Link to="/parent/bookings"><span className="quick-link-icon teal"><CalendarDays size={18} /></span><strong>Bookings</strong><small>Explore example sessions</small><ArrowRight size={15} /></Link>
          <Link to="/parent/settings"><span className="quick-link-icon purple"><Music2 size={18} /></span><strong>Settings</strong><small>Preferences and consent</small><ArrowRight size={15} /></Link>
        </div>
      </section>
    </div>
  );
}
