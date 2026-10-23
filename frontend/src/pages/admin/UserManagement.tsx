import { useMemo, useState } from "react";
import { Eye, Search, ShieldCheck, UserRound } from "lucide-react";
import { DataTable, DemoNote, RolePageHeading } from "../../components/RoleUI";
import { demoUsers } from "../../data/parentAdminData";

type UserStatus = "Active" | "Pending" | "Inactive";

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, UserStatus>>({});
  const filteredUsers = useMemo(() => demoUsers.filter((user) => {
    const status = statusOverrides[user.id] ?? user.status;
    const matchesSearch = `${user.name} ${user.role} ${user.id}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (roleFilter === "All roles" || user.role === roleFilter) && (statusFilter === "All statuses" || status === statusFilter);
  }), [search, roleFilter, statusFilter, statusOverrides]);
  const selectedUser = demoUsers.find((user) => user.id === selectedId);

  function toggleStatus(id: string, currentStatus: string) {
    const next: UserStatus = currentStatus === "Active" ? "Inactive" : "Active";
    setStatusOverrides((existing) => ({ ...existing, [id]: next }));
  }

  return (
    <div className="role-content">
      <RolePageHeading eyebrow="DEMO ACCOUNT DIRECTORY" title="User management" description="Search and filter fictional user records for interface review." />
      <DemoNote>User records and status controls are fictional. Changes only update this page and do not create accounts or grant permissions.</DemoNote>
      <section className="role-panel admin-list-panel">
        <div className="admin-filter-row">
          <label className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search demo users" aria-label="Search demo users" /></label>
          <label className="admin-filter"><span className="visually-hidden">Filter by role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option>All roles</option><option>Guardian</option><option>Learner</option><option>Teacher</option><option>Administrator</option></select></label>
          <label className="admin-filter"><span className="visually-hidden">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Active</option><option>Pending</option><option>Inactive</option></select></label>
        </div>
        <DataTable
          headers={["Name", "Role", "Status", "Created", "Demo actions"]}
          rows={filteredUsers.map((user) => {
            const status = statusOverrides[user.id] ?? user.status;
            return [
              <span className="admin-user-name" key="name"><span className="admin-user-avatar"><UserRound size={15} /></span><span><strong>{user.name}</strong><small>{user.id}</small></span></span>,
              user.role,
              <span className={`role-status status-${status.toLowerCase()}`} key="status">{status}</span>,
              user.created,
              <span className="admin-row-actions" key="actions"><button type="button" onClick={() => setSelectedId(selectedId === user.id ? null : user.id)}><Eye size={14} /> View</button><button type="button" onClick={() => toggleStatus(user.id, status)}>{status === "Active" ? "Set inactive (demo)" : "Set active (demo)"}</button></span>,
            ];
          })}
        />
        <p className="role-example-caption">Showing {filteredUsers.length} of {demoUsers.length} fictional records · status controls are local demo interactions.</p>
      </section>
      {selectedUser && (
        <section className="role-panel user-detail-demo">
          <div className="role-panel-heading"><div><span className="eyebrow">RECORD PREVIEW</span><h2>{selectedUser.name}</h2></div><ShieldCheck size={19} /></div>
          <p>{selectedUser.role} · {selectedUser.id} · Created {selectedUser.created}</p>
          <span className="role-example-caption">Fictional preview only. No real account data or permissions are available.</span>
        </section>
      )}
    </div>
  );
}
