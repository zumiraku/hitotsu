import Link from "next/link";
import type { NoteCategory } from "@/generated/prisma/enums";
import { NoteCardMenu } from "@/components/notes/note-card-menu";
import { Avatar } from "@/components/ui/avatar";
import { fmtDate } from "@/lib/format";
import { NOTE_CATEGORY_LABEL } from "@/lib/labels";

export type NoteCardData = {
  id: string;
  title: string;
  category: NoteCategory;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string; color: string } | null;
  project?: { id: string; name: string } | null;
  customer?: { id: string; name: string } | null;
};

const CAT_CLASS: Record<NoteCategory, string> = { HANDOVER: "bg-warn-soft text-warn", RULE: "bg-info-soft text-info", MEMO: "bg-neutral-soft text-neutral" };

export function CategoryBadge({ category }: { category: NoteCategory }) {
  return <span className={`badge ${CAT_CLASS[category]}`}>{NOTE_CATEGORY_LABEL[category]}</span>;
}

export function NoteCard({ note, showLinks = true, compact = false }: { note: NoteCardData; showLinks?: boolean; compact?: boolean }) {
  const edited = note.updatedAt.getTime() - note.createdAt.getTime() > 60_000;
  return (
    <article id={`note-${note.id}`} className={`card scroll-mt-20 p-4 ${note.pinned ? "border-warn shadow-[inset_3px_0_0_var(--color-warn)]" : ""}`}>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <CategoryBadge category={note.category} />
          <h3 className="mt-1 text-[14.5px] font-bold">{note.title}</h3>
        </div>
        <NoteCardMenu id={note.id} pinned={note.pinned} />
      </div>
      <p className={`whitespace-pre-wrap break-words text-[13.5px] text-ink-2 ${compact ? "line-clamp-4" : ""}`}>{note.body}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {note.author ? (
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={note.author.name} color={note.author.color} size={20} />
            {note.author.name}
          </span>
        ) : null}
        <span>{fmtDate(note.updatedAt)}{edited ? " 更新" : ""}</span>
        {showLinks && note.project ? <Link href={`/projects/${note.project.id}`} className="text-primary hover:underline">{note.project.name}</Link> : null}
        {showLinks && note.customer ? <Link href={`/customers/${note.customer.id}`} className="text-primary hover:underline">{note.customer.name}</Link> : null}
      </div>
    </article>
  );
}
