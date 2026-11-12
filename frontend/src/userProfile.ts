import type { User } from "firebase/auth";
import { app } from "./firebase";

export async function saveUserProfile(user: User, displayName?: string) {
  const firestore = await import("firebase/firestore");
  const db = firestore.getFirestore(app);
  const profileRef = firestore.doc(db, "users", user.uid);
  const profileSnapshot = await firestore.getDoc(profileRef);
  const profileName = displayName?.trim() || user.displayName || "";

  if (profileSnapshot.exists()) {
    await firestore.setDoc(
      profileRef,
      {
        email: user.email,
        displayName: profileName || profileSnapshot.data().displayName || "",
        updatedAt: firestore.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  await firestore.setDoc(profileRef, {
    uid: user.uid,
    email: user.email,
    displayName: profileName,
    role: "parent",
    createdAt: firestore.serverTimestamp(),
    updatedAt: firestore.serverTimestamp(),
  });
}
