export type Lesson = {
  id: string;
  title: string;
  description: string;
  instrument: string;
  duration: string;
  status: "complete" | "in-progress" | "locked";
};

export type LearningLevel = {
  id: number;
  title: string;
  subtitle: string;
  color: "pink" | "purple" | "teal" | "yellow";
  lessons: (Lesson | null)[];
};
