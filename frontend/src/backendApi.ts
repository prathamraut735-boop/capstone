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
  studentId: string;
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

export interface AdminSessionInput {
  title: string;
  venue: string;
  startAt: string;
  endAt: string;
  capacity: number;
  priceCents: number;
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
  studentId: string;
  expiresAt: string;
}

export interface StudentPasswordReset {
  studentId: string;
  temporaryPassword: string;
}

export interface StudentProfile {
  uid: string;
  role: "student";
  studentId: string;
  username: string | null;
  learnerId: string;
  firstName: string;
  preferredName: string | null;
  ageRange: ParentLearner["ageRange"];
  learningLevel: string;
  lessonProgress: { completed: number; total: number };
  practiceSubmissionStatus: string;
  teacherApprovalStatus: string;
}

export interface SubscriptionLimits {
  maxLearners: number;
  maxLearningLevel: number;
  practiceSubmissionsPerMonth: number;
}

export interface SubscriptionPlan {
  id: "free" | "standard" | "premium";
  name: string;
  priceCents: number;
  currency: "GBP";
  billingCycle: "monthly";
  maxLearners: number;
  maxLearningLevel: number;
  practiceSubmissionsPerMonth: number;
  features: string[];
}

export interface ParentSubscription {
  parentId: string;
  isPersisted: boolean;
  planId: SubscriptionPlan["id"];
  effectivePlanId: SubscriptionPlan["id"];
  status: "active" | "cancelled";
  priceCents: number;
  currency: "GBP";
  billingCycle: "monthly";
  startedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string | null;
  planLimits: SubscriptionLimits;
  limits: SubscriptionLimits;
  activeLearnerCount: number;
  practiceSubmissionsUsed: number;
  practiceSubmissionsRemaining: number;
}

export interface ParentSubscriptionOverview {
  plans: SubscriptionPlan[];
  subscription: ParentSubscription;
}

export interface StudentEntitlements {
  planId: SubscriptionPlan["id"];
  planName: string;
  limits: SubscriptionLimits;
  practiceSubmissionsUsed: number;
  practiceSubmissionsRemaining: number;
  practiceMonth: string;
  publishedLearningLevelIds: number[];
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

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

function nullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error("The API returned an invalid response.");
  return value;
}

function parseSubscriptionLimits(value: unknown): SubscriptionLimits {
  if (!isRecord(value)) throw new Error("The API returned invalid subscription limits.");
  return {
    maxLearners: requiredNumber(value, "maxLearners"),
    maxLearningLevel: requiredNumber(value, "maxLearningLevel"),
    practiceSubmissionsPerMonth: requiredNumber(value, "practiceSubmissionsPerMonth"),
  };
}

function parseSubscriptionPlan(value: unknown): SubscriptionPlan {
  if (!isRecord(value)) throw new Error("The API returned an invalid subscription plan.");
  const id = requiredString(value, "id");
  if (id !== "free" && id !== "standard" && id !== "premium") {
    throw new Error("The API returned an unknown subscription plan.");
  }
  if (
    requiredString(value, "billingCycle") !== "monthly" ||
    requiredString(value, "currency") !== "GBP" ||
    !Array.isArray(value.features)
  ) {
    throw new Error("The API returned an invalid subscription plan.");
  }
  return {
    id,
    name: requiredString(value, "name"),
    priceCents: requiredNumber(value, "priceCents"),
    currency: "GBP",
    billingCycle: "monthly",
    maxLearners: requiredNumber(value, "maxLearners"),
    maxLearningLevel: requiredNumber(value, "maxLearningLevel"),
    practiceSubmissionsPerMonth: requiredNumber(value, "practiceSubmissionsPerMonth"),
    features: value.features.map((feature: unknown) => {
      if (typeof feature !== "string") throw new Error("The API returned an invalid subscription plan.");
      return feature;
    }),
  };
}

