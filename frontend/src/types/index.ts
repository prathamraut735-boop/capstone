export type Lesson = {
  id: string;
  title: string;
  description: string;
  instrument: string;
  duration: string;
  status: "complete" | "in-progress" | "available" | "locked";
};

export interface StudentLesson extends Omit<Lesson, "status"> {
  levelId: number;
  status: "complete" | "available";
}

export interface StudentLessonCatalog {
  lessons: StudentLesson[];
  progress: { completed: number; total: number };
}

export type LearningLevel = {
  id: number;
  title: string;
  subtitle: string;
  color: "pink" | "purple" | "teal" | "yellow";
  lessons: (Lesson | null)[];
};
