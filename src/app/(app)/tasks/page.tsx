import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { TaskFilters } from "@/components/tasks/task-filters";
import { AddTaskButton, TaskRow, TaskTableHead } from "@/components/tasks/task-row";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { endOfWeek, startOfToday } from "@/lib/format";
import { can } from "@/lib/permissions";
import { liveProject } from "@/lib/scope";
import { taskInclude, toTaskItem } from "@/lib/task-item";

export const metadata = { title: "タスク" };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const show = one(sp.show) || "open";
  const assignee = one(sp.assignee) || undefined;
  const project = one(sp.project) || undefined;
  const dueParam = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.due)) ? one(sp.due) : undefined;

  const me = await currentUser();
  const today = startOfToday();
  const weekEnd = endOfWeek();
  const utc = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

  const where: Prisma.TaskWhereInput = {
    ...liveProject,
    ...(assignee ? { assigneeId: assignee } : {}),
    ...(project ? { projectId: project } : {}),
    ...(dueParam
      ? { dueDate: new Date(`${dueParam}T00:00:00Z`) }
      : show === "open"
        ? { done: false }
        : show === "mine"
          ? { done: false, assigneeId: me.id }
          : show === "overdue"
            ? { done: false, dueDate: { lt: utc(today) } }
            : show === "week"
              ? { done: false, dueDate: { gte: utc(today), lte: utc(weekEnd) } }
              : {}),
  };

  const [tasks, users, projects, openCount, overdueCount] = await Promise.all([
    db.task.findMany({ where, include: taskInclude, orderBy: [{ done: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] }),
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.project.findMany({ where: { deletedAt: null, status: { in: ["LEAD", "ACTIVE", "HOLD"] } }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" } }),
    db.task.count({ where: { done: false, ...liveProject } }),
    db.task.count({ where: { done: false, dueDate: { lt: utc(today) }, ...liveProject } }),
  ]);

  const items = tasks.map(toTaskItem);
  const weekLeft = Math.round((weekEnd.getTime() - today.getTime()) / 86_400_000);
  const groups: { label: string; tone?: string; items: typeof items }[] = [
    { label: "期限超過", tone: "text-bad", items: items.filter((t) => !t.done && t.daysLeft !== null && t.daysLeft < 0) },
    { label: "本日", tone: "text-warn", items: items.filter((t) => !t.done && t.daysLeft === 0) },
    { label: "今週", items: items.filter((t) => !t.done && t.daysLeft !== null && t.daysLeft > 0 && t.daysLeft <= weekLeft) },
    { label: "来週以降", items: items.filter((t) => !t.done && t.daysLeft !== null && t.daysLeft > weekLeft) },
    { label: "期限なし", items: items.filter((t) => !t.done && t.daysLeft === null) },
    { label: "完了", items: items.filter((t) => t.done) },
  ].filter((g) => g.items.length);

  const options = { projects, users };
  const editable = can(me, "activity");

  return (
    <div>
      <PageHeader title="タスク" sub={`未完了 ${openCount}件（うち期限超過 ${overdueCount}件）`}>
        {editable ? <AddTaskButton options={options} preset={{ assigneeId: me.id }} /> : null}
      </PageHeader>
      <Suspense>
        <TaskFilters users={users} projects={projects} />
      </Suspense>

      {groups.length === 0 ? (
        <div className="box">
          <div className="box-body text-muted">該当するタスクはありません。</div>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.label} className="mb-4">
            <h2 className={`mb-1 text-[13px] font-bold ${g.tone ?? ""}`}>
              {g.label}（{g.items.length}件）
            </h2>
            <div className="overflow-x-auto">
              <table className="tbl">
                <TaskTableHead actions={editable} />
                <tbody>
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} options={editable ? options : undefined} readOnly={!editable} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
