import { ArrowRight, CalendarDays, ClipboardCheck, MessageCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { practiceReviews, teachingSessions } from "../../data/teacherData";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";
import { TeacherStat, TeacherStatus, ReviewTarget } from "../../components/TeacherUI";

export default function TeacherDashboard() {
  const pending = practiceReviews.filter((review) => review.status !== "Teacher Reviewed").length;
  return (
    <>
      <RolePageHeading eyebrow="TEACHER WORKSPACE · DEMO DATA" title="Welcome to your teaching space" description="A simple overview of example learner activity, practice reviews and upcoming sessions." />
      <DemoNote>Everything shown here is fictional demonstration data. This is not a live teacher account.</DemoNote>
      <section className="teacher-stats-grid" aria-label="Demo summary">
        <TeacherStat icon={Users} label="Assigned learners" value="4" detail="Fictional sample records" />
        <TeacherStat icon={ClipboardCheck} label="Pending reviews" value={pending} detail="Demo review queue" />
        <TeacherStat icon={CalendarDays} label="Upcoming sessions" value={teachingSessions.length} detail="Example in-person sessions" />
        <TeacherStat icon={MessageCircle} label="Feedback to check" value="2" detail="Illustrative follow-up count" />
      </section>
      <div className="teacher-dashboard-grid">
        <section className="teacher-panel">
          <div className="teacher-panel-heading"><div><h2>Recent practice submissions</h2><p>Example activity from fictional learners</p></div><Link to="/teacher/reviews">Review queue <ArrowRight size={15} /></Link></div>
          <div className="teacher-list">
            {practiceReviews.slice(0, 3).map((review) => (
              <div className="teacher-list-row" key={review.id}>
                <span className="teacher-list-avatar">{review.learnerId.slice(-1)}</span>
                <div className="teacher-list-copy"><strong>{review.learnerId} · {review.lesson}</strong><small>{review.submitted}</small></div>
                <TeacherStatus>{review.status}</TeacherStatus>
              </div>
            ))}
          </div>
          <ReviewTarget />
        </section>
        <section className="teacher-panel">
          <div className="teacher-panel-heading"><div><h2>Upcoming sessions</h2><p>Fictional schedule</p></div><Link to="/teacher/sessions">Sessions <ArrowRight size={15} /></Link></div>
          <div className="teacher-list">
            {teachingSessions.map((session) => (
              <div className="teacher-list-row" key={session.id}>
                <span className="teacher-date-tile"><b>{session.date.split(" ")[1]?.replace(",", "")}</b><small>{session.date.split(" ")[0]}</small></span>
                <div className="teacher-list-copy"><strong>{session.title}</strong><small>{session.date} · {session.time}</small></div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="teacher-panel teacher-quick-links">
        <div className="teacher-panel-heading"><div><h2>Teacher tools</h2><p>Quick links to your demo workspace</p></div></div>
        <div className="teacher-tool-links">
          <Link to="/teacher/learners">My learners <ArrowRight size={15} /></Link>
          <Link to="/teacher/reviews">Practice reviews <ArrowRight size={15} /></Link>
          <Link to="/teacher/lesson-plans">Lesson plans <ArrowRight size={15} /></Link>
          <Link to="/teacher/learner-needs">Restricted learner needs <ArrowRight size={15} /></Link>
        </div>
      </section>
    </>
  );
}