function parseParentSubscriptionOverview(value: unknown): ParentSubscriptionOverview {
  if (!isRecord(value) || !Array.isArray(value.plans) || !isRecord(value.subscription)) {
    throw new Error("The API returned invalid subscription information.");
  }
  const subscription = value.subscription;
  const planId = requiredString(subscription, "planId");
  const effectivePlanId = requiredString(subscription, "effectivePlanId");
  const status = requiredString(subscription, "status");
  if (
    typeof subscription.isPersisted !== "boolean" ||
    (planId !== "free" && planId !== "standard" && planId !== "premium") ||
    (effectivePlanId !== "free" && effectivePlanId !== "standard" && effectivePlanId !== "premium") ||
    (status !== "active" && status !== "cancelled") ||
    requiredString(subscription, "currency") !== "GBP" ||
    requiredString(subscription, "billingCycle") !== "monthly"
  ) {
    throw new Error("The API returned an invalid subscription.");
  }
  return {
    plans: value.plans.map(parseSubscriptionPlan),
    subscription: {
      parentId: requiredString(subscription, "parentId"),
      isPersisted: subscription.isPersisted,
      planId,
      effectivePlanId,
      status,
      priceCents: requiredNumber(subscription, "priceCents"),
      currency: "GBP",
      billingCycle: "monthly",
      startedAt: nullableString(subscription, "startedAt"),
      cancelledAt: nullableString(subscription, "cancelledAt"),
      updatedAt: nullableString(subscription, "updatedAt"),
      planLimits: parseSubscriptionLimits(subscription.planLimits),
      limits: parseSubscriptionLimits(subscription.limits),
      activeLearnerCount: requiredNumber(subscription, "activeLearnerCount"),
      practiceSubmissionsUsed: requiredNumber(subscription, "practiceSubmissionsUsed"),
      practiceSubmissionsRemaining: requiredNumber(subscription, "practiceSubmissionsRemaining"),
    },
  };
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
    studentId: requiredString(value, "studentId"),
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

export async function getParentSubscription(user: User): Promise<ParentSubscriptionOverview> {
  const overview = parseParentSubscriptionOverview(await apiRequest(user, "/api/v1/users/me/subscription"));
  if (overview.subscription.parentId !== user.uid) {
    throw new Error("The API returned a subscription for a different parent.");
  }
  return overview;
}

export async function changeParentSubscription(
  user: User,
  planId: SubscriptionPlan["id"],
): Promise<ParentSubscriptionOverview> {
  const overview = parseParentSubscriptionOverview(
    await apiRequest(user, "/api/v1/users/me/subscription", {
      method: "PUT",
      body: JSON.stringify({ planId }),
    }),
  );
  if (overview.subscription.parentId !== user.uid) {
    throw new Error("The API returned a subscription for a different parent.");
  }
  return overview;
}

export async function cancelParentSubscription(user: User): Promise<ParentSubscriptionOverview> {
  const overview = parseParentSubscriptionOverview(
    await apiRequest(user, "/api/v1/users/me/subscription/cancel", { method: "POST" }),
  );
  if (overview.subscription.parentId !== user.uid) {
    throw new Error("The API returned a subscription for a different parent.");
  }
  return overview;
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
    studentId: requiredString(response, "studentId"),
    expiresAt: requiredString(response, "expiresAt"),
  };
}

export async function activateStudentInvitation(
  code: string,
  username: string,
  password: string,
): Promise<{ studentId: string; username: string }> {
  const response = await apiRequestWithoutUser("/api/v1/student-invitations/activate", {
    method: "POST",
    body: JSON.stringify({ code, username, password }),
  });
  if (!isRecord(response)) throw new Error("The API returned an invalid activation response.");
  return {
    studentId: requiredString(response, "studentId"),
    username: requiredString(response, "username"),
  };
}

export async function loginStudent(
  identifier: string,
  password: string,
): Promise<{ customToken: string; studentId: string }> {
  const response = await apiRequestWithoutUser("/api/v1/students/login", {
    method: "POST",
    body: JSON.stringify({ studentId: identifier, password }),
  });
  if (!isRecord(response)) throw new Error("The API returned an invalid student sign-in response.");
  return {
    customToken: requiredString(response, "customToken"),
    studentId: requiredString(response, "studentId"),
  };
}

