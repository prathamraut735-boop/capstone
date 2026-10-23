import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { teacherLearners } from "../../data/teacherData";
import { DataTable, DemoNote, RolePageHeading } from "../../components/RoleUI";
import { TeacherStatus } from "../../components/TeacherUI";

export default function TeacherLearners() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("All levels");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState<string | null>(null);
  const learners = useMemo(() => teacherLearners.filter((learner) =>
    `${learner.id} ${learner.displayName}`.toLowerCase().includes(search.toLowerCase())
    && (level === "All levels" || learner.level === level)
    && (status === "All statuses" || learner.progressStatus === status)
  ), [level, search, status]);
  const learner = teacherLearners.find((item) => item.id === selected);

  return (
    <>
      <RolePageHeading eyebrow="TEACHER WORKSPACE · DEMO DATA" title="My learners" description="A teaching-focused view of fictional learners assigned to this example workspace." />
      <DemoNote>Sample learner identifiers and activity only. No public profiles or messaging are available.</DemoNote>
      <section className="teacher-panel">
        <div className="teacher-filters">
          <label>Search learners<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ID or display name" /></label>
          <label>Learning level<select value={level} onChange={(event) => setLevel(event.target.value)}><option>All levels</option><option>Level 1</option><option>Level 2</option></select></label>
          <label>Progress status<select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>On track</option><option>Needs review</option><option>Awaiting practice</option></select></label>
        </div>
        <DataTable headers={["Learner", "Level", "Recent lesson activity", "Latest practice", "Progress", ""]} rows={learners.map((item) => [
          <span key="learner"><strong>{item.displayName}</strong><small className="teacher-cell-subtitle">{item.id}</small></span>,
          item.level,
          item.recentActivity,
          <TeacherStatus key="practice">{item.latestPracticeStatus}</TeacherStatus>,
          <TeacherStatus key="progress">{item.progressStatus}</TeacherStatus>,
          <button key="view" type="button" className="teacher-text-button" onClick={() => setSelected(item.id)} aria-label={`View summary for ${item.id}`}>View summary</button>,
        ])} />
      </section>
      {learner && <section className="teacher-panel teacher-learner-summary" aria-live="polite">
        <div className="teacher-panel-heading"><div><span className="eyebrow">FICTIONAL LEARNER SUMMARY</span><h2>{learner.id}</h2></div><button type="button" className="teacher-text-button" onClick={() => setSelected(null)}>Close</button></div>
        <p>Display name: {learner.displayName} · Current learning level: {learner.level}</p>
        <p>Recent activity: {learner.recentActivity}</p>
        <p>Latest practice: <TeacherStatus>{learner.latestPracticeStatus}</TeacherStatus> · Progress: <TeacherStatus>{learner.progressStatus}</TeacherStatus></p>
        <Link className="teacher-inline-link" to="/teacher/reviews">Open practice reviews</Link>
      </section>}
    </>
  );
}
