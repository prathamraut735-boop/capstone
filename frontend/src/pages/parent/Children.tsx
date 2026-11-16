import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  createParentLearner,
  createStudentInvitation,
  deleteParentLearnerProfilePicture,
  getParentLearnerProfilePicture,
  getParentLearners,
  uploadParentLearnerProfilePicture,
  updateParentLearner,
  type ParentLearner,
  type ParentLearnerInput,
  type StudentInvitation,
} from "../../backendApi";
import { RolePageHeading } from "../../components/RoleUI";
import useCurrentUser from "../../useCurrentUser";

type LearnerForm = {
  firstName: string;
  ageRange: ParentLearner["ageRange"];
  preferredName: string;
  musicalExperience: NonNullable<ParentLearner["musicalExperience"]> | "";
  learningInterests: ParentLearner["learningInterests"];
  profilePicture: File | null;
};

const emptyForm: LearnerForm = {
  firstName: "",
  ageRange: "8-10",
  preferredName: "",
  musicalExperience: "",
  learningInterests: [],
  profilePicture: null,
};

const interestOptions: ParentLearner["learningInterests"] = ["Singing", "Ukulele", "Songwriting"];

function isProfileImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 2 * 1024 * 1024;
}

export default function Children() {
  const { user, isAuthReady } = useCurrentUser();
  const [learners, setLearners] = useState<ParentLearner[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const photoObjectUrls = useRef<string[]>([]);
  const [form, setForm] = useState<LearnerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<(StudentInvitation & { learnerId: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyLearnerId, setBusyLearnerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    getParentLearners(user)
      .then(async (records) => {
        if (active) setLearners(records);
        const learnersWithPhotos = records.filter(
          (learner): learner is ParentLearner & { profilePicturePath: string } =>
            typeof learner.profilePicturePath === "string",
        );
        const urls = await Promise.all(
          learnersWithPhotos.map(async (learner) => {
            const picture = await getParentLearnerProfilePicture(user, learner.id);
            const url = URL.createObjectURL(picture);
            photoObjectUrls.current.push(url);
            return [learner.id, url] as const;
          }),
        );
        if (active) {
          setPhotoUrls(Object.fromEntries(urls));
        } else {
          urls.forEach(([, url]) => URL.revokeObjectURL(url));
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load learner profiles.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      photoObjectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      photoObjectUrls.current = [];
    };
  }, [isAuthReady, user]);

  useEffect(
    () => () => photoObjectUrls.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function beginEdit(learner: ParentLearner) {
    setEditingId(learner.id);
    setForm({
      firstName: learner.firstName,
      ageRange: learner.ageRange,
      preferredName: learner.preferredName ?? "",
      musicalExperience: learner.musicalExperience ?? "",
      learningInterests: learner.learningInterests,
      profilePicture: null,
    });
    setError("");
    setNotice("");
  }

  function handlePictureChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = event.currentTarget.files?.[0] ?? null;
    if (file && !isProfileImage(file)) {
      setForm((current) => ({ ...current, profilePicture: null }));
      event.currentTarget.value = "";
      setError("Choose a JPEG, PNG, or WebP image smaller than 2 MB.");
      return;
    }
    setForm((current) => ({ ...current, profilePicture: file }));
  }

  function toggleInterest(interest: ParentLearner["learningInterests"][number]) {
    setForm((current) => ({
      ...current,
      learningInterests: current.learningInterests.includes(interest)
        ? current.learningInterests.filter((item) => item !== interest)
        : [...current.learningInterests, interest],
    }));
  }

  async function saveProfilePicture(learnerId: string, file: File) {
    if (!user) throw new Error("You need to sign in again before uploading a profile picture.");
    const updated = await uploadParentLearnerProfilePicture(user, learnerId, file);
    const picture = await getParentLearnerProfilePicture(user, learnerId);
    const url = URL.createObjectURL(picture);
    photoObjectUrls.current.push(url);
    setPhotoUrls((current) => ({ ...current, [learnerId]: url }));
    setLearners((current) => current.map((item) => (item.id === learnerId ? updated : item)));
  }

  async function handleRemovePicture(learner: ParentLearner) {
    if (!user) return;
    setBusyLearnerId(learner.id);
    setError("");
    setNotice("");
    try {
      await deleteParentLearnerProfilePicture(user, learner.id);
      const oldUrl = photoUrls[learner.id];
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      setPhotoUrls((current) => {
        const next = { ...current };
        delete next[learner.id];
        return next;
      });
      setLearners((current) =>
        current.map((item) => item.id === learner.id ? { ...item, profilePicturePath: null } : item),
      );
      setNotice("Profile picture removed.");
    } catch (pictureError) {
      setError(pictureError instanceof Error ? pictureError.message : "Unable to remove the profile picture.");
    } finally {
      setBusyLearnerId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setError("");
    setNotice("");
    setIsSaving(true);
    const input: ParentLearnerInput = {
      firstName: form.firstName.trim(),
      ageRange: form.ageRange,
      preferredName: form.preferredName.trim() || undefined,
      musicalExperience: form.musicalExperience || undefined,
      learningInterests: form.learningInterests,
    };

    try {
      let pictureUploadError = "";
      const learner = editingId
        ? await updateParentLearner(user, editingId, input)
        : await createParentLearner(user, input);
      setLearners((current) =>
        editingId
          ? current.map((item) => (item.id === learner.id ? learner : item))
          : [...current, learner],
      );
      if (form.profilePicture) {
        try {
          await saveProfilePicture(learner.id, form.profilePicture);
        } catch (pictureError) {
          pictureUploadError = pictureError instanceof Error
            ? `Profile saved, but the picture could not be uploaded: ${pictureError.message}`
            : "Profile saved, but the picture could not be uploaded.";
        }
      }
      if (pictureUploadError) setError(pictureUploadError);
      else setNotice(editingId ? "Learner profile updated." : "Learner profile created.");
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this learner profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusChange(learner: ParentLearner) {
    if (!user) return;
    const nextStatus = learner.accountStatus === "deactivated" ? "active" : "deactivated";
    const confirmed = window.confirm(
      nextStatus === "deactivated"
        ? `Deactivate ${learner.preferredName || learner.firstName}'s profile and student access?`
        : `Reactivate ${learner.preferredName || learner.firstName}'s profile?`,
    );
    if (!confirmed) return;
    setBusyLearnerId(learner.id);
    setError("");
    setNotice("");
    try {
      const updated = await updateParentLearner(user, learner.id, { status: nextStatus });
      setLearners((current) => current.map((item) => (item.id === learner.id ? updated : item)));
      setInvitation(null);
      setNotice(nextStatus === "deactivated" ? "Learner profile and student access deactivated." : "Learner profile reactivated.");
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update learner access.");
    } finally {
      setBusyLearnerId(null);
    }
  }

  async function handleCreateInvitation(learner: ParentLearner) {
    if (!user) return;
    setBusyLearnerId(learner.id);
    setError("");
    setNotice("");
    setInvitation(null);
    try {
      const created = await createStudentInvitation(user, learner.id);
      setInvitation({ ...created, learnerId: learner.id });
      const records = await getParentLearners(user);
      setLearners(records);
      setNotice("Share this one-time code with the learner. It expires in 24 hours.");
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to create student access.");
    } finally {
      setBusyLearnerId(null);
    }
  }

  return (
    <div className="role-content">
      <RolePageHeading
        eyebrow="FAMILY LEARNERS"
        title="My Children"
        description="Manage learner profiles and create separate student sign-ins."
      />
      <div className="role-demo-note role-note-teal">
        <ShieldCheck size={17} />
        <span>
          Learner profiles are linked to your signed-in parent account. Student access uses a separate login.
          Only collect the profile information shown here.
        </span>
      </div>

      {!isAuthReady || isLoading ? (
        <section className="role-panel"><p>Loading learner profiles...</p></section>
      ) : !user ? (
        <section className="role-panel">
          <p>Log in with your parent account to manage learner profiles.</p>
          <Link className="button button-pink" to="/login">Log in</Link>
        </section>
      ) : (
        <>
          <section className="role-panel child-add-panel">
            <div className="role-panel-heading">
              <div>
                <span className="eyebrow">{editingId ? "EDIT PROFILE" : "FAMILY PROFILES"}</span>
                <h2>{editingId ? "Edit learner profile" : "Add a child"}</h2>
              </div>
              <span className="role-icon-chip pink"><Plus size={17} /></span>
            </div>
            <form className="child-add-form child-profile-form" onSubmit={handleSubmit}>
              <label className="form-field" htmlFor="child-first-name">
                <span>Child’s first name <b aria-hidden="true">*</b></span>
                <input
                  id="child-first-name"
                  name="firstName"
                  type="text"
                  autoComplete="off"
                  maxLength={60}
                  value={form.firstName}
                  onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  required
                />
              </label>
              <label className="form-field" htmlFor="child-age-range">
                <span>Age range <b aria-hidden="true">*</b></span>
                <select
                  id="child-age-range"
                  value={form.ageRange}
                  onChange={(event) => setForm((current) => ({ ...current, ageRange: event.target.value as LearnerForm["ageRange"] }))}
                  required
                >
                  <option value="8-10">8–10</option>
                  <option value="11-13">11–13</option>
                  <option value="14-16">14–16</option>
                </select>
              </label>
              <label className="form-field" htmlFor="child-preferred-name">
                <span>Preferred name <small>Optional</small></span>
                <input
                  id="child-preferred-name"
                  type="text"
                  maxLength={40}
                  value={form.preferredName}
                  onChange={(event) => setForm((current) => ({ ...current, preferredName: event.target.value }))}
                />
              </label>
              <label className="form-field" htmlFor="child-experience">
                <span>Musical experience <small>Optional</small></span>
                <select
                  id="child-experience"
                  value={form.musicalExperience}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    musicalExperience: event.target.value as LearnerForm["musicalExperience"],
                  }))}
                >
                  <option value="">Not specified</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Some experience">Some experience</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </label>
              <fieldset className="child-interest-options">
                <legend>Learning interests <small>Optional</small></legend>
                {interestOptions.map((interest) => (
                  <label className="checkbox-field" key={interest}>
                    <input
                      type="checkbox"
                      checked={form.learningInterests.includes(interest)}
                      onChange={() => toggleInterest(interest)}
                    />
                    <span>{interest}</span>
                  </label>
                ))}
              </fieldset>
              <label className="form-field child-photo-field" htmlFor="child-picture">
                <span>Profile picture <small>Optional · JPEG, PNG or WebP, max 2 MB</small></span>
                <input id="child-picture" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePictureChange} />
              </label>
              <div className="child-form-actions">
                <button className="button button-pink" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingId ? "Save changes" : "Add child"}
                </button>
                {editingId && (
                  <button className="button button-outline" type="button" onClick={resetForm} disabled={isSaving}>
                    <X size={15} /> Cancel edit
                  </button>
                )}
              </div>
            </form>
          </section>

          {error && <p className="auth-error-message" role="alert">{error}</p>}
          {notice && <div className="role-inline-message" role="status"><Check size={16} />{notice}</div>}

          {learners.length ? (
            <div className="children-grid">
              {learners.map((learner) => (
                <article className={`role-panel child-profile-card ${learner.accountStatus === "deactivated" ? "child-profile-inactive" : ""}`} key={learner.id}>
                  <div className="child-profile-top">
                    {photoUrls[learner.id] ? (
                      <img className="child-profile-avatar child-profile-photo" src={photoUrls[learner.id]} alt="" />
                    ) : (
                      <span className="child-profile-avatar" aria-hidden="true">
                        {(learner.preferredName || learner.firstName).charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className={`role-status ${learner.accountStatus === "deactivated" ? "status-draft" : "status-published"}`}>
                      {learner.accountStatus === "deactivated" ? "Deactivated" : learner.accessStatus === "active" ? "Student active" : "Profile active"}
                    </span>
                  </div>
                  <h2>{learner.preferredName || learner.firstName}</h2>
                  <p>{learner.firstName} · Age {learner.ageRange} · {learner.learningLevel}</p>
                  <div className="child-platform-details">
                    <span>Lessons: {learner.lessonProgress.completed}/{learner.lessonProgress.total}</span>
                    <span>Practice: {learner.practiceSubmissionStatus}</span>
                    <span>Teacher approval: {learner.teacherApprovalStatus}</span>
                    <span>Teacher: {learner.assignedTeacher || "Not assigned"}</span>
                    {learner.studentUsername && <span>Student username: <strong>{learner.studentUsername}</strong></span>}
                    {learner.accessStatus === "invitation_pending" && learner.invitationExpiresAt && (
                      <span>Invitation expires: {new Date(learner.invitationExpiresAt).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="child-card-actions">
                    <button className="button button-outline" type="button" onClick={() => beginEdit(learner)} disabled={learner.accountStatus === "deactivated"}>
                      <Pencil size={14} /> Edit
                    </button>
                    {learner.accountStatus !== "deactivated" && learner.accessStatus !== "active" && (
                      <button
                        className="button button-outline"
                        type="button"
                        onClick={() => void handleCreateInvitation(learner)}
                        disabled={busyLearnerId !== null}
                      >
                        <KeyRound size={14} /> {busyLearnerId === learner.id ? "Creating..." : "Create student access"}
                      </button>
                    )}
                    <button
                      className="button button-outline"
                      type="button"
                      onClick={() => void handleStatusChange(learner)}
                      disabled={busyLearnerId !== null}
                    >
                      {learner.accountStatus === "deactivated" ? "Reactivate" : <><Trash2 size={14} /> Deactivate</>}
                    </button>
                    {learner.profilePicturePath && learner.accountStatus !== "deactivated" && (
                      <button
                        className="button button-outline"
                        type="button"
                        onClick={() => void handleRemovePicture(learner)}
                        disabled={busyLearnerId !== null}
                      >
                        Remove picture
                      </button>
                    )}
                  </div>
                  {invitation?.learnerId === learner.id && (
                    <div className="student-invitation-card" role="status">
                      <strong>Share with the learner once</strong>
                      <span>Student username: <b>{invitation.username}</b></span>
                      <code>{invitation.code}</code>
                      <small>Expires {new Date(invitation.expiresAt).toLocaleString()}. The code cannot be shown again; create a new one if it is lost.</small>
                      <Link to="/student/activate">Open student activation page</Link>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : !isLoading ? (
            <section className="role-panel child-empty-state">
              <span className="quick-link-icon pink"><UserRound size={18} /></span>
              <h2>No children linked yet</h2>
              <p>Add a child profile to manage learner information and create separate student access.</p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
