import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getStudentLessons } from "../backendApi";
import type { StudentLessonCatalog } from "../types";
import { auth } from "../firebase";

const emptyCatalog: StudentLessonCatalog = {
  lessons: [],
  progress: { completed: 0, total: 0 },
};

export function useStudentLessons() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [catalog, setCatalog] = useState<StudentLessonCatalog>(emptyCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setCatalog(emptyCatalog);
      setLoading(false);
      setError("");
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError("");
    getStudentLessons(user)
      .then((result) => {
        if (active) setCatalog(result);
      })
      .catch((cause: unknown) => {
        if (active) {
          setCatalog(emptyCatalog);
          setError(cause instanceof Error ? cause.message : "Your lessons could not be loaded.");
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

  return { user, ...catalog, loading, error, reload };
}
