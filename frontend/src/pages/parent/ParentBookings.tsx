import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { CalendarDays, Check, MapPin, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  cancelParentBooking,
  createParentBooking,
  getAvailableSessions,
  getParentBookings,
  getParentLearners,
  type AvailableSession,
  type ParentBooking,
  type ParentLearner,
} from "../../backendApi";
import { RolePageHeading } from "../../components/RoleUI";
import useCurrentUser from "../../useCurrentUser";

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

function formatPrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(priceCents / 100);
}

export default function ParentBookings() {
  const { user, isAuthReady } = useCurrentUser();
  const [sessions, setSessions] = useState<AvailableSession[]>([]);
  const [learners, setLearners] = useState<ParentLearner[]>([]);
  const [bookings, setBookings] = useState<ParentBooking[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedLearnerId, setSelectedLearnerId] = useState("");
  const [acceptsReservation, setAcceptsReservation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId),
    [sessions, selectedSessionId],
  );
  const selectedLearner = useMemo(
    () => learners.find((learner) => learner.id === selectedLearnerId),
    [learners, selectedLearnerId],
  );

  useEffect(() => {
    if (!isAuthReady) return;
    if (user === null) {
      setIsLoading(false);
      return;
    }
    const authenticatedUser: User = user;

    let active = true;
    let requestInProgress = false;
    async function refreshBookingData(currentUser: User, showLoading: boolean) {
      if (requestInProgress) return;
      requestInProgress = true;
      if (showLoading) setIsLoading(true);
      try {
        const [availableSessions, familyLearners, familyBookings] = await Promise.all([
          getAvailableSessions(currentUser),
          getParentLearners(currentUser),
          getParentBookings(currentUser),
        ]);
        if (!active) return;
        const activeLearners = familyLearners.filter((learner) => learner.accountStatus !== "deactivated");
        setSessions(availableSessions);
        setLearners(activeLearners);
        setBookings(familyBookings);
        setSelectedLearnerId((current) => (
          activeLearners.some((learner) => learner.id === current) ? current : activeLearners[0]?.id || ""
        ));
        setError("");
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load booking information.");
      } finally {
        requestInProgress = false;
        if (active && showLoading) setIsLoading(false);
      }
    }

    setError("");
    void refreshBookingData(authenticatedUser, true);
    const refreshTimer = window.setInterval(() => {
      void refreshBookingData(authenticatedUser, false);
    }, 15_000);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [isAuthReady, user, refreshVersion]);

  async function handleBooking() {
    if (!user || !selectedSession || !selectedLearner || !acceptsReservation) return;
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const booking = await createParentBooking(user, selectedSession.id, selectedLearner.id);
      setNotice(`Booking confirmed for ${booking.learnerNickname}. Payment was simulated; no money was charged.`);
      setSelectedSessionId("");
      setAcceptsReservation(false);
      setRefreshVersion((version) => version + 1);
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : "Unable to complete this booking.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancellation(booking: ParentBooking) {
    if (!user) return;
    const confirmed = window.confirm(
      `Cancel ${booking.learnerNickname}'s booking for ${booking.sessionTitle}? This releases the reserved session spot.`,
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    setBusyBookingId(booking.id);
    try {
      await cancelParentBooking(user, booking.id);
      setNotice("Booking cancelled and the session spot released. No payment was taken.");
      setRefreshVersion((version) => version + 1);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel this booking.");
    } finally {
      setBusyBookingId(null);
    }
  }

  return (
    <div className="role-content">
      <RolePageHeading
        eyebrow="FAMILY MUSIC SESSIONS"
        title="Bookings"
        description="Browse published sessions, reserve a place, and manage your family bookings."
      />
      {/* <div className="role-demo-note role-note-teal">
        <CalendarDays size={17} />
        <span>
          These are scheduled live sessions, not pre-recorded lessons. Confirming simulated checkout creates a real booking and reserves a place; no money is charged. Session availability and booking history refresh automatically.
        </span>
      </div> */}

      {!isAuthReady || isLoading ? (
        <section className="role-panel"><p>Loading sessions and bookings...</p></section>
      ) : !user ? (
        <section className="role-panel">
          <p>Log in with your parent account to browse sessions and manage bookings.</p>
          <Link className="button button-pink" to="/login">Log in</Link>
        </section>
      ) : (
        <>
          {error && <p className="auth-error-message" role="alert">{error}</p>}
          {notice && <div className="role-inline-message" role="status"><Check size={16} />{notice}</div>}

          <div className="booking-layout">
            <section className="booking-session-list">
              <div className="role-section-heading">
                <div><span className="eyebrow">LIVE AVAILABILITY</span><h2>Explore sessions</h2></div>
              </div>
              {sessions.length ? sessions.map((session) => (
                <article
                  className={`role-panel booking-session-card ${selectedSessionId === session.id ? "booking-session-selected" : ""}`}
                  key={session.id}
                >
                  <div className="booking-session-title">
                    <span className="role-icon-chip teal"><CalendarDays size={17} /></span>
                    <div><h3>{session.title}</h3><small>{session.availableSeats} of {session.capacity} places available</small></div>
                    <span className="role-status status-published">{formatPrice(session.priceCents, session.currency)}</span>
                  </div>
                  <div className="booking-details">
                    <span><CalendarDays size={14} />{formatSessionDate(session.startAt, session.endAt)}</span>
                    <span><MapPin size={14} />{session.venue}</span>
                  </div>
                  <button
                    className={`button ${selectedSessionId === session.id ? "button-success" : "button-outline"}`}
                    type="button"
                    onClick={() => {
                      setSelectedSessionId(session.id);
                      setAcceptsReservation(false);
                    }}
                  >
                    {selectedSessionId === session.id ? <><Check size={15} /> Selected</> : "Choose session"}
                  </button>
                </article>
              )) : (
                <div className="role-panel booking-empty-state">
                  <CalendarDays size={22} />
                  <h3>No sessions available</h3>
                  <p>There are no upcoming sessions with places available right now. Please check again later.</p>
                </div>
              )}
            </section>

            <aside className="role-panel booking-summary">
              <span className="eyebrow">RESERVATION</span>
              <h2>Booking summary</h2>
              {selectedSession ? (
                <>
                  <div className="summary-session">
                    <strong>{selectedSession.title}</strong>
                    <span>{formatSessionDate(selectedSession.startAt, selectedSession.endAt)}</span>
                    <span>{selectedSession.venue}</span>
                    <strong>{formatPrice(selectedSession.priceCents, selectedSession.currency)}</strong>
                  </div>
                  {learners.length ? (
                    <>
                      <label className="form-field booking-learner-select" htmlFor="booking-learner">
                        <span>Learner profile</span>
                        <select
                          id="booking-learner"
                          value={selectedLearnerId}
                          onChange={(event) => setSelectedLearnerId(event.target.value)}
                        >
                          {learners.map((learner) => (
                            <option key={learner.id} value={learner.id}>{learner.preferredName || learner.firstName}</option>
                          ))}
                        </select>
                      </label>
                      <label className="checkbox-field booking-simulation-consent">
                        <input
                          type="checkbox"
                          checked={acceptsReservation}
                          onChange={(event) => setAcceptsReservation(event.target.checked)}
                        />
                        <span>I understand this confirms a real reservation, but payment is simulated and no money is charged.</span>
                      </label>
                      <button
                        className="button button-pink booking-confirm-button"
                        type="button"
                        onClick={() => void handleBooking()}
                        disabled={!acceptsReservation || isSubmitting}
                      >
                        {isSubmitting ? "Confirming..." : "Confirm simulated payment"}
                      </button>
                    </>
                  ) : (
                    <div className="booking-no-learners">
                      <p>Add or reactivate a learner profile before booking a session.</p>
                      <Link className="button button-outline" to="/parent/children">Manage learner profiles</Link>
                    </div>
                  )}
                  <p className="role-example-caption">No payment provider is connected. The booking will reserve a real available place.</p>
                </>
              ) : <p className="empty-summary">Choose an available session to see its details.</p>}
            </aside>
          </div>

          <section className="role-panel booking-history">
            <div className="role-panel-heading">
              <div><span className="eyebrow">YOUR BOOKINGS</span><h2>Booking history</h2></div>
            </div>
            {bookings.length ? bookings.map((booking) => (
              <article className="booking-history-row" key={booking.id}>
                <span className="role-icon-chip purple"><CalendarDays size={16} /></span>
                <span className="booking-history-detail">
                  <strong>{booking.sessionTitle} · {booking.learnerNickname}</strong>
                  <small>{formatSessionDate(booking.startAt, booking.endAt)} · {booking.venue}</small>
                  <small>{formatPrice(booking.amountCents, booking.currency)} · Payment simulated, no charge</small>
                </span>
                <span className={`role-status ${booking.status === "confirmed" ? "status-published" : "status-draft"}`}>
                  {booking.status === "confirmed" ? "Confirmed" : "Cancelled"}
                </span>
                {booking.status === "confirmed" && new Date(booking.startAt) > new Date() && (
                  <button
                    className="button button-outline booking-cancel-button"
                    type="button"
                    onClick={() => void handleCancellation(booking)}
                    disabled={busyBookingId !== null}
                    aria-label={`Cancel ${booking.sessionTitle} for ${booking.learnerNickname}`}
                  >
                    <X size={14} /> {busyBookingId === booking.id ? "Cancelling..." : "Cancel"}
                  </button>
                )}
              </article>
            )) : <p className="empty-summary">You have no bookings yet.</p>}
          </section>
        </>
      )}
    </div>
  );
}
