import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import type { NoteCategory } from "@/generated/prisma/enums";
import { NoteCard } from "@/components/notes/note-card";
import { NoteFilters } from "@/components/notes/note-filters";
import { Empty } from "@/components/ui/empty";
import { Flash } from "@/components/ui/flash";
import { PageHeader } from "@/components/ui/page-header";
import { currentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export const metadata = { title: "社内メモ・引き継ぎ" };
export const dynamic = "force-dynamic";

const CATS = new Set(["MEMO", "HANDOVER", "RULE"]);
type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function NotesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const me = await currentUser();
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const category = CATS.has(one(sp.category)) ? (one(sp.category) as NoteCategory) : undefined;
  const pinnedOnly = one(sp.pinned) === "1";

  const where: Prisma.NoteWhereInput = {
    ...(category ? { category } : {}),
    ...(pinnedOnly ? { pinned: true } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const [notes, total] = await Promise.all([
    db.note.findMany({
      where,
      include: { author: { select: { name: true, color: true } }, project: { select: { id: true, name: true } }, customer: { select: { id: true, name: true } } },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    }),
    db.note.count(),
  ]);

  return (
    <div>
      <PageHeader title="社内メモ・引き継ぎ" sub={`${notes.length}件${q || category || pinnedOnly ? "（絞り込み中）" : ""} / 全${total}件。担当が変わっても困らないように、ルールと経緯をここに残します`}>
        {can(me, "activity") ? <Link href="/notes/new" className="btn btn-primary">＋ メモを追加</Link> : null}
      </PageHeader>
      <Suspense>
        <Flash messages={{ created: "メモを追加しました", saved: "保存しました" }} />
        <NoteFilters />
      </Suspense>
      {notes.length === 0 ? (
        <div className="card"><Empty>該当するメモがありません</Empty></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} editable={can(me, "activity")} />
          ))}
        </div>
      )}
    </div>
  );
}
