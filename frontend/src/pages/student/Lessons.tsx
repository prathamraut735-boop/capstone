import { useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronUp, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { learningLevels } from "../../data/mockData";
import type { LearningLevel } from "../../types";
import { LockedMessage, PageHeading, StatusPill } from "../../components/UI";
import { useStudentLessons } from "../../hooks/useStudentLessons";

function LevelCard({
  level,
  expanded,
  loading,
  error,
  onToggle,
}: {
  level: LearningLevel;
  expanded: boolean;
  loading: boolean;
  error: string;
  onToggle: () => void;
}) {
  const availableCount = level.lessons.filter(Boolean).length;
  return (
    <section className={`level-card level-${level.color} ${expanded ? "level-expanded" : ""}`}>
      <button className="level-header" type="button" aria-expanded={expanded} onClick={onToggle}>
        <span className="level-number">0{level.id}</span>
        <span className="level-title-group"><strong>{level.title}</strong><small>{level.subtitle}</small></span>
        <span className="level-count">{level.id === 1 ? `${availableCount} lessons` : "8 lesson slots"}</span>
        <span className="level-toggle">{expanded ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</span>
      </button>
      {expanded && (
        <div className="level-content">
          {loading && <p className="student-lesson-empty">Loading your lessons…</p>}
          {!loading && error && level.id === 1 && <p className="student-lesson-empty">Lessons could not be loaded.</p>}
          {!loading && !error && level.id === 1 && availableCount === 0 && <p className="student-lesson-empty">No lessons are published yet.</p>}
          {level.lessons.map((lesson, index) => (
            lesson ? (
              <Link key={lesson.id} className="slot-row" to={`/student/lessons/${lesson.id}`}>
                <span className={`slot-status ${lesson.status}`}>{lesson.status === "complete" ? <Check size={14} /> : <BookOpen size={14} />}</span>
                <span><strong>{lesson.title}</strong><small>{lesson.instrument} · {lesson.duration}</small></span>
                <StatusPill tone={lesson.status === "complete" ? "green" : lesson.status === "in-progress" ? "purple" : "neutral"}>
                  {lesson.status === "complete" ? "Completed" : lesson.status === "in-progress" ? "In progress" : lesson.status === "available" ? "Available" : "Up next"}
                </StatusPill>
                <ArrowRight size={17} className="slot-arrow" />
              </Link>
            ) : (
              <div className="slot-row slot-unpublished" key={`slot-${index}`}>
                <span className="slot-status unavailable"><LockKeyhole size={14} /></span>
                <span><strong>Lesson {index + 1}</strong><small>Lesson content not published</small></span>
                <LockedMessage />
              </div>
            )
          ))}
        </div>
      )}
    </section>
  );
}

export default function Lessons() {
  const [expandedLevel, setExpandedLevel] = useState(1);
  const { lessons, progress, loading, error, reload } = useStudentLessons();
  return (
    <div className="page-content">
      <PageHeading eyebrow="YOUR LEARNING LIBRARY" title="My Lessons">
        {progress.total > 0
          ? `${progress.completed} of ${progress.total} published lessons completed.`
          : "Explore published lessons and track your progress."}
      </PageHeading>
      {error ? (
        <div className="notice notice-purple" role="alert">
          <BookOpen size={19} />
          <span>{error} <button className="student-lesson-text-button" type="button" onClick={reload}>Try again</button></span>
        </div>
      ) : (
        <div className="notice notice-purple"><BookOpen size={19} /><span>Only published lessons are available. Lesson videos are placeholders in this prototype; your completion status is saved to your account.</span></div>
      )}
      <div className="levels-list">
        {learningLevels.map((level) => {
          const currentLevel = level.id === 1 ? { ...level, lessons } : level;
          return (
            <LevelCard
              key={level.id}
              level={currentLevel}
              expanded={expandedLevel === level.id}
              loading={loading && level.id === 1}
              error={error}
              onToggle={() => setExpandedLevel(expandedLevel === level.id ? 0 : level.id)}
            />
          );
        })}
      </div>
      <div className="curriculum-note"><span>♪</span><p>The relationship between these levels and the curriculum stages is still to be confirmed.</p></div>
    </div>
  );
}
