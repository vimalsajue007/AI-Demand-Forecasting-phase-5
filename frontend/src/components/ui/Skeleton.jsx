export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-primary-100 dark:bg-primary-900 rounded-xl ${className}`} />;
}
export function SkeletonCard() {
  return <div className="glass-card p-5 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /><Skeleton className="h-3 w-20" /></div>;
}
export function SkeletonTable({ rows = 5 }) {
  return <div className="space-y-2"><Skeleton className="h-10 w-full" />{[...Array(rows)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
}
export function SkeletonChart() {
  return <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-52 w-full" /></div>;
}
