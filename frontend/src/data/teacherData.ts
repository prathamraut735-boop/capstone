export type ReviewStatus = "Pending Review" | "AI Draft Ready" | "Revision Requested" | "Teacher Reviewed";

export type TeacherLearner = {
  id: string;
  displayName: string;
  level: string;
  recentActivity: string;
  latestPracticeStatus: ReviewStatus;
  progressStatus: "On track" | "Needs review" | "Awaiting practice";
};

export type PracticeReview = {
  id: string;
  learnerId: string;
  lesson: string;
  submitted: string;
  status: ReviewStatus;
  aiDraft: string;
  attempt: number;
  revisionSubmitted: boolean;
};

export type TeachingSession = {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  registrations: { id: string; learnerId: string; attendance: "Not marked" | "Present" | "Absent" }[];
};

export const teacherLearners: TeacherLearner[] = [
  {
    id: "LRN-201",
    displayName: "Learner A",
    level: "Level 1",
    recentActivity: "Viewed a rhythm lesson · Today",
    latestPracticeStatus: "Pending Review",
    progressStatus: "On track",
  },
  {
    id: "LRN-202",
    displayName: "Learner B",
    level: "Level 1",
    recentActivity: "Practice submitted · Yesterday",
    latestPracticeStatus: "AI Draft Ready",
    progressStatus: "Needs review",
  },
  {
    id: "LRN-203",
    displayName: "Learner C",
    level: "Level 2",
    recentActivity: "Revision requested · This week",
    latestPracticeStatus: "Revision Requested",
    progressStatus: "Awaiting practice",
  },
  {
    id: "LRN-204",
    displayName: "Learner D",
    level: "Level 1",
    recentActivity: "Teacher reviewed a practice · Monday",
    latestPracticeStatus: "Teacher Reviewed",
    progressStatus: "On track",
  },
];

export const practiceReviews: PracticeReview[] = [
  {
    id: "REV-301",
    learnerId: "LRN-201",
    lesson: "Keep a steady beat",
    submitted: "Today · 9:20 am",
    status: "Pending Review",
    aiDraft: "AI feedback preview is not available for this sample yet.",
    attempt: 1,
    revisionSubmitted: false,
  },
  {
    id: "REV-302",
    learnerId: "LRN-202",
    lesson: "Find your singing voice",
    submitted: "Yesterday · 2:45 pm",
    status: "AI Draft Ready",
    aiDraft: "Placeholder only: a future system may offer a draft observation for a teacher to check.",
    attempt: 1,
    revisionSubmitted: false,
  },
  {
    id: "REV-303",
    learnerId: "LRN-203",
    lesson: "Sample practice task",
    submitted: "20 Oct · 11:10 am",
    status: "Revision Requested",
    aiDraft: "No AI draft is attached to this fictional example.",
    attempt: 1,
    revisionSubmitted: false,
  },
  {
    id: "REV-304",
    learnerId: "LRN-204",
    lesson: "Meet your ukulele",
    submitted: "19 Oct · 4:05 pm",
    status: "Teacher Reviewed",
    aiDraft: "Placeholder only: reviewed and edited by the teacher in this example.",
    attempt: 2,
    revisionSubmitted: true,
  },
];

export const teachingSessions: TeachingSession[] = [
  {
    id: "SES-401",
    title: "Example singing circle",
    date: "Saturday, 24 October",
    time: "10:00 am – 10:45 am",
    venue: "Example Community Hall",
    registrations: [
      { id: "REG-01", learnerId: "LRN-201", attendance: "Not marked" },
      { id: "REG-02", learnerId: "LRN-202", attendance: "Not marked" },
      { id: "REG-03", learnerId: "LRN-204", attendance: "Not marked" },
    ],
  },
  {
    id: "SES-402",
    title: "Example ukulele group",
    date: "Wednesday, 28 October",
    time: "4:00 pm – 4:45 pm",
    venue: "Example Music Room",
    registrations: [
      { id: "REG-04", learnerId: "LRN-202", attendance: "Not marked" },
      { id: "REG-05", learnerId: "LRN-203", attendance: "Not marked" },
    ],
  },
];

export const lessonPlanResources = [
  { id: "PLAN-01", title: "Gentle voice warm-up", topic: "Singing", date: "12 Oct 2026", status: "Available · demo" },
  { id: "PLAN-02", title: "Steady beat activity", topic: "Rhythm", date: "08 Oct 2026", status: "Available · demo" },
  { id: "PLAN-03", title: "Ukulele starter notes", topic: "Ukulele", date: "02 Oct 2026", status: "Draft · demo" },
];

export const restrictedNeedsSamples = [
  {
    id: "LRN-202",
    note: "Example support note: offer a quieter seating option if needed.",
    session: "Example singing circle · 24 October",
  },
  {
    id: "LRN-204",
    note: "Example support note: check in with the learner before the group activity.",
    session: "Example ukulele group · 28 October",
  },
];
