import type { ReactNode } from "react";
import { ArrowRight, Check, Clock3, LockKeyhole, Play } from "lucide-react";
import { Link } from "react-router-dom";
import type { Lesson } from "../types";

export function PageHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="page-heading">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

export function SectionTitle({ title, action, to }: { title: string; action?: string; to?: string }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && to && <Link className="text-link" to={to}>{action}<ArrowRight size={16} /></Link>}
    </div>
  );
}

export function LessonCard({ lesson, compact = false }: { lesson: Lesson; compact?: boolean }) {
  const stateLabel = lesson.status === "complete" ? "Completed" : lesson.status === "in-progress" ? "In progress" : "Up next";
  return (
    <Link className={`lesson-card ${compact ? "lesson-card-compact" : ""}`} to={`/student/lessons/${lesson.id}`}>
      <span className={`lesson-icon lesson-icon-${lesson.status}`}><Play size={18} fill="currentColor" /></span>
      <span className="lesson-copy">
        <span className="lesson-meta">{lesson.instrument} <span className="meta-dot">·</span> {lesson.duration}</span>
        <strong>{lesson.title}</strong>
        {!compact && <span className="lesson-state">{lesson.status === "complete" && <Check size={13} />}{stateLabel}</span>}
      </span>
      <ArrowRight className="lesson-arrow" size={18} />
    </Link>
  );
}

export function StatCard({ icon, label, value, detail, color }: { icon: ReactNode; label: string; value: string; detail: string; color: string }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon ${color}`}>{icon}</span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

export function StatusPill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "purple" | "yellow" }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

export function Duration({ children }: { children: ReactNode }) {
  return <span className="duration"><Clock3 size={14} />{children}</span>;
}

export function LockedMessage() {
  return <span className="locked-message"><LockKeyhole size={14} />Coming soon</span>;
}
