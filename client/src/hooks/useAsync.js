import { useCallback, useEffect, useRef, useState } from "react";
export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const loaderRef = useRef(loader);
  const requestId = useRef(0);
  const depsKey = JSON.stringify(deps);
  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) setData(result);
    } catch (e) {
      if (id === requestId.current) setError(e?.message || "Đã có lỗi xảy ra.");
    } finally {
      if (id === requestId.current) setLoading(false);
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
