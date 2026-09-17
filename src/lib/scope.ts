// 論理削除した案件・顧客に紐づくデータを一覧や検索に出さないための共通条件

// 案件に紐づくもの（タスク・対応履歴・メモ・ファイル）: 案件がないか、削除されていない案件
export const liveProject = { OR: [{ projectId: null }, { project: { deletedAt: null } }] };

// 顧客に紐づくもの: 顧客がないか、削除されていない顧客
export const liveCustomer = { OR: [{ customerId: null }, { customer: { deletedAt: null } }] };

// 両方
export const liveRefs = { AND: [liveProject, liveCustomer] };
