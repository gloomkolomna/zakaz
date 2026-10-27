export default function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="page" aria-busy="true">
      <div className="skeleton skeleton-title" />
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className={`skeleton skeleton-line${index === lines - 1 ? ' short' : ''}`} />
      ))}
    </div>
  );
}
