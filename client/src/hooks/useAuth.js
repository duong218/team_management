import { useEffect, useState } from "react";
import * as api from "../api/auth";
export default function useAuth() {
  const [user, setUser] = useState(undefined),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api
      .getSession()
      .then((u) => live && setUser(u))
      .catch((e) => {
        setError(e.message);
        setUser(null);
      });
    const { data } = api.watchAuth(setUser);
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return {
    data: user,
    loading: user === undefined,
    error,
    reload: async () => {
      setError("");
      try {
        setUser(await api.getSession());
      } catch (e) {
        setError(e.message);
        setUser(null);
      }
    },
    login: api.signIn,
    logout: api.signOut,
  };
}
