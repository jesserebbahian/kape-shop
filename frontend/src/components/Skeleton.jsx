export default function Skeleton({ label = 'Loading…' }) {
  return <div className="skeleton" role="status"><span>{label}</span></div>;
}
