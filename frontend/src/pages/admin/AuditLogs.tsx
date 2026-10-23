import { Activity, CircleHelp, FileClock } from "lucide-react";
import { DataTable, DemoNote, RolePageHeading } from "../../components/RoleUI";
import { demoAuditLogs } from "../../data/parentAdminData";

export default function AuditLogs() {
  return (
    <div className="role-content">
      <RolePageHeading eyebrow="VISUAL ACTIVITY PREVIEW" title="Audit logs" description="A fictional activity list to preview a future administrative audit interface." />
      <DemoNote tone="yellow">This is a visual demo only — it is not a real security audit log and does not record user activity.</DemoNote>
      <section className="role-panel admin-list-panel">
        <div className="role-panel-heading"><div><span className="eyebrow">SAMPLE EVENTS</span><h2>Recent activity records</h2></div><span className="role-icon-chip purple"><Activity size={17} /></span></div>
        <DataTable
          headers={["Timestamp", "Actor", "Action", "Record type"]}
          rows={demoAuditLogs.map((log) => [
            <span className="audit-time" key="time"><FileClock size={14} />{log.time}</span>,
            <strong key="actor">{log.actor}</strong>,
            log.action,
            <span className="role-status status-draft" key="record">{log.record}</span>,
          ])}
        />
        <div className="admin-safety-foot"><CircleHelp size={16} /> A production audit system would require backend implementation, access controls and integrity protections.</div>
      </section>
    </div>
  );
}
