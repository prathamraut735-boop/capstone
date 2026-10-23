import { LockKeyhole } from "lucide-react";
import { restrictedNeedsSamples } from "../../data/teacherData";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";

export default function TeacherLearnerNeeds() {
  return (
    <>
      <RolePageHeading eyebrow="RESTRICTED STAFF VIEW · DEMO DATA" title="Learner needs" description="A limited visual example of relevant support notes for assigned sessions." />
      <div className="teacher-restricted-banner"><LockKeyhole size={20} /><div><strong>Restricted information — authorised staff only</strong><p>This frontend does not enforce access permissions. Production requires approved role controls and privacy procedures.</p></div></div>
      <DemoNote tone="yellow">These are carefully limited, entirely fictional support-note placeholders. This screen is not an access-control system.</DemoNote>
      <div className="teacher-needs-list">
        {restrictedNeedsSamples.map((record) => (
          <article className="teacher-panel teacher-need-card" key={record.id}>
            <div className="teacher-need-header"><span className="teacher-list-avatar">{record.id.slice(-1)}</span><div><span className="eyebrow">LEARNER IDENTIFIER</span><h2>{record.id}</h2></div></div>
            <div><strong>Relevant support note</strong><p>{record.note}</p></div>
            <div><strong>Related session</strong><p>{record.session}</p></div>
          </article>
        ))}
      </div>
    </>
  );
}
