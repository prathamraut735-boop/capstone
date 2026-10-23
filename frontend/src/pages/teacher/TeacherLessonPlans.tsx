import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { lessonPlanResources } from "../../data/teacherData";
import { DataTable, DemoNote, RolePageHeading } from "../../components/RoleUI";
import { TeacherConfirmation, TeacherEmptyState } from "../../components/TeacherUI";

export default function TeacherLessonPlans() {
  const [message, setMessage] = useState("");
  return (
    <>
      <RolePageHeading eyebrow="TEACHER WORKSPACE · DEMO DATA" title="Lesson plans" description="Example teaching resources and a visual-only resource upload placeholder." />
      <DemoNote>No files are selected, uploaded or stored. This button only demonstrates where a future resource workflow could begin.</DemoNote>
      {message && <TeacherConfirmation>{message}</TeacherConfirmation>}
      <section className="teacher-panel teacher-resource-placeholder">
        <div className="teacher-resource-icon"><Upload size={22} /></div>
        <div><h2>Add a teaching resource</h2><p>File selection and backend storage are not connected in this frontend demo.</p></div>
        <button className="button button-outline" type="button" onClick={() => setMessage("Upload resource is a visual demo only. No file chooser opened and no file was uploaded.")}>Demo: Upload Resource</button>
      </section>
      <section className="teacher-panel">
        <div className="teacher-panel-heading"><div><h2>Available resources</h2><p>Fictional resource records</p></div></div>
        {lessonPlanResources.length ? (
          <DataTable headers={["Resource", "Related topic", "Date", "Status"]} rows={lessonPlanResources.map((resource) => [
            <span className="teacher-resource-name" key="title"><FileText size={17} />{resource.title}</span>,
            resource.topic,
            resource.date,
            resource.status,
          ])} />
        ) : <TeacherEmptyState title="No resources yet">Demo resources will appear here when available.</TeacherEmptyState>}
      </section>
    </>
  );
}
