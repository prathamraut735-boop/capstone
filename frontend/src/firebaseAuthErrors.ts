import { FirebaseError } from "firebase/app";

const authErrorMessages: Record<string, string> = {
  "auth/email-already-in-use": "An account already exists for this email address. Try logging in instead.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/network-request-failed": "A network error interrupted the request. Check your connection and try again.",
  "auth/operation-not-allowed": "Email and password sign-in is not enabled for this Firebase project.",
  "auth/too-many-requests": "Too many attempts were made. Wait a little while and try again.",
  "auth/weak-password": "Choose a stronger password with at least eight characters.",
  "permission-denied": "Firestore denied access to the profile. Deploy the Firestore rules and try again.",
  "unavailable": "Firestore is temporarily unavailable. Check your connection and try again.",
};

export function getFirebaseAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return authErrorMessages[error.code] ?? error.message;
  }

  return error instanceof Error
    ? error.message
    : "An unexpected error occurred. Please try again.";
}
