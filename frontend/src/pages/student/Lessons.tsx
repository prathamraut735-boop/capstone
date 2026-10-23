import { useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronUp, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { learningLevels } from "../../data/mockData";
import type { LearningLevel } from "../../types";
import { LockedMessage, PageHeading, StatusPill } from "../../components/UI";

function LevelCard({ level, expanded, onToggle }: { level: LearningLevel; expanded: boolean; onToggle: () => void }) {
  const availableCount = level.lessons.filter(Boolean).length;
  return (
    <section className={`level-card level-${level.color} ${expanded ? "level-expanded" : ""}`}>
      <button className="level-header" type="button" aria-expanded={expanded} onClick={onToggle}>
        <span className="level-number">0{level.id}</span>
        <span className="level-title-group"><strong>{level.title}</strong><small>{level.subtitle}</small></span>
        <span className="level-count">{availableCount ? `${availableCount} lessons` : "8 lesson slots"}</span>
        <span className="level-toggle">{expanded ? <ChevronUp size={19} /> : <ChevronDown size={19} />}</span>
      </button>
      {expanded && (
        <div className="level-content">
          {level.lessons.map((lesson, index) => (
            lesson ? (
              <Link key={lesson.id} className="slot-row" to={`/student/lessons/${lesson.id}`}>
                <span className={`slot-status ${lesson.status}`}>{lesson.status === "complete" ? <Check size={14} /> : <BookOpen size={14} />}</span>
                <span><strong>{lesson.title}</strong><small>{lesson.instrument} · {lesson.duration}</small></span>
                <StatusPill tone={lesson.status === "complete" ? "green" : lesson.status === "in-progress" ? "purple" : "neutral"}>
                  {lesson.status === "complete" ? "Completed" : lesson.status === "in-progress" ? "In progress" : "Up next"}
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
  return (
    <div className="page-content">
      <PageHeading eyebrow="YOUR LEARNING LIBRARY" title="My Lessons">
        Four learning levels to explore, one small step at a time.
      </PageHeading>
      <div className="notice notice-purple"><BookOpen size={19} /><span>Lesson content in Levels 2–4 is not published yet. The level structure and sample lesson list are for demonstration only.</span></div>
      <div className="levels-list">
        {learningLevels.map((level) => (
          <LevelCard key={level.id} level={level} expanded={expandedLevel === level.id} onToggle={() => setExpandedLevel(expandedLevel === level.id ? 0 : level.id)} />
        ))}
      </div>
      <div className="curriculum-note"><span>♪</span><p>The relationship between these levels and the curriculum stages is still to be confirmed.</p></div>
    </div>
  );
}
