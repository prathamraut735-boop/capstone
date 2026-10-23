import type { LearningLevel, Lesson } from "../types";

export const sampleLessons: Lesson[] = [
  {
    id: "lesson-1",
    title: "Find your singing voice",
    description: "Warm up gently and explore the sounds your voice can make.",
    instrument: "Singing",
    duration: "8 min",
    status: "complete",
  },
  {
    id: "lesson-2",
    title: "Keep a steady beat",
    description: "Clap, tap and listen for the steady pulse in a song.",
    instrument: "Rhythm",
    duration: "10 min",
    status: "in-progress",
  },
  {
    id: "lesson-3",
    title: "Meet your ukulele",
    description: "Get to know the strings and how to hold your ukulele.",
    instrument: "Ukulele",
    duration: "12 min",
    status: "locked",
  },
  {
    id: "lesson-4",
    title: "Play your first chord",
    description: "Practise a first chord shape at a comfortable pace.",
    instrument: "Ukulele",
    duration: "12 min",
    status: "locked",
  },
  {
    id: "lesson-5",
    title: "Sing a little melody",
    description: "Listen closely and try singing a short, simple melody.",
    instrument: "Singing",
    duration: "9 min",
    status: "locked",
  },
  {
    id: "lesson-6",
    title: "Strum along",
    description: "Try a gentle strumming pattern and keep the beat.",
    instrument: "Ukulele",
    duration: "11 min",
    status: "locked",
  },
  {
    id: "lesson-7",
    title: "Make up a tune",
    description: "Experiment with a few notes and make a tune of your own.",
    instrument: "Songwriting",
    duration: "10 min",
    status: "locked",
  },
  {
    id: "lesson-8",
    title: "Put it all together",
    description: "Bring your singing and playing together in a short practice.",
    instrument: "Singing + ukulele",
    duration: "14 min",
    status: "locked",
  },
];

const unpublishedSlots = Array.from({ length: 8 }, () => null);

export const learningLevels: LearningLevel[] = [
  {
    id: 1,
    title: "Learn to Pitch & Play",
    subtitle: "A first step into singing and playing.",
    color: "pink",
    lessons: sampleLessons,
  },
  {
    id: 2,
    title: "Learn to Harmonise",
    subtitle: "Lesson content is being prepared.",
    color: "purple",
    lessons: [...unpublishedSlots],
  },
  {
    id: 3,
    title: "Write & Create Your Own",
    subtitle: "Lesson content is being prepared.",
    color: "teal",
    lessons: [...unpublishedSlots],
  },
  {
    id: 4,
    title: "Level 4",
    subtitle: "Additional level — lesson content to be confirmed.",
    color: "yellow",
    lessons: [...unpublishedSlots],
  },
];

export const recentPractices = [
  { title: "Keep a steady beat", date: "Today", status: "Waiting for teacher feedback" },
  { title: "Find your singing voice", date: "Monday", status: "Feedback received" },
  { title: "My first practice", date: "Last week", status: "Reviewed by teacher" },
];
