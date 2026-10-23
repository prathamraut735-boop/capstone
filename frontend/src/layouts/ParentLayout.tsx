import { CalendarDays, CircleUserRound, CreditCard, Heart, LayoutDashboard } from "lucide-react";
import RoleDashboardLayout from "./RoleDashboardLayout";

const navigation = [
  { label: "Overview", to: "/parent/dashboard", icon: LayoutDashboard },
  { label: "My Children", to: "/parent/children", icon: Heart },
  { label: "Bookings", to: "/parent/bookings", icon: CalendarDays },
  { label: "Subscription", to: "/parent/subscription", icon: CreditCard },
  { label: "Settings", to: "/parent/settings", icon: CircleUserRound },
];

export default function ParentLayout() {
  return <RoleDashboardLayout role="Parent space" title="Family dashboard" navigation={navigation} variant="parent" />;
}
