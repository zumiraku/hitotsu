import Link from "next/link";
import type { NoteCategory } from "@/generated/prisma/enums";
import { NoteCardMenu } from "@/components/notes/note-card-menu";
import { fmtDateTime } from "@/lib/format";
import { NOTE_CATEGORY_LABEL } from "@/lib/labels";

export type NoteCardData = {
  id: string;
  title: string;
  category: NoteCategory;
  body: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string } | null;
  project?: { id: string; name: string } | null;
  customer?: { id: string; name: string } | null;
};

export function NoteCard({ note, showLinks = true, editable = false }: { note: NoteCardData; showLinks?: boolean; editable?: boolean }) {
  const edited = note.updatedAt.getTime() - note.createdAt.getTime() > 60_000;
  return (
    <article id={`note-${note.id}`} className="box scroll-mt-4">
      <div className="box-head">
        <span className="min-w-0">
          <span className="lbl mr-1.5">{NOTE_CATEGORY_LABEL[note.category]}</span>
          {note.pinned ? <span className="lbl mr-1.5 border-warn text-warn">ピン留め</span> : null}
          {note.title}
        </span>
        {editable ? <NoteCardMenu id={note.id} pinned={note.pinned} /> : null}
      </div>
      <div className="box-body whitespace-pre-wrap break-words text-[13px]">{note.body}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line-2 px-3 py-1 text-[11.5px] text-muted">
        <span>{note.author ? `記入者：${note.author.name}` : null}</span>
        <span>
          {edited ? "更新" : "登録"}：{fmtDateTime(note.updatedAt)}
        </span>
        {showLinks && note.project ? (
          <span>
            案件：<Link href={`/projects/${note.project.id}`}>{note.project.name}</Link>
          </span>
        ) : null}
        {showLinks && note.customer ? (
          <span>
            顧客：<Link href={`/customers/${note.customer.id}`}>{note.customer.name}</Link>
          </span>
        ) : null}
      </div>
    </article>
  );
}
