import { useEffect, useState } from "react";
import { AudioLines, Check, Clock3, FileAudio2, LockKeyhole, Mic2, ShieldCheck, Upload } from "lucide-react";
import { recentPractices } from "../../data/mockData";
import { PageHeading, SectionTitle, StatusPill } from "../../components/UI";
import {
  createStudentPracticeSubmission,
  getStudentEntitlements,
  type StudentEntitlements,
} from "../../backendApi";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";

export default function Practice() {
  const [entitlements, setEntitlements] = useState<StudentEntitlements | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    let requestNumber = 0;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      requestNumber += 1;
      const currentRequest = requestNumber;
      if (!user) {
        if (active) {
          setEntitlements(null);
          setError("Sign in to check your practice allowance.");
          setIsLoading(false);
        }
        return;
      }
      setEntitlements(null);
      setIsLoading(true);
      setError("");
      getStudentEntitlements(user)
        .then((result) => {
          if (active && currentRequest === requestNumber) setEntitlements(result);
        })
        .catch((cause: unknown) => {
          if (active && currentRequest === requestNumber) {
            setError(cause instanceof Error ? cause.message : "Your practice allowance could not be loaded.");
          }
        })
        .finally(() => {
          if (active && currentRequest === requestNumber) setIsLoading(false);
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function submitDemoPractice() {
    const user = auth.currentUser;
    if (!user) {
      setError("Sign in to create a simulated practice submission.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setMessage("");
    try {
      const result = await createStudentPracticeSubmission(user, "lesson-1");
      setEntitlements((current) => current ? {
        ...current,
        practiceSubmissionsUsed: result.practiceSubmissionsUsed,
        practiceSubmissionsRemaining: result.practiceSubmissionsRemaining,
      } : current);
      setMessage(`Simulated submission recorded. ${result.practiceSubmissionsRemaining} of ${result.monthlyLimit} family submissions remain this UTC month. No audio was uploaded.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The simulated practice submission could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeading eyebrow="YOUR PRACTICE SPACE" title="My Practice">A calm place to try things out and share your progress with your teacher.</PageHeading>
      <div className="privacy-banner"><ShieldCheck size={20} /><span><strong>Your practice stays private.</strong> Audio submissions are for your teacher only. They are not shared publicly, and students cannot message one another.</span></div>
      <div className="practice-grid">
        <section className="panel upload-panel">
          <div className="panel-heading-icon"><span className="upload-icon"><Mic2 size={21} /></span><div><h2>Record or add a practice</h2><p>Ready when you are. It doesn't need to be perfect.</p></div></div>
          <button className="upload-zone" type="button" onClick={() => void submitDemoPractice()} disabled={isLoading || isSubmitting || !entitlements || entitlements.practiceSubmissionsRemaining === 0}>
            <span className="upload-round"><Upload size={21} /></span>
            <strong>{isSubmitting ? "Saving demo submission…" : "Create simulated practice submission"}</strong>
            <span>This records a demo submission against your plan allowance. Recording and audio uploads are not enabled.</span>
            <span className="upload-formats"><FileAudio2 size={14} /> No audio is collected or uploaded</span>
          </button>
          {isLoading && <div className="inline-demo-message" role="status">Loading your monthly practice allowance…</div>}
          {entitlements && <div className="inline-demo-message" role="status">{entitlements.planName} Plan · {entitlements.practiceSubmissionsUsed} of {entitlements.limits.practiceSubmissionsPerMonth} family submissions used this UTC month</div>}
          {message && <div className="inline-demo-message" role="status"><Check size={16} /> {message}</div>}
          {error && <div className="inline-demo-message" role="alert">{error}</div>}
          <div className="upload-foot"><LockKeyhole size={15} /><span>No audio is uploaded by this demo. Video submissions are not available.</span></div>
        </section>
        <aside className="practice-tip">
          <span className="tip-sparkle">✦</span><span className="eyebrow">A LITTLE REMINDER</span>
          <h2>Practice your way</h2>
          <p>Try a few minutes at a time. You can always come back and have another go.</p>
          <div className="tip-doodle">♫ <span>♪</span> ♫</div>
          <div className="duration-chip"><Clock3 size={15} /> Max recording: 4 minutes</div>
        </aside>
      </div>
      <section className="panel submissions-panel">
        <SectionTitle title="Previous submissions" />
        <div className="submission-list">
          {recentPractices.map((practice, index) => (
            <div className="submission-row" key={practice.title}>
              <span className={`submission-wave wave-${index}`}><AudioLines size={19} /></span>
              <span className="submission-copy"><strong>{practice.title}</strong><small>{practice.date} <i /> Audio only <i /> Example submission</small></span>
              <StatusPill tone={index === 1 ? "green" : "yellow"}>{index === 1 ? <><Check size={12} /> Teacher feedback</> : "Waiting for teacher"}</StatusPill>
            </div>
          ))}
        </div>
        <p className="example-note">These are fictional examples. No audio recordings are stored or played here.</p>
      </section>
    </div>
  );
}
