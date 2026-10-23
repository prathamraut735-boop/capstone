import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Clock3, Play, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { sampleLessons } from "../../data/mockData";
import { PageHeading } from "../../components/UI";

export default function LessonDetail() {
  const { lessonId } = useParams();
  const lesson = sampleLessons.find((item) => item.id === lessonId);
  const [viewed, setViewed] = useState(lesson?.status === "complete");

  if (!lesson) {
    return (
      <div className="page-content">
        <PageHeading eyebrow="LESSON" title="Lesson not available">This lesson may not have been published yet.</PageHeading>
        <div className="unpublished-banner detail-unpublished"><CircleHelp size={22} /><div><strong>There's nothing to watch just yet</strong><p>Only sample Level 1 lessons are available in this demo.</p></div></div>
        <Link className="button button-outline" to="/student/lessons"><ArrowLeft size={16} /> Back to My Lessons</Link>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Link className="back-link" to="/student/lessons"><ArrowLeft size={16} /> Back to My Lessons</Link>
      <PageHeading eyebrow={`LEVEL 1 · ${lesson.instrument.toUpperCase()}`} title={lesson.title}>{lesson.description}</PageHeading>
      <div className="lesson-detail-grid">
        <div>
          <section className="video-placeholder">
            <div className="video-pattern" aria-hidden="true"><span>♪</span><span>♫</span><span>✦</span></div>
            <div className="video-play"><Play size={23} fill="currentColor" /></div>
            <strong>Lesson video placeholder</strong>
            <small>A lesson video will appear here</small>
            <span className="video-label">SAMPLE CONTENT</span>
          </section>
          <div className="lesson-detail-info">
            <div><span className="detail-icon"><Clock3 size={17} /></span><span><small>LESSON LENGTH</small><strong>{lesson.duration}</strong></span></div>
            <div><span className="detail-icon purple"><Sparkles size={17} /></span><span><small>YOUR STATUS</small><strong>{viewed ? "Marked as viewed" : "Ready to learn"}</strong></span></div>
          </div>
        </div>
        <div className="lesson-instructions">
          <div className="instruction-heading"><span className="instruction-badge"><Sparkles size={18} /></span><div><small>YOUR LESSON</small><h2>Let’s get started!</h2></div></div>
          <p>Find a comfy spot, take your time, and give each activity a try. There’s no rush. Learning music is all about exploring.</p>
          <div className="instruction-list">
            <div><span>1</span><p><strong>Watch the lesson</strong>Follow along with the video when it’s available.</p></div>
            <div><span>2</span><p><strong>Try it out</strong>Pause and practise the new idea in your own time.</p></div>
            <div><span>3</span><p><strong>Have another go</strong>Little bits of practice can make a big difference.</p></div>
          </div>
          <button className={`button ${viewed ? "button-success" : "button-pink"} button-wide`} onClick={() => setViewed(!viewed)}>
            {viewed ? <><Check size={17} /> Marked as viewed</> : <>Mark as viewed <ArrowRight size={17} /></>}
          </button>
          <div className="teacher-note"><span>💌</span><p>Your teacher can guide your learning and give feedback on your practice.</p></div>
        </div>
      </div>
      <section className="practice-task-card">
        <div className="practice-task-icon"><Sparkles size={20} /></div>
        <div><span className="eyebrow">AFTER THE LESSON</span><h2>Your practice task</h2><p>Have a go at the idea from this lesson. When you’re ready, you can record a short audio practice for your teacher to review.</p></div>
        <Link className="button button-outline" to="/student/practice">Go to My Practice <ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}
