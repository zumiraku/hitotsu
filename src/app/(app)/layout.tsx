import { AppShell } from "@/components/app-shell";
import { currentUser } from "@/lib/current-user";
import { ROLE_LABEL } from "@/lib/labels";
import { ROLE_PERMS } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <AppShell user={{ name: user.name, roleLabel: ROLE_LABEL[user.role], perms: ROLE_PERMS[user.role] }}>
      {children}
    </AppShell>
  );
}
