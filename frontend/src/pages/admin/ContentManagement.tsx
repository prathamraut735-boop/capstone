import { useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronUp, Eye, FilePenLine, LockKeyhole, Save } from "lucide-react";
import { learningLevels } from "../../data/mockData";
import type { Lesson } from "../../types";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";

type ContentStatus = "Draft" | "Published" | "Unpublished";

export default function ContentManagement() {
  const [expandedLevel, setExpandedLevel] = useState(1);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [titleOverrides, setTitleOverrides] = useState<Record<string, string>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ContentStatus>>({});
  const [notice, setNotice] = useState("");

  function openLesson(lesson: Lesson) {
    setSelectedLesson(lesson);
    setTitleDraft(titleOverrides[lesson.id] ?? lesson.title);
    setNotice("");
  }

  function saveTitle() {
    if (!selectedLesson || !titleDraft.trim()) return;
    setTitleOverrides((existing) => ({ ...existing, [selectedLesson.id]: titleDraft.trim() }));
    setNotice("Demo title updated on this page only.");
  }

  function toggleStatus(id: string, defaultStatus: ContentStatus) {
    const current = statusOverrides[id] ?? defaultStatus;
    setStatusOverrides((existing) => ({ ...existing, [id]: current === "Published" ? "Draft" : "Published" }));
  }

  return (
    <div className="role-content">
      <RolePageHeading eyebrow="LESSON LIBRARY" title="Content management" description="Review sample lesson slots and try local draft controls." />
      <DemoNote>Editing and publishing controls are visual demos only. No lesson content is saved or published to a platform.</DemoNote>
      <div className="content-curriculum-warning"><LockKeyhole size={16} /> Four online levels are shown, but their relationship to the three curriculum stages is still subject to client confirmation.</div>
      <div className="admin-content-layout">
        <div className="admin-level-list">
          {learningLevels.map((level) => {
            const expanded = expandedLevel === level.id;
            return (
              <section className={`role-panel admin-level-card level-${level.color}`} key={level.id}>
                <button type="button" className="admin-level-header" aria-expanded={expanded} onClick={() => setExpandedLevel(expanded ? 0 : level.id)}>
                  <span className="admin-level-number">{String(level.id).padStart(2, "0")}</span>
                  <span><strong>{level.title}</strong><small>{level.id === 1 ? "8 sample lesson titles" : "8 unpublished lesson placeholders"}</small></span>
                  <span className="role-status status-draft">{level.id === 1 ? "Sample" : "Unpublished"}</span>
                  {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </button>
                {expanded && <div className="admin-lesson-slots">
                  {level.lessons.map((lesson, index) => {
                    const lessonId = lesson?.id ?? `level-${level.id}-slot-${index + 1}`;
                    const defaultStatus: ContentStatus = lesson ? (lesson.status === "complete" ? "Published" : "Draft") : "Unpublished";
                    const status = statusOverrides[lessonId] ?? defaultStatus;
                    const title = lesson ? (titleOverrides[lesson.id] ?? lesson.title) : `Lesson ${index + 1}`;
                    return (
                      <div className="admin-lesson-row" key={lessonId}>
                        <span className="admin-slot-number">{String(index + 1).padStart(2, "0")}</span>
                        <span className="admin-slot-title"><strong>{title}</strong><small>{lesson?.instrument ?? "Content not published"}</small></span>
                        <span className={`role-status status-${status.toLowerCase()}`}>{status}</span>
                        {lesson ? <button type="button" className="admin-icon-action" aria-label={`View ${title}`} onClick={() => openLesson(lesson)}><Eye size={15} /></button> : <FilePenLine size={15} className="admin-slot-muted" />}
                        {lesson && <button type="button" className="admin-small-action" onClick={() => toggleStatus(lessonId, defaultStatus)}>{status === "Published" ? "Set draft" : "Publish"} · demo</button>}
                      </div>
                    );
                  })}
                </div>}
              </section>
            );
          })}
        </div>
        <aside className="role-panel content-detail-panel">
          <span className="role-icon-chip purple">{selectedLesson ? <FilePenLine size={18} /> : <BookOpen size={18} />}</span>
          <span className="eyebrow">LESSON PREVIEW</span>
          {selectedLesson ? (
            <>
              <h2>Level 1 · sample lesson</h2>
              <label className="form-field"><span>Lesson title (demo edit)</span><input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} /></label>
              <p>{selectedLesson.description}</p>
              <span className="role-status status-draft">Draft controls are not saved</span>
              <button className="button button-outline content-save-button" type="button" onClick={saveTitle}><Save size={15} /> Save title · demo</button>
              {notice && <span className="role-inline-message" role="status"><Check size={15} />{notice}</span>}
            </>
          ) : (
            <>
              <h2>Choose a sample lesson</h2>
              <p>Use the view icon on a Level 1 sample to preview its details or try editing its title.</p>
              <span className="role-example-caption">Levels 2–4 lesson slots are unpublished placeholders.</span>
            </>
          )}
          <span className="content-demo-foot"><ArrowRight size={14} /> Demo changes reset on reload.</span>
        </aside>
      </div>
      <p className="role-example-caption"><BookOpen size={13} /> No final curriculum mapping is assumed.</p>
    </div>
  );
}
