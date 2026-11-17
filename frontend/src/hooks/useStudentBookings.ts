import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { getStudentBookings, type ParentBooking } from "../backendApi";
import useCurrentUser from "../useCurrentUser";

export function useStudentBookings() {
  const { user, isAuthReady } = useCurrentUser();
  const [bookings, setBookings] = useState<ParentBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isAuthReady) return;
    if (user === null) {
      setBookings([]);
      setLoading(false);
      setError("");
      return;
    }
    const authenticatedUser: User = user;

    let active = true;
    let requestInProgress = false;
    async function refresh(currentUser: User, showLoading: boolean) {
      if (requestInProgress) return;
      requestInProgress = true;
      if (showLoading) setLoading(true);
      try {
        const result = await getStudentBookings(currentUser);
        if (active) {
          setBookings(result);
          setError("");
        }
      } catch (cause: unknown) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Your session bookings could not be loaded.");
        }
      } finally {
        requestInProgress = false;
        if (active && showLoading) setLoading(false);
      }
    }

    void refresh(authenticatedUser, true);
    const timer = window.setInterval(() => void refresh(authenticatedUser, false), 15_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [isAuthReady, user, refreshKey]);

  function reload() {
    setRefreshKey((current) => current + 1);
  }

  return { bookings, loading, error, reload };
}
