import { useMemo, useState } from "react";
import { teachingSessions, type TeachingSession } from "../../data/teacherData";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";
import { TeacherConfirmation, TeacherStatus } from "../../components/TeacherUI";

type Attendance = "Not marked" | "Present" | "Absent";

export default function TeacherSessions() {
  const [sessions, setSessions] = useState(teachingSessions);
  const [message, setMessage] = useState("");
  const totals = useMemo(() => {
    const records = sessions.flatMap((session) => session.registrations);
    return {
      present: records.filter((item) => item.attendance === "Present").length,
      absent: records.filter((item) => item.attendance === "Absent").length,
      unmarked: records.filter((item) => item.attendance === "Not marked").length,
    };
  }, [sessions]);

  function updateAttendance(sessionId: string, registrationId: string, attendance: Attendance) {
    setSessions((current) => current.map((session) => session.id === sessionId ? {
      ...session,
      registrations: session.registrations.map((registration) => registration.id === registrationId ? { ...registration, attendance } : registration),
    } : session));
    setMessage(`Attendance marked ${attendance.toLowerCase()} in this browser demo only. It has not been saved to a server.`);
  }

  return (
    <>
      <RolePageHeading eyebrow="TEACHER WORKSPACE · DEMO DATA" title="Sessions & attendance" description="Review example in-person sessions and try local attendance controls." />
      <DemoNote>Session details and registrations are fictional. Attendance changes are temporary and reset when this page is refreshed.</DemoNote>
      {message && <TeacherConfirmation>{message}</TeacherConfirmation>}
      <section className="teacher-attendance-summary" aria-label="Demo attendance summary">
        <div><strong>{totals.present}</strong><span>Present</span></div>
        <div><strong>{totals.absent}</strong><span>Absent</span></div>
        <div><strong>{totals.unmarked}</strong><span>Not marked</span></div>
      </section>
      <div className="teacher-session-grid">
        {sessions.map((session) => <SessionCard key={session.id} session={session} onAttendanceChange={updateAttendance} />)}
      </div>
    </>
  );
}

function SessionCard({ session, onAttendanceChange }: {
  session: TeachingSession;
  onAttendanceChange: (sessionId: string, registrationId: string, attendance: Attendance) => void;
}) {
  return (
    <section className="teacher-panel teacher-session-card">
      <div className="teacher-panel-heading"><div><span className="eyebrow">{session.date}</span><h2>{session.title}</h2><p>{session.time} · {session.venue}</p></div></div>
      <h3>Registration list <span className="sample-tag">Demo</span></h3>
      <div className="teacher-attendance-list">
        {session.registrations.map((registration) => (
          <div className="teacher-attendance-row" key={registration.id}>
            <div><strong>{registration.learnerId}</strong><small>Fictional learner identifier</small></div>
            <TeacherStatus>{registration.attendance}</TeacherStatus>
            <div className="teacher-attendance-actions" aria-label={`Set attendance for ${registration.learnerId}`}>
              <button type="button" aria-pressed={registration.attendance === "Present"} onClick={() => onAttendanceChange(session.id, registration.id, "Present")}>Present</button>
              <button type="button" aria-pressed={registration.attendance === "Absent"} onClick={() => onAttendanceChange(session.id, registration.id, "Absent")}>Absent</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
