import type { User } from "firebase/auth";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string | null;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://capstone-gq7h.onrender.com/").replace(/\/+$/, "");

export async function getCurrentUserProfile(user: User): Promise<UserProfile> {
  const token = await user.getIdToken();
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/v1/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
      typeof responseBody === "object" &&
      responseBody !== null &&
      "detail" in responseBody &&
      typeof responseBody.detail === "string"
        ? responseBody.detail
        : "Unable to retrieve the account profile.";
    throw new Error(detail);
  }

  if (
    typeof responseBody !== "object" ||
    responseBody === null ||
    !("uid" in responseBody) ||
    responseBody.uid !== user.uid ||
    !("email" in responseBody) ||
    !(typeof responseBody.email === "string" || responseBody.email === null) ||
    !("displayName" in responseBody) ||
    !(typeof responseBody.displayName === "string" || responseBody.displayName === null) ||
    !("role" in responseBody) ||
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