export async function resetStudentPassword(user: User, learnerId: string): Promise<StudentPasswordReset> {
  const response = await apiRequest(
    user,
    `/api/v1/users/me/children/${encodeURIComponent(learnerId)}/student-password-reset`,
    { method: "POST" },
  );
  if (!isRecord(response)) throw new Error("The API returned an invalid password reset response.");
  return {
    studentId: requiredString(response, "studentId"),
    temporaryPassword: requiredString(response, "temporaryPassword"),
  };
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
  const username = response.username;
  if (username !== null && username !== undefined && typeof username !== "string") {
    throw new Error("The API returned an invalid student username.");
  }
  if (optionalName !== null && optionalName !== undefined && typeof optionalName !== "string") {
    throw new Error("The API returned an invalid student profile.");
  }
  return {
    uid: requiredString(response, "uid"),
    role: "student",
    studentId: requiredString(response, "studentId"),
    username: typeof username === "string" ? username : null,
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

export async function setStudentUsername(user: User, username: string): Promise<string> {
  const response = await apiRequest(user, "/api/v1/students/me/username", {
    method: "PUT",
    body: JSON.stringify({ username }),
  });
  if (!isRecord(response)) throw new Error("The API returned an invalid username response.");
  return requiredString(response, "username");
}

export async function getStudentEntitlements(user: User): Promise<StudentEntitlements> {
  const response = await apiRequest(user, "/api/v1/students/me/entitlements");
  if (!isRecord(response) || !Array.isArray(response.publishedLearningLevelIds)) {
    throw new Error("The API returned invalid learning entitlements.");
  }
  const planId = requiredString(response, "planId");
  if (planId !== "free" && planId !== "standard" && planId !== "premium") {
    throw new Error("The API returned an unknown subscription plan.");
  }
  const publishedLearningLevelIds = response.publishedLearningLevelIds.map((levelId: unknown) => {
    if (typeof levelId !== "number" || !Number.isInteger(levelId)) {
      throw new Error("The API returned invalid learning entitlements.");
    }
    return levelId;
  });
  return {
    planId,
    planName: requiredString(response, "planName"),
    limits: parseSubscriptionLimits(response.limits),
    practiceSubmissionsUsed: requiredNumber(response, "practiceSubmissionsUsed"),
    practiceSubmissionsRemaining: requiredNumber(response, "practiceSubmissionsRemaining"),
    practiceMonth: requiredString(response, "practiceMonth"),
    publishedLearningLevelIds,
  };
}

export async function checkStudentLessonAccess(user: User, lessonId: string): Promise<void> {
  const response = await apiRequest(
    user,
    `/api/v1/students/me/lessons/${encodeURIComponent(lessonId)}/access`,
  );
  if (!isRecord(response) || response.lessonId !== lessonId || response.allowed !== true) {
    throw new Error("The API returned invalid lesson authorization.");
  }
}

export async function createStudentPracticeSubmission(
  user: User,
  lessonId: string,
): Promise<{ practiceSubmissionsUsed: number; practiceSubmissionsRemaining: number; monthlyLimit: number }> {
  const response = await apiRequest(user, "/api/v1/students/me/practice-submissions", {
    method: "POST",
    body: JSON.stringify({ lessonId }),
  });
  if (!isRecord(response) || requiredString(response, "status") !== "simulated") {
    throw new Error("The API returned an invalid practice submission.");
  }
  return {
    practiceSubmissionsUsed: requiredNumber(response, "practiceSubmissionsUsed"),
    practiceSubmissionsRemaining: requiredNumber(response, "practiceSubmissionsRemaining"),
    monthlyLimit: requiredNumber(response, "monthlyLimit"),
  };
}

export async function getAvailableSessions(user: User): Promise<AvailableSession[]> {
  const responseBody = await apiRequest(user, "/api/v1/sessions");
  if (!Array.isArray(responseBody)) throw new Error("The API returned invalid session availability.");
  return responseBody.map(parseSession);
}

export async function createAdminSession(user: User, session: AdminSessionInput): Promise<AvailableSession> {
  return parseSession(
    await apiRequest(user, "/api/v1/admin/sessions", {
      method: "POST",
      body: JSON.stringify(session),
    }),
  );
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
