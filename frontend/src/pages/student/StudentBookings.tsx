import { CalendarDays, MapPin } from "lucide-react";
import { PageHeading, StatusPill } from "../../components/UI";
import type { ParentBooking } from "../../backendApi";
import { useStudentBookings } from "../../hooks/useStudentBookings";

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

function formatPrice(booking: ParentBooking) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: booking.currency,
  }).format(booking.amountCents / 100);
}

function BookingRow({ booking }: { booking: ParentBooking }) {
  const isPast = new Date(booking.startAt).getTime() <= Date.now();
  const statusLabel = booking.status === "cancelled" ? "Cancelled" : isPast ? "Past session" : "Confirmed";
  const statusTone = booking.status === "cancelled" ? "neutral" : isPast ? "yellow" : "green";

  return (
    <article className="student-session-row">
      <div className="student-session-heading">
        <CalendarDays size={18} />
        <strong>{booking.sessionTitle}</strong>
        <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
      </div>
      <p>{formatSessionDate(booking.startAt, booking.endAt)}</p>
      <p><MapPin size={14} /> {booking.venue}</p>
      <small>
        {formatPrice(booking)} · Payment simulated, no charge · Booking {booking.id.slice(0, 8).toUpperCase()}
      </small>
    </article>
  );
}

export default function StudentBookings() {
  const { bookings, loading, error, reload } = useStudentBookings();
  const now = Date.now();
  const upcoming = bookings.filter(
    (booking) => booking.status === "confirmed" && new Date(booking.startAt).getTime() > now,
  );
  const history = bookings.filter(
    (booking) => booking.status === "cancelled" || new Date(booking.startAt).getTime() <= now,
  );

  return (
    <div className="page-content">
      <PageHeading eyebrow="SCHEDULED MUSIC SESSIONS" title="My Sessions">
        Sessions your parent has booked for you. Payments are simulated and no money is charged.
      </PageHeading>

      {error && (
        <div className="notice notice-purple" role="alert">
          <CalendarDays size={18} />
          <span>{error} <button className="student-lesson-text-button" type="button" onClick={reload}>Try again</button></span>
        </div>
      )}

      <section className="panel student-sessions-panel">
        <div className="section-title"><h2>Upcoming sessions</h2></div>
        {loading ? (
          <p className="student-lesson-empty">Loading your sessions…</p>
        ) : upcoming.length ? (
          upcoming.map((booking) => <BookingRow key={booking.id} booking={booking} />)
        ) : (
          <p className="student-lesson-empty">
            No upcoming sessions are booked for you yet. Ask your parent to check the available sessions.
          </p>
        )}
      </section>

      <section className="panel student-sessions-panel">
        <div className="section-title"><h2>Session history</h2></div>
        {loading ? (
          <p className="student-lesson-empty">Loading your session history…</p>
        ) : history.length ? (
          history.map((booking) => <BookingRow key={booking.id} booking={booking} />)
        ) : (
          <p className="student-lesson-empty">Your cancelled and past sessions will appear here.</p>
        )}
      </section>
    </div>
  );
}
