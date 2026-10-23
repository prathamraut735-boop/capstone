import { useState } from "react";
import { Check, Eye, KeyRound } from "lucide-react";
import { DataTable, DemoNote, RolePageHeading } from "../../components/RoleUI";
import { demoEntitlements } from "../../data/parentAdminData";

export default function Entitlements() {
  const [reviewedId, setReviewedId] = useState<string | null>(null);

  return (
    <div className="role-content">
      <RolePageHeading eyebrow="SAMPLE ACCESS RECORDS" title="Access entitlements" description="Illustrative access categories and review placeholders." />
      <DemoNote>Entitlement records are fictional. Review controls do not change access, eligibility, or subscriptions.</DemoNote>
      <div className="entitlement-type-grid">
        <div className="entitlement-type-card"><span className="role-icon-chip teal"><Check size={17} /></span><strong>In-person members</strong><small>Example verification category</small></div>
        <div className="entitlement-type-card"><span className="role-icon-chip purple"><KeyRound size={17} /></span><strong>Scholarship learners</strong><small>Example review category</small></div>
        <div className="entitlement-type-card"><span className="role-icon-chip yellow"><KeyRound size={17} /></span><strong>Subscribers</strong><small>Payment integration pending</small></div>
      </div>
      <section className="role-panel admin-list-panel">
        <div className="role-panel-heading"><div><span className="eyebrow">DEMO RECORDS</span><h2>Entitlement overview</h2></div></div>
        <DataTable
          headers={["Record", "Account", "Type", "Status", "Expiry / review", "Demo action"]}
          rows={demoEntitlements.map((item) => [
            <strong key="id">{item.id}</strong>,
            item.account,
            item.type,
            <span key="status" className={`role-status ${item.status.startsWith("Verified") ? "status-published" : item.status.startsWith("Pending") ? "status-pending" : "status-draft"}`}>{item.status}</span>,
            item.review,
            <button className="admin-row-button" type="button" key="review" onClick={() => setReviewedId(item.id)}><Eye size={14} /> Review demo</button>,
          ])}
        />
        {reviewedId && <p className="role-inline-message" role="status"><Check size={15} /> Sample record {reviewedId} viewed. No access permissions were changed.</p>}
        <p className="role-example-caption">No real subscription, payment, or access permission is connected to these rows.</p>
      </section>
    </div>
  );
}
