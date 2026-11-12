import { useCallback, useEffect, useRef, useState } from "react";
export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const loaderRef = useRef(loader);
  const depsKey = JSON.stringify(deps);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loaderRef.current());
    } catch (e) {
      setError(e?.message || "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);
  useEffect(() => {
    Promise.resolve().then(reload);
  }, [reload, depsKey]);
  return { data, loading, error, reload, setData };
}
