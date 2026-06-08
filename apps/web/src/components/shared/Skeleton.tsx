interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

const variants = {
  text: 'rounded h-4',
  rect: 'rounded-[var(--radius-sm)]',
  circle: 'rounded-full',
};

export function Skeleton({ className = '', variant = 'text' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[var(--bg-overlay)] ${variants[variant]} ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonGroup({ count = 3, ...props }: { count?: number } & SkeletonProps) {
  return (
    <div className="flex flex-col gap-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} {...props} />
      ))}
    </div>
  );
}
