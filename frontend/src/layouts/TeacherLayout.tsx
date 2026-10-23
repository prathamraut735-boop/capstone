import { BookOpen, CalendarDays, ClipboardCheck, FileText, HeartHandshake, LayoutDashboard, Users } from "lucide-react";
import RoleDashboardLayout from "./RoleDashboardLayout";

const navigation = [
  { label: "Overview", to: "/teacher/dashboard", icon: LayoutDashboard },
  { label: "My Learners", to: "/teacher/learners", icon: Users },
  { label: "Practice Reviews", to: "/teacher/reviews", icon: ClipboardCheck },
  { label: "Sessions & Attendance", to: "/teacher/sessions", icon: CalendarDays },
  { label: "Lesson Plans", to: "/teacher/lesson-plans", icon: BookOpen },
  { label: "Learner Needs", to: "/teacher/learner-needs", icon: HeartHandshake },
  { label: "Incident Reports", to: "/teacher/incidents", icon: FileText },
];

export default function TeacherLayout() {
  return <RoleDashboardLayout role="Teacher workspace" title="Teacher Portal" navigation={navigation} variant="teacher" />;
}
