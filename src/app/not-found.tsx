import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md">
      <div className="card-body text-center">
        <p className="text-[15px] font-bold">ページが見つかりません</p>
        <p className="mt-1 text-[13px] text-muted">URL が間違っているか、削除された可能性があります。</p>
        <Link href="/" className="btn mt-4">ダッシュボードへ戻る</Link>
      </div>
    </div>
  );
}
