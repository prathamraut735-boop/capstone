import type { User } from "firebase/auth";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
}

export interface ParentLearner {
  id: string;
  firstName: string;
  ageRange: "8-10" | "11-13" | "14-16";
  preferredName: string | null;
  musicalExperience: "Beginner" | "Some experience" | "Experienced" | null;
  learningInterests: Array<"Singing" | "Ukulele" | "Songwriting">;
  profilePicturePath: string | null;
  parentId: string;
  createdAt: string;
  learningLevel: string;
  accountStatus: "profile_only" | "invitation_pending" | "active" | "deactivated";
  accessStatus: "not_created" | "invitation_pending" | "active" | "deactivated";
  assignedTeacher: string | null;
  lessonProgress: { completed: number; total: number };
  practiceSubmissionStatus: string;
  teacherApprovalStatus: string;
  studentUsername: string | null;
  invitationExpiresAt: string | null;
}

export interface ParentLearnerInput {
  firstName: string;
  ageRange: ParentLearner["ageRange"];
  preferredName?: string;
  musicalExperience?: NonNullable<ParentLearner["musicalExperience"]>;
  learningInterests: ParentLearner["learningInterests"];
}

export interface AvailableSession {
  id: string;
  title: string;
  venue: string;
  startAt: string;
  endAt: string;
  capacity: number;
  availableSeats: number;
  priceCents: number;
  currency: string;
}

export interface ParentBooking {
  id: string;
  sessionId: string;
  sessionTitle: string;
  venue: string;
  startAt: string;
  endAt: string;
  learnerId: string;
  learnerNickname: string;
  status: "confirmed" | "cancelled";
  paymentStatus: "simulated";
  amountCents: number;
  currency: string;
  createdAt: string;
}

export interface StudentInvitation {
  code: string;
  username: string;
  expiresAt: string;
}

export interface StudentProfile {
  uid: string;
  role: "student";
  learnerId: string;
  firstName: string;
  preferredName: string | null;
  ageRange: ParentLearner["ageRange"];
  learningLevel: string;
  lessonProgress: { completed: number; total: number };
  practiceSubmissionStatus: string;
  teacherApprovalStatus: string;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://capstone-gq7h.onrender.com/").replace(/\/+$/, "");
const studentAuthEmailDomain = import.meta.env.VITE_STUDENT_AUTH_EMAIL_DOMAIN || "students.capstone-af3eb.firebaseapp.com";

async function apiRequest(user: User, path: string, init?: RequestInit): Promise<unknown> {
  const token = await user.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error(`Could not connect to the Toy Choir TV API at ${apiBaseUrl}.`);
  }

  if (response.status === 204) return undefined;

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new Error("The API returned an invalid response.");
  }

  if (!response.ok) {
    const detail =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "detail" in responseBody &&
      typeof responseBody.detail === "string"
        ? responseBody.detail
        : "The request could not be completed.";
    throw new Error(detail);
  }
  return responseBody;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new Error("The API returned an invalid response.");
  return value;
}

function requiredNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("The API returned an invalid response.");
  }
  return value;
}

function parseAccountStatus(value: string): ParentLearner["accountStatus"] {
  if (value === "profile_only" || value === "invitation_pending" || value === "active" || value === "deactivated") {
    return value;
  }
  throw new Error("The API returned an invalid learner account status.");
}

function parseAccessStatus(value: string): ParentLearner["accessStatus"] {
  if (value === "not_created" || value === "invitation_pending" || value === "active" || value === "deactivated") {
    return value;
  }
  throw new Error("The API returned an invalid learner access status.");
}

function parseLearner(value: unknown): ParentLearner {
  if (!isRecord(value)) throw new Error("The API returned an invalid learner profile.");
  if (
    !Array.isArray(value.learningInterests) ||
    !isRecord(value.lessonProgress) ||
    typeof value.lessonProgress.completed !== "number" ||
    typeof value.lessonProgress.total !== "number"
  ) {
    throw new Error("The API returned an invalid learner profile.");
  }
  const ageRange = requiredString(value, "ageRange");
  if (ageRange !== "8-10" && ageRange !== "11-13" && ageRange !== "14-16") {
    throw new Error("The API returned an invalid learner age range.");
  }
  const accountStatus = parseAccountStatus(requiredString(value, "accountStatus"));
  const accessStatus = parseAccessStatus(requiredString(value, "accessStatus"));
  const optionalString = (key: string) => {
    const optionalValue = value[key];
    if (optionalValue !== null && optionalValue !== undefined && typeof optionalValue !== "string") {
      throw new Error("The API returned an invalid learner profile.");
    }
    return typeof optionalValue === "string" ? optionalValue : null;
  };
  const experienceValue = optionalString("musicalExperience");
  let musicalExperience: ParentLearner["musicalExperience"];
  if (experienceValue === null) {
    musicalExperience = null;
  } else if (
    experienceValue === "Beginner" ||
    experienceValue === "Some experience" ||
    experienceValue === "Experienced"
  ) {
    musicalExperience = experienceValue;
  } else {
    throw new Error("The API returned an invalid musical experience.");
  }
  return {
    id: requiredString(value, "id"),
    firstName: requiredString(value, "firstName"),
    ageRange,
    preferredName: optionalString("preferredName"),
    musicalExperience,
    learningInterests: value.learningInterests.map((interest: unknown) => {
      if (interest !== "Singing" && interest !== "Ukulele" && interest !== "Songwriting") {
        throw new Error("The API returned an invalid learner interest.");
      }
      return interest;
    }),
    profilePicturePath: optionalString("profilePicturePath"),
    parentId: requiredString(value, "parentId"),
    createdAt: requiredString(value, "createdAt"),
    learningLevel: requiredString(value, "learningLevel"),
    accountStatus,
    accessStatus,
    assignedTeacher: optionalString("assignedTeacher"),
    lessonProgress: {
      completed: value.lessonProgress.completed,
      total: value.lessonProgress.total,
    },
    practiceSubmissionStatus: requiredString(value, "practiceSubmissionStatus"),
    teacherApprovalStatus: requiredString(value, "teacherApprovalStatus"),
    studentUsername: optionalString("studentUsername"),
    invitationExpiresAt: optionalString("invitationExpiresAt"),
  };
}

