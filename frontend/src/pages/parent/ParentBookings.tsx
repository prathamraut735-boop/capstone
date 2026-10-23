import { useState } from "react";
import { CalendarDays, Check, Clock3, MapPin } from "lucide-react";
import { demoBookingHistory, demoChildren, demoSessions } from "../../data/parentAdminData";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";

export default function ParentBookings() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const selected = demoSessions.find((session) => session.id === selectedSession);

  return (
    <div className="role-content">
      <RolePageHeading eyebrow="FAMILY MUSIC SESSIONS" title="Bookings" description="Browse example sessions and try the demo selection flow." />
      <DemoNote tone="teal">Selecting a session only updates this page. No session is reserved and no payment is taken.</DemoNote>
      <div className="booking-layout">
        <section className="booking-session-list">
          <div className="role-section-heading"><div><span className="eyebrow">EXAMPLE AVAILABILITY</span><h2>Explore sessions</h2></div></div>
          {demoSessions.map((session) => (
            <article className={`role-panel booking-session-card ${selectedSession === session.id ? "booking-session-selected" : ""}`} key={session.id}>
              <div className="booking-session-title"><span className="role-icon-chip teal"><CalendarDays size={17} /></span><div><h3>{session.title}</h3><small>{session.availability}</small></div><span className="role-status status-draft">Demo</span></div>
              <div className="booking-details"><span><CalendarDays size={14} />{session.date}</span><span><Clock3 size={14} />{session.time}</span><span><MapPin size={14} />{session.venue}</span></div>
              <button className={`button ${selectedSession === session.id ? "button-success" : "button-outline"}`} type="button" onClick={() => { setSelectedSession(session.id); setConfirmation(false); }}>
                {selectedSession === session.id ? <><Check size={15} /> Selected for demo</> : "Select session"}
              </button>
            </article>
          ))}
        </section>
        <aside className="role-panel booking-summary">
          <span className="eyebrow">DEMO BOOKING SUMMARY</span>
          <h2>Your selection</h2>
          {selected ? (
            <>
              <div className="summary-session"><strong>{selected.title}</strong><span>{selected.date}</span><span>{selected.time}</span><span>{selected.venue}</span></div>
              <label className="form-field booking-learner-select"><span>Learner (example)</span><select defaultValue={demoChildren[0].id}>{demoChildren.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}</select></label>
              <button className="button button-pink booking-confirm-button" onClick={() => setConfirmation(true)}>Continue demo</button>
              {confirmation && <div className="role-inline-message" role="status"><Check size={16} /> Demo selection noted locally only. This is not a booking confirmation.</div>}
            </>
          ) : <p className="empty-summary">Choose an example session to see it here.</p>}
          <p className="role-example-caption">No session is reserved. Checkout and payments are not available.</p>
        </aside>
      </div>
      <section className="role-panel booking-history">
        <div className="role-panel-heading"><div><span className="eyebrow">PAST ACTIVITY</span><h2>Booking history</h2></div></div>
        {demoBookingHistory.map((booking) => <div className="booking-history-row" key={booking.title}><span className="role-icon-chip purple"><CalendarDays size={16} /></span><span><strong>{booking.title}</strong><small>{booking.date}</small></span><span className="role-status status-resolved">{booking.status} · demo</span></div>)}
      </section>
    </div>
  );
}
