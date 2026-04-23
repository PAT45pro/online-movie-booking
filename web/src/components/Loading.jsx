export default function Loading({ text }) {
  return (
    <div className="loading">
      <div className="spinner" />
      {text && <div className="mt-md text-secondary text-sm">{text}</div>}
    </div>
  );
}
