import { InviteButton } from "@/components/users/invite-dialog";
import { UserRow } from "@/components/users/user-row";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { Forbidden } from "@/components/forbidden";
import { verifyPassword } from "@/lib/auth";
import { PERM_LABEL, PERM_ORDER, ROLE_DESC, ROLE_ORDER, ROLE_PERMS, can } from "@/lib/permissions";
import { SAMPLE_LOGIN_IDS, SAMPLE_PASSWORD } from "@/lib/sample-accounts";

export const metadata = { title: "ユーザー・権限" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await currentUser();
  if (!can(me, "users")) return <Forbidden title="ユーザー・権限" need="管理者" />;

  const users = await db.user.findMany({
    include: { _count: { select: { ownedProjects: { where: { status: "ACTIVE", deletedAt: null } } } } },
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
  });
  // 動作確認用アカウントが初期パスワードのまま残っていたら本番では注意を出す
  let sampleAccounts = 0;
  if (process.env.NODE_ENV === "production") {
    for (const u of users.filter((x) => x.isActive && SAMPLE_LOGIN_IDS.includes(x.loginId))) {
      if (await verifyPassword(SAMPLE_PASSWORD, u.passwordHash)) sampleAccounts++;
    }
  }

  return (
    <div>
      <PageHeader title="ユーザー・権限" sub={`有効 ${users.filter((u) => u.isActive).length}名`}>
        <InviteButton />
      </PageHeader>

      {sampleAccounts ? <p className="msg-warn mb-3">初期パスワードのままの動作確認用アカウントが {sampleAccounts} 件あります。パスワードを変更するか無効化してください。</p> : null}
      <p className="mb-2 text-[12px] text-muted">※ ロールを変更すると、対象ユーザーの次回画面表示から反映されます。</p>
      <div className="overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th className="th">氏名</th>
              <th className="th">ログインID</th>
              <th className="th">所属</th>
              <th className="th">ロール</th>
              <th className="th">状態</th>
              <th className="th text-right">担当案件</th>
              <th className="th">最終ログイン</th>
              <th className="th">操作</th>
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
                  loginId: u.loginId,
                  department: u.department,
                  role: u.role,
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

      <div className="box mt-4">
        <div className="box-head">ロール別の権限一覧</div>
        <div className="box-body overflow-x-auto">
          <p className="mb-2 text-[12px] text-muted">※ 画面の表示だけでなく、保存処理の側でも同じ権限を確認しています。</p>
          <table className="tbl">
            <thead>
              <tr>
                <th className="th">操作</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} className="th text-center">
                    {ROLE_LABEL[r]}
                    <div className="text-[10.5px] font-normal">{ROLE_DESC[r]}</div>
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
                      {ROLE_PERMS[r].includes(p) ? "○" : <span className="text-muted">－</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