function parseSession(value: unknown): AvailableSession {
  if (!isRecord(value)) throw new Error("The API returned an invalid session.");
  return {
    id: requiredString(value, "id"),
    title: requiredString(value, "title"),
    venue: requiredString(value, "venue"),
    startAt: requiredString(value, "startAt"),
    endAt: requiredString(value, "endAt"),
    capacity: requiredNumber(value, "capacity"),
    availableSeats: requiredNumber(value, "availableSeats"),
    priceCents: requiredNumber(value, "priceCents"),
    currency: requiredString(value, "currency"),
  };
}

function parseBooking(value: unknown): ParentBooking {
  if (!isRecord(value)) throw new Error("The API returned an invalid booking.");
  const status = requiredString(value, "status");
  if (status !== "confirmed" && status !== "cancelled") {
    throw new Error("The API returned an invalid booking status.");
  }
  if (requiredString(value, "paymentStatus") !== "simulated") {
    throw new Error("The API returned an invalid payment status.");
  }
  return {
    id: requiredString(value, "id"),
    sessionId: requiredString(value, "sessionId"),
    sessionTitle: requiredString(value, "sessionTitle"),
    venue: requiredString(value, "venue"),
    startAt: requiredString(value, "startAt"),
    endAt: requiredString(value, "endAt"),
    learnerId: requiredString(value, "learnerId"),
    learnerNickname: requiredString(value, "learnerNickname"),
    status,
    paymentStatus: "simulated",
    amountCents: requiredNumber(value, "amountCents"),
    currency: requiredString(value, "currency"),
    createdAt: requiredString(value, "createdAt"),
  };
}

export async function getCurrentUserProfile(user: User): Promise<UserProfile> {
  const responseBody = await apiRequest(user, "/api/v1/users/me");
  if (
    !isRecord(responseBody) ||
    typeof responseBody.uid !== "string" ||
    responseBody.uid !== user.uid ||
    !(typeof responseBody.email === "string" || responseBody.email === null) ||
    !(typeof responseBody.displayName === "string" || responseBody.displayName === null) ||
    !(typeof responseBody.role === "string" || responseBody.role === null)
  ) {
    throw new Error("The API returned an invalid user profile.");
  }
  return {
    uid: responseBody.uid,
    email: responseBody.email,
    displayName: responseBody.displayName,
    role: responseBody.role,
  };
}

export async function getParentLearners(user: User): Promise<ParentLearner[]> {
  const responseBody = await apiRequest(user, "/api/v1/users/me/children");
  if (!Array.isArray(responseBody)) throw new Error("The API returned invalid learner profiles.");
  return responseBody.map(parseLearner);
}

export async function createParentLearner(user: User, learner: ParentLearnerInput): Promise<ParentLearner> {
  return parseLearner(
    await apiRequest(user, "/api/v1/users/me/children", {
      method: "POST",
      body: JSON.stringify(learner),
    }),
  );
}

export async function updateParentLearner(
  user: User,
  learnerId: string,
  changes: Partial<ParentLearnerInput> & { status?: "active" | "deactivated" },
): Promise<ParentLearner> {
  return parseLearner(
    await apiRequest(user, `/api/v1/users/me/children/${encodeURIComponent(learnerId)}`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),
  );
}

export async function uploadParentLearnerProfilePicture(
  user: User,
  learnerId: string,
  picture: File,
): Promise<ParentLearner> {
  const response = await authenticatedRawRequest(
    user,
    `/api/v1/users/me/children/${encodeURIComponent(learnerId)}/profile-picture`,
    {
      method: "PUT",
      headers: { "Content-Type": picture.type },
      body: picture,
    },
  );
  return parseLearner(await response.json());
}

export async function getParentLearnerProfilePicture(user: User, learnerId: string): Promise<Blob> {
  const response = await authenticatedRawRequest(
    user,
    `/api/v1/users/me/children/${encodeURIComponent(learnerId)}/profile-picture`,
  );
  return response.blob();
}

