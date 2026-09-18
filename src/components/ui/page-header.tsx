export function PageHeader({ title, sub, children }: { title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="ttl flex flex-wrap items-end justify-between gap-2">
      <h1 className="min-w-0">
        {title}
        {sub ? <span className="sub">{sub}</span> : null}
      </h1>
      {children ? <div className="flex flex-wrap items-center gap-1.5 pb-0.5">{children}</div> : null}
    </div>
  );
}
