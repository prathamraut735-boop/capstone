import { useState } from "react";
import { Check, CircleHelp, LockKeyhole, ShieldCheck, Sparkles, Star, TrendingUp } from "lucide-react";
import { learningLevels, sampleLessons } from "../../data/mockData";
import { PageHeading, SectionTitle, StatusPill, StatCard } from "../../components/UI";

export default function Progress() {
  const [showNote, setShowNote] = useState(false);
  return (
    <div className="page-content">
      <PageHeading eyebrow="LOOK HOW FAR YOU'VE COME" title="My Progress">Every try counts. Keep exploring and enjoy the journey!</PageHeading>
      <div className="stats-grid">
        <StatCard icon={<Check size={19} />} label="Lessons completed" value="1 of 8" detail="Level 1 sample data" color="pink" />
        <StatCard icon={<TrendingUp size={19} />} label="Practice sessions" value="3" detail="Example activity" color="teal" />
        <StatCard icon={<Star size={19} />} label="Teacher feedback" value="1 note" detail="Fictional sample" color="yellow" />
      </div>
      <section className="panel progress-level-panel">
        <SectionTitle title="Level 1 · Learn to Pitch & Play" />
        <div className="level-progress-summary"><div><strong>You're off to a lovely start!</strong><p>Here are some example lesson markers.</p></div><StatusPill tone="purple">1 of 8 complete</StatusPill></div>
        <div className="progress-bar large"><span style={{ width: "12.5%" }} /></div>
        <div className="completed-lessons">
          {sampleLessons.slice(0, 4).map((lesson) => (
            <div className={`completed-lesson ${lesson.status === "complete" ? "is-complete" : ""}`} key={lesson.id}>
              <span>{lesson.status === "complete" ? <Check size={14} /> : <span>{lesson.id.replace("lesson-", "")}</span>}</span>
              <small>{lesson.title}</small>
            </div>
          ))}
        </div>
        <p className="example-note">Sample indicators only. Lesson completion is not saved between visits.</p>
      </section>
      <section className="approval-card">
        <span className="approval-icon"><LockKeyhole size={21} /></span>
        <div className="approval-copy"><span className="eyebrow">LEVEL PROGRESSION</span><h2>Your teacher is your guide</h2><p>Moving to the next level requires teacher approval. You won't unlock levels automatically. Your teacher will let you know when you're ready.</p></div>
        <StatusPill tone="yellow">Teacher approval required</StatusPill>
      </section>
      <section className="panel feedback-panel">
        <SectionTitle title="Teacher feedback" />
        <div className="feedback-note">
          <span className="feedback-avatar"><Sparkles size={18} /></span>
          <div className="feedback-content"><div className="feedback-title"><strong>Example teacher note</strong><small>On “Find your singing voice” · Monday</small></div><p>Lovely effort trying out the warm-up! Keep exploring the sounds your voice can make.</p><span className="example-label">FICTIONAL SAMPLE FEEDBACK</span></div>
        </div>
        <button type="button" className="teacher-control-link" onClick={() => setShowNote(!showNote)}><CircleHelp size={15} /> How does feedback work?</button>
        {showNote && <div className="teacher-explainer"><ShieldCheck size={17} /> Feedback is private and comes from a teacher. This demo doesn't send messages or generate feedback.</div>}
      </section>
      <section className="panel level-overview">
        <SectionTitle title="Your learning levels" />
        <div className="overview-level-list">
          {learningLevels.map((level) => (
            <div className={`overview-level level-${level.color}`} key={level.id}>
              <span className="overview-number">0{level.id}</span><span className="overview-title"><strong>{level.title}</strong><small>{level.id === 1 ? "Sample learning progress" : level.subtitle}</small></span>
              {level.id === 1 ? <StatusPill tone="purple">In progress</StatusPill> : <StatusPill>Not started</StatusPill>}
            </div>
          ))}
        </div>
        <div className="approval-foot"><LockKeyhole size={14} /> Progress levels do not unlock automatically. Teacher approval is always required.</div>
      </section>
    </div>
  );
}
