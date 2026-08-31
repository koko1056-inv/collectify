/**
 * 翻訳モジュール: admin
 * 対象: src/components/admin
 *
 * ja と en は同じキー構造にすること。en が欠けたキーは日本語にフォールバックする
 * （src/translations/index.ts の getTranslation を参照）。
 */
export const admin = {
  ja: {
    duplicates: {
      title: "重複したグッズの統合",
      description:
        "同じグッズが2件に分かれていると、持っている人と欲しい人がマッチングで出会えません。片方に寄せて1件にまとめます。",
      loadFailed: "重複候補を読み込めませんでした",
      noneTitle: "重複候補はありません",
      noneDesc: "見出しが完全に一致する組は見つかりませんでした。表記が違う重複は下から手で探せます。",
      groupCount: "{count}件",
      exactBadge: "同じ画像 {count}件",
      usage: "所持 {owners}人 / 欲しい {wishes}人",
      sameImage: "画像が一致（同じものです）",
      differentImage: "画像が違います",
      nameOnlyWarning:
        "この組は名前が同じだけで、画像はすべて違います。一番くじの賞のようにキャラ違いが同じ名前で並ぶことがあるので、別商品の可能性が高いです。写真を見比べて、本当に同じものだと確認できたときだけ寄せてください。",
      keepBadge: "残す",
      mergeSide: "寄せる",
      keepThis: "これを残す",
      mergeIn: "こちらに寄せる",
      confirmTitle: "統合しますか？",
      confirmDesc:
        "「{merge}」を「{keep}」に寄せます。所持・ウィッシュ・タグ・投稿はすべて統合先に付け替わります。統合元の行は削除せず、一覧から隠すだけです。",
      confirmDifferentImage:
        "この2件は画像が違います。別商品なら、寄せると2つの商品が1つになってしまいます。付け替えた所持・ウィッシュ・タグは元に戻せません。",
      cancel: "やめる",
      confirmCta: "統合する",
      mergedTitle: "統合しました",
      mergedDesc: "統合元は一覧から隠れました",
      mergeFailedTitle: "統合できませんでした",
      mergeFailedDesc: "時間をおいてもう一度お試しください",
      manualTitle: "手で探して統合する",
      manualDesc:
        "「（再販）」が付いただけの重複などは自動では拾えません。残すほうを選んでから、寄せるほうを選びます。",
      manualPlaceholder: "グッズ名で検索（2文字以上）",
      manualKeeping: "残す: {title}",
    },
    similar: {
      title: "同じ名前のグッズが既にあります",
      description:
        "同じ名前のグッズが{count}件登録されています。同じものなら、二重に登録せず既存のものを使ってください。キャラ違いなど別商品なら、そのまま登録して問題ありません。",
      usage: "所持 {owners}人 / 欲しい {wishes}人",
      back: "戻って直す",
      proceed: "別の商品として登録する",
    },
    reports: {
      title: "通報",
      description: "交換でのトラブル報告です。通報したことは相手には伝わりません。",
      loadFailed: "通報を読み込めませんでした",
      noneTitle: "通報はありません",
      noneDesc: "新しい通報が届くとここに並びます",
      parties: "{reporter} → {reported}",
      updated: "状態を更新しました",
      updateFailed: "更新できませんでした",
      status: {
        open: "未対応",
        reviewing: "確認中",
        resolved: "対応済み",
        dismissed: "対応不要",
      },
      moveTo: {
        reviewing: "確認中にする",
        resolved: "対応済みにする",
        dismissed: "対応不要にする",
      },
    },
  },
  en: {
    duplicates: {
      title: "Merge duplicate Goods",
      description:
        "When the same item exists twice, the person who has it and the person who wants it never match. Merge them into one.",
      loadFailed: "Couldn't load duplicate candidates",
      noneTitle: "No duplicates found",
      noneDesc: "Nothing with an identical title. Search below for duplicates that are spelled differently.",
      groupCount: "{count} entries",
      exactBadge: "{count} with the same image",
      usage: "{owners} own / {wishes} want",
      sameImage: "Same image — these really are duplicates",
      differentImage: "Different image",
      nameOnlyWarning:
        "These share a title but every image differs. Lottery prizes often list character variants under one name, so these are probably different products. Compare the photos and merge only if you're sure they're the same thing.",
      keepBadge: "Keep",
      mergeSide: "Merge in",
      keepThis: "Keep this one",
      mergeIn: "Merge into that",
      confirmTitle: "Merge these?",
      confirmDesc:
        "\"{merge}\" will be merged into \"{keep}\". Collections, wishlists, tags and posts all move to the one you keep. The merged entry is hidden, not deleted.",
      confirmDifferentImage:
        "These two have different images. If they are different products, merging collapses two items into one. The collections, wishlists and tags moved across cannot be restored.",
      cancel: "Cancel",
      confirmCta: "Merge",
      mergedTitle: "Merged",
      mergedDesc: "The duplicate is now hidden from listings",
      mergeFailedTitle: "Couldn't merge",
      mergeFailedDesc: "Please try again in a moment",
      manualTitle: "Find and merge by hand",
      manualDesc:
        "Duplicates that only differ by a suffix won't be detected automatically. Pick the one to keep, then the one to merge in.",
      manualPlaceholder: "Search by title (2+ characters)",
      manualKeeping: "Keeping: {title}",
    },
    similar: {
      title: "An item with this name already exists",
      description:
        "{count} item(s) are already registered under this name. If it's the same thing, use the existing entry instead of adding it twice. If it's a different product (a character variant, say), go ahead and register it.",
      usage: "{owners} own / {wishes} want",
      back: "Go back and edit",
      proceed: "Register as a different product",
    },
    reports: {
      title: "Reports",
      description: "Trouble reported during trades. The reported person is never told.",
      loadFailed: "Couldn't load reports",
      noneTitle: "No reports",
      noneDesc: "New reports will show up here",
      parties: "{reporter} → {reported}",
      updated: "Status updated",
      updateFailed: "Couldn't update",
      status: {
        open: "Open",
        reviewing: "Reviewing",
        resolved: "Resolved",
        dismissed: "Dismissed",
      },
      moveTo: {
        reviewing: "Mark reviewing",
        resolved: "Mark resolved",
        dismissed: "Dismiss",
      },
    },
  },
} as const;
