import { useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";
import { TeacherConfirmation } from "../../components/TeacherUI";

export default function TeacherIncidents() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
  }

  return (
    <>
      <RolePageHeading eyebrow="DEMO FORM · NOT A REPORTING SERVICE" title="Incident reports" description="A form demonstration only. Do not enter real personal, safeguarding or incident information." />
      <div className="teacher-incident-warning"><AlertTriangle size={21} /><div><strong>This is not a real safeguarding reporting service</strong><p>For production use, an approved process, secure access controls and clear escalation contacts are essential.</p></div></div>
      <DemoNote>Submit will only show an on-screen demo confirmation. No report is saved or transmitted.</DemoNote>
      {submitted && <TeacherConfirmation>Demo report submitted visually. No real incident report was transmitted or saved.</TeacherConfirmation>}
      <form className="teacher-panel teacher-incident-form" onSubmit={handleSubmit}>
        <label className="teacher-field">Session reference
          <select required defaultValue="">
            <option value="" disabled>Select a fictional session reference</option>
            <option value="SES-401">SES-401 · Example singing circle</option>
            <option value="SES-402">SES-402 · Example ukulele group</option>
          </select>
        </label>
        <div className="teacher-form-two-col">
          <label className="teacher-field">Date<input type="date" required /></label>
          <label className="teacher-field">Time<input type="time" required /></label>
        </div>
        <label className="teacher-field">Factual incident description
          <textarea required minLength={10} maxLength={1000} rows={4} placeholder="Use fictional example wording only. Do not include real names or sensitive details." />
        </label>
        <label className="teacher-field">Immediate action taken
          <textarea required minLength={5} maxLength={600} rows={3} placeholder="Fictional action taken (demo only)" />
        </label>
        <label className="teacher-field">Escalation status
          <select required defaultValue="">
            <option value="" disabled>Select a demo status</option>
            <option>Not escalated · demo</option>
            <option>Escalated to example contact · demo</option>
            <option>Follow-up required · demo</option>
          </select>
        </label>
        <button className="button button-pink" type="submit">Submit Report (demo)</button>
      </form>
    </>
  );
}
