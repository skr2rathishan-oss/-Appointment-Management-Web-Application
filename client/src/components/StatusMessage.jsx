export default function StatusMessage({ loading, error, empty, emptyText = 'Nothing here yet.' }) {
  if (loading) return <p className="muted">Loading…</p>;
  if (error) return <p className="alert alert-error">{error.message}</p>;
  if (empty) return <div className="empty-state"><p>{emptyText}</p></div>;
  return null;
}
