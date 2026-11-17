import { ArrowRight, AudioLines, CalendarDays, Check, Music2, Play, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { recentPractices } from "../../data/mockData";
import { LessonCard, SectionTitle, StatusPill } from "../../components/UI";
import { useStudentBookings } from "../../hooks/useStudentBookings";
import { useStudentLessons } from "../../hooks/useStudentLessons";

function formatSessionDate(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time.format(start)}–${time.format(end)}`;
}

const journey = [
  { label: "Watch", detail: "Learn something new", icon: Play, color: "pink" },
  { label: "Practise", detail: "Try it at your pace", icon: Music2, color: "purple" },
  { label: "Submit audio", detail: "Share with your teacher", icon: AudioLines, color: "teal" },
  { label: "Get feedback", detail: "Grow with guidance", icon: Star, color: "yellow" },
];

export default function Dashboard() {
  const { lessons, progress, loading, error, reload } = useStudentLessons();
  const {
    bookings,
    loading: bookingsLoading,
    error: bookingsError,
    reload: reloadBookings,
  } = useStudentBookings();
  const nextLesson = lessons.find((lesson) => lesson.status !== "complete");
  const progressPercent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  const upcomingBookings = bookings.filter(
    (booking) => booking.status === "confirmed" && new Date(booking.startAt).getTime() > Date.now(),
  );

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
            {loading && <p className="student-lesson-empty">Loading your lessons…</p>}
            {error && <p className="student-lesson-error" role="alert">{error} <button className="student-lesson-text-button" type="button" onClick={reload}>Try again</button></p>}
            {!loading && !error && lessons.length === 0 && <p className="student-lesson-empty">No lessons are published yet.</p>}
            {!loading && !error && lessons.slice(0, 3).map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
          </div>
        </section>

        <div className="dashboard-side">
          <section className="continue-card">
            <div className="continue-top"><span className="continue-tag"><Play size={12} fill="currentColor" /> PICK UP WHERE YOU LEFT OFF</span><span className="continue-illustration">♫</span></div>
            <h2>{nextLesson ? nextLesson.title : progress.total > 0 ? "All lessons complete!" : "Your next lesson"}</h2>
            <p>{nextLesson ? "Your next little step is ready when you are." : "Explore published lessons whenever you’re ready."}</p>
            <div className="continue-progress"><span><i style={{ width: `${progressPercent}%` }} /></span><small>{progress.completed} of {progress.total} complete</small></div>
            <Link to={nextLesson ? `/student/lessons/${nextLesson.id}` : "/student/lessons"} className="button button-pink">
              {nextLesson ? "Continue learning" : "View my lessons"} <ArrowRight size={16} />
            </Link>
          </section>

          <section className="panel mini-progress">
            <SectionTitle title="My progress" action="See more" to="/student/progress" />
            <div className="progress-summary"><div className="progress-ring"><span><strong>{progress.completed}</strong><small>of {progress.total}</small></span></div><div><strong>{loading ? "Loading progress…" : "Your learning journey"}</strong><p>{error || `${progressPercent}% of published lessons complete.`}</p></div></div>
            <div className="progress-bar"><span style={{ width: `${progressPercent}%` }} /></div>
            <div className="progress-foot"><span>Saved lesson progress</span><StatusPill tone="purple">Teacher-guided</StatusPill></div>
          </section>
        </div>
      </div>

      <section className="panel student-sessions-panel">
        <SectionTitle title="My sessions" action="All sessions" to="/student/sessions" />
        {bookingsLoading && <p className="student-lesson-empty">Loading your sessions…</p>}
        {bookingsError && (
          <p className="student-lesson-error" role="alert">
            {bookingsError} <button className="student-lesson-text-button" type="button" onClick={reloadBookings}>Try again</button>
          </p>
        )}
        {!bookingsLoading && !bookingsError && upcomingBookings.length === 0 && (
          <p className="student-lesson-empty">No upcoming sessions are booked for you yet.</p>
        )}
        {!bookingsLoading && !bookingsError && upcomingBookings.slice(0, 2).map((booking) => (
          <article className="student-session-row" key={booking.id}>
            <div className="student-session-heading">
              <CalendarDays size={18} />
              <strong>{booking.sessionTitle}</strong>
              <StatusPill tone="green">Confirmed</StatusPill>
            </div>
            <p>{formatSessionDate(booking.startAt, booking.endAt)}</p>
            <small>{booking.venue} · Payment simulated, no charge</small>
          </article>
        ))}
      </section>

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
