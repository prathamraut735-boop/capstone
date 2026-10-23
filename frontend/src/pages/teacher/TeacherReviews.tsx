import { useState } from "react";
import { practiceReviews, type PracticeReview } from "../../data/teacherData";
import { DemoNote, RolePageHeading } from "../../components/RoleUI";
import { AudioPlaceholder, ReviewTarget, TeacherConfirmation, TeacherStatus } from "../../components/TeacherUI";

export default function TeacherReviews() {
  const [reviews, setReviews] = useState(practiceReviews);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [approvedReviewIds, setApprovedReviewIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const selected = reviews.find((review) => review.id === selectedId);

  function updateReview(reviewId: string, update: Partial<PracticeReview>, confirmation: string) {
    setReviews((current) => current.map((review) => review.id === reviewId ? { ...review, ...update } : review));
    setMessage(confirmation);
  }

  function markReviewed(review: PracticeReview) {
    if (review.status === "Revision Requested" && !review.revisionSubmitted) {
      setMessage("A new attempt must be submitted before this revision can be marked reviewed.");
      return;
    }
    if (!feedback[review.id]?.trim()) {
      setMessage("Add teacher feedback before marking this example review as reviewed.");
      return;
    }
    updateReview(review.id, { status: "Teacher Reviewed" }, "Teacher review updated in this browser demo only. Nothing was saved to a server.");
  }

  function requestRevision(review: PracticeReview) {
    updateReview(review.id, { status: "Revision Requested", revisionSubmitted: false }, "Revision requested in this local demo. The learner needs to submit another attempt before progression can be approved.");
  }

  function simulateAttempt(review: PracticeReview) {
    updateReview(review.id, { attempt: review.attempt + 1, revisionSubmitted: true, status: "Pending Review" }, "A fictional new attempt is shown locally. Teacher review is still required.");
  }

  function approveNextLevel(review: PracticeReview) {
    if (!review.revisionSubmitted && review.status === "Revision Requested") {
      setMessage("A new attempt is required before progression can be considered.");
      return;
    }
    if (review.status !== "Teacher Reviewed") {
      setMessage("Complete the teacher review first. AI feedback cannot approve a level.");
      return;
    }
    setApprovedReviewIds((current) => current.includes(review.id) ? current : [...current, review.id]);
    setMessage("Teacher approval shown for this fictional example only. No real level or access changed.");
  }

  return (
    <>
      <RolePageHeading eyebrow="TEACHER WORKSPACE · DEMO DATA" title="Practice reviews" description="Review fictional audio-submission records. The teacher remains the final decision-maker." />
      <DemoNote>All AI text is fictional placeholder copy, not audio analysis. No audio is attached, played, uploaded or processed.</DemoNote>
      <div className="teacher-review-target-row"><ReviewTarget /><span>Only a teacher can decide whether progression is appropriate.</span></div>
      {message && <TeacherConfirmation>{message}</TeacherConfirmation>}
      <section className="teacher-panel">
        <div className="teacher-panel-heading"><div><h2>Review queue</h2><p>{reviews.length} fictional example submissions</p></div></div>
        <div className="teacher-review-list">
          {reviews.map((review) => (
            <article className={`teacher-review-row ${selectedId === review.id ? "teacher-review-row-active" : ""}`} key={review.id}>
              <div className="teacher-list-avatar">{review.learnerId.slice(-1)}</div>
              <div className="teacher-list-copy"><strong>{review.learnerId} · {review.lesson}</strong><small>{review.submitted} · Attempt {review.attempt}</small></div>
              <TeacherStatus>{review.status}</TeacherStatus>
              <button className="button button-outline" type="button" onClick={() => { setSelectedId(selectedId === review.id ? null : review.id); setMessage(""); }}>
                {selectedId === review.id ? "Close details" : "Review details"}
              </button>
            </article>
          ))}
        </div>
      </section>
      {selected && <ReviewDetail
        review={selected}
        approved={approvedReviewIds.includes(selected.id)}
        feedback={feedback[selected.id] ?? ""}
        onFeedbackChange={(value) => setFeedback((current) => ({ ...current, [selected.id]: value }))}
        onMarkReviewed={() => markReviewed(selected)}
        onRequestRevision={() => requestRevision(selected)}
        onSimulateAttempt={() => simulateAttempt(selected)}
        onApprove={() => approveNextLevel(selected)}
      />}
    </>
  );
}

function ReviewDetail({ review, approved, feedback, onFeedbackChange, onMarkReviewed, onRequestRevision, onSimulateAttempt, onApprove }: {
  review: PracticeReview;
  approved: boolean;
  feedback: string;
  onFeedbackChange: (value: string) => void;
  onMarkReviewed: () => void;
  onRequestRevision: () => void;
  onSimulateAttempt: () => void;
  onApprove: () => void;
}) {
  const canApprove = review.status === "Teacher Reviewed" && (review.attempt === 1 || review.revisionSubmitted);
  return (
    <section className="teacher-panel teacher-review-detail" aria-label={`Review details for ${review.learnerId}`}>
      <div className="teacher-panel-heading"><div><span className="eyebrow">SUBMISSION DETAIL · DEMO</span><h2>{review.learnerId}: {review.lesson}</h2></div><TeacherStatus>{review.status}</TeacherStatus></div>
      <p className="teacher-muted">{review.submitted} · Attempt {review.attempt}</p>
      <AudioPlaceholder />
      <div className="teacher-ai-placeholder"><strong>Fictional AI feedback placeholder</strong><p>{review.aiDraft}</p><small>A teacher must check any future AI-generated draft. It cannot approve progression.</small></div>
      {review.status === "Revision Requested" && !review.revisionSubmitted && (
        <div className="teacher-revision-callout">
          <strong>Waiting for another attempt</strong>
          <p>Progression cannot be approved until a new practice attempt has been submitted and reviewed.</p>
          <button type="button" className="button button-outline" onClick={onSimulateAttempt}>Demo: show a new attempt</button>
        </div>
      )}
      <label className="teacher-field">Teacher feedback<textarea rows={4} value={feedback} onChange={(event) => onFeedbackChange(event.target.value)} placeholder="Write fictional teacher feedback for this demo. It stays only in this page state." /></label>
      <div className="teacher-action-row">
        <button type="button" className="button button-pink" onClick={onMarkReviewed} disabled={review.status === "Revision Requested" && !review.revisionSubmitted}>Mark teacher reviewed</button>
        <button type="button" className="button button-outline" onClick={onRequestRevision}>Request revision</button>
        <button type="button" className="button button-success" disabled={!canApprove || approved} onClick={onApprove}>{approved ? "Next level approved · demo" : "Approve next level (teacher)"}</button>
      </div>
      {review.status === "Revision Requested" && !review.revisionSubmitted && <small className="teacher-disabled-help">Approval is unavailable until a new attempt is submitted and reviewed.</small>}
    </section>
  );
}
