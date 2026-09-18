import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

export function Forbidden({ title, need }: { title: string; need: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="box">
        <div className="box-body text-[13px]">
          <p>この画面を表示する権限がありません。（{need}の権限が必要です）</p>
          <p className="mt-3">
            <Link href="/">ホームへ戻る</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
