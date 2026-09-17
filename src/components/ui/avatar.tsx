export function Avatar({ name, color, size = 26 }: { name: string; color: string; size?: number }) {
  return (
    <span className="avatar" style={{ background: color, width: size, height: size, fontSize: size * 0.44 }} title={name}>
      {name.slice(0, 1)}
    </span>
  );
}

export function UserChip({ user }: { user: { name: string; color: string } | null | undefined }) {
  if (!user) return <span className="text-muted">未割当</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Avatar name={user.name} color={user.color} />
      <span>{user.name}</span>
    </span>
  );
}
