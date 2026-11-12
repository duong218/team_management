import { useEffect, useState } from "react";
export default function useHashRoute() {
  const read = () => location.hash.slice(1) || "/projects";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const f = () => setRoute(read());
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  return {
    route,
    navigate: (path) => {
      location.hash = path;
    },
  };
}
