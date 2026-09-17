import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/page-header";

export function Forbidden({ title, need }: { title: string; need: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="card">
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[13.5px] text-muted">
          <Icon name="lock" size={22} />
          <p>この画面を見るには「{need}」の権限が必要です。</p>
          <Link href="/" className="btn mt-2">ダッシュボードへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
