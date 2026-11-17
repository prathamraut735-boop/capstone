import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./layouts/AdminLayout";
import ParentLayout from "./layouts/ParentLayout";
import PublicLayout from "./layouts/PublicLayout";
import StudentLayout from "./layouts/StudentLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import Landing from "./pages/public/Landing";
import AdminLogin from "./pages/public/AdminLogin";
import ForgotPassword from "./pages/public/ForgotPassword";
import Login from "./pages/public/Login";
import NotFound from "./pages/public/NotFound";
import Signup from "./pages/public/Signup";
import StudentLogin from "./pages/public/StudentLogin";
import StudentActivate from "./pages/public/StudentActivate";
import Dashboard from "./pages/student/Dashboard";
import LessonDetail from "./pages/student/LessonDetail";
import Lessons from "./pages/student/Lessons";
import Practice from "./pages/student/Practice";
import Profile from "./pages/student/Profile";
import Progress from "./pages/student/Progress";
import ParentDashboard from "./pages/parent/ParentDashboard";
import Children from "./pages/parent/Children";
import ParentBookings from "./pages/parent/ParentBookings";
import ParentSubscription from "./pages/parent/ParentSubscription";
import ParentSettings from "./pages/parent/ParentSettings";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherLearners from "./pages/teacher/TeacherLearners";
import TeacherReviews from "./pages/teacher/TeacherReviews";
import TeacherSessions from "./pages/teacher/TeacherSessions";
import TeacherLessonPlans from "./pages/teacher/TeacherLessonPlans";
import TeacherLearnerNeeds from "./pages/teacher/TeacherLearnerNeeds";
import TeacherIncidents from "./pages/teacher/TeacherIncidents";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/activate" element={<StudentActivate />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="lessons" element={<Lessons />} />
        <Route path="lessons/:lessonId" element={<LessonDetail />} />
        <Route path="practice" element={<Practice />} />
        <Route path="progress" element={<Progress />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Backend role checks remain authoritative for protected actions. */}
      <Route path="/parent" element={<ParentLayout />}>
        <Route index element={<Navigate to="/parent/dashboard" replace />} />
        <Route path="dashboard" element={<ParentDashboard />} />
        <Route path="children" element={<Children />} />
        <Route path="bookings" element={<ParentBookings />} />
        <Route path="subscription" element={<ParentSubscription />} />
        <Route path="settings" element={<ParentSettings />} />
      </Route>
      <Route path="/teacher" element={<TeacherLayout />}>
        <Route index element={<Navigate to="/teacher/dashboard" replace />} />
        <Route path="dashboard" element={<TeacherDashboard />} />
        <Route path="learners" element={<TeacherLearners />} />
        <Route path="reviews" element={<TeacherReviews />} />
        <Route path="sessions" element={<TeacherSessions />} />
        <Route path="lesson-plans" element={<TeacherLessonPlans />} />
        <Route path="learner-needs" element={<TeacherLearnerNeeds />} />
        <Route path="incidents" element={<TeacherIncidents />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}