export async function deleteParentLearnerProfilePicture(user: User, learnerId: string): Promise<void> {
  await apiRequest(
    user,
    `/api/v1/users/me/children/${encodeURIComponent(learnerId)}/profile-picture`,
    { method: "DELETE" },
  );
}

async function authenticatedRawRequest(user: User, path: string, init?: RequestInit): Promise<Response> {
  const token = await user.getIdToken();
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    throw new Error(`Could not connect to the Toy Choir TV API at ${apiBaseUrl}.`);
  }
  if (!response.ok) {
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      throw new Error("The API returned an invalid response.");
    }
    const detail =
      isRecord(responseBody) && typeof responseBody.detail === "string"
        ? responseBody.detail
        : "The request could not be completed.";
    throw new Error(detail);
  }
  return response;
}

export async function createStudentInvitation(user: User, learnerId: string): Promise<StudentInvitation> {
  const response = await apiRequest(
    user,
    `/api/v1/users/me/children/${encodeURIComponent(learnerId)}/student-invitations`,
    { method: "POST" },
  );
  if (!isRecord(response)) throw new Error("The API returned an invalid student invitation.");
  return {
    code: requiredString(response, "code"),
    username: requiredString(response, "username"),
    expiresAt: requiredString(response, "expiresAt"),
  };
}

export async function activateStudentInvitation(code: string, password: string): Promise<{ username: string }> {
  const response = await apiRequestWithoutUser("/api/v1/student-invitations/activate", {
    method: "POST",
    body: JSON.stringify({ code, password }),
  });
  if (!isRecord(response)) throw new Error("The API returned an invalid activation response.");
  return { username: requiredString(response, "username") };
}

async function apiRequestWithoutUser(path: string, init?: RequestInit): Promise<unknown> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  } catch {
    throw new Error(`Could not connect to the Toy Choir TV API at ${apiBaseUrl}.`);
  }
  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new Error("The API returned an invalid response.");
  }
  if (!response.ok) {
    const detail =
      isRecord(responseBody) && typeof responseBody.detail === "string"
        ? responseBody.detail
        : "The request could not be completed.";
    throw new Error(detail);
  }
  return responseBody;
}

export function getStudentAuthEmail(username: string): string {
  return `${username}@${studentAuthEmailDomain}`;
}

export function isStudentAuthEmail(email: string | null): boolean {
  return email?.toLowerCase().endsWith(`@${studentAuthEmailDomain.toLowerCase()}`) ?? false;
}

export async function getStudentProfile(user: User): Promise<StudentProfile> {
  const response = await apiRequest(user, "/api/v1/students/me");
  if (!isRecord(response) || response.role !== "student" || response.uid !== user.uid) {
    throw new Error("The signed-in account does not have student access.");
  }
  const ageRange = requiredString(response, "ageRange");
  if (ageRange !== "8-10" && ageRange !== "11-13" && ageRange !== "14-16") {
    throw new Error("The API returned an invalid learner age range.");
  }
  if (
    !isRecord(response.lessonProgress) ||
    typeof response.lessonProgress.completed !== "number" ||
    typeof response.lessonProgress.total !== "number"
  ) {
    throw new Error("The API returned invalid learner progress.");
  }
  const optionalName = response.preferredName;
  if (optionalName !== null && optionalName !== undefined && typeof optionalName !== "string") {
    throw new Error("The API returned an invalid student profile.");
  }
  return {
    uid: requiredString(response, "uid"),
    role: "student",
    learnerId: requiredString(response, "learnerId"),
    firstName: requiredString(response, "firstName"),
    preferredName: typeof optionalName === "string" ? optionalName : null,
    ageRange,
    learningLevel: requiredString(response, "learningLevel"),
    lessonProgress: {
      completed: response.lessonProgress.completed,
      total: response.lessonProgress.total,
    },
    practiceSubmissionStatus: requiredString(response, "practiceSubmissionStatus"),
    teacherApprovalStatus: requiredString(response, "teacherApprovalStatus"),
  };
}

export async function getAvailableSessions(user: User): Promise<AvailableSession[]> {
  const responseBody = await apiRequest(user, "/api/v1/sessions");
  if (!Array.isArray(responseBody)) throw new Error("The API returned invalid session availability.");
  return responseBody.map(parseSession);
}

export async function getParentBookings(user: User): Promise<ParentBooking[]> {
  const responseBody = await apiRequest(user, "/api/v1/users/me/bookings");
  if (!Array.isArray(responseBody)) throw new Error("The API returned invalid booking history.");
  return responseBody.map(parseBooking);
}

export async function createParentBooking(
  user: User,
  sessionId: string,
  learnerId: string,
): Promise<ParentBooking> {
  return parseBooking(
    await apiRequest(user, "/api/v1/users/me/bookings", {
      method: "POST",
      body: JSON.stringify({ sessionId, learnerId }),
    }),
  );
}

export async function cancelParentBooking(user: User, bookingId: string): Promise<ParentBooking> {
  return parseBooking(
    await apiRequest(
      user,
      `/api/v1/users/me/bookings/${encodeURIComponent(bookingId)}`,
      { method: "DELETE" },
    ),
  );
}
