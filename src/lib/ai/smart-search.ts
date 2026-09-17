import { parseQuery } from "@/lib/ai/query";
import { db } from "@/lib/db";
import { searchAll, splitWords, type SearchGroup, type SearchKind } from "@/lib/search";

export type SmartSearchResult = { groups: SearchGroup[]; chips: string[] };

// 「田中さんの今週期限のタスク」のような文も、ただの単語も同じ入口で受ける
export async function smartSearch(q: string, opts: { limit?: number; kinds?: SearchKind[] } = {}): Promise<SmartSearchResult> {
  const [users, customers] = await Promise.all([
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.customer.findMany({ where: { deletedAt: null }, select: { id: true, name: true, kana: true } }),
  ]);
  const parsed = await parseQuery(q, { users, customers });
  const structured = parsed.chips.length > 0;
  const groups = await searchAll(
    {
      words: structured ? parsed.words : splitWords(q),
      assigneeId: parsed.assignee?.id ?? null,
      customerId: parsed.customer?.id ?? null,
      status: parsed.status,
      time: parsed.time,
      kinds: opts.kinds ?? (parsed.kind ? [parsed.kind] : null),
    },
    { limit: opts.limit },
  );
  return { groups, chips: parsed.chips };
}
