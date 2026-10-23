import { useState } from "react";
import { Check, LifeBuoy, LockKeyhole } from "lucide-react";
import { DataTable, DemoNote, RolePageHeading } from "../../components/RoleUI";
import { demoSupportRequests } from "../../data/parentAdminData";

type SupportStatus = "Pending" | "Open" | "Resolved";

export default function SupportQueue() {
  const [statusOverrides, setStatusOverrides] = useState<Record<string, SupportStatus>>({});
  const [updatedRequest, setUpdatedRequest] = useState<string | null>(null);

  function toggleStatus(id: string, current: SupportStatus) {
    const next: SupportStatus = current === "Resolved" ? "Open" : "Resolved";
    setStatusOverrides((existing) => ({ ...existing, [id]: next }));
    setUpdatedRequest(id);
  }

  return (
    <div className="role-content">
      <RolePageHeading eyebrow="DEMO TEAM INBOX" title="Support queue" description="Example account, login and booking questions for interface review." />
      <DemoNote>All requests are fictional. Safeguarding or incident information is not displayed in this general support demo.</DemoNote>
      <div className="support-privacy-banner"><LockKeyhole size={17} /><span><strong>Restricted information stays out of this view.</strong> Real safeguarding and incident reporting requires a separate, access-controlled workflow.</span></div>
      <section className="role-panel admin-list-panel">
        <div className="role-panel-heading"><div><span className="eyebrow">EXAMPLE REQUESTS</span><h2>Requests for review</h2></div><span className="role-icon-chip purple"><LifeBuoy size={17} /></span></div>
        <DataTable
          headers={["Request", "Category", "Priority", "Status", "Assigned staff", "Demo action"]}
          rows={demoSupportRequests.map((item) => {
            const status = statusOverrides[item.id] ?? item.status as SupportStatus;
            return [
              <span key="subject"><strong>{item.subject}</strong><small className="table-subtext">{item.id}</small></span>,
              item.category,
              <span className={`role-status ${item.priority === "Normal" ? "status-pending" : "status-draft"}`} key="priority">{item.priority}</span>,
              <span className={`role-status status-${status.toLowerCase()}`} key="status">{status}</span>,
              item.assigned,
              <button className="admin-row-button" type="button" key="action" onClick={() => toggleStatus(item.id, status)}>{status === "Resolved" ? "Reopen · demo" : "Resolve · demo"}</button>,
            ];
          })}
        />
        {updatedRequest && <p className="role-inline-message" role="status"><Check size={15} /> Request {updatedRequest} status changed in this demo only.</p>}
        <p className="role-example-caption">Assigned staff names and statuses are placeholders, not real support operations.</p>
      </section>
    </div>
  );
}
