export function UserName({ user }: { user: { name: string } | null | undefined }) {
  if (!user) return <span className="text-muted">未割当</span>;
  return <span className="whitespace-nowrap">{user.name}</span>;
}
