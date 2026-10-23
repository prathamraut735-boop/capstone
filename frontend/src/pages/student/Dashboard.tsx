import { ArrowRight, AudioLines, Check, Music2, Play, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { recentPractices, sampleLessons } from "../../data/mockData";
import { LessonCard, SectionTitle, StatusPill } from "../../components/UI";

const journey = [
  { label: "Watch", detail: "Learn something new", icon: Play, color: "pink" },
  { label: "Practise", detail: "Try it at your pace", icon: Music2, color: "purple" },
  { label: "Submit audio", detail: "Share with your teacher", icon: AudioLines, color: "teal" },
  { label: "Get feedback", detail: "Grow with guidance", icon: Star, color: "yellow" },
];

export default function Dashboard() {
  return (
    <div className="page-content">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <span className="welcome-kicker"><Sparkles size={15} /> YOUR MUSICAL ADVENTURE</span>
          <h1>Welcome to<br /><span>Toy Choir TV!</span></h1>
          <p>Ready to sing, strum and make something wonderful?</p>
          <Link className="button button-white" to="/student/lessons">Explore my lessons <ArrowRight size={17} /></Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-sun" />
          <span className="music-note note-one">♪</span>
          <span className="music-note note-two">♫</span>
          <div className="ukulele-art"><div className="uke-neck" /><div className="uke-body"><span /></div></div>
          <div className="art-sparkle"><Star size={24} fill="currentColor" /></div>
          <span className="art-cloud">✿</span>
        </div>
      </section>

      <section className="journey-section">
        <div className="journey-heading"><span className="step-label">HOW IT WORKS</span><span className="sample-tag">A friendly learning journey</span></div>
        <div className="journey-steps">
          {journey.map(({ label, detail, icon: Icon, color }, index) => (
            <div className="journey-step" key={label}>
              <div className={`journey-icon ${color}`}><Icon size={20} /></div>
              <div><strong>{label}</strong><span>{detail}</span></div>
              {index < journey.length - 1 && <span className="journey-arrow">→</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-columns">
        <section className="panel lessons-panel">
          <SectionTitle title="My Lessons" action="All lessons" to="/student/lessons" />
          <div className="lesson-list">
            {sampleLessons.slice(0, 3).map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
          </div>
        </section>

        <div className="dashboard-side">
          <section className="continue-card">
            <div className="continue-top"><span className="continue-tag"><Play size={12} fill="currentColor" /> PICK UP WHERE YOU LEFT OFF</span><span className="continue-illustration">♫</span></div>
            <h2>Keep a steady beat</h2>
            <p>Your next little step is ready when you are.</p>
            <div className="continue-progress"><span><i /></span><small>Part 2 of 4</small></div>
            <Link to="/student/lessons/lesson-2" className="button button-pink">Continue learning <ArrowRight size={16} /></Link>
          </section>

          <section className="panel mini-progress">
            <SectionTitle title="My progress" action="See more" to="/student/progress" />
            <div className="progress-summary"><div className="progress-ring"><span><strong>1</strong><small>of 8</small></span></div><div><strong>Lovely progress!</strong><p>You're finding your rhythm.</p></div></div>
            <div className="progress-bar"><span style={{ width: "12.5%" }} /></div>
            <div className="progress-foot"><span>Level 1 sample progress</span><StatusPill tone="purple">Teacher-guided</StatusPill></div>
          </section>
        </div>
      </div>

      <section className="panel recent-panel">
        <SectionTitle title="Recent practice" action="Go to practice" to="/student/practice" />
        <div className="recent-list">
          {recentPractices.slice(0, 2).map((item, index) => (
            <div className="recent-item" key={item.title}>
              <span className={`recent-icon recent-icon-${index}`}><AudioLines size={18} /></span>
              <span className="recent-copy"><strong>{item.title}</strong><small>{item.date} <span>·</span> Audio practice</small></span>
              <StatusPill tone={index === 1 ? "green" : "yellow"}>{index === 1 ? <><Check size={12} /> Feedback received</> : "Awaiting teacher"}</StatusPill>
            </div>
          ))}
        </div>
        <p className="example-note">Example activity only. No real recordings or student information are stored.</p>
      </section>
    </div>
  );
}
