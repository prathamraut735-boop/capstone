import { Activity, BookOpen, KeyRound, LayoutDashboard, LifeBuoy, Users } from "lucide-react";
import RoleDashboardLayout from "./RoleDashboardLayout";

const navigation = [
  { label: "Overview", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Content", to: "/admin/content", icon: BookOpen },
  { label: "Access Entitlements", to: "/admin/entitlements", icon: KeyRound },
  { label: "Support Queue", to: "/admin/support", icon: LifeBuoy },
  { label: "Audit Logs", to: "/admin/audit-logs", icon: Activity },
];

export default function AdminLayout() {
  return <RoleDashboardLayout role="Admin workspace" title="Toy Choir TV Admin" navigation={navigation} variant="admin" />;
}
