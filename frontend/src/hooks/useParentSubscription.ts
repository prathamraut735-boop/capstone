import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  getParentSubscription,
  type ParentSubscriptionOverview,
} from "../backendApi";
import { auth } from "../firebase";

export function useParentSubscription() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [overview, setOverview] = useState<ParentSubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setOverview(null);
      setLoading(false);
      setError("");
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError("");
    getParentSubscription(user)
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setOverview(null);
          setError(cause instanceof Error ? cause.message : "Subscription details could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, refreshKey]);

  function reload() {
    setRefreshKey((current) => current + 1);
  }

  return { user, overview, loading, error, reload };
}
