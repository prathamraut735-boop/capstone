import type { ReactNode } from "react";
import { CheckCircle2, CircleHelp, Clock3, Headphones, type LucideIcon } from "lucide-react";

export function TeacherStat({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: LucideIcon }) {
  return (
    <article className="teacher-stat-card">
      <div className="teacher-stat-icon"><Icon size={19} /></div>
      <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </article>
  );
}

export function TeacherStatus({ children }: { children: ReactNode }) {
  const statusClass = children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "") ?? "unknown";
  return <span className={`teacher-status teacher-status-${statusClass}`}>{children}</span>;
}

export function TeacherNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "success" }) {
  return <div className={`teacher-notice teacher-notice-${tone}`} role="status">{children}</div>;
}

export function AudioPlaceholder() {
  return (
    <div className="teacher-audio-placeholder" aria-label="Audio playback placeholder; no audio file is available">
      <Headphones size={19} />
      <span><strong>Audio playback placeholder</strong><small>Fictional sample · no recording attached</small></span>
      <button type="button" className="teacher-play-placeholder" aria-label="Audio is not available" disabled>▶</button>
    </div>
  );
}

export function TeacherEmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="teacher-empty-state"><CircleHelp size={24} /><strong>{title}</strong><p>{children}</p></div>;
}

export function TeacherConfirmation({ children }: { children: ReactNode }) {
  return <div className="teacher-confirmation" role="status"><CheckCircle2 size={17} />{children}</div>;
}

export function ReviewTarget() {
  return <span className="teacher-review-target"><Clock3 size={14} />Illustrative target: teacher review within 24 hours (not guaranteed)</span>;
}
