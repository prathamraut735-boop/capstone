export type DemoChild = {
  id: string;
  name: string;
  ageLabel: string;
  level: string;
  lessonsComplete: number;
  lessonsTotal: number;
  recentActivity: string;
};

export const demoChildren: DemoChild[] = [
  { id: "learner-01", name: "Sunny Student", ageLabel: "Learner profile", level: "Level 1 · Learn to Pitch & Play", lessonsComplete: 3, lessonsTotal: 8, recentActivity: "Practised “Keep a steady beat” today" },
  { id: "learner-02", name: "River Student", ageLabel: "Learner profile", level: "Level 1 · Sample", lessonsComplete: 2, lessonsTotal: 8, recentActivity: "Viewed a singing lesson this week" },
];

export const demoTeacherFeedback = [
  { child: "Sunny Student", lesson: "Find your singing voice", note: "Lovely effort with the warm-up. Keep exploring at your own pace.", date: "This week" },
  { child: "River Student", lesson: "Sample practice", note: "Thanks for sharing your practice. Keep having fun with music!", date: "Last week" },
];

export const demoSessions = [
  { id: "session-01", title: "Family music session", venue: "Example Community Hall", date: "Saturday, 14 November", time: "10:00 am – 10:45 am", availability: "4 spaces shown in demo" },
  { id: "session-02", title: "Ukulele taster", venue: "Example Music Room", date: "Wednesday, 18 November", time: "4:00 pm – 4:45 pm", availability: "2 spaces shown in demo" },
  { id: "session-03", title: "Singing circle", venue: "Example Community Hall", date: "Saturday, 21 November", time: "11:00 am – 11:45 am", availability: "6 spaces shown in demo" },
];

export const demoBookingHistory = [
  { title: "Family music session", date: "Example · 3 November", status: "Attended" },
  { title: "Ukulele taster", date: "Example · 20 October", status: "Completed" },
];

export const demoUsers = [
  { id: "user-101", name: "Alex Example", role: "Guardian", status: "Active", created: "12 Oct 2026" },
  { id: "user-102", name: "Sunny Student", role: "Learner", status: "Active", created: "10 Oct 2026" },
  { id: "user-103", name: "Morgan Sample", role: "Teacher", status: "Active", created: "04 Oct 2026" },
  { id: "user-104", name: "River Student", role: "Learner", status: "Pending", created: "18 Oct 2026" },
  { id: "user-105", name: "Casey Demo", role: "Guardian", status: "Inactive", created: "22 Sep 2026" },
];

export const demoContentActivity = [
  { actor: "Taylor Example", action: "Updated a sample lesson draft", type: "Content", time: "Today · 9:42 am", status: "Draft" },
  { actor: "Morgan Sample", action: "Reviewed sample practice feedback", type: "Learning", time: "Yesterday · 3:16 pm", status: "Resolved" },
  { actor: "Admin Demo", action: "Checked a demo entitlement", type: "Access", time: "Yesterday · 11:08 am", status: "Pending" },
  { actor: "Taylor Example", action: "Published a Level 1 sample lesson", type: "Content", time: "20 Oct · 1:30 pm", status: "Published" },
];

export const demoEntitlements = [
  { id: "ENT-001", account: "Sunny Student", type: "In-person member", status: "Verified · demo", review: "Review date placeholder" },
  { id: "ENT-002", account: "River Student", type: "Scholarship learner", status: "Pending · demo", review: "Review date placeholder" },
  { id: "ENT-003", account: "Family Example", type: "Subscriber", status: "Illustrative only", review: "Billing period placeholder" },
];

export const demoSupportRequests = [
  { id: "SUP-021", subject: "Help with signing in", category: "Login help", priority: "Normal", status: "Pending", assigned: "Unassigned demo" },
  { id: "SUP-022", subject: "Question about session times", category: "Booking question", priority: "Low", status: "Open", assigned: "Team placeholder" },
  { id: "SUP-023", subject: "Update guardian contact details", category: "Account enquiry", priority: "Normal", status: "Resolved", assigned: "Team placeholder" },
];

export const demoAuditLogs = [
  { time: "22 Oct 2026 · 10:14 am", actor: "Admin Demo", action: "Viewed user record (demo)", record: "User · USER-101" },
  { time: "22 Oct 2026 · 9:42 am", actor: "Taylor Example", action: "Changed lesson draft title (demo)", record: "Content · LESSON-04" },
  { time: "21 Oct 2026 · 3:16 pm", actor: "Morgan Sample", action: "Marked example feedback reviewed", record: "Practice · PRACTICE-009" },
  { time: "20 Oct 2026 · 1:30 pm", actor: "Taylor Example", action: "Set sample content display to published", record: "Content · LESSON-01" },
];
