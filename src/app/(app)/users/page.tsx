import { InviteButton } from "@/components/users/invite-dialog";
import { UserRow } from "@/components/users/user-row";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { Forbidden } from "@/components/forbidden";
import { PERM_LABEL, PERM_ORDER, ROLE_DESC, ROLE_ORDER, ROLE_PERMS, can } from "@/lib/permissions";

export const metadata = { title: "ユーザー・権限" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await currentUser();
  if (!can(me, "users")) return <Forbidden title="ユーザー・権限" need="管理者" />;

  const users = await db.user.findMany({
    include: { _count: { select: { ownedProjects: { where: { status: "ACTIVE", deletedAt: null } } } } },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <PageHeader title="ユーザー・権限" sub={`${users.filter((u) => u.isActive).length}人が有効。ロールを変えると次の画面表示から反映されます`}>
        <InviteButton />
      </PageHeader>

      <div className="card overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="th">名前</th>
              <th className="th">所属</th>
              <th className="th">ロール</th>
              <th className="th">状態</th>
              <th className="th text-right">担当案件</th>
              <th className="th">最終ログイン</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                isMe={u.id === me.id}
                user={{
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  department: u.department,
                  role: u.role,
                  color: u.color,
                  isActive: u.isActive,
                  mustChangePassword: u.mustChangePassword,
                  lastLoginText: u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "未ログイン",
                  activeProjects: u._count.ownedProjects,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <section className="card mt-4">
        <div className="card-head">
          <h2 className="text-[15px] font-bold">ロールごとにできること</h2>
          <span className="text-xs text-muted">画面の表示だけでなく、保存処理の側でも同じ権限を確認しています</span>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="th">操作</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="th text-center">
                    {ROLE_LABEL[r]}
                    <div className="text-[10.5px] font-normal tracking-normal">{ROLE_DESC[r]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_ORDER.map((p) => (
                <tr key={p}>
                  <td className="td">{PERM_LABEL[p]}</td>
                  {ROLE_ORDER.map((r) => (
                    <td key={r} className="td text-center">
                      {ROLE_PERMS[r].includes(p) ? <span className="font-bold text-good">●</span> : <span className="text-line-strong">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
