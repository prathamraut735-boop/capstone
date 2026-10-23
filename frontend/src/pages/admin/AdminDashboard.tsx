import { Activity, ArrowRight, BookOpen, CircleHelp, ClipboardList, FileText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { DataTable, DemoNote, RolePageHeading } from "../../components/RoleUI";
import { demoContentActivity } from "../../data/parentAdminData";

const overviewStats = [
  { label: "Learners", value: "24", icon: Users, color: "pink" },
  { label: "Guardians", value: "18", icon: Users, color: "purple" },
  { label: "Teachers", value: "6", icon: Users, color: "teal" },
  { label: "Published lessons", value: "8", icon: BookOpen, color: "yellow" },
];

export default function AdminDashboard() {
  return (
    <div className="role-content">
      <RolePageHeading eyebrow="ADMIN OVERVIEW" title="Platform overview" description="A structured overview of example content and activity for the Toy Choir TV demo." />
      <DemoNote>All figures and activity shown here are fictional demo data — they are not live platform statistics or security records.</DemoNote>
      <div className="admin-stat-grid">
        {overviewStats.map(({ label, value, icon: Icon, color }) => (
          <div className="admin-stat-card" key={label}><span className={`admin-stat-icon ${color}`}><Icon size={18} /></span><span className="admin-stat-label">{label}</span><strong>{value}</strong><small>Demo figure</small></div>
        ))}
      </div>
      <div className="admin-overview-grid">
        <section className="role-panel admin-content-status">
          <div className="role-panel-heading"><div><span className="eyebrow">LESSON LIBRARY</span><h2>Content status</h2></div><Link className="text-link" to="/admin/content">Manage content <ArrowRight size={14} /></Link></div>
          <div className="admin-level-status"><span className="admin-level-number pink">01</span><span><strong>Level 1 · Sample content</strong><small>8 lesson examples available</small></span><span className="role-status status-published">Published · demo</span></div>
          <div className="admin-level-status"><span className="admin-level-number purple">02</span><span><strong>Level 2 · Learn to Harmonise</strong><small>8 lesson slots</small></span><span className="role-status status-draft">Unpublished</span></div>
          <div className="admin-level-status"><span className="admin-level-number teal">03</span><span><strong>Level 3 · Write & Create Your Own</strong><small>8 lesson slots</small></span><span className="role-status status-draft">Unpublished</span></div>
          <div className="admin-level-status"><span className="admin-level-number yellow">04</span><span><strong>Level 4 · Content to be confirmed</strong><small>8 lesson slots</small></span><span className="role-status status-draft">Unpublished</span></div>
          <p className="role-example-caption">Curriculum mapping is still subject to client confirmation.</p>
        </section>
        <section className="role-panel admin-queue-summary">
          <div className="role-panel-heading"><div><span className="eyebrow">TEAM FOLLOW-UP</span><h2>Support queue</h2></div><span className="role-icon-chip yellow"><ClipboardList size={17} /></span></div>
          <div className="queue-total"><strong>3</strong><span>sample requests</span></div>
          <div className="queue-status-row"><span>Pending review</span><span className="role-status status-pending">1 demo</span></div>
          <div className="queue-status-row"><span>Open</span><span className="role-status status-draft">1 demo</span></div>
          <div className="queue-status-row"><span>Resolved</span><span className="role-status status-resolved">1 demo</span></div>
          <Link className="text-link" to="/admin/support">Open support queue <ArrowRight size={14} /></Link>
        </section>
      </div>
      <section className="role-panel admin-activity-panel">
        <div className="role-panel-heading"><div><span className="eyebrow">EXAMPLE ACTIVITY</span><h2>Recent activity</h2></div><span className="role-icon-chip purple"><Activity size={17} /></span></div>
        <DataTable
          headers={["Actor", "Activity", "Record type", "Time", "Status"]}
          rows={demoContentActivity.slice(0, 4).map((item) => [
            <strong key="actor">{item.actor}</strong>,
            item.action,
            item.type,
            item.time,
            <span key="status" className={`role-status status-${item.status.toLowerCase()}`}>{item.status} · demo</span>,
          ])}
        />
        <p className="role-example-caption"><FileText size={13} /> Visual demonstration only. This is not a real audit history.</p>
      </section>
      <div className="admin-safety-foot"><CircleHelp size={16} /> Role permissions and administrative actions are not enforced by this frontend.</div>
    </div>
  );
}
