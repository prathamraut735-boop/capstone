import { ArrowRight, AudioLines, BookOpen, Music2, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: BookOpen,
    color: "pink",
    title: "Watch lessons",
    description: "Explore friendly lessons for singing, ukulele and songwriting at your own pace.",
  },
  {
    icon: AudioLines,
    color: "teal",
    title: "Practise and share audio",
    description: "Build confidence with practice activities and private audio submissions.",
  },
  {
    icon: Star,
    color: "yellow",
    title: "Get teacher feedback",
    description: "Teachers can guide practice and help learners decide on their next steps.",
  },
];

export default function Landing() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="landing-kicker"><Sparkles size={15} /> A HAPPY PLACE TO MAKE MUSIC</span>
          <h1>Learn music,<br /><span>find your voice.</span></h1>
          <p>Sing a new tune, strum a ukulele, and discover the joy of making music, one little step at a time.</p>
          <div className="hero-actions">
            <Link className="button button-pink" to="/signup">Get started <ArrowRight size={16} /></Link>
            <a className="landing-secondary-link" href="#how-it-works">See how it works</a>
          </div>
          <div className="hero-note"><span className="hero-note-dot" /> A friendly online music learning experience</div>
        </div>
        <div className="landing-illustration" role="img" aria-label="Illustration of a ukulele with colourful music notes">
          <span className="illustration-sun" />
          <span className="illustration-note note-a">♪</span>
          <span className="illustration-note note-b">♫</span>
          <span className="illustration-star"><Star size={28} fill="currentColor" /></span>
          <span className="illustration-flower">✿</span>
          <div className="illustration-ukulele"><span className="illustration-neck" /><span className="illustration-body"><i /></span></div>
          <div className="illustration-caption"><Music2 size={16} /> Sing · Strum · Create</div>
        </div>
      </section>

      <section className="features-section" id="lessons">
        <div className="landing-section-heading">
          <span className="eyebrow">MAKE MUSIC YOUR WAY</span>
          <h2>A little learning goes a long way</h2>
          <p>Explore a simple learning journey with support from your teacher.</p>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, color, title, description }, index) => (
            <article className="feature-card" key={title}>
              <span className={`feature-icon ${color}`}><Icon size={22} /></span>
              <span className="feature-number">0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="learning-journey" id="how-it-works">
        <div className="journey-intro">
          <span className="eyebrow">YOUR MUSICAL ADVENTURE</span>
          <h2>Learn, try, and grow together.</h2>
          <p>Follow a friendly rhythm that leaves room to explore. Lesson content and progression are guided by teachers.</p>
          <Link className="text-link" to="/signup">Get started <ArrowRight size={16} /></Link>
        </div>
        <div className="landing-steps">
          <div className="landing-step"><span className="landing-step-icon pink"><BookOpen size={18} /></span><div><strong>Watch</strong><small>Explore a lesson</small></div><span className="landing-step-number">01</span></div>
          <div className="landing-step"><span className="landing-step-icon purple"><Music2 size={18} /></span><div><strong>Practise</strong><small>Try it at your pace</small></div><span className="landing-step-number">02</span></div>
          <div className="landing-step"><span className="landing-step-icon teal"><AudioLines size={18} /></span><div><strong>Share audio</strong><small>When you're ready</small></div><span className="landing-step-number">03</span></div>
          <div className="landing-step"><span className="landing-step-icon yellow"><Star size={18} /></span><div><strong>Get feedback</strong><small>Teacher-guided support</small></div><span className="landing-step-number">04</span></div>
        </div>
      </section>

      <section className="landing-cta">
        <span className="cta-note">♫</span>
        <div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Let’s make a little music.</h2><p>Start by exploring the Toy Choir TV demo.</p></div>
        <Link className="button button-white" to="/signup">Get started <ArrowRight size={16} /></Link>
      </section>
    </div>
  );
}
