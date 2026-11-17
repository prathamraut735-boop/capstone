import { useState, type FormEvent } from "react";
import { CalendarDays, Check, Music2 } from "lucide-react";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";
import { createAdminSession } from "../../backendApi";
import { auth } from "../../firebase";

const defaultDuration = "45";

export default function AdminDashboard() {
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [startAt, setStartAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [capacity, setCapacity] = useState("12");
  const [price, setPrice] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [publishedMessage, setPublishedMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setError("Sign in with an administrator account to publish a session.");
      return;
    }

    const startDate = new Date(startAt);
    const duration = Number(durationMinutes);
    const seatCount = Number(capacity);
    const priceValue = Number(price);
    if (
      Number.isNaN(startDate.getTime()) ||
      !Number.isInteger(duration) ||
      duration < 1 ||
      !Number.isInteger(seatCount) ||
      seatCount < 1 ||
      !Number.isFinite(priceValue) ||
      priceValue < 0
    ) {
      setError("Enter a valid future date, duration, capacity, and non-negative price.");
      return;
    }

    const endDate = new Date(startDate.getTime() + duration * 60_000);
    setError("");
    setPublishedMessage("");
    setIsSubmitting(true);
    try {
      const session = await createAdminSession(user, {
        title: title.trim(),
        venue: venue.trim(),
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        capacity: seatCount,
        priceCents: Math.round(priceValue * 100),
      });
      setPublishedMessage(
        `${session.title} is published. ${session.availableSeats} places are now available for parents to book.`,
      );
      setTitle("");
      setVenue("");
      setStartAt("");
      setDurationMinutes(defaultDuration);
      setCapacity("12");
      setPrice("0");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The session could not be published.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="role-content">
      <RolePageHeading
        eyebrow="ADMIN WORKSPACE"
        title="Publish a music session"
        description="Create an upcoming live session or workshop. Published sessions with open places appear in parent bookings."
      />
      <DemoNote tone="teal">
        Publishing makes a real session record in Firestore and opens its places for parent reservations. Checkout remains simulated; no money is collected.
      </DemoNote>
      <section className="role-panel admin-session-publish">
        <div className="role-panel-heading">
          <div><span className="eyebrow">SESSION DETAILS</span><h2>New scheduled session</h2></div>
          <span className="role-icon-chip teal"><CalendarDays size={18} /></span>
        </div>
        <form className="admin-session-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="form-field">
            <span>Session title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Beginner ukulele workshop"
              maxLength={100}
              required
            />
          </label>
          <label className="form-field">
            <span>Venue</span>
            <input
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              placeholder="Community music room"
              maxLength={160}
              required
            />
          </label>
          <label className="form-field">
            <span>Date and start time</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Duration (minutes)</span>
            <input
              type="number"
              min="1"
              max="1440"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Maximum places</span>
            <input
              type="number"
              min="1"
              max="500"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Price per learner (AUD)</span>
            <input
              type="number"
              min="0"
              max="100000"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          </label>
          <div className="admin-session-form-note">
            <Music2 size={16} />
            <span>This session will publish immediately. Parents can book one place per learner using the existing simulated checkout.</span>
          </div>
          {error && <p className="auth-error-message" role="alert">{error}</p>}
          {publishedMessage && (
            <p className="role-inline-message admin-session-success" role="status">
              <Check size={16} /> {publishedMessage}
            </p>
          )}
          <button className="button button-pink" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Publishing session..." : "Publish session"}
          </button>
        </form>
      </section>
    </div>
  );
}
