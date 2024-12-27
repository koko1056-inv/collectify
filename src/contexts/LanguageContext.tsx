import React, { createContext, useContext, useState } from "react";

type Language = "ja" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  ja: {
    // Navigation
    "nav.login": "ログイン",
    "nav.profile": "プロフィール編集",
    "nav.admin": "管理画面",
    "nav.logout": "ログアウト",
    "nav.search.user": "ユーザーを探す",

    // Tabs
    "tabs.official": "公式グッズ",
    "tabs.collection": "マイコレクション",

    // Collection
    "collection.empty": "まだコレクションに追加されたアイテムがありません。",
    "collection.no.matches": "選択されたタグに一致するアイテムがありません。",
    "collection.title": "マイコレクション",

    // Search and Filter
    "search.placeholder": "グッズを検索...",
    "tags.select": "タグを選択",
    "tags.search": "タグを検索...",
    "tags.all": "すべて",

    // Memories
    "memories.title": "の思い出",
    "memories.add": "思い出を追加",
    "memories.comment": "コメント",
    "memories.image": "画像",
    "memories.list": "これまでの思い出",
    "memories.add.success": "思い出を追加しました",
    "memories.add.error": "思い出の追加に失敗しました。",

    // Interests
    "interests.title": "興味のあるタグを選択してください",
    "interests.description": "好みに合わせたグッズを表示するために、興味のあるタグを選んでください",
    "interests.save": "確定",
    "interests.saving": "保存中...",
    "interests.success": "興味のあるタグを保存しました",
    "interests.success.desc": "おすすめのアイテムが表示されます",
    "interests.error": "エラーが発生しました",
    "interests.error.desc": "興味のあるタグの保存に失敗しました",

    // Common
    "common.cancel": "キャンセル",
    "common.confirm": "確定",
    "common.delete": "削除する",
    "common.error": "エラー",
    "common.loading": "読み込み中...",
  },
  en: {
    // Navigation
    "nav.login": "Login",
    "nav.profile": "Edit Profile",
    "nav.admin": "Admin",
    "nav.logout": "Logout",
    "nav.search.user": "Find Users",

    // Tabs
    "tabs.official": "Official Goods",
    "tabs.collection": "My Collection",

    // Collection
    "collection.empty": "No items have been added to your collection yet.",
    "collection.no.matches": "No items match the selected tags.",
    "collection.title": "My Collection",

    // Search and Filter
    "search.placeholder": "Search goods...",
    "tags.select": "Select Tags",
    "tags.search": "Search tags...",
    "tags.all": "All",

    // Memories
    "memories.title": "'s Memories",
    "memories.add": "Add Memory",
    "memories.comment": "Comment",
    "memories.image": "Image",
    "memories.list": "Previous Memories",
    "memories.add.success": "Memory added successfully",
    "memories.add.error": "Failed to add memory.",

    // Interests
    "interests.title": "Select Your Interests",
    "interests.description": "Choose tags that interest you to see recommended items",
    "interests.save": "Save",
    "interests.saving": "Saving...",
    "interests.success": "Interests saved successfully",
    "interests.success.desc": "You will now see recommended items",
    "interests.error": "An error occurred",
    "interests.error.desc": "Failed to save interests",

    // Common
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.delete": "Delete",
    "common.error": "Error",
    "common.loading": "Loading...",

    // Additional translations for previously untranslated text
    "wishlist.empty": "Your wishlist is empty",
    "wishlist.note": "Note",
    "wishlist.add": "Add to Wishlist",
    "wishlist.remove": "Remove from Wishlist",
    "wishlist.title": "Wishlist",
    "collection.add": "Add to Collection",
    "collection.remove": "Remove from Collection",
    "item.price": "Price",
    "item.release_date": "Release Date",
    "item.description": "Description",
    "item.not_set": "Not set",
    "item.quantity": "Quantity",
    "user.profile": "User Profile",
    "user.collection": "'s Collection",
    "user.shared_items": "Shared Items",
    "user.wishlist": "Wishlist",
    "user.empty_wishlist": "Wishlist is empty",
    "user.owners": "Users who own this item",
    "user.no_owners": "No users own this item yet",
    "tag.manage": "Manage Tags",
    "tag.add": "Add Tag",
    "tag.remove": "Remove Tag",
    "tag.select": "Select Tags",
    "tag.create": "Create Tag",
    "official.add": "Add New Item",
    "official.title": "Official Goods",
    "share.modal.title": "Share Settings",
    "share.public": "Make Public",
    "share.private": "Make Private",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("ja");

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations["ja"]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}