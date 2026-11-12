import { ErrorBox, Skeleton, EmptyState } from "../components/common";
export function DataScreen({ title, hook, children }) {
  const { data, loading, error, reload } = hook;
  return (
    <section>
      <h1>{title}</h1>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || !data.length ? (
        <EmptyState />
      ) : (
        children(data)
      )}
    </section>
  );
}
